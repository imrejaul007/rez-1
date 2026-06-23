import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Wallet-specific Prometheus metrics.
 * These extend the base metrics in config/prometheus.ts.
 */

// Transaction counters by operation type and status
export const walletTransactionTotal = new Counter({
  name: 'wallet_transaction_total',
  help: 'Total wallet transactions',
  labelNames: ['operation', 'coinType', 'status'],
});

// Transaction duration histogram
export const walletTransactionDuration = new Histogram({
  name: 'wallet_transaction_duration_seconds',
  help: 'Wallet transaction duration in seconds',
  labelNames: ['operation'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// Balance drift counter (reconciliation mismatches)
export const walletBalanceDriftTotal = new Counter({
  name: 'wallet_balance_drift_total',
  help: 'Number of detected balance drifts during reconciliation',
  labelNames: ['severity'],
});

// Active Redis locks gauge
export const walletActiveLocks = new Gauge({
  name: 'wallet_active_locks',
  help: 'Number of currently held wallet Redis locks',
});

// Velocity check blocks
export const walletVelocityBlockedTotal = new Counter({
  name: 'wallet_velocity_blocked_total',
  help: 'Number of requests blocked by velocity checks',
  labelNames: ['operation', 'limitType'],
});

// Transfer amount distribution
export const walletTransferAmount = new Histogram({
  name: 'wallet_transfer_amount',
  help: 'Transfer amount distribution',
  labelNames: ['coinType'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
});

// Gift amount distribution
export const walletGiftAmount = new Histogram({
  name: 'wallet_gift_amount',
  help: 'Gift amount distribution',
  labelNames: ['coinType'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
});

// Ledger entry counter
export const walletLedgerEntriesTotal = new Counter({
  name: 'wallet_ledger_entries_total',
  help: 'Total ledger entries created',
  labelNames: ['operationType', 'direction'],
});

// Cache hit/miss for wallet balance cache
export const walletCacheOps = new Counter({
  name: 'wallet_cache_operations_total',
  help: 'Wallet cache operations',
  labelNames: ['operation', 'result'],
});

// --- Gift-specific metrics ---

// Gift send counter (tracks successes and failures by theme)
export const giftSendTotal = new Counter({
  name: 'gift_send_total',
  help: 'Total gift send operations',
  labelNames: ['status', 'theme'],
});

// Gift claim counter
export const giftClaimTotal = new Counter({
  name: 'gift_claim_total',
  help: 'Total gift claim operations',
  labelNames: ['status'],
});

// Gift send duration histogram
export const giftSendDuration = new Histogram({
  name: 'gift_send_duration_seconds',
  help: 'Gift send operation duration in seconds',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// Gift scheduled queue size gauge (set by delivery job)
export const giftScheduledQueueSize = new Gauge({
  name: 'gift_scheduled_queue_size',
  help: 'Number of scheduled gifts pending delivery',
});

// --- Partner earnings metrics ---

// Partner earnings accrued counter (tracks new partner earnings by type)
export const partnerEarningsAccruedTotal = new Counter({
  name: 'partner_earnings_accrued_total',
  help: 'Total partner earnings accrued',
  labelNames: ['earningType', 'partnerLevel'],
});

// Partner earnings settled counter
export const partnerEarningsSettledTotal = new Counter({
  name: 'partner_earnings_settled_total',
  help: 'Total partner earnings settled (made available)',
  labelNames: ['partnerLevel'],
});

// Partner pending liability gauge
export const partnerPendingLiability = new Gauge({
  name: 'partner_pending_liability',
  help: 'Current total pending partner earnings liability',
});

// Partner redemption usage counter
export const partnerRedemptionTotal = new Counter({
  name: 'partner_redemption_total',
  help: 'Total partner earnings redemptions',
  labelNames: ['status'],
});

// Partner settlement failure counter
export const partnerSettlementFailures = new Counter({
  name: 'partner_settlement_failures_total',
  help: 'Total partner settlement failures',
  labelNames: ['reason'],
});

/**
 * Helper to time a wallet operation and record metrics.
 */
export async function timeWalletOperation<T>(
  operation: string,
  coinType: string,
  fn: () => Promise<T>
): Promise<T> {
  const end = walletTransactionDuration.startTimer({ operation });
  try {
    const result = await fn();
    walletTransactionTotal.inc({ operation, coinType, status: 'success' });
    return result;
  } catch (error) {
    walletTransactionTotal.inc({ operation, coinType, status: 'failure' });
    throw error;
  } finally {
    end();
  }
}
