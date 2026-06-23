/**
 * Daily Check-In routes — REZ-vs-NUQTA migration (Phase 3.1)
 *
 * Sub-router mounted under `/api/b/checkin`. Provides a tap-to-claim
 * daily coin reward with a 7-day streak ladder. The data is mock-only
 * today (a 7-day window of claimed/missed days) — the contract is the
 * stable surface that the B-side frontend binds to. The fixtures will be
 * replaced with real `streakCheckin` records once the migration is
 * complete.
 *
 * Endpoints
 * ---------
 *   GET  /api/b/checkin/status
 *     Returns today's status + the past 7-day window, the streak count,
 *     the coins earned this week, and a peek at the next milestone.
 *
 *   POST /api/b/checkin/claim
 *     Claims today's reward. Idempotent: claiming twice on the same day
 *     returns the original reward without granting it again.
 *
 * Reward ladder
 * -------------
 *   - 10 coins for a normal day.
 *   - +5 bonus when the streak lands on 7 days (1-week warrior).
 *   - +20 bonus when the streak lands on 30 days (monthly master).
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/checkin', checkinBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One day in the rolling 7-day window shown on the calendar.
 *
 * `state` is the canonical visual bucket the UI maps to an emoji:
 *   - 'claimed'  → user has already collected today's coin
 *   - 'missed'   → window day that was skipped (the streak broke)
 *   - 'pending'  → today, not yet claimed
 *   - 'future'   → outside window, never rendered
 */
export type CheckinDayState = 'claimed' | 'missed' | 'pending' | 'future';

export interface CheckinDay {
  /** ISO-8601 date (YYYY-MM-DD) for the local day. */
  date: string;
  /** Short weekday label (e.g. "Mon"). */
  weekday: string;
  /** Day-of-month number for the date strip. */
  dayOfMonth: number;
  state: CheckinDayState;
  /** Coins earned on this day; 0 for missed / pending / future. */
  coinsEarned: number;
}

/**
 * Reward granted by a single claim attempt.
 *
 * `totalCoins` is the base reward + any streak bonus that fired.
 */
export interface CheckinReward {
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  /** Human-readable label, e.g. "Daily reward" or "1-week warrior bonus". */
  label: string;
  /** True when the bonus was a milestone (7/30 day) rather than a flat day. */
  isMilestone: boolean;
}

export interface CheckinStatusResponse {
  isClaimedToday: boolean;
  currentStreakDays: number;
  lastClaimDate: string | null;
  weekData: CheckinDay[];
  totalCoinsEarnedThisWeek: number;
  nextMilestoneDays: number;
  nextMilestoneReward: string;
}

