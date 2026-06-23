/**
 * src/middleware/eventLogger.ts
 * Business Event Logging Middleware for InsightPulse monitoring
 *
 * Tracks critical business events (bookings, payments, coins, trials, etc.)
 * and persists them to Redis with daily counters and rolling windows.
 */

import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

export interface BusinessEvent {
  event: string;
  userId?: string;
  merchantId?: string;
  storeId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// In-memory buffer to batch Redis writes
// OMAR: memory leak risk — cap EVENT_BUFFER to prevent unbounded growth during high event rates
const EVENT_BUFFER: BusinessEvent[] = [];
const MAX_EVENT_BUFFER_SIZE = 5000; // Max 5000 events in-memory, roughly 50MB worst-case
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Flush buffered events to Redis
 * Called periodically to persist events
 */
async function flushEvents() {
  if (EVENT_BUFFER.length === 0) return;

  const events = EVENT_BUFFER.splice(0, EVENT_BUFFER.length);
  const today = new Date().toISOString().split('T')[0];
  const redisClient = redisService.getClient();

  try {
    for (const event of events) {
      try {
        // Increment daily counter for this event type
        await redisClient?.hIncrBy(`events:daily:${today}`, event.event, 1);

        // Keep a rolling 7-day window per event
        // ioredis v5: zAdd(key, { score, value }) for a single member, or zAdd(key, score, value) which is also valid
        await redisClient?.zAdd(
          `events:rolling:${event.event}`,
          { score: Date.now(), value: JSON.stringify(event) }
        );
        await redisService.expire(`events:rolling:${event.event}`, 7 * 24 * 60 * 60);
      } catch (err) {
        logger.error('[EventLogger] Failed to persist event', {
          event: event.event,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    logger.error('[EventLogger] Batch flush failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Track a business event
 * Events are buffered and flushed to Redis every 2 seconds
 */
export function trackEvent(event: string, data: Partial<BusinessEvent> = {}) {
  EVENT_BUFFER.push({
    event,
    ...data,
    timestamp: new Date().toISOString(),
  });

  // OMAR: memory leak risk — drain buffer immediately if it reaches cap to prevent unbounded growth
  if (EVENT_BUFFER.length >= MAX_EVENT_BUFFER_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushEvents().catch((err) => {
      logger.error('[EventLogger] Emergency flush failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return;
  }

  // Schedule flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents().catch((err) => {
        logger.error('[EventLogger] Async flush failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, 2000);
  }
}

/**
 * Force flush buffered events immediately
 * Useful for graceful shutdown
 */
export async function flushEventsImmediate() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushEvents();
}

/**
 * Key business events to track across the platform
 * These are the critical metrics for business observability
 */
export const EVENTS = {
  // User lifecycle
  USER_SIGNUP: 'user.signup',
  USER_LOGIN: 'user.login',

  // Store discovery
  STORE_VIEW: 'store.view',

  // Trial/Booking lifecycle
  BOOKING_CREATED: 'booking.created',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_CANCELLED: 'booking.cancelled',
  TRIAL_BOOKED: 'trial.booked',
  TRIAL_COMPLETED: 'trial.completed',

  // Order lifecycle
  ORDER_PLACED: 'order.placed',
  ORDER_DELIVERED: 'order.delivered',

  // Payment events
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILURE: 'payment.failure',

  // Coin economy
  COINS_EARNED: 'coins.earned',
  COINS_REDEEMED: 'coins.redeemed',
  COINS_EXPIRED: 'coins.expired',

  // Referral program
  REFERRAL_APPLIED: 'referral.applied',
  REFERRAL_REWARDED: 'referral.rewarded',

  // BBPS (bill payment) events
  BBPS_INITIATED: 'bbps.initiated',
  BBPS_COMPLETED: 'bbps.completed',
  BBPS_FAILED: 'bbps.failed',

  // Campaign/Promotional events
  CAMPAIGN_COIN_ISSUED: 'campaign.coin_issued',

  // User engagement
  REVIEW_SUBMITTED: 'review.submitted',
  QR_SCANNED: 'qr.scanned',

  // Risk/Compliance
  FRAUD_FLAGGED: 'fraud.flagged',

  // Merchant onboarding
  MERCHANT_ONBOARDED: 'merchant.onboarded',
} as const;

/**
 * Express middleware to track request-level events
 * Optional: use to automatically track HTTP events if needed
 */
export function eventLoggerMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  // Middleware is mostly a placeholder; events are tracked explicitly
  // via trackEvent() calls in controllers and services
  next();
}

export default {
  trackEvent,
  flushEventsImmediate,
  EVENTS,
};
