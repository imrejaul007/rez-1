/**
 * Order Progress Utilities
 *
 * Shared constants and helper functions for order status progress calculation.
 * Mirrors the backend's orderStateMachine.ts for consistent progress display.
 */

// Ordered statuses for linear progress calculation
export const STATUS_ORDER = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'dispatched',
  'out_for_delivery',
  'delivered',
] as const;

export type LinearOrderStatus = (typeof STATUS_ORDER)[number];

/**
 * Get the index of a status in the linear order (0-based).
 * Returns -1 for terminal branches (cancelled/returned/refunded).
 */
export function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status as LinearOrderStatus);
}

/**
 * Calculate order progress as a percentage (0-100).
 * Uses the status index in the linear order.
 */
export function getOrderProgress(status: string): number {
  if (status === 'delivered') return 100;
  if (status === 'cancelled' || status === 'refunded') return 0;
  if (status === 'returned') return 100;

  const index = getStatusIndex(status);
  if (index < 0) return 0;

  const maxIndex = STATUS_ORDER.length - 1; // 6 (delivered)
  return Math.round((index / maxIndex) * 100);
}

/**
 * Format an ETA value into a human-readable string.
 * Handles Date objects, ISO strings, minute numbers, and "Delivered"/"Cancelled" strings.
 */
export function formatETA(eta: string | Date | number | null | undefined): string {
  if (!eta) return 'Calculating...';

  // If it's a number, treat as minutes remaining
  if (typeof eta === 'number') {
    if (eta <= 0) return 'Any moment now';
    if (eta < 60) return `~${Math.round(eta)} min`;
    const hours = Math.floor(eta / 60);
    const mins = Math.round(eta % 60);
    return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
  }

  // If it's a string like "Delivered" or "Cancelled", return as-is
  if (typeof eta === 'string' && !Date.parse(eta)) {
    return eta;
  }

  // Parse as Date
  const etaDate = typeof eta === 'string' ? new Date(eta) : eta;
  if (isNaN(etaDate.getTime())) return 'Calculating...';

  const now = new Date();
  const diffMs = etaDate.getTime() - now.getTime();

  // If in the past, it's arrived
  if (diffMs <= 0) return 'Any moment now';

  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `~${diffMins} min`;

  // Show as time ("By 3:45 PM")
  return `By ${etaDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
}

/**
 * Get a human-readable label for a status.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    placed: 'Order Placed',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    dispatched: 'Dispatched',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    returned: 'Returned',
    refunded: 'Refunded',
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}
