import { logger } from '../config/logger';
// Audit Alert Service
// Sends notifications for critical audit events

import { IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
import EmailService from './EmailService';
import { Merchant } from '../models/Merchant';

export interface AlertRule {
  name: string;
  condition: (log: IAuditLog) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notification: {
    email: boolean;
    sms: boolean;
  };
}

export class AuditAlertService {
  // Alert rules configuration
  private static rules: AlertRule[] = [
    {
      name: 'Failed Login Attempts',
      condition: (log) => log.action === 'auth.failed_login',
      severity: 'high',
      notification: { email: true, sms: false }
    },
    {
      name: 'Bulk Product Deletion',
      condition: (log) =>
        log.action === 'product.bulk_deleted' &&
        (log.details?.metadata?.count || 0) > 10,
      severity: 'critical',
      notification: { email: true, sms: true }
    },
    {
      name: 'Bank Details Changed',
      condition: (log) => log.action === 'settings.bank_details_updated',
      severity: 'critical',
      notification: { email: true, sms: false }
    },
    {
      name: 'User Removed',
      condition: (log) => log.action === 'team.user_removed',
      severity: 'medium',
      notification: { email: true, sms: false }
    },
    {
      name: 'Security Event',
      condition: (log) => log.action.startsWith('security.'),
      severity: 'high',
      notification: { email: true, sms: false }
    },
    {
      name: 'Suspicious Login',
      condition: (log) => log.action === 'security.suspicious_login',
      severity: 'critical',
      notification: { email: true, sms: true }
    },
    {
      name: 'API Key Created/Deleted',
      condition: (log) =>
        log.action === 'security.api_key_created' ||
        log.action === 'security.api_key_deleted',
      severity: 'high',
      notification: { email: true, sms: false }
    },
    {
      name: 'Order Cancellation',
      condition: (log) =>
        log.action === 'order.status_changed' &&
        log.details?.metadata?.newStatus === 'cancelled',
      severity: 'medium',
      notification: { email: false, sms: false }
    },
    {
      name: 'Store Deactivated',
      condition: (log) =>
        log.action === 'store.status_changed' &&
        log.details?.after?.isActive === false,
      severity: 'high',
      notification: { email: true, sms: false }
    }
  ];

  /**
   * Check if audit log should trigger an alert
   */
  static async checkAndAlert(log: IAuditLog): Promise<void> {
    try {
      // Find matching rules
      const matchingRules = this.rules.filter(rule => rule.condition(log));

      if (matchingRules.length === 0) {
        return;
      }

      // Get merchant info
      const merchant = await Merchant.findById(log.merchantId).lean();
      if (!merchant) {
        logger.error('❌ [ALERT] Merchant not found:', log.merchantId);
        return;
      }

      // Send alerts for each matching rule
      for (const rule of matchingRules) {
        await this.sendAlert(merchant, log, rule);
      }
    } catch (error) {
      logger.error('❌ [ALERT] Failed to check/send alert:', error);
    }
  }

  /**
   * Send alert notification
   */
  private static async sendAlert(
    merchant: any,
    log: IAuditLog,
    rule: AlertRule
  ): Promise<void> {
    try {
      logger.info(`🚨 [ALERT] Triggering: ${rule.name} (${rule.severity})`);

      // Send email notification
      if (rule.notification.email) {
        await this.sendEmailAlert(merchant, log, rule);
      }

      // Send SMS notification
      if (rule.notification.sms) {
        await this.sendSMSAlert(merchant, log, rule);
      }
    } catch (error) {
      logger.error('❌ [ALERT] Failed to send alert:', error);
    }
  }

  /**
   * Send email alert
   */
  private static async sendEmailAlert(
    merchant: any,
    log: IAuditLog,
    rule: AlertRule
  ): Promise<void> {
    try {
      const subject = `🚨 Security Alert: ${rule.name}`;
      const body = this.formatEmailBody(merchant, log, rule);

      await EmailService.send({
        to: merchant.email,
        subject,
        html: body
      });

      logger.info('✅ [ALERT] Email sent to:', merchant.email);
    } catch (error) {
      logger.error('❌ [ALERT] Failed to send email:', error);
    }
  }

  /**
   * Send SMS alert
   */
  private static async sendSMSAlert(
    merchant: any,
    log: IAuditLog,
    rule: AlertRule
  ): Promise<void> {
    try {
      const message = this.formatSMSBody(merchant, log, rule);

      // TODO: Integrate with SMS service (Twilio, SNS, etc.)
      logger.info('📱 [ALERT] SMS would be sent to: ***' + (merchant.phone ? merchant.phone.slice(-4) : 'N/A'));
      logger.info('📱 [ALERT] Message:', message);
    } catch (error) {
      logger.error('❌ [ALERT] Failed to send SMS:', error);
    }
  }

  /**
   * Format email body
   */
  private static formatEmailBody(
    merchant: any,
    log: IAuditLog,
    rule: AlertRule
  ): string {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const user = (log.merchantUserId as any)?.name || 'System';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; border-radius: 5px; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
          .detail { margin: 10px 0; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
          .footer { margin-top: 20px; padding: 20px; background-color: #f0f0f0; border-radius: 5px; }
          .severity { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
          .severity-critical { background-color: #f44336; color: white; }
          .severity-high { background-color: #ff9800; color: white; }
          .severity-medium { background-color: #ffc107; color: black; }
          .severity-low { background-color: #4caf50; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 Security Alert</h2>
            <p>${rule.name}</p>
          </div>

          <div class="content">
            <div class="detail">
              <span class="label">Severity:</span>
              <span class="severity severity-${rule.severity}">${rule.severity.toUpperCase()}</span>
            </div>

            <div class="detail">
              <span class="label">Merchant:</span>
              <span class="value">${merchant.businessName}</span>
            </div>

            <div class="detail">
              <span class="label">Action:</span>
              <span class="value">${log.action}</span>
            </div>

            <div class="detail">
              <span class="label">Resource:</span>
              <span class="value">${log.resourceType}${log.resourceId ? ` #${log.resourceId}` : ''}</span>
            </div>

            <div class="detail">
              <span class="label">Performed by:</span>
              <span class="value">${user}</span>
            </div>

            <div class="detail">
              <span class="label">Time:</span>
              <span class="value">${timestamp}</span>
            </div>

            <div class="detail">
              <span class="label">IP Address:</span>
              <span class="value">${log.ipAddress}</span>
            </div>

            ${log.details?.changes ? `
              <div class="detail">
                <span class="label">Changes:</span>
                <pre>${JSON.stringify(log.details.changes, null, 2)}</pre>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p><strong>What should you do?</strong></p>
            <ul>
              <li>Review the activity in your merchant dashboard</li>
              <li>Verify this action was authorized</li>
              <li>Contact support if you notice any suspicious activity</li>
            </ul>

            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This is an automated security notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Format SMS body
   */
  private static formatSMSBody(
    merchant: any,
    log: IAuditLog,
    rule: AlertRule
  ): string {
    return `ALERT: ${rule.name} detected for ${merchant.businessName}. ` +
           `Action: ${log.action} at ${new Date(log.timestamp).toLocaleString()}. ` +
           `Check your dashboard for details.`;
  }

  /**
   * Get failed login count for merchant
   */
  static async getFailedLoginCount(
    merchantId: string | Types.ObjectId,
    since: Date = new Date(Date.now() - 3600000) // Last hour
  ): Promise<number> {
    const AuditLog = (await import('../models/AuditLog')).default;

    return await AuditLog.countDocuments({
      merchantId,
      action: 'auth.failed_login',
      timestamp: { $gte: since }
    });
  }

  /**
   * Check for suspicious activity patterns
   */
  static async checkSuspiciousActivity(
    merchantId: string | Types.ObjectId
  ): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);
    const AuditLog = (await import('../models/AuditLog')).default;

    // Check for multiple failed logins
    const failedLogins = await AuditLog.countDocuments({
      merchantId,
      action: 'auth.failed_login',
      timestamp: { $gte: lastHour }
    });

    if (failedLogins >= 3) {
      reasons.push(`${failedLogins} failed login attempts in the last hour`);
    }

    // Check for bulk deletions
    const bulkDeletions = await AuditLog.countDocuments({
      merchantId,
      action: { $regex: /bulk.*delete/i },
      timestamp: { $gte: lastHour }
    });

    if (bulkDeletions > 0) {
      reasons.push(`Bulk deletion operations detected`);
    }

    // Check for unusual IP addresses
    const recentIPs = await AuditLog.distinct('ipAddress', {
      merchantId,
      timestamp: { $gte: lastHour }
    });

    if (recentIPs.length > 5) {
      reasons.push(`Multiple IP addresses (${recentIPs.length}) used in last hour`);
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Add custom alert rule
   */
  static addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove alert rule
   */
  static removeRule(name: string): void {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  /**
   * Get all alert rules
   */
  static getRules(): AlertRule[] {
    return [...this.rules];
  }
}

export default AuditAlertService;
