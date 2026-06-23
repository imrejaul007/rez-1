/**
 * Order Alert Rules
 *
 * Monitors order metrics and triggers alerts via socket + structured logs.
 */

import orderSocketService from '../services/orderSocketService';
import { Order } from '../models/Order';
import { ACTIVE_STATUSES, SLA_THRESHOLDS } from '../config/orderStateMachine';
import { logger } from '../config/logger';

interface AlertRule {
  name: string;
  check: () => Promise<boolean>;
  message: string;
  severity: 'warning' | 'critical';
}

/**
 * Run all alert rule checks and emit alerts for triggered rules.
 */
export async function runOrderAlertChecks(): Promise<void> {
  const now = new Date();

  const rules: AlertRule[] = [
    {
      name: 'too_many_stuck_orders',
      severity: 'critical',
      message: 'More than 10 orders are stuck beyond SLA thresholds',
      check: async () => {
        let stuckCount = 0;
        for (const [status, thresholdMin] of Object.entries(SLA_THRESHOLDS)) {
          const cutoff = new Date(now.getTime() - thresholdMin * 60 * 1000);
          const count = await Order.countDocuments({ status, updatedAt: { $lt: cutoff } });
          stuckCount += count;
        }
        return stuckCount > 10;
      },
    },
    {
      name: 'high_cancellation_rate',
      severity: 'warning',
      message: 'Cancellation rate exceeds 20% in the last hour',
      check: async () => {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const [total, cancelled] = await Promise.all([
          Order.countDocuments({ createdAt: { $gte: oneHourAgo } }),
          Order.countDocuments({ status: 'cancelled', cancelledAt: { $gte: oneHourAgo } }),
        ]);
        if (total < 5) return false; // Minimum sample size
        return (cancelled / total) > 0.2;
      },
    },
    {
      name: 'sla_breach_rate_high',
      severity: 'critical',
      message: 'SLA breach rate exceeds 20% in the last 24 hours',
      check: async () => {
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        let breachCount = 0;
        for (const [status, thresholdMin] of Object.entries(SLA_THRESHOLDS)) {
          const cutoff = new Date(now.getTime() - thresholdMin * 60 * 1000);
          const count = await Order.countDocuments({
            status,
            updatedAt: { $lt: cutoff, $gte: twentyFourHoursAgo },
          });
          breachCount += count;
        }
        const totalActive = await Order.countDocuments({
          status: { $in: ACTIVE_STATUSES },
          createdAt: { $gte: twentyFourHoursAgo },
        });
        if (totalActive < 10) return false;
        return (breachCount / totalActive) > 0.2;
      },
    },
  ];

  for (const rule of rules) {
    try {
      const triggered = await rule.check();
      if (triggered) {
        // Emit to admin via socket
        orderSocketService.emitToAdmin('ORDER_ALERT', {
          name: rule.name,
          severity: rule.severity,
          message: rule.message,
          timestamp: now,
        });

        // Structured log for external alerting systems
        logger.warn(`[ORDER ALERT] ${rule.severity.toUpperCase()}: ${rule.name} - ${rule.message}`);
      }
    } catch (err) {
      logger.error(`[ORDER ALERT] Failed to check rule ${rule.name}:`, err);
    }
  }
}
