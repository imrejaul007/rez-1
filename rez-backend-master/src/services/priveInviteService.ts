import { logger } from '../config/logger';
/**
 * Privé Invite Service
 *
 * Handles invite code generation, validation, application, stats, and leaderboard.
 */

import mongoose, { Types } from 'mongoose';
import PriveInviteCode, { IPriveInviteCode } from '../models/PriveInviteCode';
import PriveAccess from '../models/PriveAccess';
import { CoinTransaction, ICoinTransactionModel } from '../models/CoinTransaction';
import { User } from '../models/User';
import priveAccessService from './priveAccessService';
import priveInviteFraudService from './priveInviteFraudService';
import reputationService from './reputationService';
import { WalletConfig } from '../models/WalletConfig';
import type { Lean } from '../types/lean';

class PriveInviteService {
  /**
   * Generate a new invite code for an eligible Privé member
   */
  async generateCode(
    userId: Types.ObjectId,
    metadata?: { ip?: string; device?: string }
  ): Promise<IPriveInviteCode> {
    // Verify user can generate
    const eligibility = await priveAccessService.canGenerateInvites(userId);
    if (!eligibility.canGenerate) {
      throw new Error(eligibility.reason || 'Cannot generate invite code');
    }

    // Get config
    const config = await priveAccessService.getInviteConfig();

    // Get user's effective tier
    const accessCheck = await priveAccessService.checkAccess(userId);
    const effectiveTier = accessCheck.effectiveTier;

    if (effectiveTier === 'none') {
      throw new Error('Must have an active Privé tier to generate invite codes');
    }

    // Generate unique code
    const code = await PriveInviteCode.generateUniqueCode();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.codeExpiryDays);

    const inviteCode = new PriveInviteCode({
      code,
      creatorId: userId,
      creatorTier: effectiveTier,
      maxUses: config.maxUsesPerCode,
      expiresAt,
      metadata: {
        createdFromIP: metadata?.ip,
        createdFromDevice: metadata?.device,
      },
    });

