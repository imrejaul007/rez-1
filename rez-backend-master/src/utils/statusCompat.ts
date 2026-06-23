/**
 * Legacy status compatibility mapper.
 *
 * During migration, some clients or older data may carry status values that
 * predate the canonical Phase 3 state machine. This module normalises them to
 * the canonical values before any FSM validation runs.
 *
 * Add mappings here as legacy values are discovered — never remove them until
 * you are certain no DB document or client can produce the old value.
 */

const ORDER_STATUS_MAP: Record<string, string> = {
  in_transit: 'out_for_delivery', // old name → canonical
  refund_initiated: 'partially_refunded',
  shipping: 'dispatched',
  packed: 'preparing',
  accepted: 'confirmed',
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  success: 'paid',
  captured: 'paid',
  pending_capture: 'authorized',
  completed: 'paid',
  initiated: 'awaiting_payment',
};

export function normalizeOrderStatus(status: string): string {
  return ORDER_STATUS_MAP[status] ?? status;
}

export function normalizePaymentStatus(status: string): string {
  return PAYMENT_STATUS_MAP[status] ?? status;
}

export default { normalizeOrderStatus, normalizePaymentStatus };
