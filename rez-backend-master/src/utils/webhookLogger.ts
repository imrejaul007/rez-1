import { WebhookLog } from '../models/WebhookLog';
import { logger } from '../config/logger';

/**
 * Webhook Logger Utility
 * Provides structured logging for webhook events
 */

export interface WebhookEventDetails {
  provider: 'razorpay' | 'stripe';
  eventId: string;
  eventType: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: string;
}

/**
 * Log webhook event receipt
 */
export function logWebhookReceived(details: WebhookEventDetails): void {
  const logData = {
    provider: details.provider.toUpperCase(),
    eventId: details.eventId,
    eventType: details.eventType,
    orderId: details.orderId,
    paymentId: details.paymentId,
    timestamp: new Date().toISOString()
  };

  logger.info(`[${details.provider.toUpperCase()} WEBHOOK] Event received`, logData);

  logger.info(`🔔 [${details.provider.toUpperCase()} WEBHOOK] Event received:`, {
    eventType: details.eventType,
    eventId: details.eventId,
    orderId: details.orderId || 'N/A',
    timestamp: new Date().toISOString()
  });
}

/**
 * Log successful webhook processing
 */
export function logWebhookSuccess(details: WebhookEventDetails): void {
  const logData = {
    provider: details.provider.toUpperCase(),
    eventId: details.eventId,
    eventType: details.eventType,
    orderId: details.orderId,
    status: 'success',
    timestamp: new Date().toISOString()
  };

  logger.info(`[${details.provider.toUpperCase()} WEBHOOK] Event processed successfully`, logData);

  logger.info(`✅ [${details.provider.toUpperCase()} WEBHOOK] Event processed successfully:`, {
    eventType: details.eventType,
    eventId: details.eventId,
    orderId: details.orderId || 'N/A'
  });
}

/**
 * Log webhook processing failure
 */
export function logWebhookError(details: WebhookEventDetails): void {
  const logData = {
    provider: details.provider.toUpperCase(),
    eventId: details.eventId,
    eventType: details.eventType,
    orderId: details.orderId,
    error: details.error,
    status: 'failed',
    timestamp: new Date().toISOString()
  };

  logger.error(`[${details.provider.toUpperCase()} WEBHOOK] Event processing failed`, logData);

  logger.error(`❌ [${details.provider.toUpperCase()} WEBHOOK] Event processing failed:`, {
    eventType: details.eventType,
    eventId: details.eventId,
    orderId: details.orderId || 'N/A',
    error: details.error
  });
}

/**
 * Log duplicate webhook event
 */
export function logWebhookDuplicate(details: WebhookEventDetails): void {
  const logData = {
    provider: details.provider.toUpperCase(),
    eventId: details.eventId,
    eventType: details.eventType,
    status: 'duplicate',
    timestamp: new Date().toISOString()
  };

  logger.warn(`[${details.provider.toUpperCase()} WEBHOOK] Duplicate event detected`, logData);

  logger.info(`⚠️ [${details.provider.toUpperCase()} WEBHOOK] Duplicate event detected:`, {
    eventType: details.eventType,
    eventId: details.eventId
  });
}

/**
 * Log signature verification failure
 */
export function logWebhookSignatureFailure(provider: 'razorpay' | 'stripe', eventType?: string): void {
  const logData = {
    provider: provider.toUpperCase(),
    eventType: eventType || 'unknown',
    error: 'Invalid webhook signature',
    status: 'signature_failed',
    timestamp: new Date().toISOString()
  };

  logger.error(`[${provider.toUpperCase()} WEBHOOK] Signature verification failed`, logData);

  logger.error(`❌ [${provider.toUpperCase()} WEBHOOK] Signature verification failed for event:`, eventType || 'unknown');
}

/**
 * Log payment state change
 */
export function logPaymentStateChange(
  provider: 'razorpay' | 'stripe',
  orderId: string,
  oldState: string,
  newState: string,
  paymentId?: string
): void {
  const logData = {
    provider: provider.toUpperCase(),
    orderId,
    oldState,
    newState,
    paymentId,
    timestamp: new Date().toISOString()
  };

  logger.info(`[${provider.toUpperCase()} WEBHOOK] Payment state changed`, logData);

  logger.info(`🔄 [${provider.toUpperCase()} WEBHOOK] Payment state changed:`, {
    orderId,
    oldState,
    newState,
    paymentId: paymentId || 'N/A'
  });
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(
  provider?: 'razorpay' | 'stripe',
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const query: any = {};

  if (provider) {
    query.provider = provider;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const [total, processed, failed, duplicates] = await Promise.all([
    WebhookLog.countDocuments(query),
    WebhookLog.countDocuments({ ...query, status: 'success' }),
    WebhookLog.countDocuments({ ...query, status: 'failed' }),
    WebhookLog.countDocuments({ ...query, status: 'duplicate' })
  ]);

  const successRate = total > 0 ? ((processed / total) * 100).toFixed(2) : '0.00';

  return {
    total,
    processed,
    failed,
    duplicates,
    pending: total - processed - failed - duplicates,
    successRate: `${successRate}%`,
    provider: provider || 'all',
    dateRange: {
      start: startDate?.toISOString() || 'all time',
      end: endDate?.toISOString() || 'present'
    }
  };
}

/**
 * Get recent webhook events
 */
export async function getRecentWebhookEvents(
  provider?: 'razorpay' | 'stripe',
  limit: number = 20
): Promise<any[]> {
  const query: any = {};

  if (provider) {
    query.provider = provider;
  }

  return await WebhookLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('provider eventType status metadata createdAt errorMessage')
    .lean();
}

/**
 * Cleanup old webhook logs (called by cron job)
 */
export async function cleanupOldWebhookLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await WebhookLog.deleteMany({
    createdAt: { $lt: cutoffDate }
  });

  logger.info(`[WEBHOOK CLEANUP] Deleted ${result.deletedCount} old webhook logs`, {
    daysToKeep,
    cutoffDate: cutoffDate.toISOString(),
    deletedCount: result.deletedCount
  });

  return result.deletedCount || 0;
}

/**
 * Retry failed webhook events (manual retry utility)
 */
export async function getFailedWebhooksForRetry(
  maxRetries: number = 3,
  limit: number = 50
): Promise<any[]> {
  return await WebhookLog.find({
    status: 'failed',
    retryCount: { $lt: maxRetries }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export default {
  logWebhookReceived,
  logWebhookSuccess,
  logWebhookError,
  logWebhookDuplicate,
  logWebhookSignatureFailure,
  logPaymentStateChange,
  getWebhookStats,
  getRecentWebhookEvents,
  cleanupOldWebhookLogs,
  getFailedWebhooksForRetry
};
