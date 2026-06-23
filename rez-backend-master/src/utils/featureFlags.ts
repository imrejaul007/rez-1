import FeatureFlag from '../models/FeatureFlag';
import redisService from '../services/redisService';

// ─── KILL-SWITCH KEYS ────────────────────────────────────────────────────────
// These constants are the canonical keys used by isFeatureEnabled() to gate
// business-critical flows at runtime. Each key maps to a DB-backed FeatureFlag
// document that any super-admin can toggle from the /api/admin/feature-flags UI
// WITHOUT a code deploy. The hardcoded GAMIFICATION_FLAGS booleans in
// gamificationFeatureFlags.ts remain the static compile-time fallback; these DB
// flags take precedence when present.
export const KILL_SWITCH = {
  PAYMENTS: 'kill_switch.payments', // Razor pay / BBPS payment flows
  REWARDS: 'kill_switch.rewards', // Cashback + coin issuance engine
  REFERRALS: 'kill_switch.referrals', // Referral reward disbursement
  CAMPAIGNS: 'kill_switch.campaigns', // Campaign redemption
  WALLET_CREDIT: 'kill_switch.wallet_credit', // Manual admin wallet credit/debit
  COINS: 'kill_switch.coins', // Coin-on-purchase (gamification.coins)
  MINI_GAMES: 'kill_switch.mini_games', // Spin wheel, scratch card, quiz
} as const;

export type KillSwitchKey = (typeof KILL_SWITCH)[keyof typeof KILL_SWITCH];

// FT-001 FIX: Replace the in-process Map with a Redis-backed cache.
//
// ROOT CAUSE: FLAG_CACHE was a plain in-memory Map. In a multi-pod deployment
// (e.g. 3 Node.js replicas behind a load balancer), toggling a flag calls
// FLAG_CACHE.delete(key) on exactly ONE pod — the one that handled the admin
// PATCH request. The other two pods keep serving the stale value until their
// individual 5-minute TTL naturally expires. For kill-switches (PAYMENTS,
// REWARDS, etc.) this means up to 5 minutes of continued processing after an
// emergency halt is issued.
//
// FIX: All pods share a single Redis key (feature_flag:<key>). The admin route
// calls invalidateFlagCache(key) which DELetes the Redis key; every pod's next
// call re-reads from DB and re-populates Redis. The in-process Map is kept as
// an L1 cache with a drastically reduced TTL (10 seconds) only to absorb
// thundering-herd DB reads on high-traffic keys — it is NOT the source of truth.
export const FLAG_CACHE = new Map<string, { enabled: boolean; percentage: number; expiresAt: number }>();
const L1_TTL_MS = 10 * 1000; // 10-second in-process cache (thundering-herd guard only)
const REDIS_TTL = 5 * 60; // 5 minutes in Redis (seconds, for setEx)

/**
 * Invalidate feature flag cache across all pods.
 * Must be called by admin routes after every flag mutation.
 *
 * FT-001: Deletes the shared Redis key so every pod gets a fresh DB read on
 *         next call. Also clears the local L1 Map slot immediately.
 */
export async function invalidateFlagCache(key: string): Promise<void> {
  FLAG_CACHE.delete(key);
  try {
    await redisService.del(`feature_flag:${key}`);
  } catch {
    // Non-fatal — the L1 TTL (10s) will expire shortly anyway
  }
}

// FT-002 FIX: Serialize concurrent DB fetches for the same key.
//
// ROOT CAUSE: Without a dedup guard, two concurrent calls for the same
// uncached key both bypass the L1 Map, fire separate DB queries, and
// independently call FLAG_CACHE.set(). If the DB is updated between the two
// queries, they can return contradictory results within the same request burst
// (e.g. one goroutine enables REWARDS kill-switch, the other doesn't).
//
// FIX: An in-flight promise map (inflight) serializes concurrent DB reads for
// the same key. The first miss fires the DB query and caches the promise;
// subsequent concurrent calls for the same key await the same promise rather
// than issuing their own DB call.
const inflight = new Map<string, Promise<boolean>>();

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const now = Date.now();

  // ── L1: in-process cache (10-second TTL, thundering-herd guard only) ──
  const l1 = FLAG_CACHE.get(key);
  if (l1 && l1.expiresAt > now) {
    if (!l1.enabled) return false;
    if (l1.percentage < 100 && userId) {
      const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return hash % 100 < l1.percentage;
    }
    return l1.enabled;
  }

  // ── L2: Redis shared cache (5-minute TTL, cross-pod coherent) ──
  try {
    const redisVal = await redisService.get<{ enabled: boolean; percentage: number }>(`feature_flag:${key}`);
    if (redisVal) {
      FLAG_CACHE.set(key, { ...redisVal, expiresAt: now + L1_TTL_MS });
      if (!redisVal.enabled) return false;
      if (redisVal.percentage < 100 && userId) {
        const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return hash % 100 < redisVal.percentage;
      }
      return redisVal.enabled;
    }
  } catch {
    // Redis down — fall through to DB
  }

  // ── L3: DB read with in-flight dedup ──
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const dbPromise = (async (): Promise<boolean> => {
    try {
      const flag = await FeatureFlag.findOne({ key }).lean();
      if (!flag) return false;

      const entry = { enabled: flag.enabled, percentage: flag.rolloutPercentage ?? 0 };

      // Populate both caches
      FLAG_CACHE.set(key, { ...entry, expiresAt: now + L1_TTL_MS });
      redisService.set(`feature_flag:${key}`, entry, REDIS_TTL).catch(() => {
        /* non-fatal */
      });

      if (!flag.enabled) return false;
      if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100 && userId) {
        const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return hash % 100 < flag.rolloutPercentage;
      }
      return flag.enabled;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, dbPromise);
  return dbPromise;
}

