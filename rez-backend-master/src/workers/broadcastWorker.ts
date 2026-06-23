import { Worker, Job } from 'bullmq';
import * as crypto from 'crypto';
import { bullmqRedis } from '../config/bullmq-connection';
import { getRedis } from '../config/redis-pool';
import { logger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';
import { broadcastDispatchService } from '../services/broadcastDispatchService';
import { BroadcastCampaign } from '../models/BroadcastCampaign';
import { MerchantCustomerSnapshot } from '../models/MerchantCustomerSnapshot';
import pushNotificationService from '../services/pushNotificationService';
import SMSService from '../services/SMSService';
import EmailService from '../services/EmailService';
import { Merchant } from '../models/Merchant';
import whatsAppMarketingService from '../services/WhatsAppMarketingService';

/**
 * Generate an HMAC-signed unsubscribe token.
 * Prevents forgery — unsigned base64 tokens could be crafted by any attacker.
 */
function signUnsubscribeToken(userId: string, merchantId: string): string {
  const payload = JSON.stringify({ userId, merchantId });
  const encoded = Buffer.from(payload).toString('base64url');
  const secret = process.env.JWT_SECRET || process.env.INTERNAL_SERVICE_TOKEN || '';
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Broadcast Worker — processes campaign dispatch jobs from the 'broadcast' BullMQ queue.
 *
 * Job payload (from broadcastDispatchService.dispatch):
 *   { campaignId: string, merchantId: string, message: string }
 *
 * Worker flow per job:
 *   1. Mark campaign as 'sending'
 *   2. Resolve audience from MerchantCustomerSnapshot based on campaign.audience.segment
 *   3. For each customer: check channel opt-in + per-customer dedup (24h window)
 *   4. Dispatch message (in_app by default; hook for SMS/push/email per channel)
 *   5. Update campaign stats + mark 'sent' (or 'failed' if no customers reachable)
 *
 * Deduplication layers (from broadcastDispatchService):
 *   L1: Redis NX lock per campaign (prevents double-dispatch from UI)
 *   L2: BullMQ jobId = campaignId (deduplicated in queue)
 *   L3: Per-customer message hash → 24h TTL (this worker checks via checkCustomerDedup)
 *
 * Concurrency: 2 concurrent jobs. Broadcast jobs are DB-heavy (bulk reads + per-row writes).
 * Limiter: max 10 campaigns/min to avoid overwhelming FCM/SMS providers at scale.
 *
 * v3 Architecture: Part 5 — broadcast campaign execution.
 */

// ─── Audience filter helpers ─────────────────────────────────────────────────

type AudienceSegment = 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';

function buildAudienceFilter(merchantId: string, segment: AudienceSegment): Record<string, any> {
  const base = { merchantId };
  switch (segment) {
    case 'recent':
      return { ...base, isRecent: true };
    case 'lapsed':
      return { ...base, isLapsed: true };
    case 'high_value':
      return { ...base, isHighValue: true };
    case 'stamp_card':
      return { ...base, hasActiveStampCard: true };
    case 'all':
    default:
      return base;
  }
}

// MED-001 FIX: Format validators — reject malformed contacts before hitting external APIs.
// Invalid formats cause provider errors that silently count as campaign failures.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164-compatible Indian mobile: optional +91 prefix, 10-digit number starting with 6-9
const PHONE_RE = /^(?:\+?91)?[6-9]\d{9}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.replace(/[\s\-()]/g, ''));
}

function buildOptInField(channel: string): string {
  switch (channel) {
    case 'sms':
      return 'smsOptIn';
    case 'push':
      return 'pushOptIn';
    case 'email':
      return 'emailOptIn';
    case 'whatsapp':
      return 'whatsappOptIn';
    case 'in_app':
    default:
      return 'hasAppInstalled';
  }
}

// ─── Message dispatch ─────────────────────────────────────────────────────────

/**
 * Dispatch a single message to a customer.
 * Returns 'sent' | 'failed' | 'deduped'.
 *
 * Currently implements in_app channel (marks message in Redis for the app to poll).
 * SMS, push, email, whatsapp channels are stubbed for future provider integration.
 */
