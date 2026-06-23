// @ts-nocheck
import { logger } from './logger';

/**
 * Global Financial State Machine (FSM) — v2 shim.
 *
 * This module used to own every transition graph in the platform. As of
 * `@rez/shared@2.0.0`, the Payment-entity and Order.payment FSMs
 * are canonical in that package. This file is a compatibility layer:
 *
 *   - `PAYMENT_TRANSITIONS`      → re-exports PAYMENT_STATE_TRANSITIONS (canonical)
 *   - `ORDER_PAYMENT_TRANSITIONS`→ re-exports ORDER_PAYMENT_STATE_TRANSITIONS (canonical)
 *   - REFUND / SETTLEMENT / GIFT_CARD / LOAN / TRANSACTION — still local
 *     (not yet modeled in canonical; migrate when needed)
 *
 * Behavior change vs v1 (covered in MIGRATION.md Appendix B):
 *   - Canonical PAYMENT_STATE_TRANSITIONS adds a transition row for
 *     `partially_refunded` (→ refund_initiated), which the v1 backend
 *     was missing even though its Mongoose enum accepted the value.
 *     Any refund flow that previously tried to transition out of
 *     `partially_refunded` would throw in the pre-save hook. With this
 *     shim, it works correctly.
 *
 * All existing call sites keep their imports unchanged — every legacy
 * export below stays wire-compatible.
 *
 * Usage:
 *   import { assertValidTransition, transitionPaymentStatus } from '../config/financialStateMachine';
 *   await transitionPaymentStatus(paymentId, 'completed', 'razorpay_webhook', 'system');
 */

import {
  PAYMENT_STATE_TRANSITIONS,
  ORDER_PAYMENT_STATE_TRANSITIONS,
  assertValidPaymentTransition,
  assertValidOrderPaymentTransition,
  isValidPaymentTransition,
  isValidOrderPaymentTransition,
  getValidNextPaymentStates,
  getValidNextOrderPaymentStates,
} from '../@rez/shared-types';

// ── Payment Lifecycle — delegated to canonical @rez/shared ──────────────
//
// PAYMENT_STATE_TRANSITIONS exports string-keyed readonly arrays, so we
// can cast to the legacy Record<string, string[]> shape that existing
// callers expect. Terminal states still map to [].
export const PAYMENT_TRANSITIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(PAYMENT_STATE_TRANSITIONS).map(([k, v]) => [k, [...v]]),
);

// ── Order Payment Sub-document Lifecycle — delegated to canonical ─────────────
//
// Order.payment.status — distinct from Payment.status. Canonical graph
// is field-for-field identical to what lived here before.
export const ORDER_PAYMENT_TRANSITIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ORDER_PAYMENT_STATE_TRANSITIONS).map(([k, v]) => [k, [...v]]),
);

// ── Refund Lifecycle — still local (not canonical yet) ────────────────────────
export const REFUND_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: [], // terminal
  failed: ['pending'], // can retry
  cancelled: [], // terminal
};

// ── Settlement Lifecycle — still local ────────────────────────────────────────
export const SETTLEMENT_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'on_hold'],
  processing: ['completed', 'failed'],
  completed: [], // terminal
  failed: ['pending'], // retry
  on_hold: ['pending', 'cancelled'], // fraud hold → release or cancel
  cancelled: [], // terminal
};

// ── Gift Card Lifecycle — still local ─────────────────────────────────────────
export const GIFT_CARD_TRANSITIONS: Record<string, string[]> = {
  active: ['used', 'expired', 'cancelled'],
  used: [], // terminal
  expired: [], // terminal
  cancelled: ['active'], // admin can reinstate
};

// ── Merchant Loan Lifecycle — still local ─────────────────────────────────────
export const LOAN_TRANSITIONS: Record<string, string[]> = {
  offered: ['accepted', 'declined'],
  accepted: ['disbursed'],
  declined: [], // terminal
  disbursed: ['repaying'],
  repaying: ['closed', 'defaulted'],
  closed: [], // terminal
  defaulted: ['closed'], // after recovery action
};

