import { logger } from '../../config/logger';
/**
 * Admin Routes - Gamification Stats
 * Read-only dashboard endpoints for economy overview, engagement metrics, and fraud alerts
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import UserAchievement from '../../models/UserAchievement';
import UserChallengeProgress from '../../models/UserChallengeProgress';
import GameSession from '../../models/GameSession';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/gamification-stats/economy
 * Economy overview: coins in circulation, earned/spent today/week/month
 */
router.get('/economy', asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate wallet totals
    const walletAggregation = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalInCirculation: { $sum: '$balance.total' },
          totalEarned: { $sum: '$statistics.totalEarned' },
          totalSpent: { $sum: '$statistics.totalSpent' },
        }
      }
    ]);

    const walletTotals = walletAggregation[0] || {
      totalInCirculation: 0,
      totalEarned: 0,
      totalSpent: 0,
    };

    // Aggregate CoinTransaction for today/week/month
    const [earnedToday, spentToday, earnedWeek, earnedMonth, spentWeek, spentMonth] = await Promise.all([
      CoinTransaction.aggregate([
        { $match: { type: 'earned', createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      CoinTransaction.aggregate([
        { $match: { type: 'spent', createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      CoinTransaction.aggregate([
        { $match: { type: 'earned', createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      CoinTransaction.aggregate([
        { $match: { type: 'earned', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      CoinTransaction.aggregate([
        { $match: { type: 'spent', createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      CoinTransaction.aggregate([
        { $match: { type: 'spent', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    const coinsEarnedToday = earnedToday[0]?.total || 0;
    const coinsSpentToday = spentToday[0]?.total || 0;

    return sendSuccess(res, {
      totalInCirculation: walletTotals.totalInCirculation,
      totalEarnedAllTime: walletTotals.totalEarned,
      totalSpentAllTime: walletTotals.totalSpent,
      coinsEarnedToday,
      coinsSpentToday,
      coinsEarnedThisWeek: earnedWeek[0]?.total || 0,
      coinsSpentThisWeek: spentWeek[0]?.total || 0,
      coinsEarnedThisMonth: earnedMonth[0]?.total || 0,
      coinsSpentThisMonth: spentMonth[0]?.total || 0,
      netFlowToday: coinsEarnedToday - coinsSpentToday,
    }, 'Economy stats fetched');
}));

/**
 * GET /api/admin/gamification-stats/engagement
 * Engagement metrics: achievements, challenges, game sessions
 */
router.get('/engagement', asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalAchievementsUnlocked,
      totalChallengesCompleted,
      activeChallenges,
      totalGameSessions,
      gameSessionsToday,
    ] = await Promise.all([
      UserAchievement.countDocuments({ unlockedDate: { $exists: true, $ne: null } }),
      UserChallengeProgress.countDocuments({ completed: true }),
      UserChallengeProgress.countDocuments({ completed: false }),
      GameSession.countDocuments(),
      GameSession.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

    return sendSuccess(res, {
      totalAchievementsUnlocked,
      totalChallengesCompleted,
      activeChallenges,
      totalGameSessions,
      gameSessionsToday,
    }, 'Engagement stats fetched');
}));

/**
 * GET /api/admin/gamification-stats/fraud-alerts
 * Potential fraud: users earning > 5000 coins in last 24h
 */
router.get('/fraud-alerts', asyncHandler(async (req: Request, res: Response) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const suspiciousUsers = await CoinTransaction.aggregate([
      {
        $match: {
          type: 'earned',
          createdAt: { $gte: twentyFourHoursAgo }
        }
      },
      {
        $group: {
          _id: '$user',
          totalEarned: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $match: {
          totalEarned: { $gt: 5000 }
        }
      },
      {
        $sort: { totalEarned: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          userId: '$_id',
          totalEarned: 1,
          transactionCount: 1,
          userName: { $arrayElemAt: ['$userInfo.name', 0] },
          userPhone: { $arrayElemAt: ['$userInfo.phone', 0] },
        }
      }
    ]);

    return sendSuccess(res, {
      alerts: suspiciousUsers,
      alertCount: suspiciousUsers.length,
      threshold: 5000,
      window: '24h',
    }, 'Fraud alerts fetched');
}));

export default router;
