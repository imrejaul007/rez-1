import { logger } from '../config/logger';
import * as cron from 'node-cron';
import redisService from '../services/redisService';
import CreatorProfile from '../models/CreatorProfile';
import CreatorPick from '../models/CreatorPick';
import CreatorConversion from '../models/CreatorConversion';
import EarningConfig from '../models/EarningConfig';
import { awardCoins } from '../services/coinService';
import mongoose from 'mongoose';

/**
 * Creator Program Background Jobs
 *
 * 1. Confirm Pending Conversions (every hour)
 * 2. Refresh Trending Scores (every 15 minutes)
 * 3. Refresh Creator Stats (every 30 minutes)
 * 4. Auto-Tier Upgrade (daily at 3 AM)
 */

// Job instances
let confirmConversionsJob: ReturnType<typeof cron.schedule> | null = null;
let trendingScoresJob: ReturnType<typeof cron.schedule> | null = null;
let refreshStatsJob: ReturnType<typeof cron.schedule> | null = null;
let autoTierJob: ReturnType<typeof cron.schedule> | null = null;

// ============================================
// 1. CONFIRM PENDING CONVERSIONS (Hourly)
// ============================================

async function confirmPendingConversions(): Promise<void> {
  const lockKey = 'lock:creator:confirm-conversions';

  try {
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('[CREATOR JOBS] Confirm conversions: lock not acquired, skipping');
      return;
    }

    // Get config
    const config = await EarningConfig.findOne();
    const pendingPeriodDays = config?.creatorProgram?.pendingPeriodDays || 7;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - pendingPeriodDays);

    // Find pending conversions past the pending period
    const pendingConversions = await CreatorConversion.find({
      status: 'pending',
      createdAt: { $lte: cutoffDate },
    }).limit(100);

    let confirmed = 0;
    let errors = 0;

    for (const conversion of pendingConversions) {
      try {
        conversion.status = 'confirmed';
        conversion.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          reason: 'Auto-confirmed after pending period',
        });
        await conversion.save();

        // Award coins to creator
        const creatorProfile = await CreatorProfile.findById(conversion.creator);
        if (creatorProfile) {
          // Invalidate earnings cache (pending amount changed)
          try { await redisService.delPattern(`earnings:consolidated:${creatorProfile.user.toString()}:*`); } catch (e) {}
        }
        if (creatorProfile) {
          const result = await awardCoins(
            creatorProfile.user.toString(),
            conversion.commissionAmount,
            'creator_commission',
            `Commission from pick conversion`,
            {
              conversionId: conversion._id,
              pickId: conversion.pick,
              orderId: conversion.order,
            }
          );

          if (result.success && result.transactionId) {
            conversion.status = 'paid';
            conversion.paidAt = new Date();
            conversion.coinTransactionId = new mongoose.Types.ObjectId(result.transactionId);
            conversion.statusHistory.push({
              status: 'paid',
              timestamp: new Date(),
              reason: 'Coins credited to wallet',
            });
            await conversion.save();
          }
        }

        confirmed++;
      } catch (err) {
        logger.error(`[CREATOR JOBS] Error confirming conversion ${conversion._id}:`, err);
        errors++;
      }
    }

    logger.info(`[CREATOR JOBS] Confirmed conversions: ${confirmed}, errors: ${errors}`);

    await redisService.releaseLock(lockKey, lockToken);
  } catch (err) {
    logger.error('[CREATOR JOBS] Error in confirmPendingConversions:', err);
  }
}

// ============================================
// 2. REFRESH TRENDING SCORES (Every 15 min)
// ============================================

async function refreshTrendingScores(): Promise<void> {
  const lockKey = 'lock:creator:trending-scores';

  try {
    const lockToken = await redisService.acquireLock(lockKey, 180);
    if (!lockToken) return;

    const now = new Date();

    // Get all published picks
    const picks = await CreatorPick.find({
      status: 'approved',
      isPublished: true,
    }).select('engagement conversions createdAt trendingScore');

    let updated = 0;

    for (const pick of picks) {
      const ageInHours = Math.max(
        (now.getTime() - new Date(pick.createdAt).getTime()) / (1000 * 60 * 60),
        1
      );

      const views = pick.engagement?.views || 0;
      const likes = pick.engagement?.likes?.length || 0;
      const shares = pick.engagement?.shares || 0;
      const clicks = pick.engagement?.clicks || 0;
      const conversions = pick.conversions?.totalPurchases || 0;

      // Hybrid trending formula
      const rawScore = (views * 1) + (likes * 5) + (shares * 10) + (clicks * 2) + (conversions * 50);
      const trendingScore = rawScore / Math.pow(ageInHours, 1.5);

      const isTrending = trendingScore > 10; // threshold

      if (pick.trendingScore !== trendingScore) {
        await CreatorPick.updateOne(
          { _id: pick._id },
          { $set: { trendingScore, isTrending } }
        );
        updated++;
      }
    }

    // Clear trending cache
    await redisService.del('creators:trending-picks:*');

    logger.info(`[CREATOR JOBS] Trending scores refreshed: ${updated}/${picks.length} picks updated`);

    await redisService.releaseLock(lockKey, lockToken);
  } catch (err) {
    logger.error('[CREATOR JOBS] Error in refreshTrendingScores:', err);
  }
}

// ============================================
// 3. REFRESH CREATOR STATS (Every 30 min)
// ============================================

