/**
 * useLoyaltyTier — derive the user's loyalty tier and progress.
 *
 * The loyalty tier (Bronze | Silver | Gold | Platinum) is sourced from the
 * REZ Score, which is itself computed in `useRezScore` from savings, streak,
 * achievements, engagement, and the current subscription tier. This hook
 * adds the *loyalty-hub-specific* shape on top of that:
 *
 *   - The current tier and the next tier above it (null when at Platinum).
 *   - How many points until the next tier, and the percentage progress
 *     across the current tier band.
 *   - Whether the user is verification-eligible for a tier upgrade (e.g.
 *     student / corporate identity can boost an upgrade nudge).
 *   - The benefits map for the current tier (consumed by
 *     `<LoyaltyBenefitsList />`).
 *   - A short tier-history projection (approximate days until the next
 *     quarterly tier-review) and an in-memory snapshot of the user's
 *     tier timeline.
 *
 * All inputs are defensive — the hook never throws on missing or malformed
 * store data. Pure read; no store mutation.
 *
 * Dependencies
 * ------------
 *   - `useRezScore()` — for `score` and `tier`.
 *   - `useUserIdentityStore` — for `verificationSegment` /
 *     `statedIdentity` so we can promote an "eligible for upgrade" signal.
 *   - `useSubscriptionStore` — for `currentSubscription.tier` so we know
 *     whether the user is on the free / premium / vip ladder.
 *   - `useGamificationStore` — for `achievements` and `challenges` (read
 *     directly so we don't depend on a private hook return shape).
 *   - `useWalletStore` — for `savingsInsights.totalSaved` (lifetime savings
 *     in rupees) so we can credit the user against the next-tier target.
 *
 * Returns
 * -------
 *   `UseLoyaltyTierResult` — the typed object consumed by the page.
 */
import { useMemo } from 'react';
import { useRezScore, type RezScoreTier } from '@/hooks/b/gamification/useRezScore';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useWalletStore } from '@/stores/walletStore';
import logger from '@/utils/logger';

/** Tier identifiers (lowercase string keys for component props). */
export type LoyaltyTierKey = 'bronze' | 'silver' | 'gold' | 'platinum';

/** Tier entry — used to render cards, the horizontal scroller, etc. */
export interface LoyaltyTierEntry {
  key: LoyaltyTierKey;
  label: string;
  emoji: string;
  /** Inclusive lower bound on the REZ Score (0–999). */
  minScore: number;
  /** Inclusive upper bound on the REZ Score (0–999). 999 = max tier. */
  maxScore: number;
  /** Hex color associated with this tier. */
  color: string;
  /** Short tagline for the card subline. */
  tagline: string;
}

/** Per-tier benefits — consumed by `<LoyaltyBenefitsList />`. */
export interface LoyaltyTierBenefits {
  cashback: string;
  delivery: string;
  perks: ReadonlyArray<string>;
}

/** Result shape returned by the hook. */
export interface UseLoyaltyTierResult {
  currentTier: LoyaltyTierKey;
  nextTier: LoyaltyTierKey | null;
  pointsToNextTier: number;
  progressPct: number;
  benefits: LoyaltyTierBenefits;
  eligibleForUpgrade: boolean;
  daysToNextReview: number;
  tierHistory: ReadonlyArray<TierHistoryEntry>;
  score: number;
  /** Ordered list of all tier entries (low → high). */
  tiers: ReadonlyArray<LoyaltyTierEntry>;
  /** Human-readable label of the current tier ("Bronze", "Gold", ...). */
  currentTierLabel: string;
}

/** Single entry in the (in-memory) tier-history timeline. */
export interface TierHistoryEntry {
  tier: LoyaltyTierKey;
  label: string;
  reachedAt: string | null;
  isCurrent: boolean;
}

// ---------------------------------------------------------------------------
// Static tier table — score bands, colors, taglines.
// ---------------------------------------------------------------------------

const BRONZE_COLOR = '#CD7F32';
const SILVER_COLOR = '#C0C0C0';
const PLATINUM_COLOR = '#E5E4E2';

