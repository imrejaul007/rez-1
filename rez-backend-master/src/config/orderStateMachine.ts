/**
 * Order State Machine Configuration
 *
 * Centralized status transitions, validation, and progress calculation
 * for the order lifecycle. Used by admin routes, orderController, and webhookController.
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

// All valid order statuses (including terminal branches)
export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type LinearOrderStatus = (typeof STATUS_ORDER)[number];

// Terminal statuses (no further transitions except refund)
export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'returned', 'refunded'];

// Active statuses (order is in progress)
export const ACTIVE_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery'];

// Past statuses (order is complete in some way)
export const PAST_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'returned', 'refunded'];

/**
 * Valid status transitions map.
 * Key = current status, Value = array of allowed next statuses.
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['out_for_delivery', 'delivered', 'returned'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: ['returned', 'refunded'],
  cancelled: ['refunded'],
  returned: ['refunded'],
  refunded: [],
};

/**
 * Merchant-allowed transitions (subset of STATUS_TRANSITIONS).
 * Merchants can only move orders forward through preparation/dispatch.
 */
export const MERCHANT_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['preparing'],
  preparing: ['ready'],
  ready: ['dispatched'],
  dispatched: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

/**
 * SLA thresholds per status (in minutes).
 * Orders exceeding these thresholds are considered "stuck".
 */
export const SLA_THRESHOLDS: Record<string, number> = {
  placed: 60,        // 1 hour to confirm
  confirmed: 30,     // 30 min to start preparing
  preparing: 120,    // 2 hours to finish preparing
  ready: 30,         // 30 min to dispatch
  dispatched: 180,   // 3 hours to deliver
  out_for_delivery: 120, // 2 hours to deliver after out_for_delivery
};

/**
 * Check if a transition from one status to another is valid.
 */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Check if a merchant-initiated transition is valid.
 */
export function isValidMerchantTransition(from: string, to: string): boolean {
  const allowed = MERCHANT_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Get the list of valid next statuses from the current status.
 */
export function getNextStatuses(current: string): string[] {
  return STATUS_TRANSITIONS[current] || [];
}

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
 * Terminal statuses: delivered=100, cancelled/refunded=0, returned=100.
 */
export function getOrderProgress(status: string): number {
  if (status === 'delivered') return 100;
  if (status === 'cancelled' || status === 'refunded') return 0;
  if (status === 'returned') return 100;

  const index = getStatusIndex(status);
  if (index < 0) return 0;

  // Progress is the ratio of the current index to the last linear index
  const maxIndex = STATUS_ORDER.length - 1; // 6 (delivered)
  return Math.round((index / maxIndex) * 100);
}

/**
 * Map order status to delivery status.
 */
export const DELIVERY_STATUS_MAP: Record<string, string> = {
  confirmed: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
  dispatched: 'dispatched',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'failed',
  returned: 'returned',
};
