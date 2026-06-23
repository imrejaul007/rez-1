/**
 * useRezScore — compute the REZ Score (0–999) for the Phase 1.3 loyalty hub.
 *
 * Formula
 * -------
 *   REZ Score = clamp(
 *     0.30 × savings    +
 *     0.25 × streak     +
 *     0.20 × achievement+
 *     0.15 × engagement +
 *     0.10 × loyalty    ,
 *     0, 999
 *   )
 *
 * Each pillar is normalized to [0, 1] before being weighted:
 *
 *   - **Savings (30%)** — logarithmically scales `lifetimeSavedRupees` from
 *     the wallet's `savingsInsights.totalSaved`. Sigmoid-style cap at 50,000
 *     lifetime rupees (₹500 lifetime) gives ~1.0. This prevents whales from
 *     saturating the score and rewards incremental savers.
 *
 *   - **Streak consistency (25%)** — capped-linear at 30 days. A user with a
 *     30-day unbroken streak scores ~1.0 on this pillar.
 *
 *   - **Achievement completion (20%)** — direct ratio of unlocked achievements
 *     to total achievements, from the gamification store. Returns 0 when the
 *     backend hasn't loaded any achievements yet (no false-floor).
 *
 *   - **Engagement (15%)** — fraction of challenges the user has completed
 *     (challenges.filter(c => c.completed).length / challenges.length).
 *     Returns 0 when no challenges are loaded.
 *
 *   - **Loyalty tier (10%)** — discrete ladder:
 *       free    → 0.0
 *       premium → 0.6
 *       vip     → 1.0
 *     Falls back to 0.0 when the subscription payload is missing.
 *
 * Tier labels
 * -----------
 *   Bronze    : 0   – 249
 *   Silver    : 250 – 499
 *   Gold      : 500 – 749
 *   Platinum  : 750 – 999
 *
 * Defensive notes
 * ---------------
 *   - Pure function of store state — recomputes via useMemo whenever any
 *     upstream slice changes.
 *   - All inputs are coerced through `safeNonNegativeInt` / clamped helpers;
 *     the hook never throws on missing or malformed store data.
 *   - Reads only Zustand state. Does not mutate any store.
 */
import { useMemo } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useWalletStore } from '@/stores/walletStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import type { SubscriptionTier } from '@/types/subscription.types';

/** Score range. */
const SCORE_MIN = 0;
const SCORE_MAX = 999;

/** Pillar weights — sum to 1.0. */
const WEIGHTS = {
  savings: 0.3,
  streak: 0.25,
  achievements: 0.2,
  engagement: 0.15,
  loyalty: 0.1,
} as const;

const SAVINGS_CAP_RUPEES = 50_000;
const STREAK_CAP_DAYS = 30;

export type RezScoreTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface RezScoreBreakdown {
  savings: number;
  streak: number;
  achievements: number;
  engagement: number;
  loyalty: number;
}

export interface UseRezScoreResult {
  score: number;
  tier: RezScoreTier;
  breakdown: RezScoreBreakdown;
  isTopTier: boolean;
}

/** Clamp a number into [min, max], coercing NaN / non-finite to min. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function safeNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.floor(value);
}

/**
 * Log-shaped savings curve. Returns a value in [0, 1].
 *
 * Uses 1 - exp(-x / cap) so the curve asymptotically approaches 1 without
 * ever reaching it. At `cap` rupees the pillar score is ~0.632; at `2*cap`
 * it's ~0.865; at `5*cap` it's ~0.993.
 */
function savingsPillar(lifetimeSavedRupees: number): number {
  if (lifetimeSavedRupees <= 0) return 0;
  const ratio = lifetimeSavedRupees / SAVINGS_CAP_RUPEES;
  return clamp(1 - Math.exp(-ratio), 0, 1);
}

/** Linear cap on streak days, in [0, 1]. */
function streakPillar(currentStreakDays: number): number {
  if (currentStreakDays <= 0) return 0;
  return clamp(currentStreakDays / STREAK_CAP_DAYS, 0, 1);
}

/** Achievement completion ratio, in [0, 1]. Returns 0 when no achievements. */
function achievementPillar(
  achievements: ReadonlyArray<{ unlocked?: boolean }>,
): number {
  if (achievements.length === 0) return 0;
  let unlocked = 0;
  for (const a of achievements) {
    if (a.unlocked) unlocked += 1;
  }
  return clamp(unlocked / achievements.length, 0, 1);
}

/** Challenge completion ratio, in [0, 1]. Returns 0 when no challenges. */
function engagementPillar(
  challenges: ReadonlyArray<{ completed?: boolean }>,
): number {
  if (challenges.length === 0) return 0;
  let done = 0;
  for (const c of challenges) {
    if (c.completed) done += 1;
  }
  return clamp(done / challenges.length, 0, 1);
}

/** Discrete tier score in [0, 1]. */
function loyaltyPillar(tier: SubscriptionTier | null | undefined): number {
  switch (tier) {
    case 'vip':
      return 1;
    case 'premium':
      return 0.6;
    case 'free':
    case undefined:
    case null:
    default:
      return 0;
  }
}

function tierForScore(score: number): RezScoreTier {
  if (score >= 750) return 'Platinum';
  if (score >= 500) return 'Gold';
  if (score >= 250) return 'Silver';
  return 'Bronze';
}

export function useRezScore(): UseRezScoreResult {
  // Granular subscriptions so we only re-render when each slice changes.
  const achievements = useGamificationStore((s) => s.state.achievements);
  const challenges = useGamificationStore((s) => s.state.challenges);
  const dailyStreak = useGamificationStore((s) => s.state.dailyStreak);

  // Wallet store: `savingsInsights.totalSaved` is the lifetime saved figure
  // (in rupees, not paise — see `types/wallet.ts` SavingsInsights).
  const lifetimeSavedRupees = useWalletStore(
    (s) => s.savingsInsights?.totalSaved ?? 0,
  );

  // Subscription tier: may be undefined while the subscription payload is
  // loading. We default to 'free' (zero pillar score) when missing.
  const subscriptionTier = useSubscriptionStore(
    (s) => s.state.currentSubscription?.tier ?? null,
  );

  return useMemo<UseRezScoreResult>(() => {
    const breakdown: RezScoreBreakdown = {
      savings: savingsPillar(safeNonNegativeInt(lifetimeSavedRupees)),
      streak: streakPillar(safeNonNegativeInt(dailyStreak)),
      achievements: achievementPillar(achievements ?? []),
      engagement: engagementPillar(challenges ?? []),
      loyalty: loyaltyPillar(subscriptionTier),
    };

    const weightedSum =
      breakdown.savings * WEIGHTS.savings +
      breakdown.streak * WEIGHTS.streak +
      breakdown.achievements * WEIGHTS.achievements +
      breakdown.engagement * WEIGHTS.engagement +
      breakdown.loyalty * WEIGHTS.loyalty;

    const score = Math.round(clamp(weightedSum * SCORE_MAX, SCORE_MIN, SCORE_MAX));
    const tier = tierForScore(score);

    return {
      score,
      tier,
      breakdown,
      isTopTier: tier === 'Platinum',
    };
  }, [
    achievements,
    challenges,
    dailyStreak,
    lifetimeSavedRupees,
    subscriptionTier,
  ]);
}

export default useRezScore;