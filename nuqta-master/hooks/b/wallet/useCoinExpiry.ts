/**
 * useCoinExpiry — derives expiring-coin summaries from the wallet store.
 *
 * Reads `walletStore.brandedCoins` (the same source as the existing
 * `BrandedCoinsScreen`) and identifies coins whose `expiryDate` falls
 * within the next 30 days. Returns the `CoinExpirySummary` shape from
 * `@/types/coin-expiry.types` so the existing `CoinExpiryWidget` and
 * `CoinExpiryList` components keep working, plus the expanded slice
 * shape the new banner / urgency-banner components need.
 *
 * The store types `brandedCoins` as `any[]` (the backend payload is
 * not yet fully modelled). We treat it as an array of
 * `ExpirableCoin`-shaped records — fields are read defensively and
 * anything that doesn't parse is skipped. This keeps the hook safe
 * even if a backend response is missing `expiryDate` on some items.
 *
 * @example
 *   ```tsx
 *   const { notices, totalExpiringPaise, mostUrgent } = useCoinExpiry();
 *   if (notices.length === 0) return null;
 *   ```
 */

import { useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import logger from '@/utils/logger';
import type {
  CoinExpiryNotice,
  CoinExpirySeverity,
  CoinExpirySummary,
} from '@/types/coin-expiry.types';
import {
  URGENT_DAYS_THRESHOLD,
  WARNING_DAYS_THRESHOLD,
  EXPIRY_WINDOW_DAYS,
} from '@/types/coin-expiry.types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A coin record that we expect to be able to read an `expiryDate` from.
 *
 * The wallet store types its `brandedCoins` array as `any[]`, so we keep
 * this permissive on purpose — every field is optional and the hook
 * skips records that can't be parsed.
 */
export interface ExpirableCoin {
  /** Stable identifier (e.g. merchant id, "rez-0", "promo-0"). */
  id?: string;
  /** Human-readable brand / merchant / source name. */
  brand?: string;
  /** Coin amount in the smallest unit (e.g. paise / smallest coin). */
  amount?: number;
  /** When this coin expires. */
  expiryDate?: Date | string | number | null;
  /** Whether this coin is a promo coin (drives UI styling). */
  isPromo?: boolean;
}

export interface ExpiringCoin extends ExpirableCoin {
  /** Required after normalization. */
  id: string;
  brand: string;
  amount: number;
  expiryDate: Date;
  isPromo: boolean;
  /** Days until expiry (negative means already expired). */
  daysUntilExpiry: number;
}

export interface UseCoinExpiryResult extends CoinExpirySummary {
  /** All coins expiring within 30 days, soonest first (raw records). */
  expiringSoon: ExpiringCoin[];
  /** Subset expiring within 7 days. */
  expiringThisWeek: ExpiringCoin[];
  /** Subset expiring in 8-30 days (i.e. not this week, but this month). */
  expiringThisMonth: ExpiringCoin[];
  /** Most-urgent expiring coin (raw record) or `null` when none. */
  mostUrgent: ExpiringCoin | null;
  /** Convenience: `true` when at least one notice is `urgent` (≤ 7 days). */
  isUrgent: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a value to a `Date` if it represents a valid instant. Returns
 * `null` for `null`, `undefined`, non-finite numbers, and unparseable
 * strings — we never want to throw inside a render.
 */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Bucket a `daysLeft` value into a `CoinExpirySeverity`.
 *
 *   - `urgent`  → ≤ `URGENT_DAYS_THRESHOLD`   (default 7)
 *   - `warning` → ≤ `WARNING_DAYS_THRESHOLD`  (default 14)
 *   - `info`    → ≤ `EXPIRY_WINDOW_DAYS`      (default 30)
 */
function severityFor(daysLeft: number): CoinExpirySeverity {
  if (daysLeft <= URGENT_DAYS_THRESHOLD) return 'urgent';
  if (daysLeft <= WARNING_DAYS_THRESHOLD) return 'warning';
  return 'info';
}

/**
 * Normalize a raw branded-coin record into a fully-typed `ExpiringCoin`.
 * Returns `null` if we can't read an `expiryDate` (i.e. the record is
 * not actually expirable).
 */
function normalizeCoin(raw: unknown): ExpiringCoin | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const expiry = toDate(r.expiryDate ?? r.expiry);
  if (expiry === null) return null;

  // amount can be undefined → treat as 0 (still surfaces the expiry)
  const amountRaw = r.amount;
  const amount =
    typeof amountRaw === 'number' && Number.isFinite(amountRaw) ? amountRaw : 0;

  // brand: backend uses merchantName, older payloads used brand / name
  const brandCandidates = [r.brand, r.merchantName, r.name];
  const brand =
    brandCandidates.find(
      (c): c is string => typeof c === 'string' && c.trim().length > 0,
    ) ?? 'Unknown';

  const idCandidates = [r.id, r.merchantId, r.coinId];
  const id =
    idCandidates.find(
      (c): c is string => typeof c === 'string' && c.trim().length > 0,
    ) ?? `coin-${expiry.getTime()}-${amount}`;

  const isPromo =
    r.isPromo === true ||
    r.type === 'promo' ||
    typeof r.promoDetails === 'object';

  const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / MS_PER_DAY);

  return {
    id,
    brand,
    amount,
    expiryDate: expiry,
    isPromo,
    daysUntilExpiry,
  };
}

