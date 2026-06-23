/**
 * Re-engage Lapsed Customers — daily-action rule.
 *
 * Fires when a merchant has ≥ MIN_LAPSED_COUNT customers who haven't
 * visited in ≥ LAPSED_DAYS (60 days), aligned with the Phase H
 * classify() definition of 'lapsed'.
 *
 * CTA launches the `bring-back-60d-lapsed` campaign template from Phase C.
 *
 * Previous gap (FIXED): This rule previously used Snapshot.isLapsed (31-90d
 * per the snapshot model) which diverged from Phase H's LAPSED_DAYS=60.
 * Now uses daysSinceLastVisit >= LAPSED_DAYS directly so both systems
 * share the same definition.
 *
 * Why the specific threshold
 * ──────────────────────────
 * Below 10 lapsed customers, the marginal value of a bring-back
 * campaign is lower than the attention cost on the dashboard.
 * The threshold is deliberately merchant-independent for the MVP;
 * a tuning pass will probably make it per-vertical later.
 */

import MerchantCustomerSnapshot from '../../../models/MerchantCustomerSnapshot';
import { logger } from '../../../config/logger';
import { LAPSED_DAYS } from '../../customerLifecycle/classify';
import type { Rule, RuleContext } from '../types';
import type { IDailyActionItem } from '../../../models/MerchantDailyAction';

const MIN_LAPSED_COUNT = 10;

export const reengageLapsedRule: Rule = {
  ruleId: 'reengage-lapsed',
  description: `Surface a "bring back lapsed customers" CTA when ≥${MIN_LAPSED_COUNT} have been absent ≥${LAPSED_DAYS}d`,

  async run(ctx: RuleContext): Promise<IDailyActionItem[]> {
    try {
      // FIX: Use daysSinceLastVisit >= LAPSED_DAYS instead of Snapshot.isLapsed
      // to stay aligned with Phase H's classify() definition.
      const cutoffDate = new Date(ctx.now);
      cutoffDate.setDate(cutoffDate.getDate() - LAPSED_DAYS);

      const lapsedCount = await MerchantCustomerSnapshot.countDocuments({
        merchantId: ctx.merchantId,
        lastVisitAt: { $lte: cutoffDate },
      });

      if (lapsedCount < MIN_LAPSED_COUNT) return [];

      const item: IDailyActionItem = {
        actionId: `reengage-lapsed:${String(ctx.merchantId)}`,
        kind: 'reengage-lapsed',
        title: `Re-engage ${lapsedCount} lapsed customers`,
        description:
          `${lapsedCount} customers haven't visited in ${LAPSED_DAYS}+ days. Launch the ` +
          `"We Miss You" campaign to bring them back with 25% off (capped at ₹300).`,
        icon: 'refresh-circle',
        // Big priority — retention >>> acquisition cost.
        priority: 85,
        cta: {
          kind: 'launch-template',
          target: 'bring-back-60d-lapsed',
          params: ctx.storeId ? { storeId: String(ctx.storeId) } : {},
        },
        data: {
          lapsedCount,
          thresholdUsed: MIN_LAPSED_COUNT,
          lapsedDaysThreshold: LAPSED_DAYS,
        },
      };
      return [item];
    } catch (err) {
      logger.warn('[daily-actions] reengage-lapsed rule failed — returning empty', {
        merchantId: String(ctx.merchantId),
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  },
};

// Exported constants for tests / tuning.
export const __testOnly = { MIN_LAPSED_COUNT, LAPSED_DAYS };
