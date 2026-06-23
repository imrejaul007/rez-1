/**
 * Karma module — B-feature migration types (Phase 4.2)
 *
 * These types mirror the backend contract at `/api/b/karma/*`. The Karma
 * module is the civic-impact surface of the REZ-vs-NUQTA migration: a user's
 * profile, mission ledger, leaderboard, and the communities they belong to.
 *
 * DATE CONVENTION:
 *   All timestamps are ISO 8601 strings (e.g. `2026-06-20T10:30:00.000Z`).
 *
 * LEVEL LADDER:
 *   The `currentLevel` field on `KarmaProfile` is a 4-step ladder. Backend
 *   thresholds (informational, the value is authoritative):
 *     L1 — Sprout       (0–499 karma)
 *     L2 — Contributor  (500–1,999 karma)
 *     L3 — Champion     (2,000–4,999 karma)
 *     L4 — Luminary     (5,000+ karma)
 *
 * LEADERBOARD PERIODS:
 *   `period` is the time window the leaderboard ranks over. Mirrors the
 *   backend enum: 'week' | 'month' | 'all'.
 */

// ---------------------------------------------------------------------------
// Karma profile
// ---------------------------------------------------------------------------

/**
 * The four discrete karma levels a user can be on. The level is computed
 * server-side from `totalKarma`; the UI never derives it from the number.
 */
export type KarmaLevel = 'L1' | 'L2' | 'L3' | 'L4';

/**
 * A user's full karma profile.
 *
 * @example
 * {
 *   userId: 'usr_01HXY',
 *   totalKarma: 1280,
 *   currentLevel: 'L2',
 *   trustScore: 86,
 *   badgesEarned: ['first_mission', 'streak_7', 'eco_warrior'],
 *   joinedAt: '2025-09-12T08:15:00.000Z'
 * }
 */
export interface KarmaProfile {
  /** Server-side user id (ULID/ObjectId stringified). */
  userId: string;
  /** Lifetime karma points accumulated. Always >= 0. */
  totalKarma: number;
  /** Authoritative level bucket — see KarmaLevel. */
  currentLevel: KarmaLevel;
  /**
   * 0-100 trust score that blends verification, community standing, and
   * behaviour. Always in [0, 100].
   */
  trustScore: number;
  /** Slugs of badges the user has earned. Render order is UI-side. */
  badgesEarned: string[];
  /** ISO 8601 timestamp of when the user joined the karma programme. */
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// Mission
// ---------------------------------------------------------------------------

/**
 * The four civic categories a mission can belong to. Drives the icon
 * shown on the mission card and the colour of the category pill.
 */
export type KarmaMissionCategory =
  | 'environment'
  | 'community'
  | 'health'
  | 'education';

/**
 * A single civic-impact mission the user can complete.
 *
 * @example
 * {
 *   id: 'm_plant_50_trees',
 *   title: 'Plant 50 saplings in your ward',
 *   description: '...',
 *   category: 'environment',
 *   karmaReward: 250,
 *   expiresAt: '2026-07-15T23:59:00.000Z',
 *   isCompleted: false,
 *   progressPct: 32
 * }
 */
export interface KarmaMission {
  /** Server-side mission id. */
  id: string;
  /** Short title shown in the mission card header. */
  title: string;
  /** 1-2 sentence description shown beneath the title. */
  description: string;
  /** Mission category — drives icon + colour. */
  category: KarmaMissionCategory;
  /** Karma points awarded on completion. */
  karmaReward: number;
  /** ISO 8601 timestamp; the mission expires at this point. */
  expiresAt: string;
  /** True once the user has marked this mission complete. */
  isCompleted: boolean;
  /** 0-100 integer; partial progress for multi-step missions. */
  progressPct: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * The time window the leaderboard ranks over.
 *  - 'week' — Monday-to-Sunday rolling window
 *  - 'month' — calendar month, rolling
 *  - 'all' — all-time
 */
export type KarmaLeaderboardPeriod = 'week' | 'month' | 'all';

/**
 * One row on the karma leaderboard. Rank is 1-indexed.
 */
export interface KarmaLeaderboardEntry {
  /** 1-indexed position on the leaderboard. */
  rank: number;
  userId: string;
  userName: string;
  /** Optional avatar URL; the UI falls back to initials if missing. */
  avatarUrl?: string;
  /** Karma total for the selected period (not lifetime). */
  totalKarma: number;
  /** Display level — string form for forward-compat with new levels. */
  level: string;
  /** True when this row is the requesting user. */
  isCurrentUser: boolean;
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

/**
 * A karma community the user can join. Communities bundle missions and
 * shared leaderboards around a theme.
 */
export interface KarmaCommunity {
  id: string;
  name: string;
  /** URL-safe slug; also used as a deep link target. */
  slug: string;
  /** Total members; monotonically non-decreasing per the mock. */
  memberCount: number;
  /** Karma earned by the community as a whole this week. */
  karmaThisWeek: number;
  /** Emoji shown as the community's icon. */
  iconEmoji: string;
  /** True when the requesting user has joined. */
  isJoined: boolean;
}