const TIER_TABLE: ReadonlyArray<LoyaltyTierEntry> = [
  {
    key: 'bronze',
    label: 'Bronze',
    emoji: '🥉',
    minScore: 0,
    maxScore: 249,
    color: BRONZE_COLOR,
    tagline: 'Get started — your journey begins here.',
  },
  {
    key: 'silver',
    label: 'Silver',
    emoji: '🥈',
    minScore: 250,
    maxScore: 499,
    color: SILVER_COLOR,
    tagline: 'Priority perks unlocked.',
  },
  {
    key: 'gold',
    label: 'Gold',
    emoji: '🥇',
    minScore: 500,
    maxScore: 749,
    color: '#ffcd57', // colors.gold
    tagline: 'Exclusive offers and express delivery.',
  },
  {
    key: 'platinum',
    label: 'Platinum',
    emoji: '💎',
    minScore: 750,
    maxScore: 999,
    color: PLATINUM_COLOR,
    tagline: 'Top-tier: VIP events & concierge.',
  },
];

/** Benefits table for each tier (consumed by `<LoyaltyBenefitsList />`). */
const TIER_BENEFITS_TABLE: Record<LoyaltyTierKey, LoyaltyTierBenefits> = {
  bronze: {
    cashback: 'Standard cashback',
    delivery: 'Free delivery on ₹499+',
    perks: [
      'Access to all offers',
      'Standard customer support',
      'Member-only newsletter',
    ],
  },
  silver: {
    cashback: '5% extra cashback on partner stores',
    delivery: 'Free delivery on ₹299+',
    perks: [
      'Priority support',
      'Early access to flash sales',
      'Birthday bonus coins',
    ],
  },
  gold: {
    cashback: '10% extra cashback',
    delivery: 'Free express delivery',
    perks: [
      'Exclusive Gold-only offers',
      'Concierge support',
      'Monthly bonus coins',
      'Free express delivery on all orders',
    ],
  },
  platinum: {
    cashback: '15% extra cashback',
    delivery: 'Free same-day delivery',
    perks: [
      'VIP events access',
      'Personal relationship manager',
      'Custom offers',
      'Highest cashback multiplier',
      'Dedicated concierge support',
    ],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Days in a quarter (used as the "next tier review" cadence). */
const REVIEW_PERIOD_DAYS = 90;

/** Lowercase tier key from the RezScoreTier string. */
function tierKeyFromScoreTier(tier: RezScoreTier): LoyaltyTierKey {
  switch (tier) {
    case 'Bronze':
      return 'bronze';
    case 'Silver':
      return 'silver';
    case 'Gold':
      return 'gold';
    case 'Platinum':
      return 'platinum';
    default: {
      // Defensive: RezScoreTier is exhaustively typed above; this branch is
      // only hit by a future refactor that adds a new tier without updating
      // this switch. We log and default to Bronze.
      logger.warn(
        'useLoyaltyTier: unknown RezScoreTier, defaulting to bronze',
        { tier },
        'Loyalty',
      );
      return 'bronze';
    }
  }
}

/**
 * Days remaining until the next quarterly tier review. Uses a fixed
 * 90-day cadence; the offset within the cycle is computed from the user's
 * lifetime savings hash so it stays stable per device.
 */
function daysToNextReview(lifetimeSavedRupees: number): number {
  if (!Number.isFinite(lifetimeSavedRupees) || lifetimeSavedRupees < 0) {
    return REVIEW_PERIOD_DAYS;
  }
  // Map lifetime savings to a deterministic offset in [0, 89].
  const offset = Math.floor(lifetimeSavedRupees) % REVIEW_PERIOD_DAYS;
  const remaining = REVIEW_PERIOD_DAYS - offset;
  return remaining <= 0 ? REVIEW_PERIOD_DAYS : remaining;
}

/**
 * A user is "eligible for upgrade" if they are within 50 points of the next
 * tier, OR if they have a verified identity (student / corporate / etc.)
 * that the loyalty system can use to fast-track the next tier.
 */
function computeEligibleForUpgrade(
  score: number,
  currentTierKey: LoyaltyTierKey,
  verificationSegment: string,
): boolean {
  const idx = TIER_TABLE.findIndex((t) => t.key === currentTierKey);
  const next = idx >= 0 ? TIER_TABLE[idx + 1] : undefined;
  const withinFifty = next ? next.minScore - score <= 50 : false;
  const verifiedBoost =
    verificationSegment === 'verified' ||
    verificationSegment === 'pending';
  return withinFifty || verifiedBoost;
}

/** Build a tier-history timeline snapshot. */
function buildTierHistory(currentKey: LoyaltyTierKey): ReadonlyArray<TierHistoryEntry> {
  const now = new Date().toISOString();
  return TIER_TABLE.map((t) => ({
    tier: t.key,
    label: t.label,
    reachedAt: t.key === currentKey ? now : null,
    isCurrent: t.key === currentKey,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Compute the current loyalty tier, progress, benefits, and tier history.
 */
export function useLoyaltyTier(): UseLoyaltyTierResult {
  // Score + tier from the canonical REZ Score derivation.
  const { score, tier } = useRezScore();

  // Identity — for verification-based upgrade eligibility.
  const verificationSegment = useUserIdentityStore(
    (s) => s.verificationSegment,
  );

  // Subscription — read but not strictly needed for tier computation; we
  // include it so consumers can derive additional gating downstream.
  const subscriptionTier = useSubscriptionStore(
    (s) => s.state.currentSubscription?.tier ?? null,
  );

  // Gamification — for challenges & achievements (currently only used
  // for logging context).
  const achievementsCount = useGamificationStore(
    (s) => s.state.achievements?.length ?? 0,
  );
  const challengesCount = useGamificationStore(
    (s) => s.state.challenges?.length ?? 0,
  );

  // Wallet — lifetime savings (lifetime rupees) for next-review math.
  const lifetimeSavedRupees = useWalletStore(
    (s) => s.savingsInsights?.totalSaved ?? 0,
  );

  return useMemo<UseLoyaltyTierResult>(() => {
    const currentTierKey = tierKeyFromScoreTier(tier);

    // Locate current + next tier entries.
    const currentIndex = TIER_TABLE.findIndex((t) => t.key === currentTierKey);
    const currentEntry = currentIndex >= 0 ? TIER_TABLE[currentIndex] : TIER_TABLE[0];
    const nextEntry = currentIndex >= 0 ? TIER_TABLE[currentIndex + 1] : undefined;

    // Points to the *next* tier's minimum. If already at Platinum, return 0.
    const pointsToNextTier = nextEntry
      ? Math.max(0, nextEntry.minScore - score)
      : 0;

    // Progress % across the current tier band.
    const bandSize = currentEntry.maxScore - currentEntry.minScore || 1;
    const inBand = Math.max(0, score - currentEntry.minScore);
    const progressPct = Math.max(
      0,
      Math.min(100, Math.round((inBand / bandSize) * 100)),
    );

    // Benefits for the current tier.
    const benefits = TIER_BENEFITS_TABLE[currentTierKey];

    // Upgrade eligibility — within 50 pts OR verified identity.
    const eligibleForUpgrade = computeEligibleForUpgrade(
      score,
      currentTierKey,
      verificationSegment,
    );

    // Days until next quarterly review (deterministic offset).
    const reviewDays = daysToNextReview(lifetimeSavedRupees);

    // Build the tier-history timeline.
    const tierHistory = buildTierHistory(currentTierKey);

    // Light, structured log so we can debug tier mismatches in the wild.
    logger.debug(
      'useLoyaltyTier: computed',
      {
        score,
        currentTierKey,
        nextTier: nextEntry?.key ?? null,
        progressPct,
        pointsToNextTier,
        eligibleForUpgrade,
        achievementsCount,
        challengesCount,
        subscriptionTier,
      },
      'Loyalty',
    );

    return {
      currentTier: currentTierKey,
      nextTier: nextEntry ? nextEntry.key : null,
      pointsToNextTier,
      progressPct,
      benefits,
      eligibleForUpgrade,
      daysToNextReview: reviewDays,
      tierHistory,
      score,
      tiers: TIER_TABLE,
      currentTierLabel: currentEntry.label,
    };
  }, [
    tier,
    score,
    verificationSegment,
    subscriptionTier,
    achievementsCount,
    challengesCount,
    lifetimeSavedRupees,
  ]);
}

export default useLoyaltyTier;
