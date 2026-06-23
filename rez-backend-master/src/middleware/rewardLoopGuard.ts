/**
 * Anti-Loop Guard Middleware
 *
 * Prevents infinite reward loops where:
 * 1. User earns coins on purchase
 * 2. User redeems coins for discount
 * 3. User earns coins on discounted amount (creates infinite loop)
 *
 * ACTIVE EXPORTS:
 *   - calculateCashableAmount (used by ruleEngine.ts and cashbackService.ts)
 *
 * REMOVED (were never wired into any route/middleware — 0 imports found):
 *   - DailyRewardCapGuard       (Redis-backed daily reward event counter)
 *   - CircularReferralDetector  (A→B→A referral chain detection)
 *   - TripleSpendDetector       (coins-redeemed-then-earn-again detection)
 *   - HotspotDetector           (rapid repeated transaction detection)
 *
 * Re-implement from git history if fraud middleware is needed in future.
 */

import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('reward-loop-guard');

/**
 * Calculate the NET cash amount paid after coin redemption.
 * This is the basis for cashback calculation.
 *
 * RULE: Cashback = F(net cash paid), NOT F(total bill amount)
 * This prevents: Bill ₹100 + redeem ₹50 coins = ₹50 cash paid → Cashback on ₹50 only
 *
 * @param totalAmount Transaction total in INR
 * @param coinsRedeemedValue INR value of coins used for this transaction
 * @returns Safe cash amount for cashback basis
 */
export function calculateCashableAmount(totalAmount: number, coinsRedeemedValue: number = 0): number {
  const cashable = Math.max(0, totalAmount - coinsRedeemedValue);
  logger.debug('[RewardLoopGuard] Cashable amount calculated', {
    totalAmount,
    coinsRedeemedValue,
    cashable,
  });
  return cashable;
}
