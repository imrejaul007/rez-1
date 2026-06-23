/**
 * SafeDeploy Webhook Payload Validation Middleware
 * Validates webhook payloads against expected contracts
 *
 * Used for:
 * - Razorpay payment webhooks
 * - External service webhooks
 * - Integration webhooks
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import redisService from '../services/redisService';

/**
 * Razorpay webhook payload structure (v2024)
 */
interface RazorpayPayment {
  entity: 'payment';
  id: string;
  amount: number; // in paise
  status: 'captured' | 'failed' | 'authorized' | 'created';
  method: string;
  description?: string;
  order_id?: string;
  customer_id?: string;
  created_at: number; // unix timestamp
}

interface RazorpayRefund {
  entity: 'refund';
  id: string;
  amount: number; // in paise
  status: 'processed' | 'failed' | 'pending' | 'created';
  payment_id: string;
  created_at: number; // unix timestamp
}

interface RazorpayOrder {
  entity: 'order';
  id: string;
  amount: number; // in paise
  status: string;
  created_at: number; // unix timestamp
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: RazorpayPayment;
    };
    refund?: {
      entity: RazorpayRefund;
    };
    order?: {
      entity: RazorpayOrder;
    };
  };
}

const KNOWN_PAYMENT_EVENTS = new Set(['payment.captured', 'payment.failed', 'payment.authorized']);

const KNOWN_REFUND_EVENTS = new Set(['refund.created', 'refund.processed', 'refund.failed']);

const KNOWN_ORDER_EVENTS = new Set(['order.paid']);

/**
 * Validate the common outer envelope (event string + payload object).
 */
function validateEnvelope(payload: any, errors: string[]): void {
  if (!payload.event || typeof payload.event !== 'string') {
    errors.push('Missing or invalid event type');
  }
  if (!payload.payload || typeof payload.payload !== 'object') {
    errors.push('Missing payload field');
  }
}

/**
 * Validate a payment entity present inside payload.payment.entity.
 */
function validatePaymentEntity(payment: any, errors: string[]): void {
  if (!payment.id || typeof payment.id !== 'string') {
    errors.push('Missing or invalid payment.id');
  }
  if (typeof payment.amount !== 'number' || payment.amount < 0) {
    errors.push('Invalid payment amount (must be number >= 0)');
  }
  if (!payment.status || typeof payment.status !== 'string') {
    errors.push('Missing or invalid payment status');
  }
  const validStatuses = ['captured', 'failed', 'authorized', 'created'];
  if (payment.status && !validStatuses.includes(payment.status)) {
    errors.push(`Invalid payment status: ${payment.status}`);
  }
  if (typeof payment.created_at !== 'number') {
    errors.push('Invalid payment created_at timestamp');
  }
}

/**
 * Validate a refund entity present inside payload.refund.entity.
 */
function validateRefundEntity(refund: any, errors: string[]): void {
  if (!refund.id || typeof refund.id !== 'string') {
    errors.push('Missing or invalid refund.id');
  }
  if (typeof refund.amount !== 'number' || refund.amount < 0) {
    errors.push('Invalid refund amount (must be number >= 0)');
  }
  if (!refund.payment_id || typeof refund.payment_id !== 'string') {
    errors.push('Missing or invalid refund.payment_id');
  }
  if (!refund.status || typeof refund.status !== 'string') {
    errors.push('Missing or invalid refund status');
  }
  const validStatuses = ['processed', 'failed', 'pending', 'created'];
  if (refund.status && !validStatuses.includes(refund.status)) {
    errors.push(`Invalid refund status: ${refund.status}`);
  }
  if (typeof refund.created_at !== 'number') {
    errors.push('Invalid refund created_at timestamp');
  }
}

/**
 * Validate an order entity present inside payload.order.entity.
 */
function validateOrderEntity(order: any, errors: string[]): void {
  if (!order.id || typeof order.id !== 'string') {
    errors.push('Missing or invalid order.id');
  }
  if (typeof order.amount !== 'number' || order.amount < 0) {
    errors.push('Invalid order amount (must be number >= 0)');
  }
  if (!order.status || typeof order.status !== 'string') {
    errors.push('Missing or invalid order status');
  }
  if (typeof order.created_at !== 'number') {
    errors.push('Invalid order created_at timestamp');
  }
}

/**
 * Validate Razorpay webhook payload structure.
 * Validation is performed per-event-type so each event's specific entity
 * requirements are checked rather than forcing every event through the
 * payment-entity schema.
 */
