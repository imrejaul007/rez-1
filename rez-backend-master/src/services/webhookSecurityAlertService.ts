import { logger } from '../config/logger';
/**
 * Webhook Security Alert Service
 * Sends alerts for security violations and anomalies
 */

export type AlertType =
  | 'WEBHOOK_IP_VIOLATION'
  | 'WEBHOOK_SIGNATURE_FAILURE'
  | 'WEBHOOK_DUPLICATE_EVENT'
  | 'WEBHOOK_INVALID_PAYLOAD'
  | 'WEBHOOK_RATE_LIMIT'
  | 'WEBHOOK_PROCESSING_FAILURE'
  | 'WEBHOOK_REPLAY_ATTACK'
  | 'WEBHOOK_TIMEOUT';

export interface WebhookSecurityAlert {
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip?: string;
  eventId?: string;
  reason: string;
  details?: Record<string, any>;
  timestamp: Date;
  resolved?: boolean;
}

/**
 * In-memory storage for recent alerts (would be replaced with persistent storage)
 */
const recentAlerts: WebhookSecurityAlert[] = [];
const ALERT_HISTORY_LIMIT = 1000;

/**
 * Send an alert for a security violation
 */
export const sendSecurityAlert = async (
  alert: Omit<WebhookSecurityAlert, 'timestamp'>
): Promise<void> => {
  const fullAlert: WebhookSecurityAlert = {
    ...alert,
    timestamp: new Date(),
  };

  // Store alert in memory
  recentAlerts.push(fullAlert);

  // Keep only recent alerts
  if (recentAlerts.length > ALERT_HISTORY_LIMIT) {
    recentAlerts.shift();
  }

  // Log based on severity
  const logMessage = `[WEBHOOK-ALERT-${alert.severity.toUpperCase()}] ${alert.type}: ${alert.reason}`;

  switch (alert.severity) {
    case 'critical':
      logger.error(logMessage, {
        ...fullAlert,
      });
      // TODO: Integrate with error tracking (Sentry) and admin notifications (email/SMS)
      break;

    case 'high':
      logger.warn(logMessage, {
        ...fullAlert,
      });
      // TODO: Integrate with error tracking service (Sentry)
      break;

    case 'medium':
      logger.warn(logMessage, {
        ...fullAlert,
      });
      break;

    case 'low':
      logger.info(logMessage, {
        ...fullAlert,
      });
      break;
  }
};

/**
 * Get all recent alerts
 */
export const getRecentAlerts = (
  limit: number = 100,
  type?: AlertType
): WebhookSecurityAlert[] => {
  let alerts = [...recentAlerts].reverse();

  if (type) {
    alerts = alerts.filter(alert => alert.type === type);
  }

  return alerts.slice(0, limit);
};

/**
 * Get alerts by severity
 */
export const getAlertsBySeverity = (
  severity: 'low' | 'medium' | 'high' | 'critical'
): WebhookSecurityAlert[] => {
  return recentAlerts.filter(alert => alert.severity === severity);
};

/**
 * Get alert statistics
 */
export const getAlertStats = () => {
  const stats = {
    total: recentAlerts.length,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    byType: {} as Record<AlertType, number>,
    last24Hours: 0,
  };

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  recentAlerts.forEach(alert => {
    stats.bySeverity[alert.severity]++;

    if (!stats.byType[alert.type]) {
      stats.byType[alert.type] = 0;
    }
    stats.byType[alert.type]++;

    if (alert.timestamp > twentyFourHoursAgo) {
      stats.last24Hours++;
    }
  });

  return stats;
};

/**
 * Check if there's a suspicious pattern (multiple violations from same IP)
 */
export const checkSuspiciousPattern = (ip: string, timeWindowMinutes: number = 5): number => {
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  const suspiciousAlerts = recentAlerts.filter(
    alert =>
      alert.ip === ip &&
      alert.timestamp > timeWindow &&
      alert.severity >= 'medium'
  );

  return suspiciousAlerts.length;
};

/**
 * Alert helper functions
 */

export const alertIPViolation = (ip: string, reason: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_IP_VIOLATION',
    severity: 'high',
    ip,
    reason: `IP whitelisting violation: ${reason}`,
  });
};

export const alertSignatureFailure = (eventId: string, reason: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_SIGNATURE_FAILURE',
    severity: 'critical',
    eventId,
    reason: `Webhook signature verification failed: ${reason}`,
  });
};

export const alertDuplicateEvent = (eventId: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_DUPLICATE_EVENT',
    severity: 'medium',
    eventId,
    reason: `Duplicate webhook event detected: ${eventId}`,
  });
};

export const alertInvalidPayload = (eventId: string | undefined, reason: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_INVALID_PAYLOAD',
    severity: 'high',
    eventId,
    reason: `Invalid webhook payload: ${reason}`,
  });
};

export const alertRateLimit = (ip: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_RATE_LIMIT',
    severity: 'medium',
    ip,
    reason: `Webhook rate limit exceeded from IP: ${ip}`,
  });
};

export const alertProcessingFailure = (eventId: string, error: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_PROCESSING_FAILURE',
    severity: 'high',
    eventId,
    reason: `Webhook processing failed: ${error}`,
  });
};

export const alertReplayAttack = (eventId: string, reason: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_REPLAY_ATTACK',
    severity: 'critical',
    eventId,
    reason: `Replay attack detected: ${reason}`,
  });
};

export const alertTimeout = (eventId: string) => {
  return sendSecurityAlert({
    type: 'WEBHOOK_TIMEOUT',
    severity: 'high',
    eventId,
    reason: `Webhook processing timeout: ${eventId}`,
  });
};

/**
 * Clear old alerts (can be called periodically)
 */
export const clearOldAlerts = (hoursOld: number = 72) => {
  const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  const initialLength = recentAlerts.length;

  while (recentAlerts.length > 0 && recentAlerts[0].timestamp < cutoffTime) {
    recentAlerts.shift();
  }

  logger.info(
    `[ALERT-SERVICE] Cleared ${initialLength - recentAlerts.length} old alerts`
  );
};

export default {
  sendSecurityAlert,
  getRecentAlerts,
  getAlertsBySeverity,
  getAlertStats,
  checkSuspiciousPattern,
  alertIPViolation,
  alertSignatureFailure,
  alertDuplicateEvent,
  alertInvalidPayload,
  alertRateLimit,
  alertProcessingFailure,
  alertReplayAttack,
  alertTimeout,
  clearOldAlerts,
};
