/**
 * Daily Actions — rule contract.
 *
 * Every rule is a pure-ish function that, given a RuleContext, returns
 * zero or more DailyActionItem objects. Rules MUST NOT throw — a rule
 * that wants to signal failure returns an empty array and (optionally)
 * logs. The engine will swallow unexpected throws defensively but a
 * thrown rule is a bug and should be treated as such.
 *
 * Rules have no knowledge of each other. The engine is responsible for
 * ranking, truncating, and deciding where the actions go.
 */

import type { Types } from 'mongoose';

import type { IDailyActionItem } from '../../models/MerchantDailyAction';

export interface RuleContext {
  merchantId: Types.ObjectId | string;
  /** The active store used for rule scoping (lapsed lookup, coupon
   *  lookup, vertical resolution). Optional because a merchant can have
   *  multiple stores; the engine scopes to the primary (first active). */
  storeId?: Types.ObjectId | string;
  /** Vertical derived from store category. Used by rules to filter in
   *  or out — e.g. "lunch hour" is a restaurant-only rule. */
  vertical: 'restaurant' | 'salon' | 'hotel' | 'grocery' | 'general';
  /** The UTC clock at generation time. Rules should read this instead
   *  of `new Date()` so tests can freeze time deterministically. */
  now: Date;
}

export interface Rule {
  /** Stable key. Used for analytics + per-rule disable flags. */
  ruleId: string;
  /** Human-readable summary for logs. */
  description: string;
  /**
   * Run the rule. Returns 0..N action items. Never throws.
   */
  run(ctx: RuleContext): Promise<IDailyActionItem[]>;
}
