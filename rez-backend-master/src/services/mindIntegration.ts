/**
 * Mind Integration Service
 *
 * Sends events to ReZ Mind for:
 * - Event attendance tracking
 * - Consumer intent capture
 * - Product verification events
 */

import { logger } from '../config/logger';

const REZ_MIND_URL = process.env.REZ_MIND_URL || 'http://localhost:4008';
const INTENT_CAPTURE_URL = process.env.INTENT_CAPTURE_URL || 'https://rez-intent-graph.onrender.com';

export interface MindEvent {
  event: string;
  userId: string;
  source: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface SocialImpactEvent {
  userId: string;
  eventId: string;
  eventName: string;
  eventType: string;
  sponsorId?: string;
  karmaEarned?: number;
  coinsEarned?: number;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
}

export interface BillUploadEvent {
  userId: string;
  billId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  cashbackEarned?: number;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
}

/**
 * Send event to ReZ Mind (event platform webhook)
 */
export async function sendEventToMind(event: MindEvent): Promise<boolean> {
  try {
    const response = await fetch(`${REZ_MIND_URL}/webhook/consumer/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
      },
      body: JSON.stringify({
        ...event,
        timestamp: event.timestamp || new Date(),
        source: `rez-backend:${event.source}`,
      }),
    });

    if (!response.ok) {
      logger.warn('[MindService] Failed to send event to Mind', {
        status: response.status,
        event: event.event,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[MindService] Error sending to Mind', { error, event: event.event });
    return false;
  }
}

/**
 * Capture intent to Intent Graph
 */
export async function captureIntent(intent: {
  userId: string;
  appType: string;
  event: string;
  intentKey: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const response = await fetch(`${INTENT_CAPTURE_URL}/api/intent/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(intent),
    });

    if (!response.ok) {
      logger.warn('[MindService] Failed to capture intent', {
        status: response.status,
        intentKey: intent.intentKey,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[MindService] Error capturing intent', { error });
    return false;
  }
}

/**
 * Send Social Impact event completion to Mind
 */
export async function sendSocialImpactEventToMind(data: SocialImpactEvent): Promise<void> {
  try {
    // Send to event platform
    await sendEventToMind({
      event: 'social_impact_completed',
      userId: data.userId,
      source: 'social-impact',
      metadata: {
        eventId: data.eventId,
        eventName: data.eventName,
        eventType: data.eventType,
        sponsorId: data.sponsorId,
        karmaEarned: data.karmaEarned,
        coinsEarned: data.coinsEarned,
        location: data.location,
      },
    });

    // Capture intent for personalization
    await captureIntent({
      userId: data.userId,
      appType: 'social-impact',
      event: 'event_completed',
      intentKey: `social_impact_${data.eventId}`,
      metadata: {
        eventId: data.eventId,
        eventType: data.eventType,
        karmaEarned: data.karmaEarned,
      },
    });
  } catch (error) {
    // Fire-and-forget, don't fail the main flow
    logger.error('[MindService] Error sending social impact event', { error });
  }
}

/**
 * Send Bill Upload event to Mind
 */
export async function sendBillUploadEventToMind(data: BillUploadEvent): Promise<void> {
  try {
    // Send to event platform
    await sendEventToMind({
      event: 'bill_uploaded',
      userId: data.userId,
      source: 'bill-upload',
      metadata: {
        billId: data.billId,
        merchantId: data.merchantId,
        merchantName: data.merchantName,
        amount: data.amount,
        cashbackEarned: data.cashbackEarned,
        location: data.location,
      },
    });

    // Capture intent
    await captureIntent({
      userId: data.userId,
      appType: 'bill-upload',
      event: 'bill_verified',
      intentKey: `bill_${data.merchantId}`,
      metadata: {
        merchantId: data.merchantId,
        amount: data.amount,
        cashbackEarned: data.cashbackEarned,
      },
    });
  } catch (error) {
    logger.error('[MindService] Error sending bill upload event', { error });
  }
}

/**
 * Send Ad Campaign engagement to Mind
 */
export async function sendAdEngagementToMind(data: {
  userId: string;
  campaignId: string;
  adId?: string;
  merchantId?: string;
  action: 'scanned' | 'viewed' | 'clicked' | 'converted';
  location?: { lat: number; lng: number; city?: string };
}): Promise<void> {
  try {
    await sendEventToMind({
      event: `ad_${data.action}`,
      userId: data.userId,
      source: 'ads-qr',
      metadata: {
        campaignId: data.campaignId,
        adId: data.adId,
        merchantId: data.merchantId,
        location: data.location,
      },
    });

    await captureIntent({
      userId: data.userId,
      appType: 'ads',
      event: `ad_${data.action}`,
      intentKey: `ad_${data.campaignId}`,
      metadata: {
        campaignId: data.campaignId,
        action: data.action,
      },
    });
  } catch (error) {
    logger.error('[MindService] Error sending ad engagement', { error });
  }
}
