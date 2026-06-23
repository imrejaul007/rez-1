/**
 * AOV Reward Service — Consumer-side helper for checkout nudge banners.
 *
 * Resolves which AOV reward tier a given bill amount qualifies for,
 * and what the next upsell threshold is, based on active merchant configs.
 */

import mongoose from 'mongoose';
import AOVRewardTier, { IAOVTier } from '../models/AOVRewardTier';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('aov-reward-service');

export interface AOVRewardResult {
  qualifiedTier: IAOVTier | null;
  nextTier: IAOVTier | null;
  amountToNextTierPaise: number;
}

/**
 * Returns the best qualified AOV reward tier for a given bill amount,
 * plus the next tier threshold for upsell nudge display at checkout.
 *
 * Only considers configs that are:
 *   - isActive: true
 *   - valid for the current day-of-week and hour
 */
export async function getAOVRewardForBill(storeId: string, amountPaise: number): Promise<AOVRewardResult> {
  const now = new Date();
  const currentDay = now.getDay(); // 0 (Sun) – 6 (Sat)
  const currentHour = now.getHours(); // 0 – 23

  try {
    const configs = await AOVRewardTier.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      isActive: true,
    }).lean();

    // Filter by time window
    const validConfigs = configs.filter((cfg) => {
      const dayOk = !cfg.validDays || cfg.validDays.length === 0 || cfg.validDays.includes(currentDay);

      const hourStart = cfg.validHourStart ?? 0;
      const hourEnd = cfg.validHourEnd ?? 23;
      const hourOk = currentHour >= hourStart && currentHour <= hourEnd;

      return dayOk && hourOk;
    });

    if (validConfigs.length === 0) {
      return { qualifiedTier: null, nextTier: null, amountToNextTierPaise: 0 };
    }

    // Collect all tiers across valid configs, sorted ascending by threshold
    const allTiers: IAOVTier[] = validConfigs
      .flatMap((cfg) => cfg.tiers)
      .sort((a, b) => a.spendThresholdPaise - b.spendThresholdPaise);

    // Best qualified tier = highest threshold still <= amountPaise
    let qualifiedTier: IAOVTier | null = null;
    let nextTier: IAOVTier | null = null;

    for (const tier of allTiers) {
      if (amountPaise >= tier.spendThresholdPaise) {
        qualifiedTier = tier;
      } else {
        // First tier above the current amount
        if (!nextTier) nextTier = tier;
      }
    }

    const amountToNextTierPaise = nextTier ? Math.max(0, nextTier.spendThresholdPaise - amountPaise) : 0;

    return { qualifiedTier, nextTier, amountToNextTierPaise };
  } catch (err: any) {
    logger.error('[AOVRewardService] getAOVRewardForBill failed', {
      storeId,
      amountPaise,
      error: err.message,
    });
    return { qualifiedTier: null, nextTier: null, amountToNextTierPaise: 0 };
  }
}
