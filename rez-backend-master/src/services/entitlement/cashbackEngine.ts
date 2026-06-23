/**
 * Cashback Engine
 *
 * Centralized cashback calculation using the privilege resolution service.
 * Applies subscription multiplier (on rate) and Prive multiplier (on amount).
 *
 * Usage:
 *   const result = await calculateCashback({ userId, billAmount: 1000, baseRate: 5 });
 *   // result.cashbackAmount = 300 (for VIP 3x + Elite 2.0x)
 */

import { privilegeResolutionService, UserPrivileges } from './privilegeResolutionService';

// ============================================================================
// Types
// ============================================================================

export interface CashbackInput {
  userId: string;
  billAmount: number;
  baseRate: number; // Store's baseCashbackPercent
}

export interface CashbackResult {
  cashbackAmount: number;
  effectiveRate: number;
  breakdown: {
    baseRate: number;
    baseCashbackAmount: number;
    subscriptionMultiplier: number;
    afterSubscription: number;
    priveCoinMultiplier: number;
    priveTier: string;
    finalCashbackAmount: number;
  };
}

// ============================================================================
// Engine
// ============================================================================

/**
 * Calculate cashback for a store payment using the user's full privilege snapshot.
 *
 * Flow:
 * 1. Resolve user's privileges (cached, ~1ms if warm)
 * 2. Apply subscription multiplier to cashback rate (premium=2x, VIP=3x)
 * 3. Apply Prive coin multiplier to cashback amount (signature=1.5x, elite=2.0x)
 * 4. Return amount + full breakdown for audit trail
 */
export async function calculateCashback(input: CashbackInput): Promise<CashbackResult> {
  const priv = await privilegeResolutionService.resolve(input.userId);
  return calculateCashbackFromPrivileges(input, priv);
}

/**
 * Calculate cashback from pre-resolved privileges.
 * Useful when the caller already has the privileges (avoids double resolve).
 */
export function calculateCashbackFromPrivileges(
  input: CashbackInput,
  priv: UserPrivileges
): CashbackResult {
  // Step 1: Base cashback
  const baseCashbackAmount = Math.floor((input.billAmount * input.baseRate) / 100);

  // Step 2: Apply subscription multiplier to rate
  const afterSubscription = Math.floor(baseCashbackAmount * priv.cashbackMultiplier);

  // Step 3: Apply Prive coin multiplier to amount
  const finalCashback = Math.floor(afterSubscription * priv.priveCoinMultiplier);

  // Calculate effective rate for display
  const effectiveRate = input.billAmount > 0
    ? (finalCashback / input.billAmount) * 100
    : 0;

  return {
    cashbackAmount: finalCashback,
    effectiveRate: Math.round(effectiveRate * 100) / 100, // 2 decimal places
    breakdown: {
      baseRate: input.baseRate,
      baseCashbackAmount,
      subscriptionMultiplier: priv.cashbackMultiplier,
      afterSubscription,
      priveCoinMultiplier: priv.priveCoinMultiplier,
      priveTier: priv.priveTier,
      finalCashbackAmount: finalCashback,
    },
  };
}
