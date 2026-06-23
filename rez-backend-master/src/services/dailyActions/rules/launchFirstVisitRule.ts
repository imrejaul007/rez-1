/**
 * Launch First-Visit Offer — daily-action rule.
 *
 * Fires when the merchant has NO active first-visit coupon launched
 * from the `first-visit-offer` template in the last N days. First-visit
 * offer is the single highest-converting CAC mechanism in the platform
 * per the growth-strategy doc, so nagging a merchant who hasn't
 * launched it is one of the highest-value daily actions we can emit.
 *
 * "Active" = BroadcastCampaign with templateLaunch.templateId =
 * 'first-visit-offer' and status ∈ {queued, sending, sent} AND
 * generatedAt within the last 14 days. If nothing matches, we fire.
 */

import { BroadcastCampaign } from '../../../models/BroadcastCampaign';
import { logger } from '../../../config/logger';
import type { Rule, RuleContext } from '../types';
import type { IDailyActionItem } from '../../../models/MerchantDailyAction';

const LOOKBACK_DAYS = 14;

export const launchFirstVisitRule: Rule = {
  ruleId: 'launch-first-visit',
  description: 'Nag merchants without an active first-visit-offer to launch one',

  async run(ctx: RuleContext): Promise<IDailyActionItem[]> {
    try {
      const cutoff = new Date(ctx.now.getTime() - LOOKBACK_DAYS * 24 * 3600 * 1000);

      const existing = await BroadcastCampaign.findOne({
        merchantId: ctx.merchantId,
        'templateLaunch.templateId': 'first-visit-offer',
        createdAt: { $gte: cutoff },
        status: { $in: ['queued', 'sending', 'sent'] },
      })
        .select('_id')
        .lean();

      if (existing) return [];

      const item: IDailyActionItem = {
        actionId: `launch-first-visit:${String(ctx.merchantId)}`,
        kind: 'launch-first-visit',
        title: `Convert walk-ins with a first-visit offer`,
        description: `You haven't run a first-visit offer in the last ${LOOKBACK_DAYS} days. ` +
          `Launch ₹100 off for new customers to turn QR scanners into paying customers.`,
        icon: 'sparkles',
        priority: 70,
        cta: {
          kind: 'launch-template',
          target: 'first-visit-offer',
          params: ctx.storeId ? { storeId: String(ctx.storeId) } : {},
        },
        data: { lookbackDays: LOOKBACK_DAYS },
      };
      return [item];
    } catch (err) {
      logger.warn('[daily-actions] launch-first-visit rule failed — returning empty', {
        merchantId: String(ctx.merchantId),
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  },
};

export const __testOnly = { LOOKBACK_DAYS };
