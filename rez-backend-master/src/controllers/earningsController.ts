import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess, sendBadRequest, sendNotFound, sendCreated } from '../utils/response';
import mongoose, { Types } from 'mongoose';
import spinWheelService from '../services/spinWheelService';
import { Project } from '../models/Project';
import SocialMediaPost from '../models/SocialMediaPost';
import { SpinWheelSpin } from '../models/SpinWheel';
import Referral from '../models/Referral';
import earningsSocketService from '../services/earningsSocketService';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import redisService from '../services/redisService';
import Partner from '../models/Partner';
import { SOURCE_TO_CATEGORY } from '../config/earningsCategories';
import { logger } from '../config/logger';

/**
 * Filter type → CoinTransaction source mapping for history queries
 */
const TYPE_TO_SOURCES: Record<string, string[]> = {
  videos: ['creator_pick_reward'],
  projects: ['order'],
  referrals: ['referral'],
  cashback: ['cashback', 'purchase_reward'],
  socialMedia: ['social_share_reward', 'poll_vote', 'offer_comment', 'photo_upload', 'ugc_reel'],
  games: ['spin_wheel', 'scratch_card', 'quiz_game', 'memory_match', 'coin_hunt', 'guess_price'],
  dailyCheckIn: ['daily_login'],
  bonus: ['achievement', 'challenge', 'admin', 'review', 'bill_upload', 'survey', 'merchant_award', 'bonus_campaign'],
  socialImpact: ['social_impact_reward'],
  programs: ['program_task_reward', 'program_multiplier_bonus'],
  events: ['event_booking', 'event_checkin', 'event_participation', 'event_sharing', 'event_entry', 'event_review', 'event_rating'],
};

/**
 * Get user's consolidated earnings summary using CoinTransaction as source of truth
 * GET /api/earnings/consolidated-summary
 * @query period - '7d' | '30d' | '90d' | 'all' (default: 'all')
 * @query startDate - ISO date string for custom range
 * @query endDate - ISO date string for custom range
 * @returns Accurate breakdown, statistics, pending, and recent transactions
 */