export interface CheckinClaimResponse {
  reward: CheckinReward;
  isClaimedToday: boolean;
  currentStreakDays: number;
  /** ISO-8601 timestamp; the next claim becomes available ~24h later. */
  nextClaimAvailableAt: string;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Static 7-day window (today inclusive, going back 6 days).
 * Today is index 6; index 0 is the oldest day.
 *
 *   - Index 0–3: claimed, claimed, missed, claimed  → streak broke at idx 2
 *   - Index 4–5: claimed, claimed                   → streak rebuilding
 *   - Index 6:   pending (today)
 */
const FIXTURE_WEEK_STATES: ReadonlyArray<{
  state: CheckinDayState;
  coinsEarned: number;
}> = [
  { state: 'claimed', coinsEarned: 10 },
  { state: 'claimed', coinsEarned: 10 },
  { state: 'missed', coinsEarned: 0 },
  { state: 'claimed', coinsEarned: 10 },
  { state: 'claimed', coinsEarned: 10 },
  { state: 'claimed', coinsEarned: 10 },
  { state: 'pending', coinsEarned: 0 },
];

/**
 * Milestone ladder. Mirrors `useStreakDisplay` on the frontend.
 * Each entry is `[streakDaysToTrigger, bonusCoins, label]`.
 */
const MILESTONES: ReadonlyArray<readonly [number, number, string]> = [
  [7, 5, '1-week warrior bonus'],
  [30, 20, 'Monthly master bonus'],
] as const;

const BASE_DAILY_REWARD = 10;

// ---------------------------------------------------------------------------
// Mutable per-user state
// ---------------------------------------------------------------------------

/**
 * We keep the in-flight claim state in a module-level object so the
 * mock is interactive (claim → status reflects it). For the duration
 * of the migration the only "user" is anonymous and unauthenticated
 * from the route layer's perspective — `authenticate` is the only
 * gate and we key the mock by `req.userId ?? 'anonymous'`.
 */
interface UserCheckinState {
  /** ISO date of the last successful claim, or null. */
  lastClaimDate: string | null;
  /** Current streak length (1 on the day after a successful claim). */
  currentStreakDays: number;
  /** Calendar day number on which the current streak began. */
  streakStartedOnDayIndex: number;
}

const userState: UserCheckinState = {
  lastClaimDate: null,
  currentStreakDays: 0,
  streakStartedOnDayIndex: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS: ReadonlyArray<string> = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Return a YYYY-MM-DD string for a Date in local time. */
function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Add `days` whole days to a Date and return a new Date. */
function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Build the 7-day window ending today (inclusive). Index 0 is the
 * oldest day; the last index is today.
 */
function buildWeekData(): CheckinDay[] {
  const today = new Date();
  const out: CheckinDay[] = [];
  for (let i = 0; i < FIXTURE_WEEK_STATES.length; i += 1) {
    const date = addDays(today, i - (FIXTURE_WEEK_STATES.length - 1));
    const fixture = FIXTURE_WEEK_STATES[i] as {
      state: CheckinDayState;
      coinsEarned: number;
    };
    out.push({
      date: toIsoDate(date),
      weekday: WEEKDAYS[date.getDay()] as string,
      dayOfMonth: date.getDate(),
      state: fixture.state,
      coinsEarned: fixture.coinsEarned,
    });
  }
  return out;
}

/** Sum the coins earned across the rendered week (claimed days only). */
function totalCoinsThisWeek(week: ReadonlyArray<CheckinDay>): number {
  let total = 0;
  for (const day of week) {
    if (day.state === 'claimed') total += day.coinsEarned;
  }
  return total;
}

/**
 * Pick the next milestone that the current streak hasn't yet hit.
 * Mirrors `useStreakDisplay` on the frontend.
 */
function nextMilestone(streakDays: number): { days: number; reward: string } {
  for (const [days, , label] of MILESTONES) {
    if (streakDays < days) {
      return { days: days - streakDays, reward: label };
    }
  }
  // Beyond the ladder — next multiple of 100.
  const nextHundred = Math.floor(streakDays / 100) * 100 + 100;
  return { days: nextHundred - streakDays, reward: `Centurion+ (${nextHundred} days)` };
}

/** Compute the reward for a (would-be) claim of streak length `n`. */
function computeReward(streakAfterClaim: number): CheckinReward {
  let bonus = 0;
  let bonusLabel = '';
  let isMilestone = false;
  for (const [days, bonusCoins, label] of MILESTONES) {
    if (streakAfterClaim === days) {
      bonus = bonusCoins;
      bonusLabel = label;
      isMilestone = true;
      break;
    }
  }
  const total = BASE_DAILY_REWARD + bonus;
  return {
    baseCoins: BASE_DAILY_REWARD,
    bonusCoins: bonus,
    totalCoins: total,
    label: bonus > 0 ? bonusLabel : 'Daily reward',
    isMilestone,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every checkin endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/checkin/status
 *
 * Returns the current user's check-in state — today's status, the past
 * 7-day window, streak count, this week's earnings, and the next
 * milestone target. Mock data today; real persistence comes after the
 * Phase 3.1 migration window.
 */
router.get('/status', (req, res) => {
  const weekData = buildWeekData();
  const todayIso = toIsoDate(new Date());
  const isClaimedToday = userState.lastClaimDate === todayIso;

  // Roll the streak forward if a previous claim exists but is older
  // than yesterday — streak should reset to 0 for the response.
  let reportedStreak = userState.currentStreakDays;
  if (userState.lastClaimDate !== null) {
    const last = new Date(`${userState.lastClaimDate}T00:00:00`);
    const daysSinceLast = Math.floor(
      (new Date(`${todayIso}T00:00:00`).getTime() - last.getTime()) / 86400000,
    );
    if (daysSinceLast > 1) {
      reportedStreak = 0;
    }
  }

  const totalCoins = totalCoinsThisWeek(weekData);
  const milestone = nextMilestone(reportedStreak);

  try {
    logger.info('b_checkin_status', {
      userId: req.userId ?? null,
      isClaimedToday,
      currentStreakDays: reportedStreak,
    });
  } catch {
    /* logger must never block the response */
  }

  const payload: CheckinStatusResponse = {
    isClaimedToday,
    currentStreakDays: reportedStreak,
    lastClaimDate: userState.lastClaimDate,
    weekData,
    totalCoinsEarnedThisWeek: totalCoins,
    nextMilestoneDays: milestone.days,
    nextMilestoneReward: milestone.reward,
  };
  return bSuccess(res, payload);
});

/**
 * POST /api/b/checkin/claim
 *
 * Claims today's daily reward. Idempotent: if the user has already
 * claimed today, returns the original reward without granting it a
 * second time and reports `isClaimedToday: true`.
 */
router.post('/claim', (req, res) => {
  const todayIso = toIsoDate(new Date());
  if (userState.lastClaimDate === todayIso) {
    // Idempotent re-claim — return the current streak's reward shape.
    const reward = computeReward(userState.currentStreakDays);
    const payload: CheckinClaimResponse = {
      reward,
      isClaimedToday: true,
      currentStreakDays: userState.currentStreakDays,
      nextClaimAvailableAt: addDays(new Date(), 1).toISOString(),
    };
    return bSuccess(res, payload, 'Already claimed today');
  }

  // Decide whether the streak continues or resets.
  let nextStreak = 1;
  if (userState.lastClaimDate !== null) {
    const last = new Date(`${userState.lastClaimDate}T00:00:00`);
    const daysSinceLast = Math.floor(
      (new Date(`${todayIso}T00:00:00`).getTime() - last.getTime()) / 86400000,
    );
    if (daysSinceLast === 1) {
      nextStreak = userState.currentStreakDays + 1;
    }
  }

  userState.lastClaimDate = todayIso;
  userState.currentStreakDays = nextStreak;

  const reward = computeReward(nextStreak);

  try {
    logger.info('b_checkin_claim', {
      userId: req.userId ?? null,
      streakAfterClaim: nextStreak,
      totalCoins: reward.totalCoins,
      isMilestone: reward.isMilestone,
    });
  } catch {
    /* logger must never block the response */
  }

  const payload: CheckinClaimResponse = {
    reward,
    isClaimedToday: true,
    currentStreakDays: nextStreak,
    nextClaimAvailableAt: addDays(new Date(), 1).toISOString(),
  };
  return bSuccess(res, payload, 'Reward claimed');
});

/**
 * Fallback: an unknown checkin sub-route under the namespaced router
 * returns a 404. Keeps error envelopes consistent with the rest of
 * the B namespace.
 */
router.use((req, res) => {
  void req;
  return bError(
    res,
    `Unknown checkin endpoint: ${req.method} ${req.originalUrl}`,
    404,
  );
});

export default router;
