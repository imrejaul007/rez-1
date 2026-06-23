import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { Lean } from '../types/lean';

// Import services
import challengeService from '../services/challengeService';
import { UserAchievement, ACHIEVEMENT_DEFINITIONS } from '../models/Achievement';
import leaderboardService from '../services/leaderboardService';
import coinService from '../services/coinService';
import gamificationEventBus from '../events/gamificationEventBus';
import streakService from '../services/streakService';
import spinWheelService from '../services/spinWheelService';
import quizService from '../services/quizService';
import tournamentService from '../services/tournamentService';
import Tournament from '../models/Tournament';
import scratchCardService from '../services/scratchCardService';
import redisService from '../services/redisService';
import SurpriseCoinDrop from '../models/SurpriseCoinDrop';
import UserStreak from '../models/UserStreak';
import { Order } from '../models/Order';
import Review from '../models/Review';
import type { ISocialMediaPost } from '../models/SocialMediaPost';
import Challenge from '../models/Challenge';
import Campaign from '../models/Campaign';
import CoinDrop from '../models/CoinDrop';
import { withTransaction } from '../utils/withTransaction';

// ========================================
// CHALLENGES
// ========================================

export const getChallenges = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  const challenges = await challengeService.getActiveChallenges(type as string);

  sendSuccess(res, challenges, 'Challenges retrieved successfully');
});

export const getActiveChallenge = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const progress = await challengeService.getUserProgress((req.user._id as Types.ObjectId).toString(), false);

  sendSuccess(res, progress, 'Active challenges retrieved successfully');
});

export const claimChallengeReward = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const result = await challengeService.claimRewards((req.user._id as Types.ObjectId).toString(), id);

  sendSuccess(res, result, 'Challenge reward claimed successfully');
});

/**
 * Join a challenge
 * POST /api/gamification/challenges/:id/join
 */
export const joinChallenge = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;
  const userId = (req.user._id as Types.ObjectId).toString();

  // Validate challenge exists and is active
  const challenge = await Challenge.findById(id);
  if (!challenge) {
    return sendNotFound(res, 'Challenge not found');
  }

  if (!challenge.isActive()) {
    return sendBadRequest(res, 'Challenge is no longer active');
  }

  if (!challenge.canJoin()) {
    return sendBadRequest(res, 'Challenge has reached maximum participants');
  }

  // Check if user already joined
  const UserChallengeProgress = (await import('../models/UserChallengeProgress')).default;
  const existing = await UserChallengeProgress.findOne({ user: userId, challenge: id }).lean();
  if (existing) {
    return sendSuccess(res, {
      progress: existing,
      alreadyJoined: true
    }, 'Already joined this challenge');
  }

  // Create progress document
  const progress = await UserChallengeProgress.create({
    user: userId,
    challenge: id,
    progress: 0,
    target: challenge.requirements.target,
    startedAt: new Date()
  });

  // Increment participant count
  await Challenge.findByIdAndUpdate(id, { $inc: { participantCount: 1 } });

  sendSuccess(res, {
    progress,
    alreadyJoined: false,
    challenge: {
      id: challenge._id,
      title: challenge.title,
      description: challenge.description,
      target: challenge.requirements.target,
      rewards: challenge.rewards,
      endDate: challenge.endDate
    }
  }, 'Successfully joined challenge', 201);
});

/**
 * Get unified challenges with user state and server time.
 * Single source of truth for Play & Earn + Missions pages.
 * GET /api/gamification/challenges/unified?type=daily&limit=6
 */
export const getUnifiedChallenges = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { type, limit, visibility } = req.query;

  const result = await challengeService.getUnifiedChallenges(userId, {
    type: type as string,
    limit: limit ? parseInt(limit as string) : undefined,
    visibility: visibility as string,
  });

  sendSuccess(res, result, 'Unified challenges retrieved successfully');
});

export const getChallengeLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;

  const leaderboard = await challengeService.getChallengeLeaderboard(id, parseInt(limit as string));

  // Format leaderboard with ranks
  const formattedLeaderboard = leaderboard.map((entry: any, index: number) => ({
    rank: index + 1,
    user: entry.user,
    progress: entry.progress,
    target: entry.target,
    completed: entry.completed,
    completedAt: entry.completedAt
  }));

  sendSuccess(res, formattedLeaderboard, 'Challenge leaderboard retrieved successfully');
});

// ========================================
// ACHIEVEMENTS
// ========================================

export const getAchievements = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, ACHIEVEMENT_DEFINITIONS.filter(a => a.isActive), 'Achievement definitions retrieved successfully');
});

export const getUserAchievements = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const achievements = await UserAchievement.find({ user: userId })
    .sort({ unlocked: -1, progress: -1 }).lean();

  sendSuccess(res, achievements, 'User achievements retrieved successfully');
});

/**
 * Get current user's achievements (JWT-based, no userId param)
 * GET /api/gamification/achievements/me
 */