export const getConsolidatedEarningsSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { period = 'all', startDate, endDate } = req.query;

  // Check Redis cache
  const cacheKey = `earnings:consolidated:${userId}:${period}:${startDate || ''}:${endDate || ''}`;
  try {
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, 'Earnings summary retrieved successfully (cached)');
    }
  } catch (e) {
    // Redis unavailable, continue without cache
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Build date filter based on period or custom range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    } else if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
      if (days > 0) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        dateFilter.createdAt = { $gte: fromDate };
      }
    }

    // Earning types that count as income (exclude spent, expired, branded_award)
    const earningTypes = ['earned', 'bonus', 'refunded'];

    // 1-3. Run breakdown aggregation, stats aggregation, and wallet query in parallel
    const [breakdownAgg, statsAgg, walletResult] = await Promise.all([
      CoinTransaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: { $in: earningTypes },
            ...dateFilter
          }
        },
        {
          $group: {
            _id: '$source',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      CoinTransaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: { $in: earningTypes }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            firstDate: { $min: '$createdAt' },
            lastDate: { $max: '$createdAt' }
          }
        }
      ]),
      Wallet.findOne({ user: userId }).lean().catch(() => null),
    ]);

    // Map aggregation results to UI categories
    const breakdown: Record<string, { amount: number; count: number }> = {
      videos: { amount: 0, count: 0 },
      projects: { amount: 0, count: 0 },
      referrals: { amount: 0, count: 0 },
      cashback: { amount: 0, count: 0 },
      socialMedia: { amount: 0, count: 0 },
      games: { amount: 0, count: 0 },
      dailyCheckIn: { amount: 0, count: 0 },
      socialImpact: { amount: 0, count: 0 },
      programs: { amount: 0, count: 0 },
      events: { amount: 0, count: 0 },
      bonus: { amount: 0, count: 0 },
    };

    let breakdownTotal = 0;
    breakdownAgg.forEach((item: { _id: string; total: number; count: number }) => {
      const category = SOURCE_TO_CATEGORY[item._id] || 'bonus';
      if (!breakdown[category]) {
        breakdown[category] = { amount: 0, count: 0 };
      }
      breakdown[category].amount = Math.round((breakdown[category].amount + item.total) * 100) / 100;
      breakdown[category].count += item.count;
      breakdownTotal += item.total;
    });
    breakdownTotal = Math.round(breakdownTotal * 100) / 100;

    // Extract stats data
    const statsData = statsAgg[0] || { total: 0, count: 0, firstDate: new Date(), lastDate: new Date() };
    const daysActive = Math.max(
      1,
      Math.ceil((Date.now() - new Date(statsData.firstDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    const dailyAverage = Math.round((statsData.total / daysActive) * 100) / 100;

    const statistics = {
      dailyAverage,
      weeklyAverage: Math.round(dailyAverage * 7 * 100) / 100,
      monthlyAverage: Math.round(dailyAverage * 30 * 100) / 100,
      transactionCount: statsData.count,
      daysActive
    };

    // Extract available balance from wallet result
    let availableBalance = 0;
    if (walletResult) {
      availableBalance = (walletResult as any).balance?.available || (walletResult as any).balance?.total || 0;
    }

    // 4. Calculate pending earnings from all pending sources in parallel
    const [pendingProjects, pendingCashback, pendingRewards, pendingConversions] = await Promise.all([
      // Pending project submissions
      (async () => {
        try {
          const projects = await Project.find({
            'submissions.user': userId,
          }).lean();
          let total = 0;
          projects.forEach((project: any) => {
            project.submissions?.forEach((sub: any) => {
              if (sub.user && sub.user.toString() === userId &&
                  (sub.status === 'pending' || sub.status === 'in_review' || sub.status === 'under_review') &&
                  project.reward?.amount) {
                total += project.reward.amount;
              }
            });
          });
          return total;
        } catch { return 0; }
      })(),
      // Pending cashback
      (async () => {
        try {
          const UserCashback = mongoose.model('UserCashback');
          const result = await UserCashback.aggregate([
            { $match: { user: userObjectId, status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]);
          return result[0]?.total || 0;
        } catch { return 0; }
      })(),
      // Pending coin rewards (admin approval queue)
      (async () => {
        try {
          const PendingCoinReward = mongoose.model('PendingCoinReward');
          const result = await PendingCoinReward.aggregate([
            { $match: { user: userObjectId, status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]);
          return result[0]?.total || 0;
        } catch { return 0; }
      })(),
      // Pending creator conversions (creator field references CreatorProfile, not User)
      (async () => {
        try {
          const CreatorProfile = mongoose.model('CreatorProfile');
          const profile = await CreatorProfile.findOne({ user: userObjectId }).lean();
          if (!profile) return 0;
          const CreatorConversion = mongoose.model('CreatorConversion');
          const result = await CreatorConversion.aggregate([
            { $match: { creator: (profile as any)._id, status: { $in: ['pending', 'confirming'] } } },
            { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
          ]);
          return result[0]?.total || 0;
        } catch { return 0; }
      })(),
    ]);

    const pendingEarnings = Math.round((pendingProjects + pendingCashback + pendingRewards + pendingConversions) * 100) / 100;

    // 5. Get recent earning transactions (last 10)
    const recentTransactions = await CoinTransaction.find({
      user: userObjectId,
      type: { $in: earningTypes },
      ...dateFilter
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const formattedRecent = recentTransactions.map((tx: any) => ({
      _id: tx._id.toString(),
      type: tx.type,
      source: tx.source,
      category: SOURCE_TO_CATEGORY[tx.source] || 'bonus',
      amount: tx.amount,
      description: tx.description,
      createdAt: tx.createdAt,
      metadata: tx.metadata
    }));

    // Use wallet statistics totalEarned for all-time total if period is 'all'
    // This ensures consistency with the wallet display
    let totalEarned = breakdownTotal;
    if (period === 'all') {
      try {
        const wallet = await Wallet.findOne({ user: userId }).lean();
        const walletTotal = (wallet as any)?.statistics?.totalEarned;
        if (walletTotal && walletTotal > 0) {
          // Use the larger of wallet stats vs CoinTransaction aggregate
          // (wallet stats may include earnings not yet in CoinTransaction, or vice versa)
          totalEarned = Math.max(walletTotal, breakdownTotal);
        }
      } catch { /* use breakdownTotal */ }
    }

    const result = {
      totalEarned: Math.round(totalEarned * 100) / 100,
      availableBalance: Math.round(availableBalance * 100) / 100,
      pendingEarnings,
      breakdown: {
        ...breakdown,
        total: period === 'all' ? Math.round(totalEarned * 100) / 100 : breakdownTotal
      },
      statistics,
      period: period as string,
      recentTransactions: formattedRecent
    };

    // Cache for 2 minutes
    try {
      await redisService.set(cacheKey, result, 120);
    } catch (e) {
      // Redis unavailable, continue without cache
    }

    sendSuccess(res, result, 'Earnings summary retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting consolidated summary:', error);
    throw new AppError('Failed to fetch earnings summary', 500);
  }
});

/**
 * Get user's partner-specific earnings summary
 * GET /api/earnings/partner-summary
 * @query period - 'all' | '7d' | '30d' | '90d' (default: 'all')
 * @returns Partner earnings breakdown (cashback, milestones, referrals, tasks),
 *          actual this-month total, partner-specific pending, and partner level info
 */
export const getPartnerEarningsSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { period = 'all' } = req.query;

  // Check Redis cache
  const cacheKey = `partner-earnings:${userId}:${period}`;
  try {
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, 'Partner earnings retrieved (cached)');
    }
  } catch { /* Redis unavailable */ }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const earningTypes = ['earned', 'bonus', 'refunded'];

    // Build date filter
    let dateFilter: any = {};
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
      if (days > 0) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        dateFilter.createdAt = { $gte: fromDate };
      }
    }

    // 1. Aggregate partner-tagged CoinTransactions by partnerEarningType
    const breakdownAgg = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: { $in: earningTypes },
          'metadata.partnerEarning': true,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$metadata.partnerEarningType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Map to breakdown structure
    const breakdown: Record<string, { amount: number; count: number }> = {
      partnerCashback: { amount: 0, count: 0 },
      milestoneRewards: { amount: 0, count: 0 },
      referralBonus: { amount: 0, count: 0 },
      taskRewards: { amount: 0, count: 0 },
    };

    const TYPE_TO_UI: Record<string, string> = {
      cashback: 'partnerCashback',
      milestone: 'milestoneRewards',
      referral: 'referralBonus',
      task: 'taskRewards',
    };

    let totalPartnerEarnings = 0;
    breakdownAgg.forEach((item: { _id: string; total: number; count: number }) => {
      const uiKey = TYPE_TO_UI[item._id] || 'partnerCashback';
      breakdown[uiKey].amount = Math.round((breakdown[uiKey].amount + item.total) * 100) / 100;
      breakdown[uiKey].count += item.count;
      totalPartnerEarnings += item.total;
    });

    // Also include referral earnings (source='referral') even without partnerEarning metadata
    // since referral rewards are always partner-relevant
    const referralAgg = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: { $in: earningTypes },
          source: 'referral',
          'metadata.partnerEarning': { $ne: true }, // avoid double-counting
          ...dateFilter,
        },
      },
      {
        $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } },
      },
    ]);

    if (referralAgg[0]) {
      breakdown.referralBonus.amount = Math.round((breakdown.referralBonus.amount + referralAgg[0].total) * 100) / 100;
      breakdown.referralBonus.count += referralAgg[0].count;
      totalPartnerEarnings += referralAgg[0].total;
    }
    totalPartnerEarnings = Math.round(totalPartnerEarnings * 100) / 100;

    // 2. Compute actual this-month total (not average)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthAgg = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: { $in: earningTypes },
          $or: [
            { 'metadata.partnerEarning': true },
            { source: 'referral' },
          ],
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: { _id: null, total: { $sum: '$amount' } },
      },
    ]);
    const thisMonth = Math.round((thisMonthAgg[0]?.total || 0) * 100) / 100;

    // 3. Get partner-specific pending from Partner model
    let pendingPartnerEarnings = 0;
    try {
      const partner = await Partner.findOne({ userId }).lean();
      if (partner) {
        pendingPartnerEarnings = (partner as any).earnings?.pending || 0;
      }
    } catch { /* Partner may not exist */ }

    // 4. Get available balance from Wallet
    let availableBalance = 0;
    try {
      const wallet = await Wallet.findOne({ user: userId }).lean();
      if (wallet) {
        availableBalance = (wallet as any).balance?.available || 0;
      }
    } catch { /* Wallet may not exist */ }

    // 5. Get partner level info
    let partnerLevel = { level: 0, name: 'None', daysRemaining: 0, ordersToNextLevel: 0 };
    try {
      const partner = await Partner.findOne({ userId }).lean();
      if (partner) {
        partnerLevel = {
          level: (partner as any).currentLevel?.level || 0,
          name: (partner as any).currentLevel?.name || 'None',
          daysRemaining: typeof (partner as any).getDaysRemaining === 'function'
            ? (partner as any).getDaysRemaining() : 0,
          ordersToNextLevel: typeof (partner as any).getOrdersNeededForNextLevel === 'function'
            ? (partner as any).getOrdersNeededForNextLevel() : 0,
        };
      }
    } catch { /* Partner may not exist */ }

    const result = {
      totalPartnerEarnings,
      availableBalance: Math.round(availableBalance * 100) / 100,
      breakdown,
      thisMonth,
      pendingPartnerEarnings: Math.round(pendingPartnerEarnings * 100) / 100,
      partnerLevel,
      period: period as string,
    };

    // Cache for 2 minutes
    try {
      await redisService.set(cacheKey, result, 120);
    } catch { /* Redis unavailable */ }

    sendSuccess(res, result, 'Partner earnings summary retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting partner earnings summary:', error);
    throw new AppError('Failed to fetch partner earnings summary', 500);
  }
});

