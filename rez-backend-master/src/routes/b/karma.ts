/**
 * Karma routes — REZ-vs-NUQTA migration (Phase 4.2)
 *
 * Sub-router mounted under `/api/b/karma`. Provides the civic-impact
 * surface: profile, missions, leaderboard, communities. The data is
 * mock-only today — the contract is the stable surface that the
 * B-side frontend binds to. The fixtures will be replaced with real
 * karma records once the migration is complete.
 *
 * Endpoints
 * ---------
 *   GET  /api/b/karma/profile
 *     Returns the requesting user's `KarmaProfile`.
 *
 *   GET  /api/b/karma/missions
 *     Returns the active mission list.
 *
 *   POST /api/b/karma/missions/:id/complete
 *     Marks a mission complete; returns the updated mission + the
 *     karma delta that should be added to the user's profile.
 *
 *   GET  /api/b/karma/leaderboard?period=week|month|all
 *     Returns the top-20 leaderboard for the given period. The
 *     current user is inserted somewhere in the window.
 *
 *   GET  /api/b/karma/communities
 *     Returns the available karma communities.
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/karma', karmaBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type KarmaLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type KarmaMissionCategory =
  | 'environment'
  | 'community'
  | 'health'
  | 'education';

export type KarmaLeaderboardPeriod = 'week' | 'month' | 'all';

export interface KarmaProfile {
  userId: string;
  totalKarma: number;
  currentLevel: KarmaLevel;
  trustScore: number;
  badgesEarned: string[];
  joinedAt: string;
}

export interface KarmaMission {
  id: string;
  title: string;
  description: string;
  category: KarmaMissionCategory;
  karmaReward: number;
  expiresAt: string;
  isCompleted: boolean;
  progressPct: number;
}

export interface KarmaMissionCompleteResponse {
  mission: KarmaMission;
  karmaDelta: number;
}

export interface KarmaLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  totalKarma: number;
  level: string;
  isCurrentUser: boolean;
}

export interface KarmaLeaderboardResponse {
  period: KarmaLeaderboardPeriod;
  userRank: number | null;
  entries: KarmaLeaderboardEntry[];
}

export interface KarmaCommunity {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  karmaThisWeek: number;
  iconEmoji: string;
  isJoined: boolean;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Static profile used while the karma module is a stub. */
const FIXTURE_PROFILE: KarmaProfile = {
  userId: 'me',
  totalKarma: 1280,
  currentLevel: 'L2',
  trustScore: 86,
  badgesEarned: [
    'first_mission',
    'streak_7',
    'eco_warrior',
    'community_builder',
  ],
  // 90 days back from "now" — `joinedAt` is informational.
  joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
};

/** 5 active missions. A real implementation will scope by `userId`. */
const FIXTURE_MISSIONS: ReadonlyArray<KarmaMission> = [
  {
    id: 'm_plant_50_trees',
    title: 'Plant 50 saplings in your ward',
    description:
      'Join the weekend drive at the Laskar Hills nursery. Tools and saplings are provided.',
    category: 'environment',
    karmaReward: 250,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: false,
    progressPct: 32,
  },
  {
    id: 'm_visit_5_merchants',
    title: 'Visit 5 small merchants in your locality',
    description:
      'Spend at least ₹100 at each — verified via the merchant\'s bill upload.',
    category: 'community',
    karmaReward: 120,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: false,
    progressPct: 60,
  },
  {
    id: 'm_blood_drive',
    title: 'Donate blood at the HSR camp',
    description:
      'Walk-in donations on Saturday between 9 and 13. Bring a photo ID.',
    category: 'health',
    karmaReward: 400,
    expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: false,
    progressPct: 0,
  },
  {
    id: 'm_teach_weekend',
    title: 'Teach a weekend class for under-12s',
    description:
      '2-hour slots available at the Koramangala community library.',
    category: 'education',
    karmaReward: 300,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: false,
    progressPct: 0,
  },
  {
    id: 'm_park_cleanup',
    title: 'Clean up your neighbourhood park',
    description:
      'Submit before + after photos to claim. Gloves and bags on us.',
    category: 'environment',
    karmaReward: 150,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: true,
    progressPct: 100,
  },
];

/**
 * Mutable per-user state. Keyed by `req.userId` so concurrent users
 * (in tests) don't see each other's progress. The migration's
 * real implementation will move this to a `karma_mission_complete`
 * table.
 */
const userState: Map<string, Set<string>> = new Map();

function isCompletedFor(userId: string, missionId: string): boolean {
  const set = userState.get(userId);
  if (set === undefined) return false;
  return set.has(missionId);
}

function markCompletedFor(userId: string, missionId: string): void {
  let set = userState.get(userId);
  if (set === undefined) {
    set = new Set<string>();
    userState.set(userId, set);
  }
  set.add(missionId);
}

