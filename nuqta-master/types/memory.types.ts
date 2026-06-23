/**
 * Memory Continuity — shared types (Phase 2.2).
 *
 * Powers the "REZ remembers so you don't have to" surface that surfaces
 * short personalised phrases referencing past activity:
 *
 *   - "You saved ₹420 at Café Delhi last week"
 *   - "You tend to shop more on weekends"
 *   - "Your favourite category this month is Food"
 *   - "You haven't visited BigBazaar in 30 days — miss it?"
 *   - "Last month you saved ₹1,200 on Coffee"
 *
 * The data is computed client-side from existing stores
 * (`useWalletStore`, `useGamificationStore`, `useUserIdentityStore`) — no
 * backend round-trip required.
 *
 * Consumers
 * ---------
 *   - `hooks/b/social/useMemoryContinuity.ts` — derives the list.
 *   - `components/b/social/MemoryContinuityCard.tsx` — renders one card.
 *   - `app/b/social/memories.tsx` — full-page vertical list.
 *
 * Stability contract
 * ------------------
 *   - `MemoryReference` is the on-the-render shape — adding a required
 *     field is a breaking change for the card and the page.
 *   - `category` is a closed union; new categories must be added here AND
 *     in the icon map inside the card component.
 *   - `relatedEntityId` / `relatedEntityType` are best-effort pointers
 *     into the broader data graph; consumers must treat them as optional
 *     hints, not strict foreign keys.
 */

/**
 * Discriminator for the kind of memory a card represents.
 *
 * Keep this union closed — the card uses it to pick an emoji icon and
 * accent colour, and a new value silently degrades to a generic chip
 * otherwise.
 */
export type MemoryCategory =
  | 'spending'
  | 'saving'
  | 'preference'
  | 'streak'
  | 'social';

/**
 * Coarse-grained type of the entity the memory points at, when known.
 *
 * `undefined` (the field is optional) means the memory is about an
 * aggregate (e.g. "You tend to shop more on weekends") and has no
 * single entity to drill into.
 */
export type MemoryEntityType = 'store' | 'category' | 'offer';

/**
 * A single personalised memory reference shown to the user.
 *
 * @example
 * {
 *   id: 'mem_2026-06-20_saved_kaffastory',
 *   text: 'You saved ₹120 at Kaffa Story last week',
 *   category: 'saving',
 *   relatedEntityId: 'st_kaffa_story_koramangala',
 *   relatedEntityType: 'store',
 *   daysAgo: 5,
 *   ctaRoute: '/b/store/st_kaffa_story_koramangala',
 * }
 */
export interface MemoryReference {
  /** Stable id; used as React key + as the payload to the "forget" API. */
  id: string;
  /** Pre-rendered human-readable memory sentence. */
  text: string;
  /** Coarse category — drives icon and accent. */
  category: MemoryCategory;
  /** Optional id of the store / category / offer the memory is about. */
  relatedEntityId?: string;
  /** Optional type of the related entity. */
  relatedEntityType?: MemoryEntityType;
  /**
   * Approximate days since the underlying event. Always a non-negative
   * integer; memories older than 90 days are dropped at the hook layer
   * before they ever reach the UI.
   */
  daysAgo: number;
  /**
   * Optional deep-link the card should navigate to when tapped.
   * Treated as a hint — components may still choose to ignore it.
   */
  ctaRoute?: string;
}

/**
 * Return shape of `useMemoryContinuity`.
 *
 * Mirrors the convention of `useLiveActivity` and friends — the hook
 * never throws, it always returns a stable object shape so consumers can
 * render their loading / error / empty states from included flags.
 */
export interface UseMemoryContinuityResult {
  /** Memory references, sorted newest-first, capped at 5. */
  memories: MemoryReference[];
  /**
   * Number of references before the soft cap is applied. Always
   * `>= memories.length`; useful for "View all" affordances.
   */
  totalReferences: number;
  /** Convenience flag — `true` when there is at least one memory. */
  hasMemory: boolean;
  /**
   * Force a re-computation. Today the hook is a pure derivation so
   * `refresh` is a no-op marker, but the contract is in place so
   * consumers (and the page's pull-to-refresh) can wire to it.
   */
  refresh: () => void;
}