/**
 * Get user's complete earnings summary (legacy endpoint)
 * GET /api/earnings/summary
 * @returns Total earnings with breakdown by source (projects, referrals, shareAndEarn, spin)
 */
export const getEarningsSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  logger.info('[EARNINGS] Getting earnings summary for user:', userId);

  try {
    // Fetch all earnings data in parallel
    const [
      projectEarnings,
      referralEarnings,
      socialMediaEarnings,
      spinStats
    ] = await Promise.all([
      // Project earnings: Sum of paidAmount from approved project submissions
      (async () => {
        try {
          // Find all projects with user's submissions
          const projects = await Project.find({
            'submissions.user': userId
          }).lean();

          let total = 0;
          let approvedCount = 0;
          projects.forEach(project => {
            project.submissions?.forEach((sub: any) => {
              // Check if this submission belongs to the user and is approved with paidAmount
              if (sub.user && sub.user.toString() === userId && 
                  sub.status === 'approved' && 
                  sub.paidAmount && sub.paidAmount > 0) {
                total += sub.paidAmount;
                approvedCount++;
              }
            });
          });

          logger.info(`[EARNINGS] Project earnings: ${total} from ${approvedCount} approved submissions`);
          return total;
        } catch (error) {
          logger.error('[EARNINGS] Error calculating project earnings:', error);
          return 0;
        }
      })(),

      // Referral earnings: Sum of referrerAmount from rewarded referrals
      (async () => {
        try {
          // Get referrals where referrer has been rewarded
          const referrals = await Referral.find({
            referrer: userId,
            referrerRewarded: true // Only count referrals where reward has been given
          }).lean();

          let total = 0;
          referrals.forEach((ref: any) => {
            // Use rewards.referrerAmount field (not earnings.totalEarned)
            if (ref.rewards && ref.rewards.referrerAmount) {
              total += ref.rewards.referrerAmount;
            }
            // Also include milestone bonus if rewarded
            if (ref.milestoneRewarded && ref.rewards && ref.rewards.milestoneBonus) {
              total += ref.rewards.milestoneBonus;
            }
          });

          logger.info(`[EARNINGS] Referral earnings: ${total} from ${referrals.length} rewarded referrals`);
          return total;
        } catch (error) {
          logger.error('[EARNINGS] Error calculating referral earnings:', error);
          return 0;
        }
      })(),

      // Social media earnings: Sum of cashbackAmount from credited social media posts
      (async () => {
        try {
          const posts = await SocialMediaPost.find({
            user: userId,
            status: 'credited'
          }).lean();

          let total = 0;
          posts.forEach((post: any) => {
            // Use cashbackAmount field (not earnings.amount)
            if (post.cashbackAmount) {
              total += post.cashbackAmount;
            }
          });

          logger.info(`[EARNINGS] Social media earnings: ${total} from ${posts.length} credited posts`);
          return total;
        } catch (error) {
          logger.error('[EARNINGS] Error calculating social media earnings:', error);
          return 0;
        }
      })(),

      // Spin earnings: Get total coins won from spin wheel
      (async () => {
        try {
          const stats = await spinWheelService.getSpinStats(userId);
          return stats.totalCoinsWon || 0;
        } catch (error) {
          logger.error('[EARNINGS] Error calculating spin earnings:', error);
          return 0;
        }
      })()
    ]);

    // Calculate total earned
    const totalEarned = projectEarnings + referralEarnings + socialMediaEarnings + spinStats;

    // Build breakdown object
    const breakdown = {
      projects: projectEarnings,
      referrals: referralEarnings,
      shareAndEarn: socialMediaEarnings,
      spin: spinStats
    };

    // Get wallet balance for available and pending earnings
    let availableBalance = 0;
    let pendingEarnings = 0;

    try {
      const { Wallet } = await import('../models/Wallet');
      const wallet = await Wallet.findOne({ user: userId }).lean();
      
      if (wallet) {
        availableBalance = wallet.balance?.total || 0;
        // Pending earnings would be from projects in review
        const pendingProjects = await Project.find({
          'submissions.user': userId,
          'submissions.status': { $in: ['pending', 'in_review'] }
        }).lean();
        
        pendingProjects.forEach(project => {
          project.submissions?.forEach((sub: any) => {
            if (sub.user.toString() === userId && 
                (sub.status === 'pending' || sub.status === 'in_review') && 
                project.reward?.amount) {
              pendingEarnings += project.reward.amount;
            }
          });
        });
      }
    } catch (error) {
      logger.error('[EARNINGS] Error fetching wallet balance:', error);
    }

    const earningsSummary = {
      totalEarned,
      breakdown,
      availableBalance,
      pendingEarnings,
      currency: '₹'
    };

    logger.info('[EARNINGS] Earnings summary calculated:', earningsSummary);

    // Emit real-time earnings update
    try {
      earningsSocketService.emitEarningsUpdate(userId, {
        totalEarned,
        breakdown
      });
    } catch (error) {
      logger.error('[EARNINGS] Error emitting earnings update:', error);
    }

    sendSuccess(res, earningsSummary, 'Earnings summary retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting earnings summary:', error);
    throw new AppError('Failed to fetch earnings summary', 500);
  }
});