    await inviteCode.save();
    return inviteCode;
  }

  /**
   * Validate a code without applying it
   */
  async validateCode(
    code: string,
    applicantUserId: Types.ObjectId
  ): Promise<{
    valid: boolean;
    reason?: string;
    creator?: { name: string; tier: string };
  }> {
    const inviteCode = await PriveInviteCode.findByCode(code);

    if (!inviteCode) {
      return { valid: false, reason: 'Invalid invite code' };
    }

    if (!inviteCode.isActive) {
      return { valid: false, reason: 'This invite code has been deactivated' };
    }

    if (new Date() > inviteCode.expiresAt) {
      return { valid: false, reason: 'This invite code has expired' };
    }

    if (inviteCode.usageCount >= inviteCode.maxUses) {
      return { valid: false, reason: 'This invite code has reached its usage limit' };
    }

    // Self-use check
    if (inviteCode.creatorId.toString() === applicantUserId.toString()) {
      return { valid: false, reason: 'You cannot use your own invite code' };
    }

    // Already used by this user
    const alreadyUsed = inviteCode.usedBy.some(
      u => u.userId.toString() === applicantUserId.toString()
    );
    if (alreadyUsed) {
      return { valid: false, reason: 'You have already used this invite code' };
    }

    // Already has access
    const existingAccess = await PriveAccess.findOne({
      userId: applicantUserId,
      status: 'active',
    }).lean();
    if (existingAccess) {
      return { valid: false, reason: 'You already have Privé access' };
    }

    // Get creator info
    const creator = await User.findById(inviteCode.creatorId)
      .select('profile.firstName profile.lastName')
      .lean();

    const creatorName = creator
      ? `${(creator as any).profile?.firstName || ''} ${(creator as any).profile?.lastName || ''}`.trim() || 'Privé Member'
      : 'Privé Member';

    return {
      valid: true,
      creator: {
        name: creatorName,
        tier: inviteCode.creatorTier,
      },
    };
  }

  /**
   * Apply an invite code — grants Privé access + distributes rewards
   */
  async applyCode(
    code: string,
    applicantUserId: Types.ObjectId,
    metadata?: { ip?: string; device?: string; userAgent?: string }
  ): Promise<{
    success: boolean;
    access: any;
    inviterReward: number;
    inviteeReward: number;
  }> {
    const inviteCode = await PriveInviteCode.findByCode(code);

    if (!inviteCode) {
      throw new Error('Invalid invite code');
    }

    // Validate the code
    const validation = await this.validateCode(code, applicantUserId);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid invite code');
    }

    // Run fraud detection
    const fraudCheck = await priveInviteFraudService.checkInviteApplication(
      inviteCode.creatorId,
      applicantUserId,
      metadata || {}
    );

    const config = await priveAccessService.getInviteConfig();

    if (fraudCheck.riskScore >= config.fraudBlockThreshold) {
      throw new Error('This invite cannot be processed at this time. Please contact support.');
    }

    // Atomic usage increment with guard
    const updatedCode = await PriveInviteCode.findOneAndUpdate(
      {
        _id: inviteCode._id,
        isActive: true,
        usageCount: { $lt: inviteCode.maxUses },
      },
      {
        $inc: { usageCount: 1 },
        $push: {
          usedBy: {
            userId: applicantUserId,
            usedAt: new Date(),
            rewardDistributed: false,
          },
        },
      },
      { new: true }
    );

    if (!updatedCode) {
      throw new Error('Invite code is no longer available');
    }

    // Grant Privé access
    const access = await priveAccessService.grantAccessViaInvite(
      applicantUserId,
      code,
      inviteCode.creatorId
    );

    // Distribute rewards
    let inviterReward = 0;
    let inviteeReward = 0;

    try {
      // Inviter reward
      if (config.inviterRewardCoins > 0) {
        try {
          await (CoinTransaction as unknown as ICoinTransactionModel).createTransaction(
            inviteCode.creatorId.toString(),
            'earned',
            config.inviterRewardCoins,
            'prive_invite_reward',
            `Privé invite reward: new member joined via your code`,
            {
              priveInviteCodeId: inviteCode._id.toString(),
              priveInviteRole: 'inviter',
              inviteeUserId: applicantUserId.toString(),
              inviteCode: code,
            }
          );
          inviterReward = config.inviterRewardCoins;
        } catch (err: any) {
          // Idempotency: duplicate key means already rewarded
          if (err?.code !== 11000) {
            logger.error('[PriveInvite] Failed to reward inviter:', err);
          }
        }
      }

      // Invitee reward
      if (config.inviteeRewardCoins > 0) {
        try {
          await (CoinTransaction as unknown as ICoinTransactionModel).createTransaction(
            applicantUserId.toString(),
            'earned',
            config.inviteeRewardCoins,
            'prive_invite_reward',
            `Welcome to Privé! Starter bonus coins`,
            {
              priveInviteCodeId: inviteCode._id.toString(),
              priveInviteRole: 'invitee',
              inviterUserId: inviteCode.creatorId.toString(),
              inviteCode: code,
            }
          );
          inviteeReward = config.inviteeRewardCoins;
        } catch (err: any) {
          if (err?.code !== 11000) {
            logger.error('[PriveInvite] Failed to reward invitee:', err);
          }
        }
      }

      // Mark reward as distributed
      await PriveInviteCode.updateOne(
        { _id: inviteCode._id, 'usedBy.userId': applicantUserId },
        { $set: { 'usedBy.$.rewardDistributed': true } }
      );
    } catch (err) {
      logger.error('[PriveInvite] Reward distribution error:', err);
    }

    // Fire-and-forget: recalculate reputation for both
    setImmediate(async () => {
      try {
        await reputationService.recalculateReputation(inviteCode.creatorId, 'invite_reward');
      } catch (err) { logger.warn('[PriveInvite] Failed to recalculate creator reputation', { creatorId: inviteCode.creatorId, error: (err as Error).message }); }
      try {
        await reputationService.recalculateReputation(applicantUserId, 'invite_join');
      } catch (err) { logger.warn('[PriveInvite] Failed to recalculate applicant reputation', { applicantId: applicantUserId, error: (err as Error).message }); }
    });

    return {
      success: true,
      access,
      inviterReward,
      inviteeReward,
    };
  }

  /**
   * Get invite stats for a user (dashboard data)
   */
  async getInviteStats(userId: Types.ObjectId): Promise<{
    totalInvites: number;
    activeInvites: number;
    pendingCodes: number;
    totalCoinsEarned: number;
    successRate: number;
    activeCodes: Lean<IPriveInviteCode>[];
  }> {
    // Count total invitees
    const totalInvites = await PriveAccess.countDocuments({
      invitedBy: userId,
    });

    // Count active invitees
    const activeInvites = await PriveAccess.countDocuments({
      invitedBy: userId,
      status: 'active',
    });

    // Get active codes
    const now = new Date();
    const activeCodes = await PriveInviteCode.find({
      creatorId: userId,
      isActive: true,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 }).lean();

    const pendingCodes = activeCodes.filter(c => c.usageCount < c.maxUses).length;

    // Calculate total coins earned from invites
    const coinAgg = await CoinTransaction.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId.toString()),
          source: 'prive_invite_reward',
          'metadata.priveInviteRole': 'inviter',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalCoinsEarned = coinAgg[0]?.total || 0;

    // Success rate: active / total (avoid division by zero)
    const successRate = totalInvites > 0 ? Math.round((activeInvites / totalInvites) * 100) : 0;

    return {
      totalInvites,
      activeInvites,
      pendingCodes,
      totalCoinsEarned,
      successRate,
      activeCodes,
    };
  }

  /**
   * Get invite leaderboard — paginated, sorted by active invites
   */
  async getLeaderboard(params: {
    page: number;
    limit: number;
    userId?: Types.ObjectId;
  }): Promise<{
    leaderboard: Array<{
      rank: number;
      userId: string;
      name: string;
      avatar?: string;
      tier: string;
      totalInvites: number;
      activeInvites: number;
    }>;
    pagination: { page: number; limit: number; total: number; pages: number };
    myRank?: { rank: number; totalInvites: number };
  }> {
    const { page, limit, userId } = params;
    const skip = (page - 1) * limit;

    // Aggregate invite counts from PriveAccess
    const pipeline: any[] = [
      {
        $match: {
          invitedBy: { $exists: true, $ne: null },
          status: 'active',
        },
      },
      {
        $group: {
          _id: '$invitedBy',
          activeInvites: { $sum: 1 },
        },
      },
      { $sort: { activeInvites: -1 } },
    ];

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await PriveAccess.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Get paginated results
    const leaderboardRaw = await PriveAccess.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { 'profile.firstName': 1, 'profile.lastName': 1, 'profile.avatar': 1 } },
          ],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'priveaccesses',
          localField: '_id',
          foreignField: 'userId',
          as: 'access',
          pipeline: [{ $project: { tierOverride: 1 } }],
        },
      },
      { $unwind: { path: '$access', preserveNullAndEmptyArrays: true } },
    ]);

    const leaderboard = leaderboardRaw.map((entry: any, index: number) => ({
      rank: skip + index + 1,
      userId: entry._id.toString(),
      name: entry.user
        ? `${entry.user.profile?.firstName || ''} ${entry.user.profile?.lastName || ''}`.trim() || 'Privé Member'
        : 'Privé Member',
      avatar: entry.user?.profile?.avatar,
      tier: entry.access?.tierOverride || 'entry',
      totalInvites: entry.activeInvites,
      activeInvites: entry.activeInvites,
    }));

    // Get user's rank if requested
    let myRank: { rank: number; totalInvites: number } | undefined;
    if (userId) {
      const allRanks = await PriveAccess.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            entries: { $push: { userId: '$_id', count: '$activeInvites' } },
          },
        },
      ]);

      if (allRanks[0]?.entries) {
        const userEntry = allRanks[0].entries.findIndex(
          (e: any) => e.userId.toString() === userId.toString()
        );
        if (userEntry >= 0) {
          myRank = {
            rank: userEntry + 1,
            totalInvites: allRanks[0].entries[userEntry].count,
          };
        }
      }
    }

    return {
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      myRank,
    };
  }

  /**
   * Deactivate expired codes
   */
  async deactivateExpiredCodes(): Promise<number> {
    const result = await PriveInviteCode.updateMany(
      {
        isActive: true,
        expiresAt: { $lt: new Date() },
      },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'expired',
        },
      }
    );

    return result.modifiedCount;
  }
}

export default new PriveInviteService();