// ── Transaction Lifecycle — still local ───────────────────────────────────────
export const TRANSACTION_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: ['reversed'],
  failed: ['pending'],
  cancelled: [],
  reversed: [],
};

// ── Entity type map ───────────────────────────────────────────────────────────
type FinancialEntityType = 'payment' | 'refund' | 'settlement' | 'gift_card' | 'loan' | 'transaction';

const TRANSITION_MAP: Record<FinancialEntityType, Record<string, string[]>> = {
  payment: PAYMENT_TRANSITIONS,
  refund: REFUND_TRANSITIONS,
  settlement: SETTLEMENT_TRANSITIONS,
  gift_card: GIFT_CARD_TRANSITIONS,
  loan: LOAN_TRANSITIONS,
  transaction: TRANSACTION_TRANSITIONS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Core guard function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforce a valid FSM transition. Throws if invalid.
 *
 * @throws Error if transition is invalid (fail-closed)
 */
export function assertValidTransition(entityType: FinancialEntityType, from: string, to: string): void {
  // Delegate payment transitions to the canonical helper so the error
  // message format and rules stay consistent with every other service.
  if (entityType === 'payment') {
    try {
      assertValidPaymentTransition(from as never, to as never);
      return;
    } catch (err) {
      // Re-throw with the legacy "[FSM]" prefix so existing log filters keep working.
      throw new Error(`[FSM] ${(err as Error).message}`);
    }
  }

  const map = TRANSITION_MAP[entityType];

  if (!map) {
    throw new Error(`[FSM] Unknown entity type: ${entityType}`);
  }

  if (!map[from]) {
    throw new Error(`[FSM] Unknown ${entityType} state: "${from}"`);
  }

  if (!map[from].includes(to)) {
    throw new Error(
      `[FSM] Invalid ${entityType} transition: ${from} → ${to}. ` +
        `Allowed from "${from}": ${map[from].join(', ') || 'none (terminal state)'}`,
    );
  }
}

/**
 * Check if a transition is valid without throwing.
 * Use for conditional logic (e.g., UI "can refund?" check).
 */
export function isValidTransition(entityType: FinancialEntityType, from: string, to: string): boolean {
  // Payment delegates to canonical for consistency.
  if (entityType === 'payment') {
    return isValidPaymentTransition(from as never, to as never);
  }
  try {
    assertValidTransition(entityType, from, to);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all valid next states from a current state.
 * Use for UI state machine buttons (e.g., "Show refund button only if payment.completed").
 */
export function getValidNextStates(entityType: FinancialEntityType, from: string): string[] {
  if (entityType === 'payment') {
    return [...getValidNextPaymentStates(from as never)];
  }
  const map = TRANSITION_MAP[entityType];
  if (!map || !map[from]) return [];
  return [...map[from]];
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition helpers with audit trail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transition a Payment status with FSM validation + audit trail.
 *
 * Usage in razorpayController.ts:
 *   await transitionPaymentStatus(paymentId, 'completed', 'razorpay_webhook', 'system');
 */
export async function transitionPaymentStatus(
  paymentId: string,
  newStatus: string,
  reason: string,
  actorId: string,
): Promise<void> {
  // Import here to avoid circular deps at module load time
  const { default: Payment } = await import('../models/Payment');
  const { TransactionAuditLog } = await import('../models/TransactionAuditLog');

  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error(`[FSM] Payment ${paymentId} not found`);

  assertValidTransition('payment', (payment as any).status, newStatus);

  // FIX 4: Cap failed→pending retries at 3 to prevent infinite retry loops.
  if ((payment as any).status === 'failed' && newStatus === 'pending') {
    const retryCount = (payment as any).metadata?.retryCount || 0;
    if (retryCount >= 3) {
      throw new Error(
        `[FSM] Payment ${paymentId} has exceeded maximum retry attempts (3). ` +
          `Current retryCount: ${retryCount}. Manual intervention required.`,
      );
    }
    await Payment.findByIdAndUpdate(paymentId, {
      $set: { 'metadata.retryCount': retryCount + 1 },
    });
    logger.info(`[FSM] Payment ${paymentId} retry ${retryCount + 1}/3: failed → pending`);
  }

  await Payment.findByIdAndUpdate(paymentId, {
    status: newStatus,
    [`statusHistory.${newStatus}`]: new Date(),
  });

  await TransactionAuditLog.create({
    entityType: 'payment',
    entityId: paymentId,
    operation: `status_transition_${newStatus}`,
    actorId,
    metadata: {
      from: (payment as any).status,
      to: newStatus,
      reason,
      actorId,
    },
    createdAt: new Date(),
  });

  logger.info(`[FSM] Payment ${paymentId}: ${(payment as any).status} → ${newStatus} (${reason})`);
}

/**
 * Transition a Refund status with FSM validation + audit trail.
 */
export async function transitionRefundStatus(
  refundId: string,
  newStatus: string,
  reason: string,
  actorId: string,
): Promise<void> {
  const { Refund } = await import('../models/Refund');
  const { TransactionAuditLog } = await import('../models/TransactionAuditLog');

  const refund = await Refund.findById(refundId);
  if (!refund) throw new Error(`[FSM] Refund ${refundId} not found`);

  assertValidTransition('refund', (refund as any).status, newStatus);

  await Refund.findByIdAndUpdate(refundId, {
    status: newStatus,
    updatedAt: new Date(),
  });

  await TransactionAuditLog.create({
    entityType: 'refund',
    entityId: refundId,
    operation: `status_transition_${newStatus}`,
    actorId,
    metadata: { from: (refund as any).status, to: newStatus, reason, actorId },
    createdAt: new Date(),
  });

  logger.info(`[FSM] Refund ${refundId}: ${(refund as any).status} → ${newStatus} (${reason})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Order payment sub-document transition helpers (delegates to canonical)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an order payment sub-document status transition without throwing.
 * Returns true if allowed, false (and logs a warning) if not.
 *
 * Use this for Order.payment.status transitions (IOrderPayment.status), NOT for
 * the standalone Payment model (use assertValidTransition('payment', ...) for that).
 */
export function validatePaymentTransition(from: string, to: string): boolean {
  const valid = isValidOrderPaymentTransition(from as never, to as never);
  if (!valid) {
    const allowed = ORDER_PAYMENT_TRANSITIONS[from];
    if (!allowed) {
      logger.warn(`[FSM] validatePaymentTransition: unknown source status "${from}". Cannot transition to "${to}".`);
    } else {
      logger.warn(
        `[FSM] validatePaymentTransition: invalid order-payment transition "${from}" → "${to}". ` +
          `Allowed from "${from}": [${allowed.join(', ') || 'none — terminal state'}]`,
      );
    }
  }
  return valid;
}

/**
 * Assert that an order payment sub-document status transition is valid, throwing on failure.
 */
export function assertPaymentTransition(from: string, to: string): void {
  try {
    assertValidOrderPaymentTransition(from as never, to as never);
  } catch (err) {
    // Rewrap with legacy "[FSM]" prefix.
    throw new Error(`[FSM] ${(err as Error).message}`);
  }
}

export default {
  assertValidTransition,
  isValidTransition,
  getValidNextStates,
  transitionPaymentStatus,
  transitionRefundStatus,
  validatePaymentTransition,
  assertPaymentTransition,
  PAYMENT_TRANSITIONS,
  ORDER_PAYMENT_TRANSITIONS,
  REFUND_TRANSITIONS,
  SETTLEMENT_TRANSITIONS,
  GIFT_CARD_TRANSITIONS,
  LOAN_TRANSITIONS,
  TRANSACTION_TRANSITIONS,
};