/**
 * Get user's project statistics
 * GET /api/earnings/project-stats
 * @returns Project status counts (completeNow, inReview, completed)
 */
export const getProjectStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  logger.info('[EARNINGS] Getting project stats for user:', userId);

  try {
    // Find all projects with user's submissions
    const projectsWithSubmissions = await Project.find({
      'submissions.user': userId
    }).lean();

    let inReview = 0; // Submissions pending or under_review
    let completed = 0; // Approved submissions

    // Count submissions by status
    projectsWithSubmissions.forEach(project => {
      project.submissions?.forEach((sub: any) => {
        if (sub.user && sub.user.toString() === userId) {
          if (sub.status === 'pending' || sub.status === 'under_review') {
            inReview++;
          } else if (sub.status === 'approved') {
            completed++;
          }
        }
      });
    });

    // Count active projects user can complete (active projects where user has no submissions)
    const allActiveProjects = await Project.find({
      status: 'active'
    }).lean();

    let completeNow = 0;
    allActiveProjects.forEach(project => {
      // Check if user has any submission for this project
      const hasUserSubmission = project.submissions?.some((sub: any) => 
        sub.user && sub.user.toString() === userId
      );
      
      // If user hasn't submitted, it's available to complete
      if (!hasUserSubmission) {
        completeNow++;
      }
    });

    const stats = {
      completeNow,
      inReview,
      completed,
      totalProjects: completeNow + inReview + completed
    };

    logger.info('[EARNINGS] Project stats calculated:', stats);

    // Emit real-time project status update
    try {
      earningsSocketService.emitProjectStatusUpdate(userId, stats);
    } catch (error) {
      logger.error('[EARNINGS] Error emitting project status update:', error);
    }

    sendSuccess(res, stats, 'Project statistics retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting project stats:', error);
    throw new AppError('Failed to fetch project statistics', 500);
  }
});