export async function seedDefaultFlags(): Promise<void> {
  const defaults = [
    {
      key: 'bill_split',
      enabled: true,
      description: 'Bill splitting feature at POS',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'waitlist',
      enabled: true,
      description: 'Waitlist for fully booked slots',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'patch_tests',
      enabled: true,
      description: 'Patch test tracking for salons',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'treatment_notes',
      enabled: true,
      description: 'Post-appointment treatment notes',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'rebooking_nudge',
      enabled: true,
      description: 'Rebooking nudge 6 weeks after appointment',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'coin_drop_anticipation',
      enabled: true,
      description: 'Countdown banner for upcoming coin drops',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'whatsapp_ordering',
      enabled: false,
      description: 'WhatsApp order placement (requires Meta API approval)',
      rolloutPercentage: 0,
      environments: ['staging'],
    },
    {
      key: 'ondc_integration',
      enabled: false,
      description: 'ONDC/Beckn protocol (requires govt registration)',
      rolloutPercentage: 0,
      environments: ['staging'],
    },
    {
      key: 'gold_savings',
      enabled: false,
      description: 'Digital gold savings feature',
      rolloutPercentage: 0,
      environments: ['staging'],
    },
    {
      key: 'insurance_products',
      enabled: false,
      description: 'Insurance product discovery',
      rolloutPercentage: 0,
      environments: ['staging'],
    },
    {
      key: 'bbps_payments',
      enabled: true,
      description: 'Bill payment through BBPS',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    {
      key: 'tips_at_pos',
      enabled: true,
      description: 'Tip collection at POS',
      rolloutPercentage: 100,
      environments: ['production'],
    },
    // ── KILL SWITCHES — business-critical features toggleable without a deploy ──
    // Flipping any of these to false in the DB instantly disables the feature
    // for all users without restarting the server (5-minute cache TTL applies).
    {
      key: KILL_SWITCH.PAYMENTS,
      enabled: true,
      description: 'KILL SWITCH: Razorpay / BBPS payment flows. Set false to halt all new payments.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
    {
      key: KILL_SWITCH.REWARDS,
      enabled: true,
      description: 'KILL SWITCH: Cashback & coin issuance engine. Set false to stop all reward disbursements.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
    {
      key: KILL_SWITCH.REFERRALS,
      enabled: true,
      description: 'KILL SWITCH: Referral reward disbursement. Set false to halt referral payouts.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
    {
      key: KILL_SWITCH.CAMPAIGNS,
      enabled: true,
      description: 'KILL SWITCH: Campaign deal redemption. Set false to block all campaign redemptions.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
    {
      key: KILL_SWITCH.WALLET_CREDIT,
      enabled: true,
      description: 'KILL SWITCH: Admin manual wallet credit/debit. Set false to block all manual adjustments.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
    {
      key: KILL_SWITCH.COINS,
      enabled: true,
      description: 'KILL SWITCH: Coin-on-purchase gamification. Set false to stop coin issuance on orders.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
    {
      key: KILL_SWITCH.MINI_GAMES,
      enabled: true,
      description: 'KILL SWITCH: Mini games (spin wheel, scratch card, quiz). Set false to disable all games.',
      rolloutPercentage: 100,
      environments: ['production', 'staging'],
    },
  ];

  await FeatureFlag.bulkWrite(
    defaults.map((flag) => ({
      updateOne: {
        filter: { key: flag.key },
        update: { $setOnInsert: flag },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}
