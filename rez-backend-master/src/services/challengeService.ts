import { logger } from '../config/logger';
import Challenge, { IChallenge } from '../models/Challenge';
import UserChallengeProgress, { IUserChallengeProgress } from '../models/UserChallengeProgress';
import ChallengeAnalytics from '../models/ChallengeAnalytics';
import CHALLENGE_TEMPLATES from '../config/challengeTemplates';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { Lean } from '../types/lean';
import redisService from './redisService';
import { CacheTTL } from '../config/redis';
import pushNotificationService from './pushNotificationService';
import { isGamificationEnabled } from '../config/gamificationFeatureFlags';
// Valid status transitions: maps current status -> allowed next statuses
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['scheduled', 'active', 'disabled'],
  scheduled: ['active', 'draft', 'disabled'],
  active: ['paused', 'disabled', 'completed', 'expired'],
  paused: ['active', 'disabled'],
  completed: ['disabled'],
  expired: ['disabled'],
  disabled: ['draft'],
};
class ChallengeService {
  /**
   * Validate that a status transition is allowed
   */
  validateStatusTransition(currentStatus: string, newStatus: string): { valid: boolean; message?: string } {
    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (!allowed) {
      return { valid: false, message: `Unknown current status: ${currentStatus}` };
    }
    if (!allowed.includes(newStatus)) {
      return {
        valid: false,
        message: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`,
      };
    }
    return { valid: true };
  }
  // Get active challenges with Redis caching and auto-regeneration
  async getActiveChallenges(type?: string): Promise<Lean<IChallenge>[]> {
    // Try Redis cache first
    const cacheKey = `challenges:active${type ? ':' + type : ''}`;
    try {
      const cached = await redisService.get<Lean<IChallenge>[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    } catch {
      // Redis unavailable, continue with DB
    }
    const now = new Date();
    const query: any = {
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };
    if (type) {
      query.type = type;
    }
    let challenges = await Challenge.find(query)
      .sort({ featured: -1, difficulty: 1, endDate: 1 })
        .lean().exec();
    // Auto-regenerate if no active challenges found
    if (challenges.length === 0) {
      logger.info('📅 [CHALLENGE SERVICE] No active challenges found, auto-regenerating...');
      await this.regenerateExpiredChallenges();
      // Fetch again after regeneration
      challenges = await Challenge.find(query)
        .sort({ featured: -1, difficulty: 1, endDate: 1 })
          .lean().exec();
      logger.info(`✅ [CHALLENGE SERVICE] Regenerated ${challenges.length} active challenges`);
    }
    // Cache for 5 minutes
    try {
      await redisService.set(cacheKey, challenges, CacheTTL.CHALLENGES_ACTIVE);
    } catch {
      // Redis unavailable, no-op
    }
    return challenges;
  }
  // Invalidate challenge caches (called after admin changes, join, claim)
  async invalidateChallengeCache(): Promise<void> {
    try {
      await redisService.delPattern('challenges:*');
    } catch {
      // Redis unavailable, no-op
    }
  }
  // Regenerate expired challenges by cloning them with fresh dates (preserves historical data)
  async regenerateExpiredChallenges(): Promise<number> {
    const now = new Date();
    let regeneratedCount = 0;
    try {
      // Find expired challenges that don't already have an active replacement
      const expiredChallenges = await Challenge.find({
        endDate: { $lt: now },
        active: true, // Only regenerate ones that were active (not disabled/draft)
      }).lean();
      logger.info(`📅 [CHALLENGE SERVICE] Found ${expiredChallenges.length} expired challenges to regenerate`);
      for (const challenge of expiredChallenges) {
        const { startDate, endDate } = this.getDateRangeForType(challenge.type);
        // Check if an active replacement already exists for this type+action combo
        const existingActive = await Challenge.findOne({
          type: challenge.type,
          'requirements.action': challenge.requirements.action,
          active: true,
          endDate: { $gte: now },
        }).lean();
        if (existingActive) continue; // Skip - already has active replacement
        // Mark old challenge as expired (preserve historical data)
        await Challenge.findByIdAndUpdate(challenge._id, {
          $set: { active: false, status: 'expired' },
        });
        // Clone as a new challenge with fresh dates
        const { _id, createdAt, updatedAt, __v, ...cloneData } = challenge as any;
        await Challenge.create({
          ...cloneData,
          startDate,
          endDate,
          active: true,
          status: 'active',
          participantCount: 0,
          completionCount: 0,
          statusHistory: [],
        });
        regeneratedCount++;
      }
      logger.info(`✅ [CHALLENGE SERVICE] Regenerated ${regeneratedCount} challenges`);
    } catch (error) {
      logger.error('❌ [CHALLENGE SERVICE] Error regenerating challenges:', error);
    }
    return regeneratedCount;
  }
  // Helper to get date range based on challenge type
  private getDateRangeForType(type: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startDate = new Date(now);
    const endDate = new Date(now);
    switch (type) {
      case 'daily':
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        endDate.setDate(endDate.getDate() + 30);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'special':
        endDate.setDate(endDate.getDate() + 14);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  }
  // Get today's daily challenges
  async getDailyChallenges(): Promise<Lean<IChallenge>[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return Challenge.find({
      type: 'daily',
      active: true,
      startDate: { $gte: today, $lt: tomorrow }
    }).lean().exec();
  }
  // Get user's challenge progress
  async getUserProgress(
    userId: string,
    includeCompleted: boolean = true
  ): Promise<Lean<IUserChallengeProgress>[]> {
    const query: any = { user: userId };
    if (!includeCompleted) {
      query.completed = false;
    }
    return UserChallengeProgress.find(query)
      .populate('challenge')
        .sort({ completed: 1, lastUpdatedAt: -1 })
          .lean().exec();
  }
  // Join a challenge
  async joinChallenge(
    userId: string,
    challengeId: string
  ): Promise<IUserChallengeProgress | Lean<IUserChallengeProgress>> {
    // Check if challenge exists and is active
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    if (!challenge.isActive()) {
      throw new Error('Challenge is not active');
    }
    if (!challenge.canJoin()) {
      throw new Error('Challenge is full');
    }
    // Check if already joined first
    const existing = await UserChallengeProgress.findOne({ user: userId, challenge: challengeId }).lean();
    if (existing) {
      // Already joined — return existing progress
      return existing
    }
    // Atomic upsert: prevents race condition where concurrent requests could create duplicates
    const progress = await UserChallengeProgress.findOneAndUpdate(
      { user: userId, challenge: challengeId },
      {
        $setOnInsert: {
          user: userId,
          challenge: challengeId,
          progress: 0,
          target: challenge.requirements.target,
          startedAt: new Date(),
          completed: false,
          rewardsClaimed: false,
          lastUpdatedAt: new Date(),
          progressHistory: [],
        },
      },
      { upsert: true, new: true }
    ).lean();
    if (!progress) {
      throw new Error('Failed to create challenge progress');
    }
    // Increment participant count for new join
    await Challenge.findByIdAndUpdate(challengeId, {
      $inc: { participantCount: 1 }
    });
    // Fire-and-forget: Track join event
    setImmediate(() => {
      (ChallengeAnalytics as any).trackEvent(challengeId, userId, 'join', {
        challengeType: challenge.type,
        target: challenge.requirements.target,
      }).catch((err: any) => logger.error('[ChallengeService] Analytics trackEvent join failed', { error: err.message, challengeId, userId }));
    });
    // Invalidate cache
    this.invalidateChallengeCache().catch((err) => logger.warn('[ChallengeService] Challenge cache invalidation failed after join', { error: err.message }));
    return progress;
  }
  // Update challenge progress
  async updateProgress(
    userId: string,
    action: string,
    amount: number = 1,
    metadata?: any
  ): Promise<Lean<IUserChallengeProgress>[]> {
    // Skip DB query entirely when challenges feature is disabled
    if (!isGamificationEnabled('challenges')) return [];
    // Find all active challenges for this action
    const now = new Date();
    const challenges = await Challenge.find({
      'requirements.action': action,
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();
    const updates: Lean<IUserChallengeProgress>[] = [];
    for (const challenge of challenges) {
      // Check if user has joined
      let progress = await UserChallengeProgress.findOne({
        user: userId,
        challenge: challenge._id
      }).lean();
      // Auto-join if not joined
      if (!progress) {
        progress = await this.joinChallenge(userId, String(challenge._id)) as any;
      }
      // Skip if already completed
      if (progress?.completed) continue;
      // Apply filters if specified
      if (challenge.requirements.stores && metadata?.storeId) {
        const storeIds = challenge.requirements.stores.map(s => s.toString());
        if (!storeIds.includes(metadata.storeId.toString())) continue;
      }
      if (challenge.requirements.categories && metadata?.category) {
        if (!challenge.requirements.categories.includes(metadata.category)) continue;
      }
      if (challenge.requirements.minAmount && metadata?.amount) {
        if (metadata.amount < challenge.requirements.minAmount) continue;
      }
      // Update progress with cap validation
      if (progress) {
        // Ensure progress won't exceed target
        if (progress.progress >= progress.target) continue;
        const source = metadata?.orderId || metadata?.reviewId || metadata?.referralId || 'system';
        await progress.addProgress(amount, source);
        // Safety cap: clamp progress to target
        if (progress.progress > progress.target) {
          progress.progress = progress.target;
          await progress.save();
        }
        // Fire-and-forget: Track progress_update
        setImmediate(() => {
          (ChallengeAnalytics as any).trackEvent(challenge._id, userId, 'progress_update', {
            action, amount, newProgress: progress!.progress, target: progress!.target,
          }).catch((err: any) => logger.error('[ChallengeService] Analytics trackEvent progress_update failed', { error: err.message, challengeId: challenge._id, userId }));
        });
        // Fire-and-forget: Track completion if just completed
        if (progress.completed) {
          setImmediate(() => {
            (ChallengeAnalytics as any).trackEvent(challenge._id, userId, 'completion', {
              action, totalProgress: progress!.progress, target: progress!.target,
            }).catch((err: any) => logger.error('[ChallengeService] Analytics trackEvent completion failed', { error: err.message, challengeId: challenge._id, userId }));
          });
          // Send challenge completed SMS notification (fire-and-forget)
          try {
            const challengeUser = await User.findById(userId).select('phoneNumber').lean();
            if (challengeUser?.phoneNumber) {
              const reward = challenge.rewards?.coins || 0;
              await pushNotificationService.sendChallengeCompleted(
                challengeUser.phoneNumber,
                challenge.title,
                reward
              );
            }
          } catch (notifErr) {
            if (process.env.NODE_ENV === 'development') {
              logger.info('[CHALLENGE SERVICE] Failed to send challenge completed notification:', notifErr);
            }
          }
        }
        updates.push(progress);
      }
    }
    return updates;
  }
  // Claim challenge rewards with atomic update and Redis lock for safety
  async claimRewards(
    userId: string,
    progressId: string
  ): Promise<{ progress: IUserChallengeProgress; rewards: any; walletBalance?: number }> {
    // Acquire Redis distributed lock to prevent concurrent claims
    let lockToken: string | null = null;
    const lockKey = `challenge_claim:${userId}:${progressId}`;
    try {
      lockToken = await redisService.acquireLock(lockKey, 30);
    } catch {
      // Redis unavailable, proceed without lock (atomic update still protects)
    }
    if (lockToken === null) {
      // If we got null from a working Redis, another claim is in progress
      try {
        const isConnected = await redisService.exists(lockKey);
        if (isConnected) {
          throw new Error('Claim already in progress. Please wait.');
        }
      } catch {
        // Redis issue, proceed
      }
    }
    try {
      // Atomic claim: findOneAndUpdate prevents race conditions
      const progress = await UserChallengeProgress.findOneAndUpdate(
        {
          _id: progressId,
          user: userId,
          completed: true,
          rewardsClaimed: false
        },
        {
          $set: {
            rewardsClaimed: true,
            claimedAt: new Date()
          }
        },
        { new: true }
      ).populate('challenge');
      if (!progress) {
        // Determine why it failed for a clear error message
        const existing = await UserChallengeProgress.findOne({ _id: progressId, user: userId }).lean();
        if (!existing) throw new Error('Challenge progress not found');
        if (!existing.completed) throw new Error('Challenge not completed yet');
        if (existing.rewardsClaimed) throw new Error('Rewards already claimed');
        throw new Error('Unable to claim rewards');
      }
    // Get challenge rewards
    const challenge = progress.challenge as any;
    const coinsReward = challenge.rewards.coins || 0;
    const rewards = {
      coins: coinsReward,
      badges: challenge.rewards.badges || [],
      exclusiveDeals: challenge.rewards.exclusiveDeals || [],
      multiplier: challenge.rewards.multiplier
    };
    // Credit coins to wallet via rewardEngine (unified: wallet + CoinTransaction + ledger)
    if (coinsReward > 0) {
      try {
        const { rewardEngine } = await import('../core/rewardEngine');
        await rewardEngine.issue({
          userId,
          amount: coinsReward,
          rewardType: 'challenge_reward',
          source: 'challenge_reward',
          description: `Challenge reward: ${challenge.title}`,
          operationType: 'achievement_reward',
          referenceId: `challenge:${challenge._id}:${progress._id}`,
          referenceModel: 'ChallengeProgress',
          metadata: {
            challengeId: String(challenge._id),
            challengeTitle: challenge.title,
            progressId: String(progress._id),
          },
        });
        logger.info(`[CHALLENGE SERVICE] Credited ${coinsReward} coins via rewardEngine for challenge ${challenge.title}`);
      } catch (walletError) {
        logger.error('[CHALLENGE SERVICE] Error crediting coins to wallet:', walletError);
      }
    }
    // Invalidate cache after claiming
    this.invalidateChallengeCache().catch((err) => logger.warn('[ChallengeService] Challenge cache invalidation failed after claim', { error: err.message }));
    // Fire-and-forget: Track claim event
    setImmediate(() => {
      (ChallengeAnalytics as any).trackEvent(challenge._id, userId, 'claim', {
        coinsRewarded: coinsReward,
        challengeTitle: challenge.title,
        challengeType: challenge.type,
      }).catch((err: any) => logger.error('[ChallengeService] Analytics trackEvent claim failed', { error: err.message, challengeId: challenge._id, userId }));
    });
    return { progress, rewards, walletBalance: undefined };
    } finally {
      // Release Redis lock
      if (lockToken) {
        try {
          await redisService.releaseLock(lockKey, lockToken);
        } catch {
          // Redis unavailable, lock will auto-expire
        }
      }
    }
  }
  // Create challenge from template
  async createChallengeFromTemplate(
    templateIndex: number,
    startDate?: Date,
    featured: boolean = false
  ): Promise<IChallenge> {
    const template = CHALLENGE_TEMPLATES[templateIndex];
    if (!template) {
      throw new Error('Template not found');
    }
    const start = startDate || new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + (template.durationDays || 1));
    return Challenge.create({
      ...template,
      startDate: start,
      endDate: end,
      featured,
      active: true
    });
  }
  // Auto-generate daily challenges
  async generateDailyChallenges(): Promise<IChallenge[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Check if challenges already generated for today
    const existing = await this.getDailyChallenges();
    if (existing.length > 0) {
      return existing as unknown as IChallenge[];
    }
    // Select 3-5 random daily challenge templates
    const dailyTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'daily');
    const selectedIndices = new Set<number>();
    while (selectedIndices.size < Math.min(5, dailyTemplates.length)) {
      selectedIndices.add(Math.floor(Math.random() * dailyTemplates.length));
    }
    const challenges: IChallenge[] = [];
    for (const index of Array.from(selectedIndices)) {
      const template = dailyTemplates[index];
      const challenge = await Challenge.create({
        ...template,
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        featured: challenges.length === 0, // First one is featured
        active: true
      });
      challenges.push(challenge);
    }
    return challenges;
  }
  // Get challenge leaderboard
  async getChallengeLeaderboard(
    challengeId: string,
    limit: number = 10
  ): Promise<any[]> {
    return UserChallengeProgress.aggregate([
      {
        $match: {
          challenge: new mongoose.Types.ObjectId(challengeId),
          progress: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $sort: { progress: -1, lastUpdatedAt: 1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            name: '$userData.name',
            avatar: '$userData.avatar'
          },
          progress: 1,
          target: 1,
          completed: 1,
          completedAt: 1
        }
      }
    ]);
  }
  /**
   * Unified endpoint: returns all active challenges merged with user progress + server time.
   * Single source of truth for both Play & Earn and Missions pages.
   */
  async getUnifiedChallenges(
    userId: string,
    options?: { type?: string; limit?: number; visibility?: string }
  ): Promise<{
    challenges: Array<{
      challenge: Lean<IChallenge>;
      userState: 'available' | 'joined' | 'in_progress' | 'completed' | 'claimed' | 'expired';
      progress: number;
      target: number;
      progressPercentage: number;
      progressId: string | null;
      rewardsClaimed: boolean;
      startedAt: string | null;
      completedAt: string | null;
    }>;
    stats: { completed: number; active: number; totalCoinsEarned: number };
    serverTime: string;
  }> {
    const now = new Date();
    // 1. Fetch all active challenges
    const challengeQuery: any = {
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };
    if (options?.type) {
      challengeQuery.type = options.type;
    }
    // Filter by visibility: play_and_earn page only sees 'play_and_earn' or 'both',
    // missions page only sees 'missions' or 'both'.
    // Also include legacy challenges that don't have a visibility field (treated as 'both').
    if (options?.visibility && options.visibility !== 'both') {
      challengeQuery.$or = [
        { visibility: { $in: [options.visibility, 'both'] } },
        { visibility: { $exists: false } },
      ];
    }
    let activeChallenges = await Challenge.find(challengeQuery)
      .sort({ priority: -1, featured: -1, difficulty: 1, endDate: 1 })
        .lean()
          .exec();
    // Auto-regenerate if no active challenges found
    if (activeChallenges.length === 0) {
      await this.regenerateExpiredChallenges();
      activeChallenges = await Challenge.find(challengeQuery)
        .sort({ priority: -1, featured: -1, difficulty: 1, endDate: 1 })
          .lean()
            .exec();
    }
    // 2. Batch-fetch user progress for all these challenges
    const challengeIds = activeChallenges.map(c => c._id);
    const userProgressList = await UserChallengeProgress.find({
      user: userId,
      challenge: { $in: challengeIds }
    }).lean().exec();
    // Build progress lookup map
    const progressMap = new Map<string, any>();
    for (const p of userProgressList) {
      progressMap.set(String(p.challenge), p);
    }
    // 3. Merge: for each challenge, compute userState
    const merged = activeChallenges.map(challenge => {
      const progress = progressMap.get(String(challenge._id));
      let userState: 'available' | 'joined' | 'in_progress' | 'completed' | 'claimed' | 'expired';
      if (!progress) {
        userState = 'available';
      } else if (progress.rewardsClaimed) {
        userState = 'claimed';
      } else if (progress.completed) {
        userState = 'completed';
      } else if (progress.progress > 0) {
        userState = 'in_progress';
      } else {
        userState = 'joined';
      }
      const currentProgress = progress?.progress || 0;
      const target = progress?.target || challenge.requirements.target;
      return {
        challenge,
        userState,
        progress: currentProgress,
        target,
        progressPercentage: target > 0 ? Math.min((currentProgress / target) * 100, 100) : 0,
        progressId: progress ? String(progress._id) : null,
        rewardsClaimed: progress?.rewardsClaimed || false,
        startedAt: progress?.startedAt ? new Date(progress.startedAt).toISOString() : null,
        completedAt: progress?.completedAt ? new Date(progress.completedAt).toISOString() : null,
      };
    });
    // Apply limit if specified
    const result = options?.limit ? merged.slice(0, options.limit) : merged;
    // 4. Calculate stats from user progress across ALL challenges (not just limited)
    let totalCompleted = 0;
    let totalCoinsEarned = 0;
    for (const p of userProgressList) {
      if (p.completed) totalCompleted++;
      if (p.rewardsClaimed) {
        const ch = activeChallenges.find(c => String(c._id) === String(p.challenge));
        if (ch) totalCoinsEarned += ch.rewards.coins || 0;
      }
    }
    // Fire-and-forget: Track impressions
    setImmediate(() => {
      const impressionIds = result.map(r => (r.challenge as any)._id);
      (ChallengeAnalytics as any).trackImpressions(impressionIds, userId).catch((err: any) => logger.error('[ChallengeService] Analytics trackImpressions failed', { error: err.message, userId }));
    });
    return {
      challenges: result,
      stats: {
        completed: totalCompleted,
        active: merged.filter(m => m.userState !== 'claimed' && m.userState !== 'completed').length,
        totalCoinsEarned,
      },
      serverTime: now.toISOString(),
    };
  }
  /**
   * Transition challenge statuses based on dates (called by background job).
   * - scheduled + scheduledPublishAt <= now -> active
   * - active + endDate < now -> expired
   */
  async transitionChallengeStatuses(): Promise<{ activated: number; expired: number }> {
    const now = new Date();
    let activated = 0;
    let expired = 0;
    try {
      // Transition scheduled -> active
      const scheduledResult = await Challenge.updateMany(
        {
          status: 'scheduled',
          scheduledPublishAt: { $lte: now }
        },
        {
          $set: { status: 'active', active: true },
          $push: {
            statusHistory: {
              status: 'active',
              changedAt: now,
              reason: 'Auto-published by scheduler'
            }
          }
        }
      );
      activated = scheduledResult.modifiedCount || 0;
      // Transition active -> expired
      const expiredResult = await Challenge.updateMany(
        {
          status: 'active',
          active: true,
          endDate: { $lt: now }
        },
        {
          $set: { status: 'expired', active: false },
          $push: {
            statusHistory: {
              status: 'expired',
              changedAt: now,
              reason: 'Challenge end date passed'
            }
          }
        }
      );
      expired = expiredResult.modifiedCount || 0;
      // Also handle legacy challenges without status field
      const legacyExpiredResult = await Challenge.updateMany(
        {
          status: { $exists: false },
          active: true,
          endDate: { $lt: now }
        },
        {
          $set: { status: 'expired', active: false }
        }
      );
      expired += legacyExpiredResult.modifiedCount || 0;
      if (activated > 0 || expired > 0) {
        logger.info(`🔄 [CHALLENGE SERVICE] Transitions: ${activated} activated, ${expired} expired`);
      }
    } catch (error) {
      logger.error('❌ [CHALLENGE SERVICE] Error transitioning statuses:', error);
    }
    return { activated, expired };
  }
  /**
   * Pause an active challenge
   */
  async pauseChallenge(challengeId: string, reason?: string, changedBy?: string): Promise<IChallenge | null> {
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge) return null;
    const currentStatus = challenge.status || (challenge.active ? 'active' : 'disabled');
    const validation = this.validateStatusTransition(currentStatus, 'paused');
    if (!validation.valid) throw new Error(validation.message);
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: { status: 'paused', active: false, pausedAt: new Date() },
        $push: {
          statusHistory: {
            status: 'paused',
            changedAt: new Date(),
            changedBy: changedBy ? new mongoose.Types.ObjectId(changedBy) : undefined,
            reason: reason || 'Paused by admin'
          }
        }
      },
      { new: true }
    );
  }
  /**
   * Resume a paused challenge
   */
  async resumeChallenge(challengeId: string, changedBy?: string): Promise<IChallenge | null> {
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge) return null;
    const currentStatus = challenge.status || (challenge.active ? 'active' : 'disabled');
    const validation = this.validateStatusTransition(currentStatus, 'active');
    if (!validation.valid) throw new Error(validation.message);
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: { status: 'active', active: true, pausedAt: null },
        $push: {
          statusHistory: {
            status: 'active',
            changedAt: new Date(),
            changedBy: changedBy ? new mongoose.Types.ObjectId(changedBy) : undefined,
            reason: 'Resumed by admin'
          }
        }
      },
      { new: true }
    );
  }
  /**
   * Disable a challenge permanently
   */
  async disableChallenge(challengeId: string, reason?: string, changedBy?: string): Promise<IChallenge | null> {
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge) return null;
    const currentStatus = challenge.status || (challenge.active ? 'active' : 'disabled');
    const validation = this.validateStatusTransition(currentStatus, 'disabled');
    if (!validation.valid) throw new Error(validation.message);
    return Challenge.findByIdAndUpdate(
      challengeId,
      {
        $set: { status: 'disabled', active: false },
        $push: {
          statusHistory: {
            status: 'disabled',
            changedAt: new Date(),
            changedBy: changedBy ? new mongoose.Types.ObjectId(changedBy) : undefined,
            reason: reason || 'Disabled by admin'
          }
        }
      },
      { new: true }
    );
  }
  /**
   * Clone a challenge with new dates
   */
  async cloneChallenge(challengeId: string, overrides?: Partial<IChallenge>): Promise<IChallenge> {
    const original = await Challenge.findById(challengeId).lean();
    if (!original) throw new Error('Challenge not found');
    const { _id, createdAt, updatedAt, participantCount, completionCount, statusHistory, ...rest } = original as any;
    return Challenge.create({
      ...rest,
      ...overrides,
      status: 'draft',
      active: false,
      participantCount: 0,
      completionCount: 0,
      statusHistory: [{
        status: 'draft',
        changedAt: new Date(),
        reason: `Cloned from challenge ${challengeId}`
      }]
    });
  }
  // Get user's challenge statistics
  async getUserStatistics(userId: string): Promise<any> {
    const stats = await UserChallengeProgress.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: null,
          totalChallenges: { $sum: 1 },
          completedChallenges: {
            $sum: { $cond: ['$completed', 1, 0] }
          },
          totalCoinsEarned: {
            $sum: {
              $cond: [
                '$rewardsClaimed',
                { $ifNull: ['$rewards.coins', 0] },
                0
              ]
            }
          }
        }
      }
    ]);
    return stats[0] || {
      totalChallenges: 0,
      completedChallenges: 0,
      totalCoinsEarned: 0
    };
  }
}
export default new ChallengeService();