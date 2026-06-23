/**
 * Order Metrics
 *
 * Prometheus-compatible counters and histograms for order lifecycle monitoring.
 * Falls back to in-memory tracking if Prometheus client is not available.
 */

// In-memory metrics storage (fallback when prom-client is not installed)
const metricsStore = {
  statusTransitions: new Map<string, number>(),
  statusDurations: new Map<string, number[]>(),
  slaBreaches: new Map<string, number>(),
  paymentMismatches: 0,
  activeOrders: new Map<string, number>(),
};

/**
 * Record a status transition.
 */
export function recordStatusTransition(fromStatus: string, toStatus: string): void {
  const key = `${fromStatus}_to_${toStatus}`;
  const current = metricsStore.statusTransitions.get(key) || 0;
  metricsStore.statusTransitions.set(key, current + 1);
}

/**
 * Record time spent in a status (in seconds).
 */
export function recordStatusDuration(status: string, durationSeconds: number): void {
  const current = metricsStore.statusDurations.get(status) || [];
  current.push(durationSeconds);
  // Keep only last 1000 entries to prevent memory bloat
  if (current.length > 1000) current.shift();
  metricsStore.statusDurations.set(status, current);
}

/**
 * Record an SLA breach.
 */
export function recordSLABreach(status: string, thresholdMinutes: number): void {
  const key = `${status}_${thresholdMinutes}`;
  const current = metricsStore.slaBreaches.get(key) || 0;
  metricsStore.slaBreaches.set(key, current + 1);
}

/**
 * Record a payment amount mismatch.
 */
export function recordPaymentMismatch(): void {
  metricsStore.paymentMismatches += 1;
}

/**
 * Update active order count by status.
 */
export function updateActiveOrderGauge(status: string, count: number): void {
  metricsStore.activeOrders.set(status, count);
}

/**
 * Get all metrics as a plain object (for /metrics endpoint or admin dashboard).
 */
export function getOrderMetrics(): {
  statusTransitions: Record<string, number>;
  statusDurations: Record<string, { avg: number; count: number; min: number; max: number }>;
  slaBreaches: Record<string, number>;
  paymentMismatches: number;
  activeOrders: Record<string, number>;
} {
  const statusTransitions: Record<string, number> = {};
  metricsStore.statusTransitions.forEach((v, k) => { statusTransitions[k] = v; });

  const statusDurations: Record<string, { avg: number; count: number; min: number; max: number }> = {};
  metricsStore.statusDurations.forEach((values, key) => {
    if (values.length > 0) {
      statusDurations[key] = {
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        count: values.length,
        min: Math.round(Math.min(...values)),
        max: Math.round(Math.max(...values)),
      };
    }
  });

  const slaBreaches: Record<string, number> = {};
  metricsStore.slaBreaches.forEach((v, k) => { slaBreaches[k] = v; });

  const activeOrders: Record<string, number> = {};
  metricsStore.activeOrders.forEach((v, k) => { activeOrders[k] = v; });

  return {
    statusTransitions,
    statusDurations,
    slaBreaches,
    paymentMismatches: metricsStore.paymentMismatches,
    activeOrders,
  };
}

/**
 * Reset all metrics (for testing).
 */
export function resetOrderMetrics(): void {
  metricsStore.statusTransitions.clear();
  metricsStore.statusDurations.clear();
  metricsStore.slaBreaches.clear();
  metricsStore.paymentMismatches = 0;
  metricsStore.activeOrders.clear();
}
