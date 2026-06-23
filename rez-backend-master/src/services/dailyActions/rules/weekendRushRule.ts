/**
 * Weekend Rush — daily-action rule.
 *
 * Fires Thu–Sat (UTC day-of-week 4, 5, 6) to prompt the merchant to
 * launch the `weekend-rush` campaign template from Phase C, giving a
 * flat 10% off Sat–Sun. Rule deliberately doesn't check "has the
 * merchant already launched weekend-rush today?" — that dedup is the
 * campaign-template launch route's job via its idempotency key. We
 * surface the action; the tap is idempotent.
 *
 * Skipped on Sun–Wed — no weekend within the offer's 48h validity.
 */

import type { Rule, RuleContext } from '../types';
import type { IDailyActionItem } from '../../../models/MerchantDailyAction';

const ELIGIBLE_DOW = new Set<number>([4, 5, 6]); // Thu, Fri, Sat

export const weekendRushRule: Rule = {
  ruleId: 'launch-weekend-rush',
  description: 'Surface the "launch weekend rush" CTA Thu–Sat so merchants catch weekend spend',

  async run(ctx: RuleContext): Promise<IDailyActionItem[]> {
    const dow = ctx.now.getUTCDay();
    if (!ELIGIBLE_DOW.has(dow)) return [];

    const proximity = dow === 4 ? 'this weekend' : dow === 5 ? 'tomorrow' : 'today';

    const item: IDailyActionItem = {
      actionId: `launch-weekend-rush:${String(ctx.merchantId)}`,
      kind: 'launch-weekend-rush',
      title: `Launch your weekend offer`,
      description: `Weekend walk-ins are coming ${proximity}. Launch a 10% flat off ` +
        `campaign to your customer base in one tap — Sat + Sun only.`,
      icon: 'calendar',
      priority: dow === 6 ? 60 : dow === 5 ? 65 : 55,
      cta: {
        kind: 'launch-template',
        target: 'weekend-rush',
        params: ctx.storeId ? { storeId: String(ctx.storeId) } : {},
      },
      data: { proximity, dayOfWeek: dow },
    };
    return [item];
  },
};

export const __testOnly = { ELIGIBLE_DOW };