async function dispatchToCustomer(
  customer: any,
  campaign: any,
  message: string,
): Promise<'sent' | 'failed' | 'deduped'> {
  const merchantId = campaign.merchantId.toString();
  const userId = customer.userId.toString();

  // Layer 3: per-customer dedup check (24h window)
  const allowed = await broadcastDispatchService.checkCustomerDedup(merchantId, userId, message);
  if (!allowed) {
    return 'deduped';
  }

  try {
    switch (campaign.channel) {
      case 'push': {
        if (customer.pushTokens?.length > 0) {
          await pushNotificationService.sendPushToUser(customer.userId.toString(), {
            title: campaign.name,
            body: message,
            data: { campaignId: campaign._id.toString(), type: 'broadcast' },
            channelId: 'merchant_broadcasts',
          });
          return 'sent';
        }
        return 'failed';
      }
      case 'sms': {
        const phone = customer.phone;
        // MED-001 FIX: Validate phone format before calling SMS provider
        if (!phone || !isValidPhone(phone)) {
          logger.debug('[BroadcastWorker] Skipping SMS — invalid/missing phone', { userId, phone });
          return 'failed';
        }
        await SMSService.send({
          to: `+91${phone.replace(/\D/g, '')}`,
          message: `${message}\n\nReply STOP to unsubscribe`,
        });
        return 'sent';
      }
      case 'email': {
        const email = customer.email;
        // MED-001 FIX: Validate email format before calling email provider
        if (!email || !isValidEmail(email)) {
          logger.debug('[BroadcastWorker] Skipping email — invalid/missing address', { userId, email });
          return 'failed';
        }
        const merchant = await Merchant.findById(campaign.merchantId).select('businessName').lean();
        const unsubscribeToken = signUnsubscribeToken(customer.userId.toString(), campaign.merchantId.toString());
        const unsubUrl = `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`;
        const merchantName = merchant?.businessName || 'merchant';
        await EmailService.send({
          to: email,
          subject: campaign.name,
          html: `<p>${message.replace(/\n/g, '<br>')}</p><br><br><hr style="border:none;border-top:1px solid #eee"><p style="font-size:12px;color:#999;text-align:center"><a href="${unsubUrl}" style="color:#999">Unsubscribe</a> from ${merchantName}'s messages</p>`,
          text: `${message}\n\nUnsubscribe: ${unsubUrl}`,
        });
        return 'sent';
      }
      case 'whatsapp': {
        const phone = customer.phone;
        if (!phone || !isValidPhone(phone)) {
          logger.debug('[BroadcastWorker] Skipping WhatsApp — invalid/missing phone', { userId, phone });
          return 'failed';
        }
        if (!whatsAppMarketingService.isConfigured) {
          logger.warn('[BroadcastWorker] WhatsApp not configured — WHATSAPP_TOKEN or WHATSAPP_PHONE_ID missing');
          return 'failed';
        }
        const result = await whatsAppMarketingService.sendText({
          to: phone,
          message: `${message}\n\nReply STOP to unsubscribe`,
          campaignId: campaign._id.toString(),
          merchantId: campaign.merchantId.toString(),
        });
        if (result.deduped) return 'deduped';
        return result.success ? 'sent' : 'failed';
      }
      case 'in_app':
      default: {
        // In-app: write a Redis key that the consumer app polls
        // The app sees this as an unread notification badge.
        const redis = getRedis();
        const inboxKey = `user:inbox:${userId}`;
        const notification = JSON.stringify({
          id: `${campaign._id}-${userId}`,
          type: 'broadcast',
          merchantId,
          campaignId: campaign._id.toString(),
          title: campaign.name,
          message,
          channel: 'in_app',
          sentAt: new Date().toISOString(),
        });
        // LPUSH + LTRIM to keep at most 50 inbox items per user
        await redis.lpush(inboxKey, notification);
        await redis.ltrim(inboxKey, 0, 49);
        // Expire inbox after 30 days of inactivity
        await redis.expire(inboxKey, 30 * 86400);
        break;
      }
    }

    return 'sent';
  } catch (err: any) {
    logger.warn('[BroadcastWorker] Dispatch failed for customer', {
      userId,
      campaignId: campaign._id,
      channel: campaign.channel,
      err: err?.message,
    });
    return 'failed';
  }
}

// ─── Worker ──────────────────────────────────────────────────────────────────

// BULL-004 fix: per-job timeout — broadcast campaigns can be large and take >30s,
// causing BullMQ to mark the job as stalled and allowing another worker to pick it up.
const JOB_TIMEOUT_MS = 60_000;

/** BULL-004 fix: wraps a BullMQ processor with a hard timeout. */
function withTimeout<T>(
  processor: (job: Job<T>) => Promise<unknown>,
  timeoutMs: number,
): (job: Job<T>) => Promise<unknown> {
  return (job: Job<T>) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(new Error(`Job ${job.id} (${job.name}) exceeded timeout of ${timeoutMs}ms — BULL-004 timeout kill`)),
        timeoutMs,
      );
      timer.unref();
      processor(job)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };
}