/**
 * Get user's earning notifications
 * GET /api/earnings/notifications
 * @returns List of notifications related to earnings
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { unreadOnly, limit } = req.query;

  logger.info('[EARNINGS] Getting notifications for user:', userId);

  try {
    // For now, return empty array as notifications system may be separate
    // In the future, this could query a Notifications collection
    const notifications: any[] = [];

    // Filter by unread if requested
    const filteredNotifications = unreadOnly === 'true' 
      ? notifications.filter(n => !n.isRead)
      : notifications;

    // Limit results
    const limitedNotifications = limit 
      ? filteredNotifications.slice(0, parseInt(limit as string))
      : filteredNotifications;

    logger.info('[EARNINGS] Notifications retrieved:', limitedNotifications.length);

    sendSuccess(res, limitedNotifications, 'Notifications retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting notifications:', error);
    throw new AppError('Failed to fetch notifications', 500);
  }
});

/**
 * Mark notification as read
 * PATCH /api/earnings/notifications/:id/read
 * @returns Success message
 */
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { id } = req.params;

  logger.info('[EARNINGS] Marking notification as read:', id, 'for user:', userId);

  try {
    // For now, just return success as notifications system may be separate
    // In the future, this would update a Notifications collection
    sendSuccess(res, { 
      notificationId: id,
      isRead: true 
    }, 'Notification marked as read successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error marking notification as read:', error);
    throw new AppError('Failed to mark notification as read', 500);
  }
});

