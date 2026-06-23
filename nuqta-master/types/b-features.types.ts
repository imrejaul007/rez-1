/**
 * B-feature namespace — type definitions.
 *
 * This file defines the public types for the `b/` migration namespace (see
 * `REZ_MIGRATION_PLAN.md`). Every feature migrated from project B (REZ) into
 * Nuqta lives under a namespaced `b.<feature>` flag so we can ship and
 * roll back each one independently of the existing 250+ Nuqta routes.
 *
 * Design contract:
 *   - All B features default to ON in both dev and prod (per user decision).
 *   - Flags are read from `subscriptionStore.featureFlags` (existing Zustand).
 *   - Runtime policy: a flag is "enabled" unless explicitly set to `false`.
 *     `undefined`, `null`, or `true` all count as enabled.
 */

/**
 * Canonical list of B-feature flags.
 *
 * Keep this union in sync with the four migration phases in
 * `REZ_MIGRATION_PLAN.md`. If you add a new feature there, add it here too —
 * `BFeatureFlagMap` and `DEFAULT_B_FLAGS` derive their keys from this union
 * so TypeScript will fail the build if you forget.
 */
export type BFeatureFlag =
  // Phase 1 — Savings Dashboard + UI-only wins
  | 'b.savings'
  | 'b.coinExpiry'
  | 'b.streakFire'
  | 'b.rezScore'
  | 'b.savingsShare'
  | 'b.weeklyDigest'
  | 'b.map'
  // Phase 2 — Quick visible wins
  | 'b.liveActivity'
  | 'b.memory'
  | 'b.nearU'
  | 'b.khata'
  // Phase 3 — Deeper features
  | 'b.dailyCheckin'
  | 'b.loyaltyHub'
  | 'b.forYouToday'
  | 'b.rezCash'
  | 'b.notifPrefs'
  // Phase 4 — Heavy verticals
  | 'b.aiAssistant'
  | 'b.karma'
  | 'b.try'
  | 'b.habixo'
  | 'b.travel'
  | 'b.salon'
  | 'b.roomService'
  | 'b.influencer';

/**
 * Map from flag name to its current boolean value.
 *
 * The store keeps a flat `Record<BFeatureFlag, boolean>` for O(1) lookups.
 * `false` means the feature is disabled; any other value means enabled.
 */
export type BFeatureFlagMap = Record<BFeatureFlag, boolean>;

/**
 * Default values applied at boot time.
 *
 * Per user decision: every B feature is ON by default in both dev and prod.
 * Operators can disable individual flags at runtime via the
 * `subscriptionStore` without rebuilding the app.
 *
 * Type `Record<BFeatureFlag, true>` forces every flag in the union to be
 * listed — if you add a flag to the union, the compiler will fail here
 * until you add it to this object.
 */
export const DEFAULT_B_FLAGS: Record<BFeatureFlag, true> = {
  // Phase 1
  'b.savings': true,
  'b.coinExpiry': true,
  'b.streakFire': true,
  'b.rezScore': true,
  'b.savingsShare': true,
  'b.weeklyDigest': true,
  'b.map': true,
  // Phase 2
  'b.liveActivity': true,
  'b.memory': true,
  'b.nearU': true,
  'b.khata': true,
  // Phase 3
  'b.dailyCheckin': true,
  'b.loyaltyHub': true,
  'b.forYouToday': true,
  'b.rezCash': true,
  'b.notifPrefs': true,
  // Phase 4
  'b.aiAssistant': true,
  'b.karma': true,
  'b.try': true,
  'b.habixo': true,
  'b.travel': true,
  'b.salon': true,
  'b.roomService': true,
  'b.influencer': true,
};

/**
 * Phases a B feature can belong to.
 * Mirrors the four phases defined in `REZ_MIGRATION_PLAN.md`.
 */
export type BFeaturePhase = 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4';

/**
 * Lightweight catalog entry used by the B hub landing page.
 * Each entry points at a route under `app/b/<feature>/<screen>`.
 */
export interface BFeatureCatalogEntry {
  /** Display name shown in the hub list. */
  name: string;
  /** Route under `/b/...` — must not include the leading `/b/`. */
  route: string;
  /** Phase this feature ships in. */
  phase: BFeaturePhase;
  /** Flag that gates this feature; defaults to `b.<feature-route>`. */
  flag: BFeatureFlag;
  /** Short human-readable description for the hub list. */
  description?: string;
  /** Optional emoji icon shown beside the feature name. */
  icon?: string;
  /** Optional CTA hint text shown on the row (defaults to "Open →"). */
  hint?: string;
}