/**
 * For-You-Today — shared type definitions (Phase 3.3).
 *
 * The "For You Today" feed is a daily, AI-curated set of 3-5 personalised
 * action cards drawn from the user's segment, recent activity, and platform
 * promotions. Each card is small, single-purpose, and tappable — it routes
 * the user into the relevant feature surface (savings, social, checkin, …).
 *
 * These types are duplicated between frontend and backend so either side
 * can be evolved in lock-step. The frontend definitions are the canonical
 * read shape; the backend (`src/routes/b/foryou.ts`) produces equivalent
 * payloads.
 *
 * Money convention
 * ----------------
 *  - All amounts on the wire are integer paise (1/100 of a rupee).
 *  - The UI is responsible for dividing by 100 and formatting via
 *    `formatPrice(...)` from `@/utils/priceFormatter`.
 */

/** Type of personalisation slot the action occupies. */
export type ForYouActionType =
  | 'save'
  | 'insight'
  | 'lifestyle'
  | 'offer'
  | 'tip';

/**
 * One action card in the "For You Today" feed.
 *
 * Cards are rendered in ascending `priority` order — lower numbers appear
 * higher in the feed. `priority` is opaque to the UI; it's whatever the
 * backend's ranker assigns.
 */
export interface ForYouAction {
  /** Stable opaque id used as a `FlatList` key and analytics correlation id. */
  id: string;
  /** Slot category — controls card chrome (icon background tint, accent). */
  type: ForYouActionType;
  /** Bold one-line title, e.g. "Save ₹200 on groceries this week". */
  title: string;
  /** One or two-line supporting copy explaining why this card is relevant. */
  description: string;
  /** Label for the primary CTA button. */
  ctaLabel: string;
  /**
   * In-app route to navigate to when the card (or its CTA) is pressed.
   * Format is an `expo-router` style path, e.g. `/b/savings/goals` or
   * `/explore?store=ccd`.
   */
  ctaRoute: string;
  /** Single emoji used as the card's icon. Should render in <Text>. */
  iconEmoji: string;
  /**
   * Lower = higher in the feed. Used as the sort key.
   * Backend may emit non-contiguous values.
   */
  priority: number;
  /**
   * Optional ISO-8601 expiry timestamp. After this moment the card should
   * be treated as expired and hidden from the feed.
   */
  expiresAt?: string;
  /**
   * Optional projected savings in paise (1/100 of a rupee). When present,
   * the card surfaces a "Potential savings: ₹X" badge.
   */
  potentialSavingsPaise?: number;
}

/**
 * Full envelope returned by `GET /api/b/foryou/today`.
 *
 * The `validUntil` field is a hint to the client — once `Date.now()`
 * exceeds it, the cached feed should be refreshed on next focus.
 */
export interface ForYouFeed {
  actions: ForYouAction[];
  /** ISO-8601 timestamp the backend produced this feed. */
  generatedAt: string;
  /** ISO-8601 timestamp after which the feed is considered stale. */
  validUntil: string;
  /** Segment tag the backend used for personalisation, e.g. "student". */
  userSegment: string;
}

/**
 * Type-guard that checks an unknown value is at least shaped like a
 * `ForYouAction`. Extra fields are allowed and ignored; required fields
 * are validated defensively so a malformed backend payload cannot crash
 * the UI.
 */
export function isForYouAction(value: unknown): value is ForYouAction {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    (v.type === 'save' ||
      v.type === 'insight' ||
      v.type === 'lifestyle' ||
      v.type === 'offer' ||
      v.type === 'tip') &&
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    typeof v.ctaLabel === 'string' &&
    typeof v.ctaRoute === 'string' &&
    typeof v.iconEmoji === 'string' &&
    typeof v.priority === 'number' &&
    Number.isFinite(v.priority)
  );
}

/**
 * Normalise a raw backend payload into a clean `ForYouFeed`. Drops
 * invalid entries, deduplicates by `id`, and sorts by `priority`.
 *
 * Returns an empty feed if nothing valid is present — never throws.
 */
export function normalizeForYouFeed(raw: unknown): ForYouFeed {
  const empty: ForYouFeed = {
    actions: [],
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    userSegment: 'all',
  };
  if (typeof raw !== 'object' || raw === null) return empty;

  const candidate = raw as Partial<ForYouFeed> & {
    actions?: unknown;
  };
  const rawActions = Array.isArray(candidate.actions) ? candidate.actions : [];
  const seen = new Set<string>();
  const clean: ForYouAction[] = [];
  for (const value of rawActions) {
    if (!isForYouAction(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  clean.sort((a, b) => a.priority - b.priority);

  return {
    actions: clean,
    generatedAt:
      typeof candidate.generatedAt === 'string'
        ? candidate.generatedAt
        : empty.generatedAt,
    validUntil:
      typeof candidate.validUntil === 'string'
        ? candidate.validUntil
        : empty.validUntil,
    userSegment:
      typeof candidate.userSegment === 'string'
        ? candidate.userSegment
        : 'all',
  };
}