/**
 * Synthetic leaderboard. Rank 1 = highest. The current user is inserted
 * at rank 11 so we exercise the "your rank" code path on the client.
 */
const LEADERBOARD_USERS: ReadonlyArray<{
  userId: string;
  userName: string;
  level: string;
  baseKarma: number;
}> = [
  { userId: 'u_001', userName: 'Ananya R.', level: 'L4', baseKarma: 5820 },
  { userId: 'u_002', userName: 'Vikram S.', level: 'L4', baseKarma: 5210 },
  { userId: 'u_003', userName: 'Priya M.', level: 'L3', baseKarma: 4680 },
  { userId: 'u_004', userName: 'Rahul K.', level: 'L3', baseKarma: 4120 },
  { userId: 'u_005', userName: 'Sneha P.', level: 'L3', baseKarma: 3950 },
  { userId: 'u_006', userName: 'Aditya V.', level: 'L3', baseKarma: 3610 },
  { userId: 'u_007', userName: 'Meera N.', level: 'L3', baseKarma: 3220 },
  { userId: 'u_008', userName: 'Karthik J.', level: 'L2', baseKarma: 2810 },
  { userId: 'u_009', userName: 'Ishita T.', level: 'L2', baseKarma: 2440 },
  { userId: 'u_010', userName: 'Rohan D.', level: 'L2', baseKarma: 2120 },
  // Rank 11 — current user slot.
  { userId: 'me', userName: 'You', level: 'L2', baseKarma: 1880 },
  { userId: 'u_011', userName: 'Tanvi G.', level: 'L2', baseKarma: 1750 },
  { userId: 'u_012', userName: 'Arjun B.', level: 'L2', baseKarma: 1620 },
  { userId: 'u_013', userName: 'Divya S.', level: 'L2', baseKarma: 1480 },
  { userId: 'u_014', userName: 'Manish A.', level: 'L2', baseKarma: 1310 },
  { userId: 'u_015', userName: 'Riya L.', level: 'L2', baseKarma: 1180 },
  { userId: 'u_016', userName: 'Sahil H.', level: 'L1', baseKarma: 990 },
  { userId: 'u_017', userName: 'Naina O.', level: 'L1', baseKarma: 880 },
  { userId: 'u_018', userName: 'Karan W.', level: 'L1', baseKarma: 770 },
  { userId: 'u_019', userName: 'Pooja C.', level: 'L1', baseKarma: 650 },
  { userId: 'u_020', userName: 'Yash F.', level: 'L1', baseKarma: 510 },
];

