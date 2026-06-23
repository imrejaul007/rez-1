/**
 * Daily Actions engine.
 *
 * Runs every registered Rule against a RuleContext, concatenates the
 * results, sorts by priority DESC, and truncates to MAX_ACTIONS_PER_DAY.
 *
 * The rule list is imported from `./rules/index.ts` so adding a new rule
 * is a one-line import + array push — no engine change required.
 *
 * Defensive: a rule that throws is caught and logged; its contribution
 * is treated as empty so one buggy rule never poisons the whole feed.
 */

import { logger } from '../../config/logger';
import type { IDailyActionItem } from '../../models/MerchantDailyAction';
import type { Rule, RuleContext } from './types';
import { ALL_RULES } from './rules';

/** Engine version — bump when the output shape or rule set changes in a
 *  way analytics should distinguish. Stored on each MerchantDailyAction
 *  row so we can cohort behaviour changes. */
export const ENGINE_VERSION = 1;

export const MAX_ACTIONS_PER_DAY = 5;

export async function runEngine(
  ctx: RuleContext,
  rules: readonly Rule[] = ALL_RULES,
): Promise<IDailyActionItem[]> {
  const results = await Promise.all(
    rules.map(async (rule) => {
      try {
        return await rule.run(ctx);
      } catch (err) {
        logger.error('[daily-actions] rule threw — dropping its output', {
          ruleId: rule.ruleId,
          merchantId: String(ctx.merchantId),
          error: err instanceof Error ? err.message : String(err),
        });
        return [] as unknown as IDailyActionItem[];
      }
    }),
  );

  const flat = results.flat();

  // Rank by priority descending, stable-ish by actionId for deterministic tests.
  flat.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.actionId.localeCompare(b.actionId);
  });

  return flat.slice(0, MAX_ACTIONS_PER_DAY);
}
