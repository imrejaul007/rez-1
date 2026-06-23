import { Request, Response } from 'express';
import { logger } from '../config/logger';
import UserLoyalty from '../models/UserLoyalty';
import { CoinTransaction, ICoinTransactionModel } from '../models/CoinTransaction';
import Challenge from '../models/Challenge';
import UserChallengeProgress from '../models/UserChallengeProgress';
import LoyaltyMilestone from '../models/LoyaltyMilestone';
import tierConfigService from '../services/tierConfigService';
import coinService from '../services/coinService';
import redisService from '../services/redisService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { escapeRegex } from '../utils/sanitize';

// Tier thresholds for point-based tier calculation
const TIER_THRESHOLDS = [
  { name: 'Diamond', minPoints: 10000, maxPoints: Infinity, color: '#B9F2FF', icon: 'diamond', discountPercentage: 15, earningMultiplier: 3.0 },
  { name: 'Platinum', minPoints: 5000, maxPoints: 9999, color: '#E5E4E2', icon: 'medal', discountPercentage: 12, earningMultiplier: 2.5 },
  { name: 'Gold', minPoints: 2000, maxPoints: 4999, color: '#FFD700', icon: 'trophy', discountPercentage: 10, earningMultiplier: 2.0 },
  { name: 'Silver', minPoints: 500, maxPoints: 1999, color: '#C0C0C0', icon: 'star', discountPercentage: 5, earningMultiplier: 1.5 },
  { name: 'Bronze', minPoints: 0, maxPoints: 499, color: '#CD7F32', icon: 'shield', discountPercentage: 2, earningMultiplier: 1.0 },
];

function getTierFromPoints(points: number) {
  for (const tier of TIER_THRESHOLDS) {
    if (points >= tier.minPoints) {
      return tier;
    }
  }
  return TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]; // Bronze fallback
}

function getNextTier(currentTierName: string) {
  const idx = TIER_THRESHOLDS.findIndex(t => t.name === currentTierName);
  if (idx <= 0) return null; // Already Diamond or not found
  return TIER_THRESHOLDS[idx - 1];
}

