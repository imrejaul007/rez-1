/**
 * Live Activity Feed — shared types.
 *
 * Powers the B-namespace "Realtime Activity Feed" feature (Phase 2.1).
 * The feed is a horizontal strip + vertical list on the Home tab that
 * surfaces recent orders, cashback events, deal claims, streak milestones,
 * and friend activity streamed over Socket.IO.
 *
 * Consumers
 * ---------
 *   - `hooks/b/social/useLiveActivity.ts` — fetches/merges live + polled data.
 *   - `components/b/social/LiveActivityStrip.tsx` — horizontal carousel.
 *   - `components/b/social/FriendsActivityFeed.tsx` — vertical friend list.
 *   - `app/b/social/live-activity.tsx` — full-screen page composing both.
 *
 * Stability contract
 * ------------------
 *   - `LiveActivityEvent` is the on-the-wire shape — do not add required
 *     fields without a coordinated backend roll-out.
 *   - All optional fields are flagged `?`; the UI must render defensively.
 *   - Amounts are always **paise** (₹1 = 100 paise) to match the rest of
 *     the Nuqta payment types.
 */

/**
 * Discriminator for the kind of activity event.
 *
 * Keep this union in sync with the backend's activity emitter. New
 * event types must be added here AND in the visual styling maps.
 */
export type LiveActivityType =
  | 'order_placed'
  | 'cashback_earned'
  | 'offer_redeemed'
  | 'streak_milestone'
  | 'friend_activity'
  | 'deal_claimed';

/**
 * A single activity event shown in the live feed.
 *
 * Shape matches the Socket.IO payload streamed from
 * `socket.events.broadcastActivity` and the HTTP fallback
 * `GET /api/b/activity/live`.
 */
export interface LiveActivityEvent {
  /** Stable server-assigned event id. Used as React key + dedupe key. */
  id: string;
  /** Discriminator for the kind of event. */
  type: LiveActivityType;
  /** Display name of the user who triggered the event. */
  userName: string;
  /** Optional avatar URL; UI falls back to an initial when missing. */
  userAvatarUrl?: string;
  /** Pre-formatted action sentence, e.g. "earned ₹50 cashback at BigBazaar". */
  action: string;
  /** Amount in paise (₹1 = 100). Undefined when no money is involved. */
  amountPaise?: number;
  /** Display name of the store where the event took place. */
  storeName?: string;
  /** Display title of the offer that triggered the event. */
  offerTitle?: string;
  /** ISO-8601 timestamp the event was emitted on the server. */
  timestamp: string;
  /** True if the actor is in the current user's friend graph. */
  isFriend: boolean;
}

/**
 * Wrapper payload for the HTTP fallback endpoint.
 *
 * The HTTP endpoint returns a small batch of recent events plus a
 * `totalToday` counter for the "12 events today" badge.
 */
export interface LiveActivityFeed {
  /** Most recent events, server-sorted newest-first. */
  events: LiveActivityEvent[];
  /** ISO-8601 timestamp of the last successful refresh. */
  lastUpdatedAt: string;
  /** Total count of all activity events emitted in the last 24h. */
  totalToday: number;
}

/**
 * User-facing filter chip selection on the friends-only vertical feed.
 *
 *   - `all`     — every friend event.
 *   - `orders`  — only `order_placed` events.
 *   - `cashback`— `cashback_earned` + `offer_redeemed` + `deal_claimed`.
 *   - `friends` — alias for `all`, kept for semantic clarity.
 */
export type ActivityFilter = 'all' | 'orders' | 'cashback' | 'friends';

/**
 * Return shape of `useLiveActivity`.
 *
 * `events` is always sorted newest-first and capped at 50 entries.
 * `isLive` mirrors the socket connection state — when false, callers
 * should consider showing a "reconnecting…" badge.
 */
export interface UseLiveActivityResult {
  /** Sorted, filtered list of recent activity events. */
  events: LiveActivityEvent[];
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
  /** Error from the most recent fetch; `null` when healthy. */
  error: Error | null;
  /** True when the socket is currently connected. */
  isLive: boolean;
  /** Force-refresh the HTTP fallback. No-op if socket is connected. */
  refresh: () => Promise<void>;
  /** Server-reported 24h total. */
  totalToday: number;
  /** ISO-8601 timestamp of the last successful update. */
  lastUpdatedAt: string;
}

/**
 * Props for the horizontal strip component.
 */
export interface LiveActivityStripProps {
  /** Events to render in the strip. */
  events: LiveActivityEvent[];
  /** Optional tap handler. When omitted, cards are non-interactive. */
  onEventPress?: (event: LiveActivityEvent) => void;
}

/**
 * Props for the vertical friends-only list component.
 */
export interface FriendsActivityFeedProps {
  /** Events to render; the component filters to `isFriend === true`. */
  events: LiveActivityEvent[];
  /** Optional tap handler. */
  onEventPress?: (event: LiveActivityEvent) => void;
}
