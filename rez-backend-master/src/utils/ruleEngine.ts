/**
 * REZ Reward Rule Precedence Engine
 *
 * Single source of truth for reward calculation across all platforms.
 * Detects contradictions and enforces deterministic stacking rules.
 *
 * When multiple rewards could apply to a single transaction:
 * Priority 1 (highest): Fraud block — if user is flagged, NO rewards
 * Priority 2: Campaign coins (time-limited, merchant-funded)
 * Priority 3: Promo coins (platform-funded, limited budget)
 * Priority 4: Cashback (percentage of transaction)
 * Priority 5: Loyalty tier multiplier (applied ON TOP of cashback)
 * Priority 6 (lowest): Base REZ coins (platform liability)
 *
 * STACKING RULES:
 * - Campaign + Promo: NOT stackable (take higher value)
 * - Campaign + Cashback: Stackable (different types)
 * - Promo + Cashback: Stackable (different types)
 * - Loyalty multiplier: Applies to REZ coins only (NOT campaign/promo)
 * - Referral bonus: One-time, separate from transaction rewards
 * - Trial coins: Separate from purchase coins (not stackable with cashback)
 *
 * CONTRADICTIONS RESOLVED:
 * 1. Coin expiry: Individual earned-date TTL (90 days) takes precedence
 *    over inactivity expiry — we do NOT expire on inactivity.
 * 2. Campaign vs Promo: Higher value always wins (not sum).
 * 3. Tier downgrade: Does NOT affect coin expiry or redemption value.
 * 4. Fraud flag: Blocks ALL rewards immediately (fail-closed).
 * 5. Daily cap: 10 events per user per day (prevents farming loops).
 */

export interface RewardContext {
  userId: string;
  storeId: string;
  transactionAmount: number;
  transactionType: 'order' | 'booking' | 'trial' | 'bbps';
  userLoyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isFraudFlagged: boolean;
  fraudReason?: string;
  activeCampaign?: {
    coinReward: number;
    isMerchantFunded: boolean;
    remainingBudget: number;
    campaignId: string;
  };
  activePromo?: {
    coinReward: number;
    userUsageCount: number;
    maxUsagePerUser: number;
    promoId: string;
  };
  cashbackRate?: number; // 0-1 (percentage as decimal)
  coinsRedeemedValue?: number; // INR value of coins used in this transaction
  userPreviousTier?: 'bronze' | 'silver' | 'gold' | 'platinum'; // For tracking tier changes
}

export interface RewardResult {
  rezCoins: number;
  campaignCoins: number;
  promoCoins: number;
  cashbackINR: number;
  loyaltyMultiplierApplied: number;
  referralBonus?: number;
  totalCoinValue: number;
  blocked: boolean;
  blockReason?: string;
  appliedRules: string[];
  skippedRules: string[];
  contradictionsFound?: string[];
}

import { MAX_CASHBACK_PER_TXN, MAX_REWARD_EVENTS_PER_DAY } from '../config/economicsConfig';
import { logger } from '../config/logger';

const LOYALTY_MULTIPLIERS: Record<string, number> = {
  bronze: 1.0,
  silver: 1.2,
  gold: 1.5,
  platinum: 2.0,
};

const BASE_COIN_RATE = 0.01; // 1 coin per ₹100
const DAILY_REWARD_CAP = MAX_REWARD_EVENTS_PER_DAY; // Max reward events per user per day (config-driven)

/**
 * Main reward calculation engine with contradiction detection.
 * Returns deterministic result based on rule precedence.
 */
