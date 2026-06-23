/**
 * For-You-Today routes — REZ-vs-NUQTA migration (Phase 3.3)
 *
 * Sub-router mounted under `/api/b/foryou`. Returns a daily, AI-curated
 * "For You" feed of 3-5 personalised action cards computed from the
 * user's segment and recent activity. The data is mocked with a small
 * fixture set — the contract (request shape and response envelope) is
 * the stable surface; the fixtures will be replaced with a real
 * ranker once the migration is complete.
 *
 * Endpoints
 * ---------
 *   GET /api/b/foryou/today
 *     Returns today's curated feed for the authenticated user. Response:
 *       { actions: ForYouAction[],
 *         generatedAt: string,
 *         validUntil: string,
 *         userSegment: string }
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/foryou', foryouBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Type of personalisation slot the action occupies. */
export type ForYouActionType =
  | 'save'
  | 'insight'
  | 'lifestyle'
  | 'offer'
  | 'tip';

/**
 * One action card in the "For You Today" feed. Mirrors the frontend
 * `ForYouAction` interface in `types/foryou.types.ts`.
 */
export interface ForYouAction {
  id: string;
  type: ForYouActionType;
  title: string;
  description: string;
  ctaLabel: string;
  /** expo-router style path used by the client to navigate. */
  ctaRoute: string;
  iconEmoji: string;
  /** Lower = higher in the feed. */
  priority: number;
  expiresAt?: string;
  potentialSavingsPaise?: number;
}

