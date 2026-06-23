import * as crypto from 'crypto';
import { Queue } from 'bullmq';
import { getRedis } from '../config/redis-pool';
import { logger } from '../config/logger';

/**
 * Broadcast Dispatch Service — deduplication-safe campaign dispatch.
 *
 * Three-layer deduplication:
 *   1. Redis NX lock per campaign — prevents concurrent dispatch (double-click)
 *   2. BullMQ jobId = campaignId — BullMQ skips duplicate job IDs
 *   3. Per-customer message hash — prevents same message reaching same customer twice in 24h
 *
 * v3 Architecture: Part 5 — Broadcast Campaign Deduplication.
 * The CTO flagged: "Merchant may tap 'Send' twice → duplicate SMS blast."
 *
 * Usage in broadcast route handler:
 *   const result = await broadcastDispatchService.dispatch(campaignId, merchantId, message);
 *   if (!result.queued) return res.status(409).json({ error: result.reason });
 */

let _broadcastQueue: Queue | null = null;

function getBroadcastQueue(): Queue {
  if (!_broadcastQueue) {
    _broadcastQueue = new Queue('broadcast', {
      connection: getRedis() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 7 * 86400 },
        removeOnFail: { age: 30 * 86400 },
      },
    });
  }
  return _broadcastQueue;
}

interface DispatchResult {
  queued: boolean;
  reason?: string; // reason for rejection
  jobId?: string;
}

export const broadcastDispatchService = {
  /**
   * Safely dispatch a broadcast campaign.
   * Acquires distributed lock before enqueuing to prevent double-dispatch.
   *
   * @param campaignId  MongoDB ObjectId string of the campaign
   * @param merchantId  MongoDB ObjectId string of the merchant
   * @param message     The message content (used for dedup hash)
   * @returns           { queued: true } on success, { queued: false, reason } if rejected
   */
  async dispatch(campaignId: string, merchantId: string, message: string): Promise<DispatchResult> {
    const redis = getRedis();

    // Layer 1: Redis NX lock — prevents concurrent dispatch of same campaign
    const lockKey = `campaign:dispatch:lock:${campaignId}`;
    const lockAcquired = await (redis as any).set(lockKey, '1', 'NX', 'EX', 300); // 5-minute TTL

    if (!lockAcquired) {
      logger.warn('[BroadcastDispatch] Lock contention — campaign already being queued', {
        campaignId,
        merchantId,
      });
      return {
        queued: false,
        reason: 'This campaign is already being queued. Please wait a moment.',
      };
    }

    try {
      // Layer 2: BullMQ jobId dedup — BullMQ skips jobs with existing ID
      const queue = getBroadcastQueue();
      await queue.add(
        'dispatch',
        { campaignId, merchantId, message },
        { jobId: campaignId }, // same campaignId = same BullMQ job = deduplicated
      );

      logger.info('[BroadcastDispatch] Campaign queued for dispatch', {
        campaignId,
        merchantId,
      });

      return { queued: true, jobId: campaignId };
    } catch (err) {
      logger.error('[BroadcastDispatch] Failed to enqueue campaign', {
        campaignId,
        err: (err as Error)?.message,
      });
      return {
        queued: false,
        reason: 'Failed to queue campaign. Please try again.',
      };
    }
    // Note: lock released by TTL — intentionally not del'd (crash-safe)
  },

  /**
   * Check if a specific customer should receive this broadcast message.
   * Layer 3: Per-customer message hash deduplication (24h window).
   *
   * Used inside the broadcast worker before dispatching to each customer:
   *   const allowed = await broadcastDispatchService.checkCustomerDedup(merchantId, userId, message);
   *   if (!allowed) continue; // skip — already received this message
   *
   * @returns true if message should be sent, false if already sent in last 24h
   */
  async checkCustomerDedup(merchantId: string, userId: string, message: string): Promise<boolean> {
    try {
      const redis = getRedis();

      // Hash the message (first 12 hex chars = 48-bit collision resistance, sufficient for dedup)
      const messageHash = crypto.createHash('sha256').update(message).digest('hex').slice(0, 12);

      const dedupeKey = `broadcast:sent:${merchantId}:${userId}:${messageHash}`;
      const alreadySent = await redis.get(dedupeKey);

      if (alreadySent) {
        return false; // duplicate — skip this customer
      }

      // Mark as sent for 24h
      await redis.setex(dedupeKey, 86400, '1');
      return true;
    } catch {
      // On Redis failure, fail-open (allow send)
      return true;
    }
  },

  /**
   * Check the dispatch lock status of a campaign.
   * Used by the admin API to show "queuing in progress" status.
   */
  async isDispatching(campaignId: string): Promise<boolean> {
    try {
      const redis = getRedis();
      const lock = await redis.get(`campaign:dispatch:lock:${campaignId}`);
      return lock !== null;
    } catch {
      return false;
    }
  },
};

export default broadcastDispatchService;
