import { Order } from '../models/Order';
import { Store } from '../models/Store';
import { createServiceLogger } from '../config/logger';
import mongoose from 'mongoose';

const logger = createServiceLogger('campaign-forecast');

// ── Types ────────────────────────────────────────────────

export type CampaignType = 'cashback_percentage' | 'flat_bonus' | 'multiplier';

export interface SimulationInput {
  storeId: string;
  campaignType: CampaignType;
  rewardValue: number;          // e.g. 10 (10%, 10 coins, or 2x)
  budgetCap: number;            // total budget in coins
  durationDays: number;         // campaign duration
  estimatedDailyFootfall?: number;  // optional merchant override
  estimatedAvgBill?: number;        // optional merchant override
}

export interface SimulationResult {
  expectedLiability: number;
  dailyLiability: number;
  budgetLastsDays: number;

  currentRepeatRate: number;
  projectedRepeatRate: number;
  additionalRepeatVisits: number;

  breakageRate: number;
  coinBreakageEstimate: number;
  effectiveCost: number;

  projectedRevenueUplift: number;
  projectedROI: number;
  breakEvenDays: number;

  baseline: {
    dailyOrders: number;
    avgOrderValue: number;
    dailyRevenue: number;
    repeatRate: number;
    totalCustomers: number;
  };
}

// ── Constants ────────────────────────────────────────────

/** Industry avg: ~25% of awarded coins are never redeemed */
const DEFAULT_BREAKAGE_RATE = 0.25;

/** Cashback campaigns typically boost repeat visits by ~20% */
const REPEAT_VISIT_BOOST_FACTOR = 0.20;

/** Campaign-driven footfall increase estimate: ~15% */
const FOOTFALL_UPLIFT_FACTOR = 0.15;

/** Lookback window for historical baseline */
const BASELINE_DAYS = 90;

// ── Service ──────────────────────────────────────────────

class CampaignForecastService {
  /**
   * Run a campaign simulation and return projected metrics.
   */
  async simulate(input: SimulationInput): Promise<SimulationResult> {
    const {
      storeId,
      campaignType,
      rewardValue,
      budgetCap,
      durationDays,
      estimatedDailyFootfall,
      estimatedAvgBill,
    } = input;

    // 1. Fetch store baseline data
    const baseline = await this.getStoreBaseline(storeId);

    // 2. Use merchant overrides or historical data
    const dailyFootfall = estimatedDailyFootfall ?? baseline.dailyOrders;
    const avgBill = estimatedAvgBill ?? baseline.avgOrderValue;

    // 3. Fetch store's base cashback rate (for multiplier calc)
    const store = await Store.findById(storeId).select('rewardRules').lean();
    const baseCashback = (store as any)?.rewardRules?.baseCashbackPercent ?? 5;

    // 4. Calculate daily liability based on campaign type
    const dailyLiability = this.calculateDailyLiability(
      campaignType, rewardValue, dailyFootfall, avgBill, baseCashback,
    );

    // 5. Total expected liability
    const expectedLiability = dailyLiability * durationDays;

    // 6. Budget duration
    const budgetLastsDays = dailyLiability > 0
      ? Math.min(Math.floor(budgetCap / dailyLiability), durationDays)
      : durationDays;

    // 7. Repeat visit uplift
    const currentRepeatRate = baseline.repeatRate;
    const projectedRepeatRate = Math.min(
      currentRepeatRate * (1 + REPEAT_VISIT_BOOST_FACTOR),
      100,
    );
    const repeatRateGain = projectedRepeatRate - currentRepeatRate;
    const additionalRepeatVisits = Math.round(
      baseline.totalCustomers * (repeatRateGain / 100) * (durationDays / 30),
    );

    // 8. Coin breakage
    const breakageRate = DEFAULT_BREAKAGE_RATE;
    const coinBreakageEstimate = expectedLiability * breakageRate;
    const effectiveCost = expectedLiability - coinBreakageEstimate;

    // 9. Revenue uplift projection
    const footfallUplift = dailyFootfall * FOOTFALL_UPLIFT_FACTOR;
    const projectedRevenueUplift = (footfallUplift + (additionalRepeatVisits / Math.max(durationDays, 1)))
      * avgBill * durationDays;

    // 10. ROI
    const projectedROI = effectiveCost > 0
      ? ((projectedRevenueUplift - effectiveCost) / effectiveCost) * 100
      : 0;

    // 11. Break-even: days until cumulative revenue > cumulative cost
    const dailyRevUplift = projectedRevenueUplift / Math.max(durationDays, 1);
    const breakEvenDays = dailyRevUplift > dailyLiability
      ? Math.ceil(effectiveCost / (dailyRevUplift - dailyLiability * (1 - breakageRate)))
      : durationDays; // Never breaks even within campaign period

    return {
      expectedLiability: round2(expectedLiability),
      dailyLiability: round2(dailyLiability),
      budgetLastsDays,

      currentRepeatRate: round2(currentRepeatRate),
      projectedRepeatRate: round2(projectedRepeatRate),
      additionalRepeatVisits,

      breakageRate: round2(breakageRate * 100),
      coinBreakageEstimate: round2(coinBreakageEstimate),
      effectiveCost: round2(effectiveCost),

      projectedRevenueUplift: round2(projectedRevenueUplift),
      projectedROI: round2(projectedROI),
      breakEvenDays: Math.max(1, Math.min(breakEvenDays, durationDays)),

      baseline,
    };
  }

