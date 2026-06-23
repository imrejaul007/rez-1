/**
 * AdBazaar Integration Service
 *
 * Handles webhook events from AdBazaar marketplace:
 * - QR scan events → Credit coins to user wallet
 * - Campaign attribution → Track ad performance
 * - User journey → Full funnel attribution
 *
 * Two-way integration:
 * 1. REZ receives QR scan events from AdBazaar
 * 2. AdBazaar receives visit/purchase events from REZ
 */

import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { AdBazaarScan } from '../models/AdBazaarScan';
import rewardEngine from '../core/rewardEngine';

/**
 * AdBazaar QR Scan Event
 */
export interface AdBazaarQrScanEvent {
  eventId: string;
  eventType: 'qr_scan';
  timestamp: string;
  userId?: string;
  deviceId: string;
  qrCode: string;
  campaignId: string;
  advertiserId: string;
  adFormat: string; // 'billboard', 'auto', 'influencer', 'restaurant_tv', etc.
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  userAgent?: string;
  ipAddress: string;
}

/**
 * AdBazaar Campaign Metadata
 */
export interface AdBazaarCampaign {
  campaignId: string;
  advertiserId: string;
  adFormat: string;
  coinReward: number; // Coins to award per scan
  dailyLimit: number; // Max scans per user per day
  campaignStartDate: string;
  campaignEndDate: string;
  targetRegion?: string;
}

/**
 * Coin Credit Result
 */
export interface CoinCreditResult {
  success: boolean;
  userId: string;
  coinsAwarded: number;
  reason: string;
  timestamp: string;
  error?: string;
}

/**
 * AdBazaar webhook signature verification
 */
