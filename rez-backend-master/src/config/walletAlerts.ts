/**
 * Wallet alert rule definitions.
 * These are consumed by the monitoring/alerting infrastructure.
 * Rules define thresholds for wallet-specific anomalies.
 */

export interface WalletAlertRule {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  condition: string;
  threshold: number;
  windowMinutes: number;
  notifyChannels: string[];
}

export const WALLET_ALERT_RULES: WalletAlertRule[] = [
  {
    name: 'balance_drift_critical',
    description: 'Balance drift detected during reconciliation exceeding 1 NC',
    severity: 'critical',
    metric: 'wallet_balance_drift_total',
    condition: 'increase > threshold',
    threshold: 0,
    windowMinutes: 5,
    notifyChannels: ['admin_slack', 'admin_email'],
  },
  {
    name: 'transaction_failure_rate_high',
    description: 'Transaction failure rate exceeds 5% in 5 minutes',
    severity: 'warning',
    metric: 'wallet_transaction_total{status="failure"}',
    condition: 'rate / total_rate > threshold',
    threshold: 0.05,
    windowMinutes: 5,
    notifyChannels: ['admin_slack'],
  },
  {
    name: 'high_value_transfer',
    description: 'Single transfer exceeds configurable threshold',
    severity: 'info',
    metric: 'wallet_transfer_amount',
    condition: 'value > threshold',
    threshold: 10000,
    windowMinutes: 1,
    notifyChannels: ['admin_slack'],
  },
  {
    name: 'velocity_abuse_suspected',
    description: 'Same user velocity-blocked more than 10 times in 1 hour',
    severity: 'warning',
    metric: 'wallet_velocity_blocked_total',
    condition: 'increase > threshold per user',
    threshold: 10,
    windowMinutes: 60,
    notifyChannels: ['admin_slack', 'security_team'],
  },
  {
    name: 'reconciliation_job_failure',
    description: 'Nightly reconciliation job failed to complete',
    severity: 'critical',
    metric: 'reconciliation_job_status',
    condition: 'last_success_age > threshold',
    threshold: 25 * 60, // 25 hours in minutes
    windowMinutes: 30,
    notifyChannels: ['admin_slack', 'admin_email', 'oncall_pager'],
  },
  {
    name: 'stuck_transactions_detected',
    description: 'Multiple stuck transactions detected (initiated but not completed)',
    severity: 'warning',
    metric: 'wallet_stuck_transactions',
    condition: 'count > threshold',
    threshold: 5,
    windowMinutes: 15,
    notifyChannels: ['admin_slack'],
  },
];

/**
 * Get alert rules by severity
 */
export function getAlertRulesBySeverity(severity: WalletAlertRule['severity']): WalletAlertRule[] {
  return WALLET_ALERT_RULES.filter(rule => rule.severity === severity);
}