const FIXTURE_COMMUNITIES: ReadonlyArray<KarmaCommunity> = [
  {
    id: 'c_green_koramangala',
    name: 'Green Koramangala',
    slug: 'green-koramangala',
    memberCount: 1284,
    karmaThisWeek: 18420,
    iconEmoji: '🌳',
    isJoined: true,
  },
  {
    id: 'c_health_indiranagar',
    name: 'Health Indiranagar',
    slug: 'health-indiranagar',
    memberCount: 612,
    karmaThisWeek: 9320,
    iconEmoji: '💪',
    isJoined: false,
  },
  {
    id: 'c_tutors_btm',
    name: 'BTM Tutors',
    slug: 'btm-tutors',
    memberCount: 432,
    karmaThisWeek: 7140,
    iconEmoji: '📚',
    isJoined: false,
  },
  {
    id: 'c_civic_hsr',
    name: 'HSR Civic Circle',
    slug: 'hsr-civic-circle',
    memberCount: 805,
    karmaThisWeek: 12560,
    iconEmoji: '🏘️',
    isJoined: true,
  },
  {
    id: 'c_mentors_all',
    name: 'Mentors Network',
    slug: 'mentors-network',
    memberCount: 2104,
    karmaThisWeek: 24180,
    iconEmoji: '🧑‍🏫',
    isJoined: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAFE_PERIODS: ReadonlyArray<KarmaLeaderboardPeriod> = [
  'week',
  'month',
  'all',
];

function safePeriod(value: unknown): KarmaLeaderboardPeriod {
  if (typeof value === 'string') {
    for (const candidate of SAFE_PERIODS) {
      if (candidate === value) return candidate;
    }
  }
  return 'week';
}

/**
 * Apply the period as a multiplier on the base karma. The mock just
 * "rescales" so the leaderboard is non-trivial in every window without
 * us having to author 3 × 20 fixtures.
 */
function periodMultiplier(period: KarmaLeaderboardPeriod): number {
  switch (period) {
    case 'week':
      return 0.18;
    case 'month':
      return 0.55;
    case 'all':
      return 1;
  }
}

function clampInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

// ---------------------------------------------------------------------------
// Mutable mission store
// ---------------------------------------------------------------------------

/** Working copy of the fixture missions, mutable per user. */
const missionsStore: KarmaMission[] = FIXTURE_MISSIONS.map((m) => ({ ...m }));

function findMission(id: string): KarmaMission | null {
  for (const mission of missionsStore) {
    if (mission.id === id) return mission;
  }
  return null;
}

function recomputeMissionsFor(userId: string): KarmaMission[] {
  return missionsStore.map((m) => ({
    ...m,
    isCompleted: m.isCompleted || isCompletedFor(userId, m.id),
  }));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every karma endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/karma/profile
 *
 * Returns the requesting user's karma profile (mock today; real
 * persistence comes after the Phase 4.2 migration window).
 */
router.get('/profile', (req, res) => {
  const userId = req.userId ?? 'anonymous';
  // The mock is the same for everyone, but in the real impl this would
  // be a `findOne({ userId })`.
  void userId;
  const payload: KarmaProfile = { ...FIXTURE_PROFILE };
  try {
    logger.info('b_karma_profile', { userId: req.userId ?? null });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, payload);
});

/**
 * GET /api/b/karma/missions
 *
 * Returns the user's active mission list. Marks missions complete
 * for this user if they've already been claimed.
 */
router.get('/missions', (req, res) => {
  const userId = req.userId ?? 'anonymous';
  const payload = recomputeMissionsFor(userId);
  try {
    logger.info('b_karma_missions_list', {
      userId: req.userId ?? null,
      count: payload.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, payload);
});

/**
 * POST /api/b/karma/missions/:id/complete
 *
 * Marks a mission as complete for the requesting user and returns the
 * updated mission + the karma delta. Idempotent: completing a mission
 * twice returns the original delta without granting it again.
 */
router.post('/missions/:id/complete', (req, res) => {
  const userId = req.userId ?? 'anonymous';
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (id.length === 0) {
    return bError(res, 'Mission id is required', 400);
  }
  const mission = findMission(id);
  if (mission === null) {
    return bError(res, `Unknown mission: ${id}`, 404);
  }

  const alreadyDone = isCompletedFor(userId, id);
  if (!alreadyDone) {
    markCompletedFor(userId, id);
    mission.isCompleted = true;
    mission.progressPct = 100;
  }

  const payload: KarmaMissionCompleteResponse = {
    mission: { ...mission },
    // Idempotent: delta is 0 on a re-claim.
    karmaDelta: alreadyDone ? 0 : clampInt(mission.karmaReward, 0),
  };

  try {
    logger.info('b_karma_mission_complete', {
      userId: req.userId ?? null,
      missionId: id,
      karmaDelta: payload.karmaDelta,
      idempotent: alreadyDone,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(
    res,
    payload,
    alreadyDone ? 'Mission already completed' : 'Mission completed',
  );
});

/**
 * GET /api/b/karma/leaderboard?period=week|month|all
 *
 * Returns the top-20 leaderboard for the requested period. The current
 * user is inserted at rank 11 so the UI can render the "Your rank"
 * affordance even when the user is far from the top.
 */
router.get('/leaderboard', (req, res) => {
  const period = safePeriod(req.query['period']);
  const userId = req.userId ?? 'anonymous';
  const mult = periodMultiplier(period);
  const top = LEADERBOARD_USERS.slice(0, 20);
  const entries: KarmaLeaderboardEntry[] = top.map((u, idx) => ({
    rank: idx + 1,
    userId: u.userId,
    userName: u.userName,
    totalKarma: clampInt(u.baseKarma * mult, 0),
    level: u.level,
    isCurrentUser: u.userId === 'me' || u.userId === userId,
  }));

  // userRank — for the mock, the current user always sits at index 10
  // (rank 11). Real implementations would query the leaderboard
  // table for the user's position.
  const userRank = 11;

  const payload: KarmaLeaderboardResponse = {
    period,
    userRank,
    entries,
  };

  try {
    logger.info('b_karma_leaderboard', {
      userId: req.userId ?? null,
      period,
      returned: entries.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, payload);
});

/**
 * GET /api/b/karma/communities
 *
 * Returns the karma communities the user can join.
 */
router.get('/communities', (req, res) => {
  try {
    logger.info('b_karma_communities_list', {
      userId: req.userId ?? null,
      count: FIXTURE_COMMUNITIES.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, FIXTURE_COMMUNITIES);
});

/**
 * Fallback: an unknown karma sub-route under the namespaced router
 * returns a 404. Keeps error envelopes consistent with the rest of
 * the B namespace.
 */
router.use((req, res) => {
  void req;
  return bError(
    res,
    `Unknown karma endpoint: ${req.method} ${req.originalUrl}`,
    404,
  );
});

export default router;
