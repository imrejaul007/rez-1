import mongoose, { Types } from 'mongoose';
import { PriveMission, IPriveMission } from '../models/PriveMission';
import { UserMission, IUserMission } from '../models/UserMission';
import { PriveAuditLog } from '../models/PriveAuditLog';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { priveMultiplierService } from './priveMultiplierService';
import { invalidateWalletCache } from './walletCacheService';
import { logger } from '../config/logger';
import type { Lean } from '../types/lean';

class PriveMissionService {
  /**
   * Get available missions for a user's tier
   */
  async getAvailableMissions(userId: string, tier: string): Promise<IPriveMission[]> {
    // Get missions already claimed by user
    const claimed = await UserMission.find({ userId: new Types.ObjectId(userId) }).select('missionId').lean();
    const claimedIds = claimed.map(c => c.missionId);

    // Use the static method on PriveMission
    const missions = await (PriveMission as any).findAvailableForTier(tier, 20);
    return missions.filter((m: IPriveMission) => !claimedIds.some((id: Types.ObjectId) => id.equals(m._id as Types.ObjectId)));
  }

  /**
   * Get user's active/claimed missions
   */
  async getActiveMissions(userId: string): Promise<Lean<IUserMission>[]> {
    return UserMission.find({
      userId: new Types.ObjectId(userId),
      status: 'active',
    })
      .populate('missionId')
      .sort({ claimedAt: -1 }).lean();
  }

  /**
   * Claim a mission
   */
  async claimMission(userId: string, missionId: string): Promise<IUserMission> {
    const userObjectId = new Types.ObjectId(userId);
    const missionObjectId = new Types.ObjectId(missionId);

    // Check mission exists and is available
    const mission = await PriveMission.findById(missionObjectId).lean();
    if (!mission || !mission.isActive || mission.isDeleted) {
      throw new Error('Mission not found or not available');
    }

    const now = new Date();
    if (now < mission.startDate || now > mission.endDate) {
      throw new Error('Mission is not within its active period');
    }

    // Check participant limit (atomic increment with guard)
    if (mission.maxParticipants > 0) {
      const updated = await PriveMission.findOneAndUpdate(
        {
          _id: missionObjectId,
          $expr: { $lt: ['$currentParticipants', '$maxParticipants'] },
        },
        { $inc: { currentParticipants: 1 } },
        { new: true }
      );
      if (!updated) {
        throw new Error('Mission is full');
      }
    } else {
      await PriveMission.findByIdAndUpdate(missionObjectId, { $inc: { currentParticipants: 1 } });
    }

    // Create user mission (unique index prevents duplicates)
    try {
      const userMission = await UserMission.create({
        userId: userObjectId,
        missionId: missionObjectId,
        progress: 0,
        targetCount: mission.targetCount,
        status: 'active',
        rewardIdempotencyKey: `mission_reward_${userId}_${missionId}`,
        claimedAt: now,
      });

      await PriveAuditLog.create({
        userId: userObjectId,
        action: 'mission_claimed',
        details: { missionId, title: mission.title },
        performerType: 'user',
      });

      return userMission;
    } catch (err: any) {
      // If duplicate key error, user already claimed this mission
      if (err.code === 11000) {
        throw new Error('You have already claimed this mission');
      }
      // Rollback participant count
      await PriveMission.findByIdAndUpdate(missionObjectId, { $inc: { currentParticipants: -1 } });
      throw err;
    }
  }