/**
 * Get user's referral information
 * GET /api/earnings/referral-info
 * @returns Referral stats and referral link
 */
export const getReferralInfo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  logger.info('[EARNINGS] Getting referral info for user:', userId);

  try {
    // Get all referrals where user is the referrer
    const referrals = await Referral.find({
      referrer: userId
    }).lean();

    // Calculate stats
    const totalReferrals = referrals.length;
    let totalEarningsFromReferrals = 0;
    let pendingReferrals = 0;

    referrals.forEach((ref: any) => {
      // Count pending referrals (not completed)
      if (ref.status !== 'completed' && ref.status !== 'expired') {
        pendingReferrals++;
      }

      // Sum earnings from rewarded referrals
      if (ref.referrerRewarded && ref.rewards && ref.rewards.referrerAmount) {
        totalEarningsFromReferrals += ref.rewards.referrerAmount;
      }
      if (ref.milestoneRewarded && ref.rewards && ref.rewards.milestoneBonus) {
        totalEarningsFromReferrals += ref.rewards.milestoneBonus;
      }
    });

    // Get user's referral code (from User model or generate from userId)
    // For now, we'll use a simple code based on userId
    const referralCode = `REZ${userId.slice(-6).toUpperCase()}`;
    const referralLink = `${process.env.FRONTEND_URL || 'https://rez.app'}/ref/${referralCode}`;

    // Default referral bonus (can be configured)
    const referralBonus = 50; // ₹50 per referral

    const referralInfo = {
      totalReferrals,
      totalEarningsFromReferrals,
      pendingReferrals,
      referralBonus,
      referralCode,
      referralLink
    };

    logger.info('[EARNINGS] Referral info calculated:', referralInfo);

    sendSuccess(res, referralInfo, 'Referral information retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting referral info:', error);
    throw new AppError('Failed to fetch referral information', 500);
  }
});