// Helper: get YYYY-MM-DD string for a date in a given timezone
function getDateStringInTZ(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * 1. GET /loyalty/points/balance
 * Returns the user's point balance with tier information.
 */
export const getPointBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check Redis cache first (60s TTL — user-specific data)
  const cacheKey = `loyalty:points:${userId}`;
  const cached = await redisService.get(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Point balance retrieved');
  }

  const [loyalty, currentBalance] = await Promise.all([
    UserLoyalty.findOne({ userId }).lean(),
    (CoinTransaction as unknown as ICoinTransactionModel).getUserBalance(userId),
  ]);

  // Compute lifetime points from all earned transactions
  const lifetimeResult = await CoinTransaction.aggregate([
    { $match: { user: userId, type: { $in: ['earned', 'bonus', 'refunded'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const lifetimePoints = lifetimeResult.length > 0 ? lifetimeResult[0].total : 0;

  // Pending points (earned in last 24h that may not have settled)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pendingResult = await CoinTransaction.aggregate([
    { $match: { user: userId, type: 'earned', createdAt: { $gte: oneDayAgo } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const pendingPoints = pendingResult.length > 0 ? pendingResult[0].total : 0;

  // Expiring points from UserLoyalty
  const expiringPoints = loyalty?.coins?.expiring || 0;
  const expiryDate = loyalty?.coins?.expiryDate || null;

  // Tier calculation
  const tier = getTierFromPoints(lifetimePoints);
  const nextTier = getNextTier(tier.name);
  const pointsToNextTier = nextTier ? nextTier.minPoints - lifetimePoints : 0;

  const result = {
    currentPoints: currentBalance,
    lifetimePoints,
    pendingPoints,
    expiringPoints,
    expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
    tier: tier.name,
    nextTier: nextTier?.name || null,
    pointsToNextTier: Math.max(0, pointsToNextTier),
  };

  // Cache for 60 seconds
  await redisService.set(cacheKey, result, 60);

  sendSuccess(res, result, 'Point balance retrieved');
});

/**
 * 2. GET /loyalty/catalog
 * Returns the rewards catalog built from LoyaltyMilestone documents.
 */
export const getRewardsCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { category, minPoints, maxPoints, search, page: pageStr, limit: limitStr } = req.query;

  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));

  const filter: any = { isActive: true };

  if (category && typeof category === 'string') {
    filter.targetType = category;
  }
  if (minPoints) {
    filter.rewardCoins = { ...filter.rewardCoins, $gte: parseInt(minPoints as string) || 0 };
  }
  if (maxPoints) {
    filter.rewardCoins = { ...filter.rewardCoins, $lte: parseInt(maxPoints as string) || 999999 };
  }
  if (search && typeof search === 'string') {
    const escaped = escapeRegex(search);
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [milestones, total] = await Promise.all([
    LoyaltyMilestone.find(filter)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LoyaltyMilestone.countDocuments(filter),
  ]);

  // Map milestones to RewardItem format
  const rewards = milestones.map(m => ({
    id: m._id,
    title: m.title,
    description: m.description,
    points: m.rewardCoins || 0,
    category: m.targetType,
    type: m.rewardType,
    icon: m.icon,
    color: m.color,
    image: m.badgeImage || null,
    tier: m.tier || null,
    discount: m.rewardDiscount || null,
    targetValue: m.targetValue,
    reward: m.reward,
  }));

  // Get featured items (top 5 by order)
  const featured = rewards.slice(0, 5);

  // Get unique categories
  const allCategories = await LoyaltyMilestone.distinct('targetType', { isActive: true });

  sendSuccess(res, {
    featured,
    categories: allCategories,
    rewards,
    total,
    filters: {
      category: category || null,
      minPoints: minPoints ? parseInt(minPoints as string) : null,
      maxPoints: maxPoints ? parseInt(maxPoints as string) : null,
      search: search || null,
    },
  }, 'Rewards catalog retrieved');
});

/**
 * 3. GET /loyalty/tier
 * Returns tier configuration with current user's tier info.
 */
export const getTierInfo = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Get subscription tiers from DB
  let dbTiers: any[] = [];
  try {
    dbTiers = await tierConfigService.getAllActiveTiers();
  } catch (err) {
    logger.warn('[loyaltyRedemption] Failed to fetch subscription tiers, using point-based tiers', err);
  }

  // Get user's current points for tier calculation
  const lifetimeResult = await CoinTransaction.aggregate([
    { $match: { user: userId, type: { $in: ['earned', 'bonus', 'refunded'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const lifetimePoints = lifetimeResult.length > 0 ? lifetimeResult[0].total : 0;
  const currentTier = getTierFromPoints(lifetimePoints);

  // Map point-based tiers to TierConfig format
  const tiers = TIER_THRESHOLDS.map(t => ({
    name: t.name,
    minPoints: t.minPoints,
    maxPoints: t.maxPoints === Infinity ? null : t.maxPoints,
    benefits: [
      { name: 'Earning Multiplier', description: `${t.earningMultiplier}x earning rate`, value: t.earningMultiplier },
      { name: 'Discount', description: `${t.discountPercentage}% discount on rewards`, value: t.discountPercentage },
    ],
    color: t.color,
    icon: t.icon,
    discountPercentage: t.discountPercentage,
    earningMultiplier: t.earningMultiplier,
  }));

  // Include subscription tier info if available
  const subscriptionTiers = dbTiers.map(t => ({
    name: t.name,
    tier: t.tier,
    pricing: t.pricing,
    benefits: t.benefits,
    features: t.features,
    description: t.description,
  }));

  sendSuccess(res, {
    currentTier: currentTier.name,
    lifetimePoints,
    tiers,
    subscriptionTiers,
  }, 'Tier information retrieved');
});

/**
 * 4. GET /loyalty/redemptions
 * Returns paginated redemption history.
 */
export const getRedemptionHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

  const filter = { user: userId, type: 'spent' as const };

  const [transactions, total] = await Promise.all([
    CoinTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(filter),
  ]);

  const redemptions = transactions.map(tx => ({
    id: tx._id,
    points: tx.amount,
    description: tx.description,
    source: tx.source,
    category: tx.category || null,
    date: tx.createdAt,
    metadata: tx.metadata || {},
  }));

  sendSuccess(res, {
    redemptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Redemption history retrieved');
});

/**
 * 5. GET /loyalty/challenges
 * Returns active challenges with user's progress.
 */
export const getChallenges = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const now = new Date();

  // Get active challenges
  const challenges = await Challenge.find({
    active: true,
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ priority: -1, endDate: 1 })
    .lean();

  if (challenges.length === 0) {
    return sendSuccess(res, { challenges: [] }, 'No active challenges');
  }

  // Batch fetch user progress for all challenges
  const challengeIds = challenges.map(c => c._id);
  const progressRecords = await UserChallengeProgress.find({
    user: userId,
    challenge: { $in: challengeIds },
  }).lean();

  const progressMap = new Map(
    progressRecords.map(p => [p.challenge.toString(), p])
  );

  const mappedChallenges = challenges.map(c => {
    const progress = progressMap.get(c._id.toString());
    return {
      id: c._id,
      type: c.type,
      title: c.title,
      description: c.description,
      icon: c.icon,
      difficulty: c.difficulty,
      action: c.requirements.action,
      target: c.requirements.target,
      progress: progress?.progress || 0,
      completed: progress?.completed || false,
      completedAt: progress?.completedAt || null,
      rewardsClaimed: progress?.rewardsClaimed || false,
      reward: {
        coins: c.rewards.coins,
        badges: c.rewards.badges || [],
        multiplier: c.rewards.multiplier || null,
      },
      startDate: c.startDate,
      endDate: c.endDate,
      featured: c.featured,
      participantCount: c.participantCount,
      completionCount: c.completionCount,
    };
  });

  sendSuccess(res, { challenges: mappedChallenges }, 'Challenges retrieved');
});

/**
 * 6. POST /loyalty/games/check-in
 * Daily check-in game endpoint (alias for check-in logic).
 */
export const dailyCheckInGame = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const lockKey = `lock:checkin:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    throw new AppError('Check-in is being processed, please try again', 429);
  }

  try {
    const timezone = req.body?.timezone || 'UTC';
    const now = new Date();
    const todayStr = getDateStringInTZ(now, timezone);

    let loyalty = await UserLoyalty.findOne({ userId }) as any;

    if (!loyalty) {
      loyalty = await UserLoyalty.create({
        userId,
        streak: { current: 0, target: 7, history: [] },
        brandLoyalty: [],
        missions: [],
        coins: { available: 0, expiring: 0, history: [] },
      });
    }

    const lastCheckin = loyalty.streak.lastCheckin
      ? new Date(loyalty.streak.lastCheckin)
      : null;
    const lastCheckinStr = lastCheckin ? getDateStringInTZ(lastCheckin, timezone) : null;

    if (lastCheckinStr === todayStr) {
      throw new AppError('Already checked in today', 400);
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getDateStringInTZ(yesterday, timezone);
    const isConsecutive = lastCheckinStr === yesterdayStr;

    const newStreak = isConsecutive ? loyalty.streak.current + 1 : 1;

    // Award coins with streak bonus
    let coinsEarned = 10;
    if (newStreak >= 7) coinsEarned = 20;
    else if (newStreak >= 3) coinsEarned = 15;

    const description = 'Daily check-in reward';
    const idempotencyKey = `checkin_${userId}_${todayStr}`;

    await coinService.awardCoins(
      userId,
      coinsEarned,
      'daily_login',
      description,
      { streakDay: newStreak, idempotencyKey },
      null
    );

    // Update loyalty state
    loyalty.streak.current = newStreak;
    loyalty.streak.lastCheckin = now;
    loyalty.streak.history.push(now);

    loyalty.coins.available += coinsEarned;
    loyalty.coins.history.push({
      amount: coinsEarned,
      type: 'earned',
      description,
      date: now,
    });

    // Update streak mission progress
    const streakMission = loyalty.missions.find((m: any) =>
      (m.missionId.includes('streak') || m.missionId.includes('maintenance')) && !m.completedAt
    );
    if (streakMission) {
      streakMission.progress = Math.min(newStreak, streakMission.target);
    }

    await loyalty.save();

    // Return in the format the frontend expects
    const bonusInfo = coinsEarned > 10
      ? { points: coinsEarned - 10, message: `Streak bonus! ${newStreak} days in a row` }
      : undefined;

    sendSuccess(res, {
      points: coinsEarned,
      streak: newStreak,
      bonus: bonusInfo,
    }, 'Check-in successful');
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('[dailyCheckInGame] Error:', error);
    throw new AppError('Failed to check in', 500);
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * 7. GET /loyalty/games/check-in/status
 * Returns check-in status with 7-day calendar and streak info.
 */
export const getCheckInStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const timezone = (req.query.timezone as string) || 'UTC';
  const loyalty = await UserLoyalty.findOne({ userId }).lean();

  const now = new Date();
  const todayStr = getDateStringInTZ(now, timezone);

  const streak = {
    current: loyalty?.streak?.current || 0,
    longest: loyalty?.streak?.history
      ? Math.max(loyalty.streak.current || 0, loyalty.streak.history.length)
      : 0,
    target: loyalty?.streak?.target || 7,
    lastCheckin: loyalty?.streak?.lastCheckin || null,
  };

  // Build 7-day check-in calendar (today + 6 past days)
  const checkIns: Array<{ date: string; checkedIn: boolean; day: number }> = [];
  const historySet = new Set(
    (loyalty?.streak?.history || []).map((d: Date) => getDateStringInTZ(new Date(d), timezone))
  );

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = getDateStringInTZ(date, timezone);
    checkIns.push({
      date: dateStr,
      checkedIn: historySet.has(dateStr),
      day: 7 - i,
    });
  }

  // Check if already checked in today
  const lastCheckinStr = loyalty?.streak?.lastCheckin
    ? getDateStringInTZ(new Date(loyalty.streak.lastCheckin), timezone)
    : null;
  const checkedInToday = lastCheckinStr === todayStr;

  sendSuccess(res, {
    checkIns,
    streak,
    checkedInToday,
  }, 'Check-in status retrieved');
});

/**
 * 8. GET /loyalty/points/expiring
 * Returns expiring points notification data.
 */
export const getExpiringPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const loyalty = await UserLoyalty.findOne({ userId }).select('coins.expiring coins.expiryDate').lean();

  const expiringPoints = loyalty?.coins?.expiring || 0;
  const expiryDate = loyalty?.coins?.expiryDate;

  let daysLeft = 0;
  if (expiryDate) {
    const diff = new Date(expiryDate).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  sendSuccess(res, {
    points: expiringPoints,
    expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
    daysLeft,
  }, 'Expiring points retrieved');
});

/**
 * 9. POST /loyalty/challenges/:challengeId/claim
 * Claim coins for a completed challenge.
 */
export const claimChallengeReward = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { challengeId } = req.params;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!challengeId) {
    throw new AppError('Challenge ID is required', 400);
  }

  // Find progress record (not lean — we need instance methods)
  const progress = await UserChallengeProgress.findOne({
    user: userId,
    challenge: challengeId,
  });

  if (!progress) {
    throw new AppError('Challenge progress not found', 404);
  }

  if (!progress.completed) {
    throw new AppError('Challenge not completed yet', 400);
  }

  if (progress.rewardsClaimed) {
    throw new AppError('Rewards already claimed', 409);
  }

  // Get challenge details for reward amount
  const challenge = await Challenge.findById(challengeId).lean();
  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  const rewardCoins = challenge.rewards.coins;

  // Award coins via CoinTransaction (idempotent via key)
  const idempotencyKey = `challenge_claim_${userId}_${challengeId}`;
  await coinService.awardCoins(
    userId,
    rewardCoins,
    'challenge_reward',
    `Challenge reward: ${challenge.title}`,
    { challengeId, idempotencyKey },
    null
  );

  // Mark as claimed
  progress.rewardsClaimed = true;
  progress.claimedAt = new Date();
  await progress.save();

  logger.info(`[claimChallengeReward] User ${userId} claimed ${rewardCoins} coins for challenge ${challengeId}`);

  sendSuccess(res, {
    coins: rewardCoins,
    challengeId,
    challengeTitle: challenge.title,
    badges: challenge.rewards.badges || [],
  }, 'Challenge reward claimed');
});

/**
 * 10. GET /loyalty/points/history
 * Returns paginated point transaction history.
 */
export const getPointHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new AppError('User not authenticated', 401);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const type = req.query.type as string | undefined;

  const filter: any = { user: userId };
  if (type && ['earned', 'spent', 'expired', 'refunded', 'bonus'].includes(type)) {
    filter.type = type;
  }

  const [transactions, total] = await Promise.all([
    CoinTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(filter),
  ]);

  sendSuccess(res, {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  }, 'Point history retrieved');
});

/**
 * 11. POST /loyalty/redeem
 * Redeem a reward (LoyaltyMilestone) by spending points.
 */
export const redeemReward = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) throw new AppError('User not authenticated', 401);

  const { rewardId, points, quantity = 1 } = req.body;
  if (!rewardId || !points) {
    throw new AppError('rewardId and points are required', 400);
  }

  // Find the reward (milestone)
  const milestone = await LoyaltyMilestone.findById(rewardId).lean();
  if (!milestone || !milestone.isActive) {
    throw new AppError('Reward not found or inactive', 404);
  }

  const totalCost = (milestone.rewardCoins || points) * quantity;

  // Check balance
  const balance = await CoinTransaction.getUserBalance(userId);
  if (balance < totalCost) {
    throw new AppError(`Insufficient points. Need ${totalCost}, have ${balance}`, 400);
  }

  // Deduct points
  const idempotencyKey = `loyalty_redeem_${userId}_${rewardId}_${Date.now()}`;
  await coinService.deductCoins(
    userId,
    totalCost,
    'redemption',
    `Redeemed: ${milestone.title} x${quantity}`,
    { rewardId, quantity, idempotencyKey }
  );

  logger.info(`[redeemReward] User ${userId} redeemed "${milestone.title}" for ${totalCost} points`);

  sendSuccess(res, {
    redemption: {
      _id: `rdm_${Date.now()}`,
      userId,
      reward: milestone,
      pointsSpent: totalCost,
      quantity,
      status: 'active',
      redeemedAt: new Date().toISOString(),
    },
    remainingPoints: balance - totalCost,
  }, 'Reward redeemed successfully');
});