async function refreshCreatorStats(): Promise<void> {
  const lockKey = 'lock:creator:refresh-stats';

  try {
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) return;

    const creators = await CreatorProfile.find({ status: 'approved' }).select('_id user');
    let updated = 0;

    for (const creator of creators) {
      try {
        // Aggregate pick stats
        const pickStats = await CreatorPick.aggregate([
          { $match: { creator: creator._id, status: 'approved' } },
          {
            $group: {
              _id: null,
              totalPicks: { $sum: 1 },
              totalViews: { $sum: '$engagement.views' },
              totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
              totalShares: { $sum: '$engagement.shares' },
              totalClicks: { $sum: '$engagement.clicks' },
            },
          },
        ]);

        // Aggregate conversion stats
        const conversionStats = await CreatorConversion.aggregate([
          { $match: { creator: creator._id, status: { $in: ['confirmed', 'paid'] } } },
          {
            $group: {
              _id: null,
              totalConversions: { $sum: 1 },
              totalEarnings: { $sum: '$commissionAmount' },
            },
          },
        ]);

        const ps = pickStats[0] || {};
        const cs = conversionStats[0] || {};

        const totalViews = ps.totalViews || 0;
        const totalLikes = ps.totalLikes || 0;

        // Calculate engagement rate
        const engagementRate = totalViews > 0
          ? ((totalLikes + (ps.totalShares || 0) + (ps.totalClicks || 0)) / totalViews) * 100
          : 0;

        await CreatorProfile.updateOne(
          { _id: creator._id },
          {
            $set: {
              'stats.totalPicks': ps.totalPicks || 0,
              'stats.totalViews': totalViews,
              'stats.totalLikes': totalLikes,
              'stats.totalShares': ps.totalShares || 0,
              'stats.totalConversions': cs.totalConversions || 0,
              'stats.totalEarnings': cs.totalEarnings || 0,
              'stats.engagementRate': Math.round(engagementRate * 100) / 100,
              'stats.lastUpdated': new Date(),
            },
          }
        );

        updated++;
      } catch (err) {
        logger.error(`[CREATOR JOBS] Error refreshing stats for creator ${creator._id}:`, err);
      }
    }

    // Clear creator profile caches
    await redisService.del('creators:featured:*');
    await redisService.del('creators:all:*');

    logger.info(`[CREATOR JOBS] Creator stats refreshed: ${updated}/${creators.length}`);

    await redisService.releaseLock(lockKey, lockToken);
  } catch (err) {
    logger.error('[CREATOR JOBS] Error in refreshCreatorStats:', err);
  }
}

// ============================================
// 4. AUTO-TIER UPGRADE (Daily at 3 AM)
// ============================================

async function autoTierUpgrade(): Promise<void> {
  const lockKey = 'lock:creator:auto-tier';

  try {
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) return;

    // Get tier thresholds from config
    const config = await EarningConfig.findOne();
    const minPicks = config?.creatorProgram?.minPicksForTier || {
      bronze: 10,
      silver: 50,
      gold: 200,
      platinum: 500,
    };

    const creators = await CreatorProfile.find({
      status: 'approved',
    }).select('_id tier stats.totalPicks');

    let upgraded = 0;

    for (const creator of creators) {
      const totalPicks = creator.stats?.totalPicks || 0;
      let newTier = 'starter';

      if (totalPicks >= (minPicks.platinum || 500)) newTier = 'platinum';
      else if (totalPicks >= (minPicks.gold || 200)) newTier = 'gold';
      else if (totalPicks >= (minPicks.silver || 50)) newTier = 'silver';
      else if (totalPicks >= (minPicks.bronze || 10)) newTier = 'bronze';

      if (creator.tier !== newTier) {
        await CreatorProfile.updateOne(
          { _id: creator._id },
          { $set: { tier: newTier } }
        );
        upgraded++;
        logger.info(`[CREATOR JOBS] Creator ${creator._id} upgraded: ${creator.tier} -> ${newTier}`);
      }
    }

    logger.info(`[CREATOR JOBS] Auto-tier: ${upgraded} creators upgraded`);

    await redisService.releaseLock(lockKey, lockToken);
  } catch (err) {
    logger.error('[CREATOR JOBS] Error in autoTierUpgrade:', err);
  }
}

// ============================================
// SCHEDULER
// ============================================

export function startCreatorJobs(): void {
  logger.info('[CREATOR JOBS] Starting creator background jobs...');

  // Every hour at minute 5
  confirmConversionsJob = cron.schedule('5 * * * *', confirmPendingConversions);

  // Every 15 minutes
  trendingScoresJob = cron.schedule('*/15 * * * *', refreshTrendingScores);

  // Every 30 minutes
  refreshStatsJob = cron.schedule('*/30 * * * *', refreshCreatorStats);

  // Daily at 3:00 AM
  autoTierJob = cron.schedule('0 3 * * *', autoTierUpgrade);

  logger.info('[CREATOR JOBS] All creator jobs scheduled');
}

export function stopCreatorJobs(): void {
  confirmConversionsJob?.stop();
  trendingScoresJob?.stop();
  refreshStatsJob?.stop();
  autoTierJob?.stop();
  logger.info('[CREATOR JOBS] All creator jobs stopped');
}

export {
  confirmPendingConversions,
  refreshTrendingScores,
  refreshCreatorStats,
  autoTierUpgrade,
};