  /**
   * Get store's 90-day baseline metrics from order history.
   */
  private async getStoreBaseline(storeId: string): Promise<SimulationResult['baseline']> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - BASELINE_DAYS);

    try {
      const pipeline = [
        {
          $match: {
            store: new mongoose.Types.ObjectId(storeId),
            createdAt: { $gte: cutoff },
            status: { $in: ['confirmed', 'delivered', 'completed'] },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totals.subtotal' },
            avgOrderValue: { $avg: '$totals.subtotal' },
            uniqueCustomers: { $addToSet: '$user' },
          },
        },
      ];

      const [result] = await Order.aggregate(pipeline);

      if (!result || result.totalOrders === 0) {
        return {
          dailyOrders: 0,
          avgOrderValue: 0,
          dailyRevenue: 0,
          repeatRate: 0,
          totalCustomers: 0,
        };
      }

      const totalOrders = result.totalOrders;
      const totalRevenue = result.totalRevenue || 0;
      const avgOrderValue = result.avgOrderValue || 0;
      const uniqueCustomers = (result.uniqueCustomers || []).length;

      // Repeat rate: customers who ordered more than once / total customers
      const repeatCustomers = await this.getRepeatCustomerCount(storeId, cutoff);
      const repeatRate = uniqueCustomers > 0
        ? (repeatCustomers / uniqueCustomers) * 100
        : 0;

      return {
        dailyOrders: round2(totalOrders / BASELINE_DAYS),
        avgOrderValue: round2(avgOrderValue),
        dailyRevenue: round2(totalRevenue / BASELINE_DAYS),
        repeatRate: round2(repeatRate),
        totalCustomers: uniqueCustomers,
      };
    } catch (error) {
      logger.error('Failed to get store baseline', error as Error, { storeId });
      return {
        dailyOrders: 0,
        avgOrderValue: 0,
        dailyRevenue: 0,
        repeatRate: 0,
        totalCustomers: 0,
      };
    }
  }

  /**
   * Count customers who ordered more than once in the given period.
   */
  private async getRepeatCustomerCount(storeId: string, since: Date): Promise<number> {
    const pipeline = [
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId),
          createdAt: { $gte: since },
          status: { $in: ['confirmed', 'delivered', 'completed'] },
        },
      },
      { $group: { _id: '$user', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'repeatCustomers' },
    ];

    const [result] = await Order.aggregate(pipeline);
    return result?.repeatCustomers || 0;
  }

  /**
   * Calculate daily coin liability based on campaign type.
   */
  private calculateDailyLiability(
    type: CampaignType,
    rewardValue: number,
    dailyFootfall: number,
    avgBill: number,
    baseCashbackPercent: number,
  ): number {
    switch (type) {
      case 'cashback_percentage':
        // footfall × avgBill × cashback%
        return dailyFootfall * avgBill * (rewardValue / 100);

      case 'flat_bonus':
        // footfall × flat coin amount
        return dailyFootfall * rewardValue;

      case 'multiplier':
        // footfall × avgBill × baseCashback% × (multiplier - 1)
        // Only the ADDITIONAL coins beyond normal cashback
        return dailyFootfall * avgBill * (baseCashbackPercent / 100) * (rewardValue - 1);

      default:
        return 0;
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const campaignForecastService = new CampaignForecastService();
export default campaignForecastService;