export function verifyAdBazaarSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Constant-time comparison
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    logger.error('[AdBazaar] Signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Process QR scan event from AdBazaar
 */
export async function processQrScanEvent(event: AdBazaarQrScanEvent): Promise<CoinCreditResult> {
  try {
    logger.info('[AdBazaar] Processing QR scan event', {
      eventId: event.eventId,
      campaignId: event.campaignId,
      advertiserId: event.advertiserId,
      deviceId: event.deviceId,
    });

    // Validate event structure
    if (!event.eventId || !event.campaignId || !event.deviceId) {
      return {
        success: false,
        userId: 'unknown',
        coinsAwarded: 0,
        reason: 'Missing required fields',
        timestamp: new Date().toISOString(),
        error: 'Invalid event structure',
      };
    }

    // ── Step 1: Resolve REZ user ────────────────────────────────────────────
    // event.userId is an optional REZ user ObjectId. If absent (anonymous scan),
    // we cannot credit coins — log and return success so AdBazaar doesn't retry.
    if (!event.userId) {
      logger.info('[AdBazaar] Anonymous scan — no userId in event, skipping coin credit', {
        eventId: event.eventId,
        deviceId: event.deviceId,
      });
      return {
        success: true,
        userId: 'anonymous',
        coinsAwarded: 0,
        reason: 'Anonymous scan — user identity required to credit coins',
        timestamp: new Date().toISOString(),
      };
    }

    const user = await User.findById(event.userId).select('_id isActive').lean();
    if (!user || !(user as any).isActive) {
      return {
        success: false,
        userId: event.userId,
        coinsAwarded: 0,
        reason: 'User not found or inactive',
        timestamp: new Date().toISOString(),
        error: 'User lookup failed',
      };
    }

    // ── Step 2: Deduplication — prevent double-credit per eventId ────────────
    const alreadyCredited = await AdBazaarScan.findOne({ scanEventId: event.eventId, coinsCredited: true }).lean();
    if (alreadyCredited) {
      logger.info('[AdBazaar] Duplicate event — coins already credited', { eventId: event.eventId });
      return {
        success: true,
        userId: event.userId,
        coinsAwarded: 0,
        reason: 'Already credited (duplicate event)',
        timestamp: new Date().toISOString(),
      };
    }

    // ── Step 3: Determine coin reward amount ─────────────────────────────────
    // Configured via ADBAZAAR_DEFAULT_SCAN_COINS env var (default: 10)
    const coinsToAward = parseInt(process.env.ADBAZAAR_DEFAULT_SCAN_COINS || '10', 10);

    // ── Step 4: Credit coins via reward engine ───────────────────────────────
    const rewardResult = await rewardEngine.issue({
      userId: event.userId,
      amount: coinsToAward,
      rewardType: 'partner_bonus',
      source: 'adbazaar_qr_scan',
      description: `AdBazaar QR scan — campaign ${event.campaignId}`,
      operationType: 'loyalty_credit',
      referenceId: event.eventId,
      referenceModel: 'AdBazaarScan',
      coinType: 'branded',
      metadata: {
        campaignId: event.campaignId,
        advertiserId: event.advertiserId,
        adFormat: event.adFormat,
        qrCode: event.qrCode,
        deviceId: event.deviceId,
        partner: 'adbazaar',
      },
    });

    // ── Step 5: Mark scan as credited to prevent future duplicates ───────────
    await AdBazaarScan.findOneAndUpdate(
      { scanEventId: event.eventId },
      { $set: { coinsCredited: true, coinsAmount: coinsToAward, creditedAt: new Date() } },
    );

    logger.info('[AdBazaar] Coins credited for QR scan', {
      eventId: event.eventId,
      userId: event.userId,
      coinsAwarded: rewardResult.amount,
    });

    return {
      success: true,
      userId: event.userId,
      coinsAwarded: rewardResult.amount,
      reason: 'QR scan credited',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[AdBazaar] Error processing QR scan event', {
      eventId: event.eventId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      userId: 'unknown',
      coinsAwarded: 0,
      reason: 'Processing error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create REZ visit/purchase event for AdBazaar
 */
export interface RezAttributionEvent {
  eventType: 'visit' | 'purchase';
  userId: string;
  campaignId?: string; // From AdBazaar campaign
  advertiserId?: string; // AdBazaar advertiser ID
  merchantId: string; // REZ merchant
  amount?: number; // Transaction amount
  timestamp: string;
  metadata: {
    source: 'adbazaar_qr' | 'organic' | 'other';
    deviceId?: string;
    sessionId?: string;
  };
}

/**
 * Send attribution event to AdBazaar webhook
 */
export async function sendAttributionEvent(
  event: RezAttributionEvent,
  adBazaarWebhookUrl: string,
  webhookSecret: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[AdBazaar] Sending attribution event', {
      eventType: event.eventType,
      userId: event.userId,
      campaignId: event.campaignId,
    });

    const payload = JSON.stringify(event);
    const signature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    const response = await fetch(adBazaarWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': new Date().toISOString(),
      },
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`AdBazaar webhook failed: ${response.statusText}`);
    }

    logger.info('[AdBazaar] Attribution event sent successfully', {
      eventType: event.eventType,
      status: response.status,
    });

    return { success: true };
  } catch (error) {
    logger.error('[AdBazaar] Error sending attribution event', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Webhook handler for AdBazaar QR scan events
 */
export async function handleAdBazaarWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const secret = process.env.ADBAZAAR_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('[AdBazaar] ADBAZAAR_WEBHOOK_SECRET not configured — rejecting webhook');
      res.status(500).json({ success: false, error: 'Server configuration error' });
      return;
    }
    if (!verifyAdBazaarSignature(payload, signature, secret)) {
      logger.warn('[AdBazaar] Invalid webhook signature', {
        path: req.path,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
      return;
    }

    const event = req.body as AdBazaarQrScanEvent;

    // Validate event type
    if (event.eventType !== 'qr_scan') {
      logger.warn('[AdBazaar] Unsupported event type', {
        eventType: event.eventType,
      });

      res.status(400).json({
        success: false,
        error: 'Unsupported event type',
      });
      return;
    }

    // Process the event
    const result = await processQrScanEvent(event);

    if (result.success) {
      logger.info('[AdBazaar] QR scan processed successfully', {
        eventId: event.eventId,
        coinsAwarded: result.coinsAwarded,
      });
    }

    res.status(200).json({
      success: result.success,
      message: result.reason,
      coinsAwarded: result.coinsAwarded,
      timestamp: result.timestamp,
    });
  } catch (error) {
    logger.error('[AdBazaar] Error handling webhook', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
}

/**
 * Track user journey across AdBazaar → REZ
 */
export interface UserJourney {
  userId: string;
  startedAt: string; // When QR was scanned
  visitedAt?: string; // When user visited merchant
  purchaseAmount?: number; // Purchase amount if made
  purchasedAt?: string; // When purchase made
  campaignId: string;
  advertiserId: string;
  conversionRate: number; // (visits / scans) or (purchases / visits)
}

/**
 * Store user journey for attribution analytics.
 *
 * Uses the AdBazaarScan model as the single source of truth for funnel state.
 * A scan record is created by processQrScanEvent — this function updates it
 * when the user progresses to visit or purchase stage.
 *
 * Funnel stages:
 *   scanned   — scan record exists, visitAttributed=false
 *   visited   — visitAttributed=true, purchaseAttributed=false
 *   purchased — visitAttributed=true, purchaseAttributed=true, revenueAttributed set
 */
export async function recordUserJourney(journey: UserJourney): Promise<void> {
  try {
    const stage = journey.purchasedAt ? 'purchased' : journey.visitedAt ? 'visited' : 'scanned';

    logger.info('[AdBazaar] Recording user journey', {
      userId: journey.userId,
      campaignId: journey.campaignId,
      stage,
    });

    if (stage === 'scanned') {
      // The scan record is already created by processQrScanEvent — nothing more to do
      return;
    }

    // Find the most-recent unattributed scan for this user + campaign
    // AdBazaarScan doesn't store campaignId directly, so we match by userId
    // and pick the most recent scan that hasn't progressed beyond this stage yet.
    const updateFields: Record<string, unknown> = {};

    if (stage === 'visited') {
      updateFields.visitAttributed = true;
      updateFields.visitAttributedAt = new Date(journey.visitedAt!);
    } else if (stage === 'purchased') {
      updateFields.visitAttributed = true;
      updateFields.visitAttributedAt = journey.visitedAt ? new Date(journey.visitedAt) : new Date();
      updateFields.purchaseAttributed = true;
      updateFields.purchaseAttributedAt = new Date(journey.purchasedAt!);
      if (journey.purchaseAmount != null && journey.purchaseAmount > 0) {
        updateFields.revenueAttributed = journey.purchaseAmount;
      }
    }

    // Update the most recent scan record for this user that is not yet fully attributed
    const filter: Record<string, unknown> = { rezUserId: journey.userId };
    if (stage === 'visited') filter.visitAttributed = false;
    if (stage === 'purchased') filter.purchaseAttributed = false;

    const updated = await AdBazaarScan.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { sort: { scannedAt: -1 }, new: true },
    );

    if (!updated) {
      logger.warn('[AdBazaar] recordUserJourney: no unattributed scan found for user', {
        userId: journey.userId,
        stage,
        campaignId: journey.campaignId,
      });
      return;
    }

    logger.info('[AdBazaar] User journey recorded', {
      scanId: updated._id,
      userId: journey.userId,
      campaignId: journey.campaignId,
      stage,
      revenueAttributed: (updated as any).revenueAttributed,
    });
  } catch (error) {
    logger.error('[AdBazaar] Error recording user journey', {
      userId: journey.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default {
  verifyAdBazaarSignature,
  processQrScanEvent,
  sendAttributionEvent,
  handleAdBazaarWebhook,
  recordUserJourney,
};