function validateRazorpayPayload(payload: any): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  validateEnvelope(payload, errors);

  // Stop early if the envelope itself is malformed — entity checks below
  // would produce confusing cascading errors.
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const event: string = payload.event;

  if (KNOWN_PAYMENT_EVENTS.has(event)) {
    if (!payload.payload?.payment?.entity) {
      errors.push('Missing payment entity in payload');
    } else {
      validatePaymentEntity(payload.payload.payment.entity, errors);
    }
  } else if (KNOWN_REFUND_EVENTS.has(event)) {
    if (!payload.payload?.refund?.entity) {
      errors.push('Missing refund entity in payload');
    } else {
      validateRefundEntity(payload.payload.refund.entity, errors);
    }
  } else if (KNOWN_ORDER_EVENTS.has(event)) {
    if (!payload.payload?.order?.entity) {
      errors.push('Missing order entity in payload');
    } else {
      validateOrderEntity(payload.payload.order.entity, errors);
    }
  } else {
    // Unknown / future event — log but do not reject (forward compatibility).
    logger.warn(`[WEBHOOK VALIDATION] Unknown event type: ${event}. Will acknowledge without processing.`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Middleware: Validate webhook payload
 * Rejects malformed webhooks before processing
 */
export function validateWebhookPayload(req: Request, res: Response, next: NextFunction): void | Response {
  try {
    const payload = req.body;

    // Determine webhook type from URL or header
    const isRazorpay = req.path.includes('/razorpay') || req.path.includes('/webhook');

    if (isRazorpay) {
      const validation = validateRazorpayPayload(payload);

      if (!validation.valid) {
        logger.warn('[WEBHOOK VALIDATION] Razorpay webhook validation failed', {
          path: req.path,
          errors: validation.errors,
          received: Object.keys(payload),
        });

        return res.status(400).json({
          success: false,
          error: 'INVALID_WEBHOOK_PAYLOAD',
          message: 'Webhook payload does not match expected contract',
          details: validation.errors,
        });
      }

      // Resolve the entity ID from whichever entity type is present.
      const entityId =
        payload.payload?.payment?.entity?.id ||
        payload.payload?.refund?.entity?.id ||
        payload.payload?.order?.entity?.id;

      logger.debug('[WEBHOOK VALIDATION] Razorpay webhook passed validation', {
        event: payload.event,
        entityId,
      });
    }

    next();
  } catch (error) {
    logger.error('[WEBHOOK VALIDATION] Unexpected error', error);
    return res.status(500).json({
      success: false,
      error: 'WEBHOOK_VALIDATION_ERROR',
      message: 'Failed to validate webhook payload',
    });
  }
}

/**
 * Middleware: Log webhook details (for debugging)
 */
export function logWebhookDetails(req: Request, _res: Response, next: NextFunction): void {
  logger.info('[WEBHOOK] Incoming webhook', {
    path: req.path,
    method: req.method,
    headers: {
      signature: req.headers['x-razorpay-signature'] ? 'present' : 'missing',
      contentType: req.headers['content-type'],
    },
    event: req.body?.event,
    timestamp: new Date().toISOString(),
  });

  next();
}

/**
 * Middleware: Rate limit webhook processing (Redis-backed, distributed)
 * Prevents webhook spam/replay attacks across multiple pods
 * CONCURRENCY FIX: Using Redis INCR instead of in-memory Map ensures
 * distributed consistency in multi-pod deployments.
 */
const WEBHOOK_WINDOW_SECONDS = 60; // 1 minute window
const WEBHOOK_MAX_DUPLICATES = 3; // Max duplicate events per minute window

export async function rateLimitWebhooks(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  const event = req.body?.event;

  // Prefer the gateway-assigned event ID from the request header (set by
  // Razorpay's delivery infrastructure), then fall back to the entity-specific
  // ID that is present for the given event type.  Using paymentId alone breaks
  // for refund.* and order.* events where no payment entity is present.
  const gatewayEventId = req.headers['x-razorpay-event-id'] as string | undefined;
  const entityId =
    gatewayEventId ||
    req.body?.payload?.payment?.entity?.id ||
    req.body?.payload?.refund?.entity?.id ||
    req.body?.payload?.order?.entity?.id;

  if (!event || !entityId) {
    // Can't build a meaningful rate-limit key — allow through.
    // The WebhookLog unique index provides secondary deduplication.
    return next();
  }

  const key = `webhook:rate-limit:${event}:${entityId}`;

  if (key.includes('undefined')) {
    // Defensive guard — should not happen given the checks above.
    return next();
  }

  try {
    // Use Redis INCR with TTL for atomic, distributed rate limiting
    // INCR returns the new count; if key doesn't exist, it's created as 0 then incremented to 1
    const count = await redisService.atomicIncr(key, WEBHOOK_WINDOW_SECONDS);

    // If Redis is unavailable (atomicIncr returns null), allow request through
    // The WebhookLog unique index will catch actual duplicates
    if (count === null) {
      logger.warn('[WEBHOOK RATE LIMIT] Redis unavailable — falling back to signature-based dedup');
      return next();
    }

    if (count > WEBHOOK_MAX_DUPLICATES) {
      logger.warn('[WEBHOOK RATE LIMIT] Too many duplicate webhook events', {
        key,
        count,
      });

      return res.status(429).json({
        success: false,
        error: 'WEBHOOK_RATE_LIMITED',
        message: 'Too many duplicate webhook events',
      });
    }

    next();
  } catch (error) {
    // If Redis fails, allow the request through
    // WebhookLog idempotency index provides secondary deduplication
    logger.warn('[WEBHOOK RATE LIMIT] Rate limit check failed, allowing request:', error);
    next();
  }
}

/**
 * No longer needed — Redis TTL handles automatic cleanup of rate limit keys.
 * Each key in Redis automatically expires after WEBHOOK_WINDOW_SECONDS.
 */
export function initWebhookCacheCleanup(): void {
  // DEPRECATED: Redis TTL handles cleanup automatically
  logger.info('[WEBHOOK CACHE] Cleanup deprecated (Redis TTL manages expiry)');
}

/**
 * No longer needed — Redis handles cleanup automatically on shutdown.
 */
export function shutdownWebhookCacheCleanup(): void {
  // DEPRECATED: No cleanup needed
  logger.info('[WEBHOOK CACHE] Shutdown cleanup deprecated (Redis TTL manages expiry)');
}

export default {
  validateWebhookPayload,
  logWebhookDetails,
  rateLimitWebhooks,
  initWebhookCacheCleanup,
  shutdownWebhookCacheCleanup,
};