export const getMyAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Check Redis cache first
  const cacheKey = `achievements:user:${userId}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'User achievements retrieved successfully');
  }

  // Get user's achievement records
  let userAchievements = await UserAchievement.find({ user: userId })
    .sort({ unlocked: -1, progress: -1 }).lean();

  // If user has no achievement records, initialize them from definitions
  if (userAchievements.length === 0) {
    const activeDefinitions = ACHIEVEMENT_DEFINITIONS.filter(d => d.isActive);

    // Create achievement records for this user
    const achievementDocs = activeDefinitions.map(def => ({
      user: userId,
      type: def.type,
      title: def.title,
      description: def.description,
      icon: def.icon,
      color: def.color,
      unlocked: false,
      progress: 0,
      targetValue: def.requirement.target
    }));

    if (achievementDocs.length > 0) {
      await UserAchievement.insertMany(achievementDocs, { ordered: false }).catch(() => {
        // Ignore duplicate key errors
      });
      userAchievements = await UserAchievement.find({ user: userId })
        .sort({ unlocked: -1, progress: -1 }).lean();
    }
  }

  // Calculate summary
  const total = userAchievements.length;
  const unlocked = userAchievements.filter(a => a.unlocked).length;
  const inProgress = userAchievements.filter(a => !a.unlocked && a.progress > 0).length;

  const responseData = {
    summary: {
      total,
      unlocked,
      inProgress,
      locked: total - unlocked - inProgress,
      completionPercentage: total > 0 ? Math.round((unlocked / total) * 100) : 0
    },
    achievements: userAchievements
  };

  // Cache for 60 seconds (user-specific data)
  redisService.set(cacheKey, responseData, 60).catch((err) =>
    logger.warn('[GamificationCtrl] Redis cache set failed for achievements', { userId, error: err.message })
  );

  sendSuccess(res, responseData, 'User achievements retrieved successfully');
});

export const unlockAchievement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { achievementId } = req.body;

  const achievement = await UserAchievement.findOne({
    _id: achievementId,
    user: req.user._id as Types.ObjectId
  });

  if (!achievement) {
    return sendNotFound(res, 'Achievement not found');
  }

  if (achievement.unlocked) {
    return sendBadRequest(res, 'Achievement already unlocked');
  }

  if (achievement.progress < 100) {
    return sendBadRequest(res, 'Achievement requirements not met');
  }

  achievement.unlocked = true;
  achievement.unlockedDate = new Date();
  await achievement.save();

  sendSuccess(res, achievement, 'Achievement unlocked successfully');
});

// ========================================
// BADGES (Using achievements system)
// ========================================

export const getBadges = asyncHandler(async (req: Request, res: Response) => {
  const badges = ACHIEVEMENT_DEFINITIONS.filter(a => a.reward?.badge);
  sendSuccess(res, badges, 'Badges retrieved successfully');
});

export const getUserBadges = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const achievements = await UserAchievement.find({
    user: userId,
    unlocked: true
  }).lean();

  const badges = achievements.filter(a => {
    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.type);
    return def?.reward?.badge;
  });

  sendSuccess(res, badges, 'User badges retrieved successfully');
});

// ========================================
// LEADERBOARD
// ========================================

// Map frontend period values to backend service format
const mapPeriodToBackend = (period: string): 'day' | 'week' | 'month' | 'all' => {
  switch (period) {
    case 'daily':
    case 'day':
      return 'day';
    case 'weekly':
    case 'week':
      return 'week';
    case 'monthly':
    case 'month':
      return 'month';
    case 'all-time':
    case 'all':
    default:
      return 'all';
  }
};

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { period = 'weekly', type = 'spending', limit = 50, page = 1 } = req.query;
  const userId = req.user ? (req.user._id as Types.ObjectId).toString() : undefined;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));

  // Use config-driven leaderboard service for all types
  const result = await leaderboardService.getLeaderboard(
    type as string,
    period as string,
    pageNum,
    limitNum
  );

  // Fetch user's rank if authenticated
  let myRank = null;
  if (userId) {
    const rankResult = await leaderboardService.getUserRank(userId, type as string, period as string);
    if (rankResult) {
      myRank = {
        rank: rankResult.rank,
        value: rankResult.value,
        total: rankResult.total,
      };
    }
  }

  // Fetch prize pool from config
  let prizePool: any[] = [];
  const LeaderboardConfigModel = (await import('../models/LeaderboardConfig')).default;
  const config = await LeaderboardConfigModel.findOne({
    leaderboardType: type,
    period: result.config.period,
    status: 'active',
  }).select('prizePool').lean();
  if (config?.prizePool) {
    prizePool = config.prizePool;
  }

  sendSuccess(res, {
    entries: result.entries,
    pagination: result.pagination,
    config: {
      ...result.config,
      prizePool,
    },
    myRank,
    lastUpdated: result.lastUpdated,
  }, 'Leaderboard retrieved successfully');
});

export const getUserRank = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { period = 'weekly' } = req.query;

  // Map frontend period format to backend format
  const backendPeriod = mapPeriodToBackend(period as string);

  const ranks = await leaderboardService.getAllUserRanks(userId, backendPeriod);

  sendSuccess(res, ranks, 'User rank retrieved successfully');
});

/**
 * Get current user's rank across all leaderboard types
 * GET /api/gamification/leaderboard/my-rank
 */
export const getMyRank = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { period = 'weekly', type } = req.query;

  // If a specific type is requested, return just that rank
  if (type) {
    const rankResult = await leaderboardService.getUserRank(userId, type as string, period as string);
    if (rankResult) {
      sendSuccess(res, rankResult, 'User rank retrieved successfully');
    } else {
      sendSuccess(res, { rank: 0, total: 0, value: 0, nearby: [] }, 'Not ranked yet');
    }
    return;
  }

  // Otherwise return all ranks (legacy behavior)
  const backendPeriod = mapPeriodToBackend(period as string);
  const ranks = await leaderboardService.getAllUserRanks(userId, backendPeriod);

  sendSuccess(res, ranks, 'User rank retrieved successfully');
});

// ========================================
// COINS (CURRENCY SYSTEM)
// ========================================

export const getCoinBalance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const balance = await coinService.getCoinBalance((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, { balance }, 'Coin balance retrieved successfully');
});

export const getCoinTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { type, source, limit, offset } = req.query;

  const result = await coinService.getCoinTransactions((req.user._id as Types.ObjectId).toString(), {
    type: type as string,
    source: source as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined
  });

  sendSuccess(res, result, 'Coin transactions retrieved successfully');
});

export const awardCoins = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { amount, source, description, metadata } = req.body;

  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid amount');
  }

  const result = await coinService.awardCoins(
    (req.user._id as Types.ObjectId).toString(),
    amount,
    source || 'admin',
    description || 'Coins awarded',
    metadata
  );

  sendSuccess(res, result, 'Coins awarded successfully');
});

export const deductCoins = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { amount, source, description, metadata } = req.body;

  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid amount');
  }

  const result = await coinService.deductCoins(
    (req.user._id as Types.ObjectId).toString(),
    amount,
    source || 'purchase',
    description || 'Coins spent',
    metadata
  );

  sendSuccess(res, result, 'Coins deducted successfully');
});

// ========================================
// DAILY STREAK
// ========================================

export const getDailyStreak = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const streaks = await streakService.getUserStreaks(userId);

  sendSuccess(res, streaks, 'Daily streaks retrieved successfully');
});

export const incrementStreak = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { type = 'login' } = req.body;

  const result = await streakService.updateStreak((req.user._id as Types.ObjectId).toString(), type);

  sendSuccess(res, result, 'Streak updated successfully');
});

// ========================================
// MINI-GAMES - SPIN WHEEL
// ========================================

export const createSpinWheel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const session = await spinWheelService.createSpinSession((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, session, 'Spin wheel session created successfully', 201);
});

export const spinWheel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  logger.info('🎰 [SPIN_WHEEL] Spin request from user:', userId);

  // Check daily spin limit using eligibility service
  const eligibility = await spinWheelService.checkEligibility(userId);
  if (!eligibility.canSpin) {
    logger.info(`❌ [SPIN_WHEEL] Daily limit reached: ${eligibility.spinsUsedToday}/${eligibility.maxDailySpins} spins used today`);
    return sendBadRequest(res, `Daily spin limit reached (${eligibility.maxDailySpins} spins per day). Next spin available at ${eligibility.nextResetAt}`);
  }

  logger.info(`✅ [SPIN_WHEEL] User eligible: ${eligibility.spinsUsedToday}/${eligibility.maxDailySpins} spins used today`);

  const { MiniGame } = await import('../models/MiniGame');

  // Create a session and immediately spin
  const session = await spinWheelService.createSpinSession(userId);
  logger.info('✅ [SPIN_WHEEL] Session created:', session.sessionId);

  const spinResult = await spinWheelService.spin(session.sessionId);
  logger.info('🎉 [SPIN_WHEEL] Spin result:', spinResult);

  // SECURITY: Post-spin race condition check
  // After the spin is completed, verify we haven't exceeded the limit
  const postSpinEligibility = await spinWheelService.checkEligibility(userId);
  // If spinsUsedToday > maxDailySpins, a race condition allowed an extra spin
  if (postSpinEligibility.spinsUsedToday > postSpinEligibility.maxDailySpins) {
    logger.warn(`⚠️ [SPIN_WHEEL] Race condition detected for user ${userId}: ${postSpinEligibility.spinsUsedToday} spins today, rolling back`);
    await MiniGame.findByIdAndUpdate(session.sessionId, { status: 'expired' });
    return sendBadRequest(res, `Daily spin limit reached. This spin has been voided.`);
  }

  // ✅ FIX: Get user's coin balance from WALLET (single source of truth)
  // This ensures consistency between homepage and spin wheel page
  const { Wallet } = await import('../models/Wallet');
  const wallet = await Wallet.findOne({ user: userId }).lean();

  let actualBalance = 0;
  if (wallet) {
    actualBalance = wallet.balance.total;
    logger.info(`💰 [SPIN_WHEEL] User balance after spin: ${actualBalance}`);
  } else {
    logger.warn(`⚠️ [SPIN_WHEEL] Wallet not found for user ${userId}`);
  }

  // Format response to match frontend expectations
  const response = {
    result: {
      segment: {
        id: spinResult.segment.toString(),
        label: spinResult.prize,
        value: spinResult.value,
        color: '#8B5CF6', // Default color
        type: spinResult.type,
        icon: 'star'
      },
      prize: {
        type: spinResult.type,
        value: spinResult.value,
        label: spinResult.prize,
        // ✅ NEW: Include coupon details for frontend display
        couponDetails: spinResult.couponMetadata ? {
          storeName: spinResult.couponMetadata.storeName,
          storeId: spinResult.couponMetadata.storeId,
          productName: spinResult.couponMetadata.productName || null,
          productId: spinResult.couponMetadata.productId || null,
          productImage: spinResult.couponMetadata.productImage || null,
          isProductSpecific: spinResult.couponMetadata.isProductSpecific,
          applicableOn: spinResult.couponMetadata.isProductSpecific
            ? `${spinResult.couponMetadata.productName} from ${spinResult.couponMetadata.storeName}`
            : `Any product from ${spinResult.couponMetadata.storeName}`
        } : null
      }
    },
    coinsAdded: spinResult.type === 'coins' ? spinResult.value : 0,
    newBalance: actualBalance,
    spinsRemaining: postSpinEligibility.spinsRemaining,
    tournamentUpdate: null as any,
  };

  // Update tournament scores if coins were won
  if (spinResult.type === 'coins' && spinResult.value > 0) {
    try {
      const activeTournaments = await Tournament.find({
        status: 'active',
        gameType: { $in: ['spin_wheel', 'mixed'] },
        'participants.user': userId
      }).select('_id name participants').lean();

      for (const t of activeTournaments) {
        try {
          await tournamentService.updateParticipantScore(String(t._id), userId, spinResult.value);
          if (!response.tournamentUpdate) {
            const sorted = [...t.participants].sort((a, b) => {
              const aScore = a.user.toString() === userId ? a.score + spinResult.value : a.score;
              const bScore = b.user.toString() === userId ? b.score + spinResult.value : b.score;
              return bScore - aScore;
            });
            const newRank = sorted.findIndex(p => p.user.toString() === userId) + 1;
            response.tournamentUpdate = { tournamentName: t.name, pointsAdded: spinResult.value, newRank: newRank || 1 };
          }
        } catch (err: any) {
          logger.error(`[SPIN_WHEEL] Tournament score update failed for ${t.name}:`, err.message);
        }
      }
    } catch (err: any) {
      logger.error('[SPIN_WHEEL] Tournament lookup failed:', err.message);
    }
  }

  // Remove null tournamentUpdate from response if not set
  if (!response.tournamentUpdate) {
    delete (response as any).tournamentUpdate;
  }

  logger.info('💰 [SPIN_WHEEL] User balance after spin:', actualBalance);
  sendSuccess(res, response, 'Spin completed successfully');
});

export const getSpinWheelEligibility = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const eligibility = await spinWheelService.checkEligibility((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, eligibility, 'Eligibility checked successfully');
});

export const getSpinWheelData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  logger.info('📊 [SPIN_WHEEL] Getting spin wheel data for user:', userId);

  // Get segments from constant (no session creation needed)
  const segments = spinWheelService.getSpinWheelSegments();

  // Get eligibility and stats in parallel
  const [eligibility, stats] = await Promise.all([
    spinWheelService.checkEligibility(userId),
    spinWheelService.getSpinStats(userId),
  ]);

  // Calculate probability percentages for frontend display
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);

  const data = {
    segments: segments.map((s) => ({
      id: s.segment.toString(),
      label: s.prize,
      value: s.value,
      color: s.color,
      type: s.type,
      icon: 'star',
      probability: Math.round((s.weight / totalWeight) * 100),
    })),
    spinsRemaining: eligibility.spinsRemaining,
    spinsUsedToday: eligibility.spinsUsedToday,
    maxDailySpins: eligibility.maxDailySpins,
    nextResetAt: eligibility.nextResetAt,
    stats,
  };

  logger.info(`📊 [SPIN_WHEEL] User ${userId}: ${eligibility.spinsUsedToday} used, ${eligibility.spinsRemaining} remaining`);
  sendSuccess(res, data, 'Spin wheel data retrieved successfully');
});

/**
 * GET /api/gamification/spin-wheel/history
 * Get spin wheel history for authenticated user
 */
export const getSpinWheelHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const page = Math.max(1, parseInt(req.query.page as string) || 1);

  logger.info('📜 [SPIN_WHEEL] Getting spin history for user:', userId, 'page:', page, 'limit:', limit);

  const result = await spinWheelService.getSpinHistory(userId, limit, page);

  logger.info('✅ [SPIN_WHEEL] Found', result.history.length, 'spin records (page', page, 'of', result.pagination.pages, ')');

  sendSuccess(res, result, 'Spin wheel history retrieved successfully');
});

// ========================================
// MINI-GAMES - SCRATCH CARD
// ========================================

export const createScratchCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const session = await scratchCardService.createScratchCard((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, session, 'Scratch card created successfully', 201);
});

export const scratchCard = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, cellIndex } = req.body;

  if (!sessionId || cellIndex === undefined) {
    return sendBadRequest(res, 'Session ID and cell index required');
  }

  const result = await scratchCardService.scratchCell(sessionId, cellIndex);

  sendSuccess(res, result, 'Cell scratched successfully');
});

export const claimScratchCard = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await scratchCardService.claimScratchCard(id);

  sendSuccess(res, result, 'Scratch card claimed successfully');
});

// ========================================
// MINI-GAMES - QUIZ
// ========================================

export const startQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { difficulty = 'easy', questionCount = 5 } = req.body;

  const quiz = await quizService.startQuiz(
    (req.user._id as Types.ObjectId).toString(),
    difficulty,
    questionCount
  );

  sendSuccess(res, quiz, 'Quiz started successfully', 201);
});

export const submitQuizAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const { questionIndex, answer, timeSpent } = req.body;
  const userId = req.user ? (req.user._id as Types.ObjectId).toString() : '';

  if (questionIndex === undefined || answer === undefined) {
    return sendBadRequest(res, 'Question index and answer required');
  }

  const result = await quizService.submitAnswer(quizId, questionIndex, answer, timeSpent || 0);

  // When quiz is completed, update tournament scores
  let tournamentUpdate = null;
  if (result.completed && userId && result.currentScore > 0) {
    try {
      const activeTournaments = await Tournament.find({
        status: 'active',
        gameType: { $in: ['quiz', 'mixed'] },
        'participants.user': userId
      }).select('_id name participants').lean();

      for (const t of activeTournaments) {
        try {
          await tournamentService.updateParticipantScore(String(t._id), userId, result.currentScore);
          if (!tournamentUpdate) {
            const sorted = [...t.participants].sort((a, b) => {
              const aScore = a.user.toString() === userId ? a.score + result.currentScore : a.score;
              const bScore = b.user.toString() === userId ? b.score + result.currentScore : b.score;
              return bScore - aScore;
            });
            const newRank = sorted.findIndex(p => p.user.toString() === userId) + 1;
            tournamentUpdate = { tournamentName: t.name, pointsAdded: result.currentScore, newRank: newRank || 1 };
          }
        } catch (err: any) {
          logger.error(`[QUIZ] Tournament score update failed for ${t.name}:`, err.message);
        }
      }
    } catch (err: any) {
      logger.error('[QUIZ] Tournament lookup failed:', err.message);
    }
  }

  const responseData = { ...result, tournamentUpdate };
  sendSuccess(res, responseData, result.correct ? 'Correct answer!' : 'Incorrect answer');
});

export const getQuizProgress = asyncHandler(async (req: Request, res: Response) => {
  const { quizId } = req.params;

  const progress = await quizService.getQuizProgress(quizId);

  sendSuccess(res, progress, 'Quiz progress retrieved successfully');
});

export const completeQuiz = asyncHandler(async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const userId = req.user ? (req.user._id as Types.ObjectId).toString() : '';

  const result = await quizService.completeQuiz(quizId);

  // Update tournament scores if coins were earned
  let tournamentUpdate = null;
  const coinsEarned = result?.score || result?.coins || result?.reward?.coins || 0;
  if (userId && coinsEarned > 0) {
    try {
      const activeTournaments = await Tournament.find({
        status: 'active',
        gameType: { $in: ['quiz', 'mixed'] },
        'participants.user': userId
      }).select('_id name participants').lean();

      for (const t of activeTournaments) {
        try {
          await tournamentService.updateParticipantScore(String(t._id), userId, coinsEarned);
          if (!tournamentUpdate) {
            const sorted = [...t.participants].sort((a, b) => {
              const aScore = a.user.toString() === userId ? a.score + coinsEarned : a.score;
              const bScore = b.user.toString() === userId ? b.score + coinsEarned : b.score;
              return bScore - aScore;
            });
            const newRank = sorted.findIndex(p => p.user.toString() === userId) + 1;
            tournamentUpdate = { tournamentName: t.name, pointsAdded: coinsEarned, newRank: newRank || 1 };
          }
        } catch (err: any) {
          logger.error(`[QUIZ] Tournament score update failed for ${t.name}:`, err.message);
        }
      }
    } catch (err: any) {
      logger.error('[QUIZ] Tournament lookup failed:', err.message);
    }
  }

  const responseData = { ...result, tournamentUpdate };
  sendSuccess(res, responseData, 'Quiz completed successfully');
});

// ========================================
// MY PROGRESS (CHALLENGES + STATS)
// ========================================

/**
 * Get user's challenge progress across all challenges
 * GET /api/gamification/challenges/my-progress
 * @returns User's challenge progress with stats
 */
export const getMyChallengeProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get all user's challenge progress
  const allProgress = await challengeService.getUserProgress(userId, true);

  // Calculate statistics
  const stats = {
    completed: allProgress.filter(p => p.completed).length,
    active: allProgress.filter(p => !p.completed && (p.challenge as any)?.active).length,
    expired: allProgress.filter(p => !p.completed && !(p.challenge as any)?.active).length,
    totalCoinsEarned: allProgress
      .filter(p => p.rewardsClaimed)
      .reduce((sum, p) => sum + ((p.challenge as any)?.rewards?.coins || 0), 0)
  };

  const result = {
    challenges: allProgress,
    stats
  };

  sendSuccess(res, result, 'Challenge progress retrieved successfully');
});

// ========================================
// GAMIFICATION STATS
// ========================================

/**
 * Get user's complete gamification statistics
 * GET /api/gamification/stats
 * @returns Complete user gamification stats including games, coins, achievements, streaks, and rank
 */
export const getGamificationStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Fetch all stats in parallel for better performance
  const [
    coinBalance,
    streaks,
    challengeStats,
    achievements,
    userRanks,
    gameSessions
  ] = await Promise.all([
    // Get coin balance
    coinService.getCoinBalance(userId),

    // Get streaks
    streakService.getUserStreaks(userId),

    // Get challenge statistics
    challengeService.getUserStatistics(userId),

    // Get achievements
    UserAchievement.find({ user: userId, unlocked: true }).countDocuments(),

    // Get user ranks
    leaderboardService.getAllUserRanks(userId, 'month'),

    // Get game session stats
    (async () => {
      const GameSession = (await import('../models/GameSession')).default;
      return GameSession.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalGames: { $sum: 1 },
            gamesWon: {
              $sum: { $cond: [{ $eq: ['$result.won', true] }, 1, 0] }
            }
          }
        }
      ]);
    })()
  ]);

  // Format game session stats
  const gameStats = gameSessions.length > 0 ? gameSessions[0] : { totalGames: 0, gamesWon: 0 };

  // Build comprehensive stats object
  const stats = {
    // Games stats
    gamesPlayed: gameStats.totalGames || 0,
    gamesWon: gameStats.gamesWon || 0,

    // Coins stats
    totalCoins: coinBalance || 0,

    // Achievements stats
    achievements: achievements || 0,

    // Streak stats
    streak: streaks.login?.current || 0,
    longestStreak: streaks.login?.longest || 0,

    // Challenge stats
    challengesCompleted: challengeStats.completedChallenges || 0,
    challengesActive: challengeStats.totalChallenges - (challengeStats.completedChallenges || 0),

    // Rank stats (using spending rank as primary)
    rank: userRanks.spending?.rank || 0,
    allRanks: {
      spending: userRanks.spending?.rank || 0,
      reviews: userRanks.reviews?.rank || 0,
      referrals: userRanks.referrals?.rank || 0,
      coins: userRanks.coins?.rank || 0,
      cashback: userRanks.cashback?.rank || 0
    }
  };

  sendSuccess(res, stats, 'Gamification stats retrieved successfully');
});

// ========================================
// PLAY & EARN HUB
// ========================================

/**
 * Get all play & earn hub data in one call
 * GET /api/gamification/play-and-earn
 * @returns Combined data for daily spin, challenges, streak, and surprise drops
 */
export const getPlayAndEarnData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get today's date for spin count
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const MAX_DAILY_SPINS = 3;

  // Import MiniGame for spin count
  const { MiniGame } = await import('../models/MiniGame');

  // Fetch all data in parallel for performance
  const [
    spinEligibilityResult,
    spinsTodayResult,
    lastSpinResult,
    activeChallengesResult,
    userStreaksResult,
    availableDropsResult,
    coinBalanceResult,
  ] = await Promise.allSettled([
    spinWheelService.checkEligibility(userId),
    MiniGame.countDocuments({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed',
      completedAt: { $gte: today }
    }),
    MiniGame.findOne({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed'
    }).sort({ completedAt: -1 }).select('completedAt').lean(),
    challengeService.getUserProgress(userId, false),
    streakService.getUserStreaks(userId),
    (SurpriseCoinDrop as any).getAvailableDrops(userId),
    coinService.getCoinBalance(userId),
  ]);

  const spinEligibility = spinEligibilityResult.status === 'fulfilled'
    ? spinEligibilityResult.value
    : { canSpin: false, spinsRemaining: 0, spinsUsedToday: 0, maxDailySpins: 3, totalCoinsEarned: 0, nextResetAt: '', lastSpinAt: null as string | null };
  const spinsToday = spinsTodayResult.status === 'fulfilled' ? spinsTodayResult.value : 0;
  const lastSpin = lastSpinResult.status === 'fulfilled' ? lastSpinResult.value : null;
  const activeChallenges = activeChallengesResult.status === 'fulfilled' ? activeChallengesResult.value : [];
  const userStreaks = userStreaksResult.status === 'fulfilled' ? userStreaksResult.value : [];
  const availableDrops = availableDropsResult.status === 'fulfilled' ? availableDropsResult.value : [];
  const coinBalance = coinBalanceResult.status === 'fulfilled' ? coinBalanceResult.value : 0;

  // Get the most significant available drop (if any)
  const activeDrop = Array.isArray(availableDrops) && availableDrops.length > 0 ? availableDrops[0] : null;

  // Calculate completed today (reuse today variable from above)
  const todayStart = new Date(today);
  const challengesArray = Array.isArray(activeChallenges) ? activeChallenges : [];
  const completedToday = challengesArray.filter(
    (c: any) => c.completed && new Date(c.updatedAt) >= todayStart
  ).length;

  // Find the app_open streak or fallback to login streak
  const streaksArray = Array.isArray(userStreaks) ? userStreaks : [];
  const appOpenStreak = streaksArray.find((s: any) => s.type === 'app_open') ||
                        streaksArray.find((s: any) => s.type === 'login');

  // Check if user has checked in today
  const lastActivity = appOpenStreak ? new Date(appOpenStreak.lastActivityDate) : null;
  const todayCheckedIn = lastActivity
    ? lastActivity.setHours(0, 0, 0, 0) === todayStart.getTime()
    : false;

  // Find next milestone
  const currentStreak = appOpenStreak?.currentStreak || 0;
  const milestones = [
    { day: 3, coins: 50 },
    { day: 7, coins: 200 },
    { day: 14, coins: 500 },
    { day: 30, coins: 2000 },
    { day: 60, coins: 5000 },
    { day: 100, coins: 10000 }
  ];
  const nextMilestone = milestones.find(m => m.day > currentStreak) || milestones[milestones.length - 1];

  const data = {
    dailySpin: {
      spinsRemaining: spinEligibility.spinsRemaining,
      maxSpins: spinEligibility.maxDailySpins,
      lastSpinAt: spinEligibility.lastSpinAt || lastSpin?.completedAt || null,
      canSpin: spinEligibility.canSpin,
      nextSpinAt: spinEligibility.nextResetAt || null
    },
    challenges: {
      active: challengesArray
        .filter((c: any) => !c.completed)
        .slice(0, 3)
        .map((c: any) => ({
          id: c._id || c.challenge?._id,
          title: c.challenge?.title || 'Challenge',
          progress: {
            current: c.progress || 0,
            target: c.challenge?.requirements?.target || 100,
            percentage: Math.round((c.progress || 0) / (c.challenge?.requirements?.target || 100) * 100)
          },
          reward: c.challenge?.rewards?.coins || 0,
          expiresAt: c.challenge?.endDate
        })),
      totalActive: challengesArray.filter((c: any) => !c.completed).length,
      completedToday
    },
    streak: {
      type: appOpenStreak?.type || 'app_open',
      currentStreak: currentStreak,
      longestStreak: appOpenStreak?.longestStreak || 0,
      nextMilestone,
      todayCheckedIn
    },
    surpriseDrop: activeDrop ? {
      id: activeDrop._id,
      available: true,
      coins: activeDrop.coins,
      message: activeDrop.message,
      expiresAt: activeDrop.expiresAt,
      reason: activeDrop.reason
    } : {
      available: false,
      coins: 0,
      message: null,
      expiresAt: null
    },
    coinBalance
  };

  sendSuccess(res, data, 'Play & Earn data retrieved successfully');
});

/**
 * Claim a surprise coin drop
 * POST /api/gamification/surprise-drop/claim
 */
export const claimSurpriseDrop = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { dropId } = req.body;
  const userId = (req.user._id as Types.ObjectId).toString();

  if (!dropId) {
    return sendBadRequest(res, 'Drop ID is required');
  }

  const result = await withTransaction(async (session) => {
    // Claim the drop (within transaction if available)
    const claimedDrop = await (SurpriseCoinDrop as any).claimDrop(dropId, userId);

    if (!claimedDrop) {
      return null;
    }

    // Award coins to user
    const coinResult = await coinService.awardCoins(
      userId,
      claimedDrop.coins,
      'surprise_drop',
      claimedDrop.message,
      { dropId: claimedDrop._id, reason: claimedDrop.reason }
    );

    return { claimedDrop, coinResult };
  });

  if (!result) {
    return sendNotFound(res, 'Drop not found, already claimed, or expired');
  }

  sendSuccess(res, {
    coins: result.claimedDrop.coins,
    newBalance: result.coinResult.newBalance,
    message: `You claimed ${result.claimedDrop.coins} surprise coins!`
  }, 'Surprise drop claimed successfully');
});

// ========================================
// DAILY CHECK-IN CONFIG
// ========================================

// Default escalating daily check-in rewards for 7-day cycle
const DEFAULT_DAY_REWARDS = [10, 15, 20, 25, 30, 40, 100];

// In-memory cache for config (refreshed every 5 minutes)
let _cachedConfig: { dayRewards: number[]; proTips: string[]; affiliateTip: string; reviewTimeframe: string; isEnabled: boolean } | null = null;
let _configCachedAt = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Invalidate the in-memory config cache (called by admin after config update) */
export function invalidateCheckinConfigCache() {
  _cachedConfig = null;
  _configCachedAt = 0;
}

async function getCheckinConfig() {
  if (_cachedConfig && (Date.now() - _configCachedAt) < CONFIG_CACHE_TTL) {
    return _cachedConfig;
  }
  try {
    const DailyCheckInConfig = (await import('../models/DailyCheckInConfig')).default;
    const config = await DailyCheckInConfig.getActiveConfig();
    _cachedConfig = {
      dayRewards: config.dayRewards,
      proTips: config.proTips,
      affiliateTip: config.affiliateTip,
      reviewTimeframe: config.reviewTimeframe,
      isEnabled: config.isEnabled,
    };
    _configCachedAt = Date.now();
    return _cachedConfig;
  } catch {
    return {
      dayRewards: DEFAULT_DAY_REWARDS,
      proTips: [
        'Check in at the same time daily to build a habit',
        'Share posters daily to maximize your affiliate earnings',
        'Track your affiliate performance to see which posters work best',
        'Missing even one day resets your streak to zero',
      ],
      affiliateTip: 'Share posters → Friends download the app → Earn 100 coins/download + 5% commission on their first 3 purchases!',
      reviewTimeframe: 'within 24 hours',
      isEnabled: true,
    };
  }
}

/**
 * Get daily check-in configuration
 * GET /api/gamification/checkin-config
 */
export const getCheckinConfigEndpoint = asyncHandler(async (req: Request, res: Response) => {
  const config = await getCheckinConfig();
  sendSuccess(res, config, 'Check-in config retrieved successfully');
});

// Escalating daily check-in rewards for 7-day cycle (matches frontend calendar)
const DAY_REWARDS = DEFAULT_DAY_REWARDS; // Fallback; streakCheckin reads from config dynamically

/**
 * Get the coin reward for a given streak day based on 7-day cycle.
 * Day 1 → 10, Day 2 → 15, ..., Day 7 → 100, Day 8 → 10 (new cycle), etc.
 * Uses cached config; falls back to DEFAULT_DAY_REWARDS.
 */
async function getDayReward(streakDay: number): Promise<number> {
  const config = await getCheckinConfig();
  const rewards = config.dayRewards || DEFAULT_DAY_REWARDS;
  const dayIndex = ((streakDay - 1) % 7); // 0-6
  return rewards[dayIndex] ?? 10;
}

/**
 * Check in for daily streak
 * POST /api/gamification/streak/checkin
 *
 * SECURITY: Uses atomic findOneAndUpdate to prevent race condition where
 * two concurrent requests both see yesterday's date and both award coins.
 * Only one request per day can succeed — the atomic guard ensures this.
 */
export const streakCheckin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Step 1: Atomically claim today's check-in slot.
  // Only succeeds if lastActivityDate is before today (prevents double check-in).
  // Returns the OLD document so we can compute the correct streak values.
  const previousStreak = await UserStreak.findOneAndUpdate(
    {
      user: userId,
      type: 'app_open',
      lastActivityDate: { $lt: todayStart }
    },
    {
      $set: { lastActivityDate: new Date() }
    },
    { new: false } // Return OLD document
  );

  if (!previousStreak) {
    // Either already checked in today, or no streak document exists
    const existingStreak = await UserStreak.findOne({ user: userId, type: 'app_open' }).lean();

    if (existingStreak) {
      // Already checked in today — return current state
      return sendSuccess(res, {
        streakUpdated: false,
        currentStreak: existingStreak.currentStreak,
        coinsEarned: 0,
        milestoneReached: null,
        message: 'Already checked in today'
      }, 'Already checked in today');
    }

    // No streak exists — create one atomically (first-ever check-in)
    const newStreak = await UserStreak.create({
      user: userId,
      type: 'app_open',
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: new Date(),
      streakStartDate: new Date(),
      totalDays: 1,
      milestones: [
        { day: 3, coinsReward: 50, rewardsClaimed: false },
        { day: 7, coinsReward: 200, rewardsClaimed: false },
        { day: 14, coinsReward: 500, rewardsClaimed: false },
        { day: 30, coinsReward: 2000, badgeReward: 'streak_master', rewardsClaimed: false },
        { day: 60, coinsReward: 5000, rewardsClaimed: false },
        { day: 100, coinsReward: 10000, badgeReward: 'loyalty_legend', rewardsClaimed: false }
      ]
    });

    // Award escalating day reward based on 7-day cycle
    const day1Reward = await getDayReward(1);
    const result = await coinService.awardCoins(
      userId, day1Reward, 'daily_login', `Day 1 streak bonus (+${day1Reward} coins)`, { streakDay: 1 }
    );

    // Create DailyCheckIn record
    const DailyCheckIn = (await import('../models/DailyCheckIn')).default;
    try {
      await DailyCheckIn.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), date: todayStart },
        { userId: new Types.ObjectId(userId), date: todayStart, streak: 1, coinsEarned: day1Reward, bonusEarned: 0, totalEarned: day1Reward, coinType: 'rez' },
        { upsert: true, new: true }
      );
    } catch (checkInError) {
      logger.error('[STREAK CHECKIN] Error creating DailyCheckIn record:', checkInError);
    }

    // Emit daily_checkin event for mission progress tracking
    gamificationEventBus.emit('daily_checkin', {
      userId,
      metadata: { streakDay: 1, coinsEarned: day1Reward },
      source: { controller: 'gamificationController', action: 'streakCheckin' },
    });

    return sendSuccess(res, {
      streakUpdated: true,
      currentStreak: 1,
      longestStreak: 1,
      coinsEarned: day1Reward,
      totalEarned: day1Reward,
      milestoneReached: null,
      newBalance: result.newBalance,
      message: `Day 1 streak! +${day1Reward} coins`
    }, 'Streak check-in successful');
  }

  // Step 2: We have the OLD document. The atomic update already set lastActivityDate
  // to now, so no other concurrent request can pass step 1. Safe to compute streak.
  const lastActivity = new Date(previousStreak.lastActivityDate);
  lastActivity.setUTCHours(0, 0, 0, 0);
  const daysDiff = Math.floor((todayStart.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  let newCurrentStreak: number;
  let newStreakStart = previousStreak.streakStartDate;

  if (daysDiff === 1) {
    // Consecutive day — extend streak
    newCurrentStreak = previousStreak.currentStreak + 1;
  } else if (daysDiff > 1) {
    // Streak potentially broken
    if (previousStreak.frozen && previousStreak.freezeExpiresAt && previousStreak.freezeExpiresAt >= todayStart) {
      // Freeze saved the streak
      newCurrentStreak = previousStreak.currentStreak + 1;
    } else {
      // Streak is broken — restart
      newCurrentStreak = 1;
      newStreakStart = new Date();
    }
  } else {
    // daysDiff === 0 shouldn't happen (filtered by $lt todayStart), defensive fallback
    newCurrentStreak = previousStreak.currentStreak;
  }

  const newLongestStreak = Math.max(previousStreak.longestStreak, newCurrentStreak);

  // Step 3: Update streak with computed values
  const updatedStreak = await UserStreak.findByIdAndUpdate(
    previousStreak._id,
    {
      $set: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        totalDays: previousStreak.totalDays + 1,
        streakStartDate: newStreakStart,
        frozen: false,
        freezeExpiresAt: undefined
      }
    },
    { new: true }
  );

  if (!updatedStreak) {
    throw new AppError('Failed to update streak', 500);
  }

  // Step 4: Check for milestone rewards
  let milestoneReached = null;
  const baseDayReward = await getDayReward(newCurrentStreak); // Escalating reward based on 7-day cycle
  let coinsEarned = baseDayReward;

  for (const milestone of updatedStreak.milestones) {
    if (newCurrentStreak >= milestone.day && !milestone.rewardsClaimed) {
      milestoneReached = {
        day: milestone.day,
        coins: milestone.coinsReward,
        badge: milestone.badgeReward
      };
      coinsEarned += milestone.coinsReward;

      // Mark as claimed
      milestone.rewardsClaimed = true;
      milestone.claimedAt = new Date();
    }
  }

  // Save milestone claims if any were reached
  if (milestoneReached) {
    await updatedStreak.save();
  }

  // Step 5: Award coins
  const result = await coinService.awardCoins(
    userId,
    coinsEarned,
    'daily_login',
    milestoneReached
      ? `Day ${newCurrentStreak} streak + Day ${milestoneReached.day} milestone!`
      : `Day ${newCurrentStreak} streak bonus`,
    { streakDay: newCurrentStreak, milestone: milestoneReached }
  );

  // Create DailyCheckIn record
  const DailyCheckIn = (await import('../models/DailyCheckIn')).default;
  try {
    await DailyCheckIn.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), date: todayStart },
      {
        userId: new Types.ObjectId(userId),
        date: todayStart,
        streak: newCurrentStreak,
        coinsEarned: baseDayReward,
        bonusEarned: milestoneReached ? milestoneReached.coins : 0,
        totalEarned: coinsEarned,
        coinType: 'rez'
      },
      { upsert: true, new: true }
    );
  } catch (checkInError) {
    logger.error('[STREAK CHECKIN] Error creating DailyCheckIn record:', checkInError);
  }

  // Emit daily_checkin event for mission progress tracking
  gamificationEventBus.emit('daily_checkin', {
    userId,
    metadata: { streakDay: newCurrentStreak, coinsEarned },
    source: { controller: 'gamificationController', action: 'streakCheckin' },
  });

  sendSuccess(res, {
    streakUpdated: true,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    coinsEarned,
    totalEarned: coinsEarned,
    milestoneReached,
    newBalance: result.newBalance,
    message: milestoneReached
      ? `Congratulations! You reached Day ${milestoneReached.day} milestone!`
      : `Day ${newCurrentStreak} streak! +${coinsEarned} coins`
  }, 'Streak check-in successful');
});

/**
 * Claim a streak milestone reward (path-param version)
 * POST /api/gamification/streak/milestone/:day/claim
 */
export const claimStreakMilestone = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const day = parseInt(req.params.day);
  const { type = 'login' } = req.body;

  if (isNaN(day) || day <= 0) {
    return sendBadRequest(res, 'Invalid milestone day');
  }

  const validTypes = ['login', 'order', 'review'];
  if (!validTypes.includes(type)) {
    return sendBadRequest(res, 'Invalid streak type. Must be: login, order, or review');
  }

  const result = await streakService.claimMilestone(userId, type, day);

  // Award milestone coins
  if (result.rewards.coins > 0) {
    const coinResult = await coinService.awardCoins(
      userId,
      result.rewards.coins,
      'daily_login',
      `Streak milestone Day ${day} reward: ${result.rewards.name}`,
      { streakDay: day, streakType: type, milestoneName: result.rewards.name }
    );

    sendSuccess(res, {
      milestone: {
        day,
        name: result.rewards.name,
        coins: result.rewards.coins,
        badge: result.rewards.badge || null
      },
      newBalance: coinResult.newBalance,
      currentStreak: result.streak.currentStreak
    }, 'Milestone reward claimed successfully');
  } else {
    sendSuccess(res, {
      milestone: { day, name: result.rewards.name, coins: 0 },
      currentStreak: result.streak.currentStreak
    }, 'Milestone claimed');
  }
});

/**
 * Get milestones for a specific streak type
 * GET /api/gamification/streaks/:type/milestones
 */
export const getStreakMilestones = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { type } = req.params;

  const validTypes = ['login', 'order', 'review', 'app_open'];
  if (!validTypes.includes(type)) {
    return sendBadRequest(res, 'Invalid streak type');
  }

  // Get user's streak for this type
  let streak = await UserStreak.findOne({ user: userId, type }).lean();

  if (!streak) {
    // Return default milestones with no progress
    const defaultMilestones = type === 'app_open' || type === 'login'
      ? [
          { day: 3, coins: 50, name: '3-Day Streak', reached: false, claimed: false },
          { day: 7, coins: 200, name: 'Week Warrior', reached: false, claimed: false },
          { day: 14, coins: 500, name: 'Two-Week Champion', reached: false, claimed: false },
          { day: 30, coins: 2000, name: 'Month Master', reached: false, claimed: false },
          { day: 60, coins: 5000, name: 'Dedication Pro', reached: false, claimed: false },
          { day: 100, coins: 10000, name: 'Loyalty Legend', reached: false, claimed: false },
        ]
      : type === 'order'
      ? [
          { day: 2, coins: 100, name: 'Double Order', reached: false, claimed: false },
          { day: 4, coins: 300, name: 'Shopping Habit', reached: false, claimed: false },
          { day: 7, coins: 800, name: 'Weekly Shopper', reached: false, claimed: false },
          { day: 14, coins: 2000, name: 'Shopping Pro', reached: false, claimed: false },
        ]
      : [
          { day: 3, coins: 75, name: 'Review Regular', reached: false, claimed: false },
          { day: 7, coins: 250, name: 'Review Pro', reached: false, claimed: false },
          { day: 14, coins: 600, name: 'Review Champion', reached: false, claimed: false },
        ];

    return sendSuccess(res, {
      type,
      currentStreak: 0,
      milestones: defaultMilestones
    }, 'Streak milestones retrieved');
  }

  // Format milestones with reach/claim status
  const milestones = streak.milestones.map(m => ({
    day: m.day,
    coins: m.coinsReward,
    badge: m.badgeReward || null,
    reached: streak!.currentStreak >= m.day,
    claimed: m.rewardsClaimed,
    claimedAt: m.claimedAt || null
  }));

  sendSuccess(res, {
    type,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    milestones
  }, 'Streak milestones retrieved');
});

// ========================================
// AFFILIATE / SHARE ENDPOINTS
// ========================================

/**
 * Get affiliate performance stats
 * GET /api/gamification/affiliate/stats
 */
export const getAffiliateStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const userObjectId = new Types.ObjectId(userId);

  // Import models
  const Referral = (await import('../models/Referral')).default;
  const SocialMediaPost = (await import('../models/SocialMediaPost')).default;

  // Use aggregation pipelines for efficient stats (avoids loading all documents into memory)
  const [referralStats, postStats] = await Promise.all([
    Referral.aggregate([
      { $match: { referrer: userObjectId } },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          appDownloads: { $sum: { $cond: [{ $ne: ['$status', 'pending'] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $in: ['$status', ['completed', 'qualified']] }, 1, 0] } },
          referrerCommission: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'qualified']] },
                { $ifNull: ['$rewards.referrerAmount', 0] },
                0
              ]
            }
          },
        },
      },
    ]),
    SocialMediaPost.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: null,
          totalShares: { $sum: 1 },
          postCommission: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved', 'credited']] },
                { $ifNull: ['$cashbackAmount', 0] },
                0
              ]
            }
          },
        },
      },
    ]),
  ]);

  const refStats = referralStats[0] || { appDownloads: 0, purchases: 0, referrerCommission: 0 };
  const pStats = postStats[0] || { totalShares: 0, postCommission: 0 };

  sendSuccess(res, {
    totalShares: pStats.totalShares,
    appDownloads: refStats.appDownloads,
    purchases: refStats.purchases,
    commissionEarned: refStats.referrerCommission + pStats.postCommission,
  }, 'Affiliate stats retrieved successfully');
});

/**
 * Get promotional posters for sharing
 * GET /api/gamification/promotional-posters
 */
export const getPromotionalPosters = asyncHandler(async (req: Request, res: Response) => {
  // Import HeroBanner model
  const HeroBanner = (await import('../models/HeroBanner')).default;

  // Get active banners that can be used as promotional posters
  const now = new Date();
  const banners = await HeroBanner.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    'metadata.tags': { $in: ['promotional', 'shareable', 'poster'] }
  }).sort({ priority: -1 }).limit(10).lean();

  // If no promotional banners found, get any active banners
  let posters = banners;
  if (posters.length === 0) {
    posters = await HeroBanner.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }).sort({ priority: -1 }).limit(4).lean();
  }

  // Transform to frontend format
  const formattedPosters = posters.map(banner => ({
    id: banner._id.toString(),
    title: banner.title,
    subtitle: banner.subtitle || banner.description || '',
    image: banner.image,
    colors: banner.metadata?.colors || [banner.backgroundColor || '#3B82F6', banner.backgroundColor || '#8B5CF6'],
    shareBonus: banner.metadata?.shareBonus || 50,
    isActive: banner.isActive,
  }));

  // No posters found — return empty array (frontend handles empty state)
  if (formattedPosters.length === 0) {
    return sendSuccess(res, { posters: [] }, 'No promotional posters available');
  }

  sendSuccess(res, { posters: formattedPosters }, 'Promotional posters retrieved successfully');
});

/**
 * Get user's share submissions history
 * GET /api/gamification/affiliate/submissions
 */
export const getShareSubmissions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  // Import SocialMediaPost model
  const SocialMediaPost = (await import('../models/SocialMediaPost')).default;

  // Get user's submissions with pagination
  const [posts, total] = await Promise.all([
    SocialMediaPost.find({ user: userId })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as Promise<Lean<ISocialMediaPost>[]>,
    SocialMediaPost.countDocuments({ user: userId }),
  ]);

  // Transform to frontend format
  const submissions = posts.map((post: any) => ({
    id: (String(post._id)).toString(),
    posterTitle: post.metadata?.orderNumber || 'Promotional Poster',
    posterId: post.metadata?.postId,
    postUrl: post.postUrl,
    platform: post.platform,
    status: post.status === 'credited' ? 'approved' : post.status,
    submittedAt: post.submittedAt.toISOString(),
    approvedAt: post.reviewedAt?.toISOString(),
    shareBonus: post.cashbackAmount || 0,
    rejectionReason: post.rejectionReason,
  }));

  sendSuccess(res, {
    submissions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, 'Share submissions retrieved successfully');
});

/**
 * Submit a shared post for review
 * POST /api/gamification/affiliate/submit
 */
export const submitSharePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { posterId, posterTitle, postUrl, platform, shareBonus } = req.body;

  if (!postUrl || !platform) {
    return sendBadRequest(res, 'Post URL and platform are required');
  }

  // Validate URL
  try {
    new URL(postUrl);
  } catch {
    return sendBadRequest(res, 'Invalid post URL');
  }

  // Import SocialMediaPost model
  const SocialMediaPost = (await import('../models/SocialMediaPost')).default;

  // FRAUD PREVENTION: Daily submission limit (50 per day)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyCount = await SocialMediaPost.countDocuments({
    user: userId,
    submittedAt: { $gte: oneDayAgo }
  });
  if (dailyCount >= 50) {
    return sendBadRequest(res, 'Maximum 50 submissions per day reached. Please try again tomorrow.');
  }

  // FRAUD PREVENTION: Check for duplicate URL (any user, not just current)
  const existingPost = await SocialMediaPost.findOne({
    postUrl: postUrl,
    status: { $in: ['pending', 'approved', 'credited'] }
  }).lean();

  if (existingPost) {
    return sendBadRequest(res, 'This post URL has already been submitted');
  }

  // Capture fraud metadata from request
  const submissionIp = req.ip || req.socket?.remoteAddress || req.headers['x-forwarded-for'];
  const deviceFingerprint = req.headers['x-device-id'] as string;
  const userAgent = req.headers['user-agent'];

  // Create new submission with fraud tracking
  const newPost = new SocialMediaPost({
    user: userId,
    platform: platform.toLowerCase(),
    postUrl,
    status: 'pending',
    cashbackAmount: shareBonus || 50,
    cashbackPercentage: 5,
    submittedAt: new Date(),
    submissionIp: typeof submissionIp === 'string' ? submissionIp : Array.isArray(submissionIp) ? submissionIp[0] : undefined,
    deviceFingerprint,
    userAgent,
    metadata: {
      postId: posterId,
      orderNumber: posterTitle,
    }
  }) as unknown as ISocialMediaPost;

  await newPost.save();

  // Return formatted submission
  const submission = {
    id: (String(newPost._id)).toString(),
    posterTitle: posterTitle || 'Promotional Poster',
    posterId,
    postUrl,
    platform,
    status: 'pending',
    submittedAt: newPost.submittedAt.toISOString(),
    shareBonus: newPost.cashbackAmount,
  };

  sendSuccess(res, { submission }, 'Post submitted for review successfully', 201);
});

/**
 * Get streak bonus milestones
 * GET /api/gamification/streak/bonuses
 */
export const getStreakBonuses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get user's streak
  const streak = await UserStreak.findOne({ user: userId, type: 'app_open' }).lean() ||
                 await UserStreak.findOne({ user: userId, type: 'login' }).lean();

  const currentStreak = streak?.currentStreak || 0;

  // Define all 6 streak bonuses (matches milestone config in streakCheckin)
  const defaultBonuses = [
    { days: 3, reward: 50, achieved: currentStreak >= 3 },
    { days: 7, reward: 200, achieved: currentStreak >= 7 },
    { days: 14, reward: 500, achieved: currentStreak >= 14 },
    { days: 30, reward: 2000, achieved: currentStreak >= 30 },
    { days: 60, reward: 5000, achieved: currentStreak >= 60 },
    { days: 100, reward: 10000, achieved: currentStreak >= 100 },
  ];

  // If user has milestones on their streak, use those (with claimed status)
  if (streak?.milestones && streak.milestones.length > 0) {
    const userBonuses = streak.milestones
      .map(m => ({
        days: m.day,
        reward: m.coinsReward,
        achieved: m.rewardsClaimed || currentStreak >= m.day,
      }))
      .sort((a, b) => a.days - b.days);

    if (userBonuses.length > 0) {
      return sendSuccess(res, { bonuses: userBonuses }, 'Streak bonuses retrieved successfully');
    }
  }

  sendSuccess(res, { bonuses: defaultBonuses }, 'Streak bonuses retrieved successfully');
});

/**
 * Get reviewable items for user
 * Items the user has purchased/visited but hasn't reviewed yet
 * GET /api/gamification/reviewable-items
 */
export const getReviewableItems = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get user's completed orders
  const completedOrders = await Order.find({
    user: userId,
    status: { $in: ['completed', 'delivered'] }
  })
    .populate('store', 'name logo category images rewardRules')
    .populate('items.product', 'name images category pricing priveReviewRewardCoins')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Get user's existing reviews to filter out already reviewed items
  const existingReviews = await Review.find({ user: userId }).select('store product').lean();
  const reviewedStoreIds = new Set(existingReviews.map(r => r.store?.toString()).filter(Boolean));
  const reviewedProductIds = new Set(existingReviews.map(r => r.product?.toString()).filter(Boolean));

  const reviewableItems: any[] = [];

  // Process orders to find reviewable stores and products
  for (const order of completedOrders) {
    const store = (order as any).store;
    const orderDate = new Date(order.createdAt);
    const daysAgo = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Add store if not reviewed
    if (store && !reviewedStoreIds.has(store._id.toString())) {
      reviewedStoreIds.add(store._id.toString()); // Prevent duplicates
      reviewableItems.push({
        id: store._id.toString(),
        type: 'store',
        name: store.name || 'Store',
        image: store.logo || store.images?.[0]?.url || null,
        category: store.category || 'General',
        visitDate: `${daysAgo} days ago`,
        coins: store.rewardRules?.reviewBonusCoins || 20,
        hasReceipt: true,
      });
    }

    // Add products from the order if not reviewed
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const product = item.product as any;
        if (product && !reviewedProductIds.has(product._id.toString())) {
          reviewedProductIds.add(product._id.toString()); // Prevent duplicates
          reviewableItems.push({
            id: product._id.toString(),
            type: 'product',
            name: product.name || 'Product',
            image: product.images?.[0]?.url || null,
            category: product.category || 'General',
            purchaseDate: `${daysAgo} days ago`,
            coins: product.priveReviewRewardCoins || store?.rewardRules?.reviewBonusCoins || 20,
            brand: product.brand || null,
          });
        }
      }
    }
  }

  // Calculate potential earnings
  const potentialEarnings = reviewableItems.reduce((sum, item) => sum + (item.coins || 0), 0);

  sendSuccess(res, {
    items: reviewableItems.slice(0, 20), // Limit to 20 items
    totalPending: reviewableItems.length,
    potentialEarnings,
  }, 'Reviewable items retrieved successfully');
});

// ========================================
// BONUS OPPORTUNITIES
// ========================================

/**
 * Get active bonus opportunities (time-limited)
 * Returns active challenges ending soon, coin drops, and campaigns
 */
export const getBonusOpportunities = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Helper to calculate time remaining
  const getTimeRemaining = (endDate: Date): string => {
    const diff = endDate.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  try {
    // Fetch all bonus data in parallel
    const [
      urgentChallenges,
      activeCoinDrops,
      activeCampaigns
    ] = await Promise.all([
      // Get challenges ending within 24 hours
      Challenge.find({
        isActive: true,
        endDate: { $gte: now, $lte: in24Hours }
      }).sort({ endDate: 1 }).limit(5).lean(),

      // Get active coin drops
      CoinDrop.find({
        isActive: true,
        endTime: { $gte: now }
      }).sort({ priority: -1, endTime: 1 }).limit(5).lean(),

      // Get active campaigns
      Campaign.find({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now }
      }).sort({ priority: -1 }).limit(5).lean()
    ]);

    const opportunities: any[] = [];

    // Format challenges as bonus opportunities
    for (const challenge of urgentChallenges) {
      opportunities.push({
        id: challenge._id.toString(),
        title: challenge.title || 'Challenge',
        description: challenge.description || 'Complete the challenge',
        reward: `+${(challenge as any).rewards?.coins || 100} Coins`,
        timeLeft: getTimeRemaining(challenge.endDate),
        icon: 'trophy',
        type: 'challenge',
        priority: 3 // High priority for ending soon
      });
    }

    // Format coin drops as bonus opportunities
    for (const drop of activeCoinDrops) {
      opportunities.push({
        id: drop._id.toString(),
        title: `${drop.multiplier}X Cashback`,
        description: `${drop.storeName || 'Partner Store'} - ${drop.boostedCashback || drop.multiplier * (drop.normalCashback || 5)}% back`,
        reward: `${drop.multiplier}X Earnings`,
        timeLeft: getTimeRemaining(drop.endTime),
        icon: 'flash',
        type: 'drop',
        priority: drop.priority || 2
      });
    }

    // Format campaigns as bonus opportunities
    for (const campaign of activeCampaigns) {
      opportunities.push({
        id: campaign._id.toString(),
        title: campaign.title || 'Special Offer',
        description: campaign.subtitle || campaign.description || 'Limited time offer',
        reward: campaign.badge || 'Bonus',
        timeLeft: getTimeRemaining(campaign.endTime),
        icon: campaign.icon || 'gift',
        type: campaign.type || 'promotion',
        priority: campaign.priority || 1
      });
    }

    // Sort by priority (higher first) and time remaining
    opportunities.sort((a, b) => b.priority - a.priority);

    // No bonus opportunities currently active — return empty array
    // Frontend handles the empty state display

    sendSuccess(res, {
      opportunities: opportunities.slice(0, 10),
      total: opportunities.length
    }, 'Bonus opportunities retrieved successfully');
  } catch (error: any) {
    logger.error('[GAMIFICATION] Error fetching bonus opportunities:', error);
    sendError(res, error.message || 'Failed to fetch bonus opportunities', 500);
  }
});
