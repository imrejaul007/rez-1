/**
 * Daily Actions — per-merchant generator.
 *
 * Resolves the merchant's primary active store (to scope store-aware
 * rules) + derives vertical, then hands off to the rules engine and
 * persists the result via MerchantDailyAction.upsertForDay.
 *
 * The cron job (src/jobs/dailyActionsJob.ts) iterates active merchants
 * and calls this module once per merchant.
 */

import type { Types } from 'mongoose';

import { logger } from '../../config/logger';
import MerchantDailyAction from '../../models/MerchantDailyAction';
import { Store } from '../../models/Store';
import { runEngine, ENGINE_VERSION } from './engine';
import type { RuleContext } from './types';

export type DailyActionsMode = 'off' | 'shadow' | 'primary';

export function getDailyActionsMode(): DailyActionsMode {
  const raw = (process.env.DAILY_ACTIONS_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

/** Derive merchant vertical from the given store's category. */
export function resolveVertical(store: {
  category?: { slug?: string; name?: string };
  businessCategory?: string;
} | null | undefined): RuleContext['vertical'] {
  const cat =
    store?.category?.slug || store?.category?.name || store?.businessCategory;
  if (!cat) return 'general';
  const lower = String(cat).toLowerCase();
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe'))
    return 'restaurant';
  if (lower.includes('salon') || lower.includes('spa') || lower.includes('beauty'))
    return 'salon';
  if (lower.includes('hotel')) return 'hotel';
  if (lower.includes('grocery') || lower.includes('kirana') || lower.includes('supermarket'))
    return 'grocery';
  return 'general';
}

/**
 * Generate + persist today's actions for a single merchant. Safe to
 * call multiple times per day — upsert on (merchantId, day) keeps it
 * idempotent.
 *
 * Returns the number of actions persisted. 0 means either the rules
 * all returned empty OR mode was 'off'.
 */
export async function generateForMerchant(
  merchantId: Types.ObjectId | string,
  now: Date = new Date(),
): Promise<number> {
  const mode = getDailyActionsMode();
  if (mode === 'off') return 0;

  // Primary active store — scope for rules that care about a store.
  let store: any = null;
  try {
    store = await Store.findOne({ merchantId, isActive: true })
      .select('category businessCategory')
      .lean();
  } catch (err) {
    logger.warn('[daily-actions] store lookup failed — proceeding vertical=general', {
      merchantId: String(merchantId),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const vertical = resolveVertical(store);
  const storeId = store?._id;

  const ctx: RuleContext = {
    merchantId,
    storeId,
    vertical,
    now,
  };

  const actions = await runEngine(ctx);

  // Filter by vertical — a rule may emit an action tagged with a
  // specific vertical list, and we only keep it if the merchant's
  // vertical matches or the list is empty/undefined.
  const filtered = actions.filter((a) => {
    if (!a.verticals || a.verticals.length === 0) return true;
    return a.verticals.includes(vertical);
  });

  const day = MerchantDailyAction.dayKey(now);
  await MerchantDailyAction.upsertForDay({
    merchantId,
    day,
    actions: filtered,
    shadow: mode === 'shadow',
    engineVersion: ENGINE_VERSION,
  });

  return filtered.length;
}