/** Envelope returned by `GET /api/b/foryou/today`. */
export interface ForYouFeed {
  actions: ForYouAction[];
  generatedAt: string;
  validUntil: string;
  userSegment: string;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * The universal "everyone" cards. Always present, regardless of segment.
 * Sorted by `priority` ascending.
 */
const UNIVERSAL_ACTIONS: ReadonlyArray<ForYouAction> = [
  {
    id: 'tip-bill-split',
    type: 'tip',
    title: 'Did you know?',
    description: 'You can split bills with friends in seconds using Khata.',
    ctaLabel: 'Open Khata',
    ctaRoute: '/b/khata',
    iconEmoji: '🧾',
    priority: 30,
  },
  {
    id: 'insight-weekly-digest',
    type: 'insight',
    title: 'Your weekly digest is ready',
    description: 'See how much you saved, where you shopped, and what is trending.',
    ctaLabel: 'View digest',
    ctaRoute: '/b/social/weekly-digest',
    iconEmoji: '📊',
    priority: 50,
  },
];

/**
 * Cards targeted at users in the `student` segment. The router picks this
 * bucket when `userSegment` resolves to `'student'`.
 */
const STUDENT_ACTIONS: ReadonlyArray<ForYouAction> = [
  {
    id: 'save-groceries-200',
    type: 'save',
    title: 'Save ₹200 on groceries this week',
    description:
      'BigBazaar is running a flat ₹200 off on a ₹1,500 basket — perfect for a hostel run.',
    ctaLabel: 'See goal',
    ctaRoute: '/b/savings/goals',
    iconEmoji: '🛒',
    priority: 10,
    potentialSavingsPaise: 20000,
    expiresAt: '2026-06-27T23:59:59.000Z',
  },
  {
    id: 'offer-ccd-10pct',
    type: 'offer',
    title: 'Cafe Coffee Day is 10% off today',
    description:
      'Tap to claim a one-day coupon — valid at all CCD outlets in your city.',
    ctaLabel: 'Open store',
    ctaRoute: '/explore?store=ccd',
    iconEmoji: '☕',
    priority: 20,
    expiresAt: '2026-06-20T23:59:59.000Z',
    potentialSavingsPaise: 4500,
  },
  {
    id: 'tip-checkin-streak',
    type: 'lifestyle',
    title: '5-day streak — keep it up!',
    description:
      'You are 2 days away from your best streak this month. Check in to extend it.',
    ctaLabel: 'Check in',
    ctaRoute: '/b/checkin',
    iconEmoji: '🔥',
    priority: 40,
  },
];

/**
 * Cards targeted at users in the `professional` segment. Kept thin — the
 * student bucket doubles as the default "young urban" cohort.
 */
const PROFESSIONAL_ACTIONS: ReadonlyArray<ForYouAction> = [
  {
    id: 'save-fuel-300',
    type: 'save',
    title: 'Save ₹300 on fuel this month',
    description:
      'HPCL pump near you is offering 4% cashback on ₹3,000 fills through the month.',
    ctaLabel: 'See goal',
    ctaRoute: '/b/savings/goals',
    iconEmoji: '⛽',
    priority: 10,
    potentialSavingsPaise: 30000,
    expiresAt: '2026-06-30T23:59:59.000Z',
  },
  {
    id: 'offer-dominos-combo',
    type: 'offer',
    title: "Domino's medium pizza at ₹199",
    description: 'Limited lunch combo — two medium pizzas and a Pepsi for ₹399.',
    ctaLabel: 'Order now',
    ctaRoute: '/explore?store=dominos',
    iconEmoji: '🍕',
    priority: 20,
    expiresAt: '2026-06-22T23:59:59.000Z',
    potentialSavingsPaise: 12000,
  },
  {
    id: 'tip-checkin-streak-pro',
    type: 'lifestyle',
    title: '5-day streak — keep it up!',
    description:
      'You are 2 days away from your best streak this month. Check in to extend it.',
    ctaLabel: 'Check in',
    ctaRoute: '/b/checkin',
    iconEmoji: '🔥',
    priority: 40,
  },
];

/**
 * Default bucket used when no segment matches. Mirrors the student set
 * minus the CCD coffee offer (kept short so the feed stays focused).
 */
const DEFAULT_ACTIONS: ReadonlyArray<ForYouAction> = [
  {
    id: 'save-groceries-200-default',
    type: 'save',
    title: 'Save ₹200 on groceries this week',
    description:
      'BigBazaar is running a flat ₹200 off on a ₹1,500 basket — fresh picks for the week.',
    ctaLabel: 'See goal',
    ctaRoute: '/b/savings/goals',
    iconEmoji: '🛒',
    priority: 10,
    potentialSavingsPaise: 20000,
    expiresAt: '2026-06-27T23:59:59.000Z',
  },
  {
    id: 'tip-checkin-streak-default',
    type: 'lifestyle',
    title: '5-day streak — keep it up!',
    description:
      'You are 2 days away from your best streak this month. Check in to extend it.',
    ctaLabel: 'Check in',
    ctaRoute: '/b/checkin',
    iconEmoji: '🔥',
    priority: 40,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** MS in an hour — used to compute the feed's `validUntil` timestamp. */
const HOUR_MS = 60 * 60 * 1000;

/**
 * Resolve a `userSegment` string to one of the fixture buckets. Unknown
 * segments fall through to the default set so the feed is never empty.
 */
function actionsForSegment(segment: string): ReadonlyArray<ForYouAction> {
  const normalized = segment.trim().toLowerCase();
  if (normalized === 'student') return STUDENT_ACTIONS;
  if (normalized === 'professional' || normalized === 'pro') {
    return PROFESSIONAL_ACTIONS;
  }
  return DEFAULT_ACTIONS;
}

/**
 * Build a fresh feed envelope for the given segment. Caps the resulting
 * list to 6 actions so the feed stays quick to scan.
 */
function buildFeed(segment: string, nowMs: number): ForYouFeed {
  const segmentActions = actionsForSegment(segment);
  const merged: ForYouAction[] = [];
  const seen = new Set<string>();
  for (const action of [...segmentActions, ...UNIVERSAL_ACTIONS]) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    merged.push(action);
  }
  merged.sort((a, b) => a.priority - b.priority);
  const capped = merged.slice(0, 6);

  const generatedAt = new Date(nowMs).toISOString();
  const validUntil = new Date(nowMs + 6 * HOUR_MS).toISOString();
  return {
    actions: capped,
    generatedAt,
    validUntil,
    userSegment: segment.trim().toLowerCase() || 'all',
  };
}

/**
 * Coerce an arbitrary value into a `userSegment` string. Falls back to
 * `'all'` if the input is missing, not a string, or empty after trim.
 */
function resolveSegment(value: unknown): string {
  if (typeof value !== 'string') return 'all';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'all';
}

/**
 * Best-effort extraction of `userSegment` from the authenticated user.
 * The auth middleware attaches the full `IUser` document as `req.user`;
 * we look at the most common fields without depending on a specific
 * shape. Anything we can't find becomes `'all'`.
 */
function extractSegment(req: { user?: unknown }): string {
  if (typeof req.user !== 'object' || req.user === null) return 'all';
  const user = req.user as Record<string, unknown>;
  const candidates: unknown[] = [
    user['segment'],
    user['userSegment'],
    (user['profile'] as Record<string, unknown> | undefined)?.['segment'],
    (user['profile'] as Record<string, unknown> | undefined)?.['userSegment'],
    user['role'],
  ];
  for (const candidate of candidates) {
    const resolved = resolveSegment(candidate);
    if (resolved !== 'all') return resolved;
  }
  return 'all';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every foryou endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/foryou/today
 *
 * Returns the curated daily feed for the authenticated user. The segment
 * is read from the user document when available; otherwise the response
 * falls back to the "all" bucket so the endpoint is always useful.
 */
router.get('/today', (req, res) => {
  const nowMs = Date.now();
  const segment = extractSegment(req);
  const feed = buildFeed(segment, nowMs);

  try {
    logger.info('b_foryou_today_query', {
      userId:
        typeof (req as { userId?: unknown }).userId === 'string'
          ? (req as { userId?: string }).userId
          : null,
      userSegment: feed.userSegment,
      actionCount: feed.actions.length,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, feed);
});

export default router;