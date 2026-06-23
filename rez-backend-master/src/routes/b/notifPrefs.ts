/**
 * Notification Preferences routes — REZ-vs-NUQTA migration (Phase 3.5)
 *
 * Sub-router mounted under `/api/b/notif-prefs`. Provides a granular
 * per-channel × per-category preferences matrix for the B-side frontend.
 *
 * Endpoints
 * ---------
 *   GET /api/b/notif-prefs
 *     Returns the user's full preference matrix — 6 categories × 4
 *     channels = 24 entries. Response shape:
 *       { prefs: NotifPref[] }
 *
 *   PUT /api/b/notif-prefs
 *     Updates a single preference entry. Body:
 *       { category: string, channel: 'push'|'email'|'sms'|'in_app', enabled: boolean }
 *     Returns the full updated `prefs` array.
 *
 * Persistence: this migration phase ships an in-memory store keyed by user
 * id (see `USER_PREF_STORE` below). The shape — request envelope and
 * `NotifPref[]` payload — is the stable contract; the backing store will
 * be swapped for a Mongo / Redis collection once the migration lands.
 *
 * Defaults
 * --------
 *   - push + in_app ON for all 6 categories
 *   - email ON only for `weekly_digest` and `survey_invites`
 *   - sms OFF for every category
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/notif-prefs', notifPrefsBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported delivery channels for B-feature notifications. */
export type NotifChannel = 'push' | 'email' | 'sms' | 'in_app';

/**
 * The six top-level notification categories exposed by the B-side UI.
 *
 * Order matters — it drives the default ordering returned by GET.
 */
export const NOTIF_CATEGORIES = [
  'offers_cashback',
  'order_updates',
  'streak_reminders',
  'weekly_digest',
  'friend_activity',
  'survey_invites',
] as const;

export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

/** Supported delivery channels exposed by the B-side UI. */
export const NOTIF_CHANNELS: ReadonlyArray<NotifChannel> = [
  'push',
  'email',
  'sms',
  'in_app',
];

/**
 * One row in the preference matrix. A row is uniquely identified by the
 * `(category, channel)` tuple.
 */
export interface NotifPref {
  category: NotifCategory;
  channel: NotifChannel;
  enabled: boolean;
}

export interface NotifPrefsResponse {
  prefs: NotifPref[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Hardcoded defaults — kept stable for the duration of the migration so
 * frontend snapshots don't drift. Mirrors the spec from the migration doc:
 *   - push + in_app ON for every category
 *   - email ON only for `weekly_digest` and `survey_invites`
 *   - sms OFF for everything
 */
function buildDefaultPrefs(): NotifPref[] {
  const emailOn: ReadonlySet<NotifCategory> = new Set<NotifCategory>([
    'weekly_digest',
    'survey_invites',
  ]);
  const smsOn: ReadonlySet<NotifCategory> = new Set<NotifCategory>([]);

  const prefs: NotifPref[] = [];
  for (const category of NOTIF_CATEGORIES) {
    for (const channel of NOTIF_CHANNELS) {
      let enabled = false;
      if (channel === 'push' || channel === 'in_app') {
        enabled = true;
      } else if (channel === 'email') {
        enabled = emailOn.has(category);
      } else if (channel === 'sms') {
        enabled = smsOn.has(category);
      }
      prefs.push({ category, channel, enabled });
    }
  }
  return prefs;
}

const DEFAULT_PREFS: ReadonlyArray<NotifPref> = buildDefaultPrefs();

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/**
 * Per-user preference store. Re-keyed lazily on first read so we never
 * touch disk during the migration phase. Each user gets a clone of
 * `DEFAULT_PREFS` so mutations on one user don't leak across users.
 */
const USER_PREF_STORE: Map<string, NotifPref[]> = new Map();

function readUserPrefs(userId: string): NotifPref[] {
  let existing = USER_PREF_STORE.get(userId);
  if (!existing) {
    existing = DEFAULT_PREFS.map((p) => ({ ...p }));
    USER_PREF_STORE.set(userId, existing);
  }
  return existing;
}

function writeUserPrefs(userId: string, prefs: NotifPref[]): void {
  USER_PREF_STORE.set(userId, prefs);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isNotifCategory(value: unknown): value is NotifCategory {
  return (
    typeof value === 'string' &&
    (NOTIF_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

function isNotifChannel(value: unknown): value is NotifChannel {
  return (
    typeof value === 'string' &&
    (NOTIF_CHANNELS as ReadonlyArray<string>).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every notif-prefs endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/notif-prefs
 *
 * Returns the full preference matrix (24 entries) for the authenticated
 * user. Lazily seeds the store with default preferences on first read.
 */
router.get('/', (req, res) => {
  const userId = req.user?.id ?? 'anonymous';
  try {
    logger.info('b_notif_prefs_query', { userId });
  } catch {
    /* logger must never block the response */
  }
  const prefs = readUserPrefs(userId).map((p) => ({ ...p }));
  const payload: NotifPrefsResponse = { prefs };
  return bSuccess(res, payload);
});

/**
 * PUT /api/b/notif-prefs
 *
 * Updates a single preference entry — the `(category, channel)` tuple is
 * the unique key. Unknown categories or channels are rejected with HTTP
 * 400 so the frontend can't silently no-op a malformed request.
 */
router.put('/', (req, res) => {
  const userId = req.user?.id ?? 'anonymous';
  const body = (req.body ?? {}) as Record<string, unknown>;

  const category = body.category;
  const channel = body.channel;
  const enabled = body.enabled;

  if (!isNotifCategory(category)) {
    return bError(res, `Invalid category: ${String(category)}`, 400, {
      allowedCategories: [...NOTIF_CATEGORIES],
    });
  }
  if (!isNotifChannel(channel)) {
    return bError(res, `Invalid channel: ${String(channel)}`, 400, {
      allowedChannels: [...NOTIF_CHANNELS],
    });
  }
  if (typeof enabled !== 'boolean') {
    return bError(res, '`enabled` must be a boolean', 400);
  }

  const prefs = readUserPrefs(userId);
  let found = false;
  for (let i = 0; i < prefs.length; i += 1) {
    const row = prefs[i];
    if (row && row.category === category && row.channel === channel) {
      row.enabled = enabled;
      found = true;
      break;
    }
  }
  if (!found) {
    // Defensive: the store is normally fully-populated, but guard anyway.
    prefs.push({ category, channel, enabled });
  }
  writeUserPrefs(userId, prefs);

  try {
    logger.info('b_notif_pref_updated', { userId, category, channel, enabled });
  } catch {
    /* logger must never block the response */
  }

  const payload: NotifPrefsResponse = {
    prefs: prefs.map((p) => ({ ...p })),
  };
  return bSuccess(res, payload);
});

export default router;