  /**
   * Track progress on missions for a given event
   */
  async trackProgress(userId: string, eventType: string, eventData?: Record<string, any>): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);

    // Map event types to mission action types
    const actionTypeMap: Record<string, string> = {
      order_placed: 'order',
      review_submitted: 'review',
      referral_completed: 'referral',
      social_share: 'social_share',
      daily_checkin: 'check_in',
      offer_redeemed: 'redeem',
      invite_applied: 'invite',
      bill_uploaded: 'bill_upload',
    };

    const actionType = actionTypeMap[eventType];
    if (!actionType) return; // Not a mission-trackable event

    // Find user's active missions that match this action type
    const activeMissions = await UserMission.find({
      userId: userObjectId,
      status: 'active',
    }).populate('missionId').lean();

    for (const userMission of activeMissions) {
      const mission = userMission.missionId as unknown as unknown as IPriveMission;
      if (!mission || mission.actionType !== actionType) continue;

      // Atomic progress increment (only if not already at target)
      const updated = await UserMission.findOneAndUpdate(
        {
          _id: userMission._id,
          status: 'active',
          progress: { $lt: userMission.targetCount },
        },
        {
          $inc: { progress: 1 },
          $push: {
            progressEvents: {
              eventType,
              eventData,
              incrementAmount: 1,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );

      // Check if mission is now complete
      if (updated && updated.progress >= updated.targetCount) {
        await UserMission.findByIdAndUpdate(updated._id, {
          status: 'completed',
          completedAt: new Date(),
        });
      }
    }
  }

  /**
   * Complete a mission and distribute reward.
   * Called by user when they claim their reward after mission completion.
   */
  async completeMission(userId: string, missionId: string): Promise<{ coins: number; coinType: string }> {
    const userObjectId = new Types.ObjectId(userId);
    const missionObjectId = new Types.ObjectId(missionId);

    // Find the user mission - must be completed and reward not yet distributed
    const userMission = await UserMission.findOne({
      userId: userObjectId,
      missionId: missionObjectId,
      status: 'completed',
      rewardDistributed: false,
    }).lean();

    if (!userMission) {
      throw new Error('Mission not found, not completed, or reward already claimed');
    }

    const mission = await PriveMission.findById(missionObjectId).lean();
    if (!mission) {
      throw new Error('Mission definition not found');
    }

    // Distribute reward in a transaction
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Mark reward as distributed (idempotency via rewardDistributed guard)
      const updated = await UserMission.findOneAndUpdate(
        {
          _id: userMission._id,
          rewardDistributed: false,
        },
        { rewardDistributed: true },
        { session, new: true }
      );

      if (!updated) {
        throw new Error('Reward already distributed');
      }

      // Award coins with tier multiplier applied
      const coinType = mission.reward.coinType || 'rez';
      const baseCoinAmount = mission.reward.coins;
      const { finalAmount: coinAmount, multiplier } = await priveMultiplierService.applyMultiplier(userId, baseCoinAmount);

      if (coinAmount > 0) {
        // Atomic wallet update (same pattern as challengeService)
        const updatedWallet = await Wallet.findOneAndUpdate(
          { user: userObjectId, 'coins.type': coinType },
          {
            $inc: {
              'balance.available': coinAmount,
              'statistics.totalEarned': coinAmount,
              'coins.$.amount': coinAmount,
            },
            $set: {
              'coins.$.lastEarned': new Date(),
              lastTransactionAt: new Date(),
            },
          },
          { new: true, session }
        );

        // Get balance for CoinTransaction record
        const balanceAfter = updatedWallet?.balance?.available ?? 0;

        // Create coin transaction
        await CoinTransaction.create([{
          user: userObjectId,
          type: 'earned',
          amount: coinAmount,
          balance: balanceAfter,
          source: 'challenge',
          description: `Mission completed: ${mission.title}`,
          metadata: {
            missionId: String(mission._id),
            missionTitle: mission.title,
            idempotencyKey: userMission.rewardIdempotencyKey,
            baseAmount: baseCoinAmount,
            multiplier,
          },
        }], { session });
      }

      // Audit log
      await PriveAuditLog.create([{
        userId: userObjectId,
        action: 'mission_completed',
        details: {
          missionId: String(mission._id),
          title: mission.title,
          reward: { coins: coinAmount, coinType, baseAmount: baseCoinAmount, multiplier },
        },
        performerType: 'user',
      }], { session });

      await session.commitTransaction();

      // Invalidate wallet cache after coin mutation
      invalidateWalletCache(userId).catch((err) => logger.error('[PriveMissionService] Wallet cache invalidation failed after mission reward', { error: err.message, userId }));

      return { coins: coinAmount, coinType };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get completed missions for a user
   */
  async getCompletedMissions(userId: string): Promise<Lean<IUserMission>[]> {
    return UserMission.find({
      userId: new Types.ObjectId(userId),
      status: 'completed',
    })
      .populate('missionId')
      .sort({ completedAt: -1 })
      .limit(50).lean();
  }

  /**
   * Expire past-due active missions (called by cron job)
   */
  async expireOverdueMissions(): Promise<number> {
    const now = new Date();

    // Find active missions whose end date has passed
    const expiredMissions = await PriveMission.find({
      isActive: true,
      endDate: { $lt: now },
    }).select('_id').lean();

    const expiredMissionIds = expiredMissions.map(m => m._id);

    if (expiredMissionIds.length === 0) return 0;

    const result = await UserMission.updateMany(
      {
        missionId: { $in: expiredMissionIds },
        status: 'active',
      },
      {
        status: 'expired',
      }
    );

    return result.modifiedCount;
  }
}

export const priveMissionService = new PriveMissionService();
export default priveMissionService;