/**
 * Project a normalized `ExpiringCoin` into the public `CoinExpiryNotice`
 * shape the components consume.
 */
function toNotice(coin: ExpiringCoin): CoinExpiryNotice {
  const daysLeft = Math.max(0, coin.daysUntilExpiry);
  return {
    coinId: coin.id,
    coinName: coin.brand,
    amountPaise: coin.amount,
    expiresAt: coin.expiryDate.toISOString(),
    daysLeft,
    severity: severityFor(daysLeft),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Derive expiring-coin data from the wallet store.
 *
 * The store's `brandedCoins` is typed as `any[]`; we treat each entry
 * as an `ExpirableCoin` and skip anything that doesn't carry a valid
 * `expiryDate`.
 */
export function useCoinExpiry(): UseCoinExpiryResult {
  const brandedCoins = useWalletStore((s) => s.brandedCoins);

  return useMemo<UseCoinExpiryResult>(() => {
    const safeArray = Array.isArray(brandedCoins) ? brandedCoins : [];

    const now = Date.now();
    const monthCutoff = now + EXPIRY_WINDOW_DAYS * MS_PER_DAY;

    // 1. Normalize + filter to "expiring within 30 days".
    const expiringSoon: ExpiringCoin[] = [];
    for (const raw of safeArray) {
      const coin = normalizeCoin(raw);
      if (!coin) continue;
      const expMs = coin.expiryDate.getTime();
      if (expMs < now) continue; // already expired — don't nag
      if (expMs > monthCutoff) continue;
      expiringSoon.push(coin);
    }

    // 2. Sort soonest first.
    expiringSoon.sort(
      (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
    );

    // 3. Bucket: this week vs the rest of the month.
    const weekCutoff = now + URGENT_DAYS_THRESHOLD * MS_PER_DAY;
    const expiringThisWeek: ExpiringCoin[] = [];
    const expiringThisMonth: ExpiringCoin[] = [];
    for (const coin of expiringSoon) {
      if (coin.expiryDate.getTime() <= weekCutoff) {
        expiringThisWeek.push(coin);
      } else {
        expiringThisMonth.push(coin);
      }
    }

    // 4. Aggregate.
    const totalExpiringPaise = expiringSoon.reduce(
      (sum, coin) => sum + (coin.amount > 0 ? coin.amount : 0),
      0,
    );

    const mostUrgent = expiringSoon[0] ?? null;

    // 5. Project to the public notices shape (consumed by the
    //    existing CoinExpiryList / CoinExpiryWidget).
    const notices: CoinExpiryNotice[] = expiringSoon.map(toNotice);

    const mostUrgentDaysLeft = notices.length === 0
      ? Number.POSITIVE_INFINITY
      : notices[0].daysLeft;

    const isUrgent = notices.some((n) => n.severity === 'urgent');

    return {
      notices,
      totalExpiringPaise,
      mostUrgentDaysLeft,
      expiringSoon,
      expiringThisWeek,
      expiringThisMonth,
      mostUrgent,
      isUrgent,
    };
  }, [brandedCoins]);
}

export default useCoinExpiry;