/**
 * Get user's earnings history using CoinTransaction as source of truth
 * GET /api/earnings/history
 * @query type - Filter by category: 'videos' | 'projects' | 'referrals' | 'cashback' | 'socialMedia' | 'games' | 'dailyCheckIn' | 'bonus'
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20, max: 50)
 * @query startDate - ISO date for custom range
 * @query endDate - ISO date for custom range
 * @returns Paginated earning transactions with summary
 */
export const getEarningsHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { type, page = 1, limit = 20, startDate, endDate } = req.query;

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const earningTypes = ['earned', 'bonus', 'refunded'];

    // Build query
    const query: any = {
      user: userObjectId,
      type: { $in: earningTypes }
    };

    // Map type filter to CoinTransaction source values
    if (type && typeof type === 'string' && TYPE_TO_SOURCES[type]) {
      query.source = { $in: TYPE_TO_SOURCES[type] };
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Count total for pagination
    const total = await CoinTransaction.countDocuments(query);
    const skip = (Number(page) - 1) * Number(limit);
    const totalPages = Math.ceil(total / Number(limit));

    // Fetch paginated transactions (native Mongo sort + skip + limit)
    const transactions = await CoinTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Format transactions for frontend
    const formattedTransactions = transactions.map((tx: any) => ({
      _id: tx._id.toString(),
      type: SOURCE_TO_CATEGORY[tx.source] || 'bonus',
      source: tx.source,
      amount: tx.amount,
      status: 'completed', // CoinTransaction records are always completed
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
    }));

    // Compute summary using aggregation (unfiltered by type, but respecting date range)
    const summaryQuery: any = {
      user: userObjectId,
      type: { $in: earningTypes }
    };
    if (startDate || endDate) {
      summaryQuery.createdAt = {};
      if (startDate) summaryQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) summaryQuery.createdAt.$lte = new Date(endDate as string);
    }

    const summaryAgg = await CoinTransaction.aggregate([
      { $match: summaryQuery },
      {
        $group: {
          _id: '$source',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Build breakdown from aggregation
    const breakdownMap: Record<string, number> = {};
    let totalEarned = 0;
    summaryAgg.forEach((item: { _id: string; total: number }) => {
      const cat = SOURCE_TO_CATEGORY[item._id] || 'bonus';
      breakdownMap[cat] = (breakdownMap[cat] || 0) + item.total;
      totalEarned += item.total;
    });

    const result = {
      transactions: formattedTransactions,
      summary: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalWithdrawn: 0, // Withdrawals are tracked in Transaction model, not CoinTransaction
        pendingAmount: 0,  // Pending is computed in consolidated-summary endpoint
        breakdown: {
          videos: Math.round((breakdownMap.videos || 0) * 100) / 100,
          projects: Math.round((breakdownMap.projects || 0) * 100) / 100,
          referrals: Math.round((breakdownMap.referrals || 0) * 100) / 100,
          cashback: Math.round((breakdownMap.cashback || 0) * 100) / 100,
          socialMedia: Math.round((breakdownMap.socialMedia || 0) * 100) / 100,
          games: Math.round((breakdownMap.games || 0) * 100) / 100,
          dailyCheckIn: Math.round((breakdownMap.dailyCheckIn || 0) * 100) / 100,
          events: Math.round((breakdownMap.events || 0) * 100) / 100,
          bonus: Math.round((breakdownMap.bonus || 0) * 100) / 100,
        }
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };

    sendSuccess(res, result, 'Earnings history retrieved successfully');
  } catch (error) {
    logger.error('[EARNINGS] Error getting earnings history:', error);
    throw new AppError('Failed to fetch earnings history', 500);
  }
});

/**
 * Withdraw earnings
 * POST /api/earnings/withdraw
 * @returns Withdrawal transaction details
 */
export const withdrawEarnings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { amount, method, accountDetails } = req.body;

  logger.info('[EARNINGS] Withdrawing earnings for user:', userId, 'amount:', amount);

  try {
    // Validate amount
    if (!amount || amount <= 0) {
      return sendBadRequest(res, 'Invalid withdrawal amount');
    }

    // Get user's wallet balance
    const { Wallet } = await import('../models/Wallet');
    const wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      return sendNotFound(res, 'Wallet not found');
    }

    // Get rez coin balance
    const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
    const availableBalance = rezCoin?.amount || 0;

    // Check if user has sufficient balance
    if (availableBalance < amount) {
      return sendBadRequest(res, 'Insufficient balance');
    }

    // Minimum withdrawal amount (can be configured)
    const minWithdrawal = 100; // ₹100
    if (amount < minWithdrawal) {
      return sendBadRequest(res, `Minimum withdrawal amount is ₹${minWithdrawal}`);
    }

    // Create withdrawal transaction
    // Note: This would typically create a withdrawal record in a Withdrawals collection
    // For now, we'll just return success
    const withdrawalId = new Types.ObjectId();

    // In a real implementation, you would:
    // 1. Create a withdrawal record
    // 2. Deduct from wallet (or mark as pending)
    // 3. Process the withdrawal through payment gateway
    // 4. Update wallet balance
    // 5. Send notification to user

    // Emit real-time withdrawal notification
    try {
      earningsSocketService.emitNotification(userId, {
        type: 'withdrawal',
        title: 'Withdrawal Request Submitted',
        description: `Your withdrawal request of ₹${amount} has been submitted`,
        data: {
          withdrawalId: withdrawalId.toString(),
          amount,
          method,
          status: 'pending'
        }
      });
    } catch (error) {
      logger.error('[EARNINGS] Error emitting withdrawal notification:', error);
    }

    const withdrawal = {
      _id: withdrawalId,
      type: 'withdrawal',
      source: 'Withdrawal',
      amount,
      currency: '₹',
      status: 'pending', // Will be updated when processed
      description: `Withdrawal via ${method || 'bank'}`,
      metadata: {
        method,
        accountDetails
      },
      createdAt: new Date(),
    };

    logger.info('[EARNINGS] Withdrawal request created:', withdrawalId);

    sendSuccess(res, {
      withdrawal,
      message: 'Withdrawal request submitted successfully. It will be processed within 3-5 business days.'
    }, 'Withdrawal request submitted successfully', 201);
  } catch (error) {
    logger.error('[EARNINGS] Error processing withdrawal:', error);
    throw new AppError('Failed to process withdrawal', 500);
  }
});