/** BULL-004 fix: extracted processor so it can be wrapped with withTimeout(). */
const broadcastProcessor = async (job: Job) => {
  const { campaignId, merchantId, message } = job.data as {
    campaignId: string;
    merchantId: string;
    message: string;
  };

  logger.info('[BroadcastWorker] Processing broadcast job', { campaignId, merchantId });

  // ── 1. Load campaign ───────────────────────────────────────────────────
  const campaign = await BroadcastCampaign.findById(campaignId).lean();
  if (!campaign) {
    logger.warn('[BroadcastWorker] Campaign not found — skipping', { campaignId });
    return;
  }

  if (['sent', 'cancelled', 'sending'].includes(campaign.status)) {
    // 'sending' = another worker already picked this up (shouldn't happen with jobId dedup)
    logger.info('[BroadcastWorker] Campaign already in terminal/active state', {
      campaignId,
      status: campaign.status,
    });
    return;
  }

  // ── 2. Mark as sending ────────────────────────────────────────────────
  await BroadcastCampaign.findByIdAndUpdate(campaignId, { status: 'sending' });

  // ── 3. Resolve audience ───────────────────────────────────────────────
  const segment = campaign.audience?.segment || 'all';
  const optInField = buildOptInField(campaign.channel);
  const audienceFilter = {
    ...buildAudienceFilter(merchantId, segment as AudienceSegment),
    [optInField]: true, // only send to opted-in customers
  };

  // Process in batches of 100 to avoid loading entire audience into memory
  const BATCH_SIZE = 100;
  let skip = 0;
  let stats = { sent: 0, delivered: 0, failed: 0, deduped: 0 };

  // Use the message from campaign.message (canonical) over job data (may differ after edit)
  const finalMessage = campaign.message || message;

  while (true) {
    const customers = await MerchantCustomerSnapshot.find(audienceFilter)
      .skip(skip)
      .limit(BATCH_SIZE)
      .select('userId phone email pushTokens hasAppInstalled smsOptIn pushOptIn emailOptIn whatsappOptIn')
      .lean();

    if (customers.length === 0) break;

    // Dispatch to each customer (sequential — avoids flooding provider rate limits)
    for (const customer of customers) {
      const outcome = await dispatchToCustomer(customer, campaign, finalMessage);
      stats[outcome === 'sent' ? 'sent' : outcome === 'deduped' ? 'deduped' : 'failed']++;
      if (outcome === 'sent') stats.delivered++; // optimistically mark as delivered
    }

    skip += BATCH_SIZE;

    // Log progress for large campaigns
    if (skip % 500 === 0) {
      logger.info('[BroadcastWorker] Dispatch progress', { campaignId, skip, stats });
    }

    // Update job progress (BullMQ)
    await job.updateProgress(Math.min(Math.round((skip / (campaign.audience?.estimatedCount || 1)) * 100), 99));
  }

  // ── 4. Mark campaign as sent ──────────────────────────────────────────
  const finalStatus = stats.sent === 0 && stats.failed > 0 ? 'failed' : 'sent';

  await BroadcastCampaign.findByIdAndUpdate(campaignId, {
    status: finalStatus,
    sentAt: new Date(),
    stats,
    ...(finalStatus === 'failed' ? { errorMessage: 'All dispatch attempts failed' } : {}),
  });

  logger.info('[BroadcastWorker] Broadcast complete', {
    campaignId,
    merchantId,
    finalStatus,
    stats,
  });

  return stats;
};

export const broadcastWorker = new Worker(
  'broadcast',
  withTimeout(broadcastProcessor, JOB_TIMEOUT_MS), // BULL-004: 60s timeout
  {
    connection: bullmqRedis,
    concurrency: 2, // broadcast jobs are DB-heavy; low concurrency prevents pool starvation
    limiter: { max: 10, duration: 60_000 }, // max 10 campaigns/min
    lockDuration: 60_000, // BULL-004: 60s lock prevents premature stall detection
    removeOnComplete: { age: 7 * 86400 }, // keep 7 days for audit
    removeOnFail: { age: 30 * 86400 }, // keep 30 days for debugging
    stalledInterval: 30_000,
    maxStalledCount: 2,
  },
);

broadcastWorker.on('error', (err) => {
  logger.error('[BroadcastWorker] Worker error:', err);
});

broadcastWorker.on('stalled', (jobId: string) => {
  logger.warn('[BroadcastWorker] Job stalled — may be a large campaign mid-dispatch', { jobId });
});

broadcastWorker.on('failed', (job, err) => {
  if (!job) return;
  logger.error('[BroadcastWorker] Job permanently failed', {
    jobId: job.id,
    campaignId: job.data?.campaignId,
    err: err?.message,
  });
  // Update campaign to failed status on permanent failure
  BroadcastCampaign.findByIdAndUpdate(job.data?.campaignId, {
    status: 'failed',
    errorMessage: err?.message || 'Worker failure',
  }).catch(() => {});
});

broadcastWorker.on('completed', (job) => {
  logger.info('[BroadcastWorker] Job completed', {
    jobId: job.id,
    campaignId: job.data?.campaignId,
  });
});

// Attach dead-letter queue handler: permanently failed broadcast jobs are pushed to
// rez:dlq:broadcast Redis list and reported via Sentry.
attachFailureHandler(broadcastWorker, 'broadcast');

export default broadcastWorker;