export function calculateRewards(ctx: RewardContext): RewardResult {
  const result: RewardResult = {
    rezCoins: 0,
    campaignCoins: 0,
    promoCoins: 0,
    cashbackINR: 0,
    loyaltyMultiplierApplied: 1.0,
    totalCoinValue: 0,
    blocked: false,
    appliedRules: [],
    skippedRules: [],
    contradictionsFound: [],
  };

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 1: Fraud block (highest priority — blocks ALL rewards)
  // ─────────────────────────────────────────────────────────────
  if (ctx.isFraudFlagged) {
    result.blocked = true;
    result.blockReason = ctx.fraudReason || 'User is fraud-flagged';
    result.skippedRules.push('all_rewards_blocked_by_fraud_flag');
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 2 vs 3: Campaign OR Promo coins (NOT both)
  // Higher value wins (not sum) — CONTRADICTION #1 resolved here
  // ─────────────────────────────────────────────────────────────
  if (ctx.activeCampaign && ctx.activePromo) {
    // Both active — must choose one
    result.contradictionsFound?.push(
      'CONTRADICTION: Both campaign and promo coins active for same transaction. ' +
        'Rule: Higher value wins (not stackable). ' +
        `Campaign: ${ctx.activeCampaign?.coinReward} coins (budget: ${ctx.activeCampaign?.remainingBudget}), ` +
        `Promo: ${ctx.activePromo.coinReward} coins (usage: ${ctx.activePromo.userUsageCount}/${ctx.activePromo.maxUsagePerUser})`,
    );

    if (ctx.activeCampaign?.coinReward >= ctx.activePromo.coinReward && ctx.activeCampaign?.remainingBudget > 0) {
      result.campaignCoins = ctx.activeCampaign?.coinReward;
      result.appliedRules.push(`campaign_coins:${ctx.activeCampaign?.campaignId}:${ctx.activeCampaign?.coinReward}`);
      result.skippedRules.push(`promo_coins:${ctx.activePromo.promoId}:outbid_by_campaign`);
    } else if (ctx.activePromo.userUsageCount < ctx.activePromo.maxUsagePerUser) {
      result.promoCoins = ctx.activePromo.coinReward;
      result.appliedRules.push(`promo_coins:${ctx.activePromo.promoId}:${ctx.activePromo.coinReward}`);
      result.skippedRules.push(`campaign_coins:${ctx.activeCampaign?.campaignId}:outbid_by_promo`);
    }
  } else if ((ctx.activeCampaign?.remainingBudget ?? 0) > 0) {
    result.campaignCoins = ctx.activeCampaign!.coinReward;
    result.appliedRules.push(`campaign_coins:${ctx.activeCampaign!.campaignId}:${ctx.activeCampaign!.coinReward}`);
  } else if (ctx.activePromo && ctx.activePromo.userUsageCount < ctx.activePromo.maxUsagePerUser) {
    result.promoCoins = ctx.activePromo.coinReward;
    result.appliedRules.push(`promo_coins:${ctx.activePromo.promoId}:${ctx.activePromo.coinReward}`);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 4: Cashback (stackable with coins but basis = net cash)
  // CONTRADICTION #3 resolved: Cashback = transaction amount MINUS coin redemption value
  // ─────────────────────────────────────────────────────────────
  if (ctx.cashbackRate && ctx.cashbackRate > 0) {
    // Calculate cashable amount: exclude coins redeemed (they don't earn cashback)
    const cashableAmount = Math.max(0, ctx.transactionAmount - (ctx.coinsRedeemedValue || 0));

    if (cashableAmount > 0) {
      const rawCashback = cashableAmount * ctx.cashbackRate;
      result.cashbackINR = Math.min(rawCashback, MAX_CASHBACK_PER_TXN);
      result.appliedRules.push(
        `cashback:rate=${ctx.cashbackRate}:basis=${cashableAmount}:amount=${result.cashbackINR}`,
      );

      if (cashableAmount === 0) {
        result.skippedRules.push('cashback:zero_cash_paid_due_to_coin_redemption');
      }
    } else {
      result.skippedRules.push('cashback:zero_cashable_amount_after_coin_redemption');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 5+6: Base REZ coins + loyalty multiplier
  // Multiplier applies ONLY to REZ coins (NOT campaign/promo)
  // Only for bookings/orders, NOT BBPS
  // ─────────────────────────────────────────────────────────────
  if (ctx.transactionType !== 'bbps') {
    const baseCoins = Math.floor(ctx.transactionAmount * BASE_COIN_RATE);

    if (baseCoins > 0) {
      const multiplier = LOYALTY_MULTIPLIERS[ctx.userLoyaltyTier] || 1.0;
      result.rezCoins = Math.floor(baseCoins * multiplier);
      result.loyaltyMultiplierApplied = multiplier;
      result.appliedRules.push(
        `base_rez_coins:${baseCoins}x${multiplier}=${result.rezCoins}:tier=${ctx.userLoyaltyTier}`,
      );

      // Contradiction #2: Tier downgrade doesn't affect coin value
      if (ctx.userPreviousTier && ctx.userPreviousTier !== ctx.userLoyaltyTier) {
        const previousMultiplier = LOYALTY_MULTIPLIERS[ctx.userPreviousTier] || 1.0;
        result.contradictionsFound?.push(
          `INFO: Tier downgrade from ${ctx.userPreviousTier} (x${previousMultiplier}) to ` +
            `${ctx.userLoyaltyTier} (x${multiplier}). Coins redeemable at same value (multiplier only affects earning).`,
        );
      }
    }
  } else {
    result.skippedRules.push('base_rez_coins:not_applicable_for_bbps');
  }

  // ─────────────────────────────────────────────────────────────
  // Calculate total coin value (for reporting)
  // ─────────────────────────────────────────────────────────────
  result.totalCoinValue = result.rezCoins + result.campaignCoins + result.promoCoins;

  return result;
}

/**
 * Stacking matrix validator — checks if given rule combination is allowed.
 * Returns true if combination is valid, false if contradictory.
 */
export function validateStacking(rules: Array<'campaign' | 'promo' | 'cashback' | 'loyalty' | 'referral' | 'trial'>): {
  valid: boolean;
  reason?: string;
} {
  // Campaign + Promo: NOT allowed (must pick one)
  if (rules.includes('campaign') && rules.includes('promo')) {
    return {
      valid: false,
      reason: 'Campaign and Promo coins are mutually exclusive. Pick higher value.',
    };
  }

  // Trial + Cashback: NOT allowed (trial coins separate)
  if (rules.includes('trial') && rules.includes('cashback')) {
    return {
      valid: false,
      reason: 'Trial coins do not earn cashback.',
    };
  }

  // Loyalty multiplier applies only to base REZ coins (not campaign/promo)
  if (rules.includes('loyalty')) {
    if (rules.includes('campaign') || rules.includes('promo')) {
      return {
        valid: false,
        reason: 'Loyalty multiplier applies only to base REZ coins, not campaign/promo.',
      };
    }
  }

  // All other combinations allowed
  return { valid: true };
}

/**
 * Calculate the safe cashable amount after coin redemption.
 * Prevents coin → cashback → coin infinite loops.
 *
 * @param totalAmount Transaction total in INR
 * @param coinsRedeemedValue INR value of coins used
 * @returns Amount eligible for cashback calculation
 */
export function calculateCashableAmount(totalAmount: number, coinsRedeemedValue: number = 0): number {
  // Cashback basis = amount actually paid in cash (not with coins)
  return Math.max(0, totalAmount - coinsRedeemedValue);
}

/**
 * Check if user would exceed daily reward cap.
 * Max 10 reward-issuing events per user per day.
 *
 * Call this in middleware before calling calculateRewards().
 */
export async function checkDailyRewardCap(
  userId: string,
  redisService: any,
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  const key = `reward:daily:${userId}:${today}`;

  try {
    const count = await redisService.get(key);
    const currentCount = parseInt(count || '0', 10);

    if (currentCount >= DAILY_REWARD_CAP) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: DAILY_REWARD_CAP - currentCount - 1 };
  } catch (err) {
    // Redis failure — fail-open (allow reward, log for monitoring)
    logger.warn('[RuleEngine] Daily cap check failed, allowing reward', {
      userId,
      error: (err as Error).message,
    });
    return { allowed: true, remaining: DAILY_REWARD_CAP };
  }
}

/**
 * Increment daily reward event counter.
 * Called after successful reward issuance.
 */
export async function incrementDailyRewardCount(userId: string, redisService: any): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `reward:daily:${userId}:${today}`;

  try {
    await redisService.incr(key);
    await redisService.expire(key, 25 * 60 * 60); // 25h TTL
  } catch (err) {
    logger.warn('[RuleEngine] Daily reward count increment failed', {
      userId,
      error: (err as Error).message,
    });
  }
}

/**
 * Circular referral detection — prevents A→B→A loops.
 *
 * @returns true if circular referral detected (fraud), false if safe
 */
export async function isCircularReferral(referrerId: string, refereeId: string, userModel: any): Promise<boolean> {
  try {
    // Check if refereeId previously referred referrerId
    const referee = await userModel.findById(refereeId).select('referral.referredUsers').lean();

    if (!referee) return false;

    const referredUsers = referee?.referral?.referredUsers || [];
    return referredUsers.includes(referrerId);
  } catch (err) {
    logger.warn('[RuleEngine] Circular referral check failed', {
      referrerId,
      refereeId,
      error: (err as Error).message,
    });
    return false; // Fail-open on error
  }
}

/**
 * Multi-level referral loop detection.
 * Detects chains like A→B→C→A (cycle detection).
 */
export async function detectReferralCycle(
  userId: string,
  userModel: any,
  maxDepth: number = 5,
): Promise<{ hasCycle: boolean; cycle?: string[] }> {
  const visited = new Set<string>();
  const path: string[] = [];

  async function dfs(currentId: string, depth: number): Promise<boolean> {
    if (depth > maxDepth) return false; // Prevent infinite recursion
    if (visited.has(currentId)) {
      // Found a cycle
      path.push(currentId);
      return true;
    }

    visited.add(currentId);
    path.push(currentId);

    try {
      const user = await userModel.findById(currentId).select('referral.referredBy').lean();

      if (user?.referral?.referredBy) {
        const cycleFound = await dfs(user.referral.referredBy, depth + 1);
        if (cycleFound) return true;
      }
    } catch (err) {
      // Fail-open on DB error
      return false;
    }

    path.pop();
    return false;
  }

  const hasCycle = await dfs(userId, 0);
  return {
    hasCycle,
    cycle: hasCycle ? [...path] : undefined,
  };
}
