import { Types } from 'mongoose';
import { DiscoveryCampaign, IDiscoveryCampaign } from '../models/DiscoveryCampaign';
import { CampaignParticipation, ICampaignParticipation } from '../models/CampaignParticipation';
import { TrialCoinWallet } from '../models/TrialCoinWallet';
import { TrialCoinLedger } from '../models/TrialCoinLedger';
import { UserTryScore } from '../models/TryScoreLedger';
import { logger } from '../config/logger';
import { Lean } from '../types/lean';

class CampaignService {
  /**
   * Get active campaigns for a given city
   */
  async getActiveCampaigns(city: string): Promise<IDiscoveryCampaign[]> {
    try {
      const now = new Date();
      const campaigns = await DiscoveryCampaign.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        $or: [{ targetCity: null }, { targetCity: city }],
      })
        .sort({ endsAt: 1 })
        .lean();

      return campaigns as unknown as IDiscoveryCampaign[];
    } catch (error: any) {
      logger.error('[CAMPAIGN SERVICE] Error fetching active campaigns: ' + error.message);
      throw error;
    }
  }

  /**
   * Join a campaign (idempotent)
   */
  async joinCampaign(userId: Types.ObjectId, campaignId: Types.ObjectId): Promise<ICampaignParticipation> {
    try {
      // Validate campaign exists
      const campaign = await DiscoveryCampaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Try to find existing participation
      let participation = await CampaignParticipation.findOne({
        userId,
        campaignId,
      });

      if (participation) {
        // Already joined, return existing
        return participation;
      }

      // Create new participation
      participation = await CampaignParticipation.create({
        userId,
        campaignId,
        completedTrialIds: [],
        currentCount: 0,
        completed: false,
        rewardCredited: false,
        joinedAt: new Date(),
      });

      // Increment campaign participant count
      await DiscoveryCampaign.findByIdAndUpdate(campaignId, {
        $inc: { participantCount: 1 },
      });

      logger.info('[CAMPAIGN SERVICE] User joined campaign', {
        userId: userId.toString(),
        campaignId: campaignId.toString(),
        participationId: (participation._id as Types.ObjectId).toString(),
      });

      return participation;
    } catch (error: any) {
      logger.error('[CAMPAIGN SERVICE] Error joining campaign: ' + error.message);
      throw error;
    }
  }

  /**
   * Update campaign progress after trial completion
   * Called from trialRewardService after trial completion
   */
  async updateCampaignProgress(
    userId: Types.ObjectId,
    bookingId: Types.ObjectId,
    category: string,
    city: string,
  ): Promise<void> {
    try {
      // Find all active campaigns user is participating in
      const now = new Date();
      const campaigns = await DiscoveryCampaign.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        $or: [{ targetCity: null }, { targetCity: city }],
      })
        .limit(100)
        .lean();

      if (campaigns.length === 0) return;

      // Batch-load all participations for this user in one query (eliminates N+1)
      const campaignIds = campaigns.map((c) => c._id);
      const participations = await CampaignParticipation.find({
        userId,
        campaignId: { $in: campaignIds },
      }).lean();

      const participationMap = new Map(participations.map((p) => [(p.campaignId as Types.ObjectId).toString(), p]));

      for (const campaign of campaigns) {
        const participation = participationMap.get((campaign._id as Types.ObjectId).toString());

        if (!participation || participation.completed) {
          continue;
        }

        // Check category match if needed
        if (campaign.targetCategory && campaign.targetCategory !== category) {
          continue;
        }

        // Atomic $inc prevents double-increment on concurrent requests.
        // We also check completed:false in the filter so two racing calls
        // don't both trigger creditCampaignReward.
        const isNowCompleted = participation.currentCount + 1 >= campaign.targetTrialCount;

        const atomicUpdate: any = {
          $inc: { currentCount: 1 },
          $push: { completedTrialIds: bookingId },
          $set: { updatedAt: new Date() },
        };

        if (isNowCompleted) {
          atomicUpdate.$set.completed = true;
          atomicUpdate.$set.completedAt = new Date();
        }

        const updated = await CampaignParticipation.findOneAndUpdate(
          { _id: participation._id, completed: false },
          atomicUpdate,
          { new: true },
        );

        if (!updated) {
          // Another concurrent request already completed this campaign
          continue;
        }

        // If just completed, credit rewards (guard: rewardCredited not yet set)
        if (isNowCompleted && !participation.rewardCredited) {
          await this.creditCampaignReward(userId, campaign);
        }

        logger.info('[CAMPAIGN SERVICE] Campaign progress updated', {
          userId: userId.toString(),
          campaignId: (campaign._id as Types.ObjectId).toString(),
          participationId: (participation._id as Types.ObjectId).toString(),
          newCount: participation.currentCount + 1,
          completed: isNowCompleted,
        });
      }
    } catch (error: any) {
      logger.error('[CAMPAIGN SERVICE] Error updating campaign progress: ' + error.message);
      // Don't throw - this is a fire-and-forget operation
    }
  }

  /**
   * Credit campaign completion rewards
   */
  private async creditCampaignReward(userId: Types.ObjectId, campaign: Lean<IDiscoveryCampaign>): Promise<void> {
    try {
      // Credit ReZ coins (trial coins)
      if (campaign.rewardCoins > 0) {
        await TrialCoinLedger.create({
          userId,
          amount: campaign.rewardCoins,
          type: 'campaign_completion',
          reason: `Campaign completed: ${campaign.title}`,
          reference: (campaign._id as Types.ObjectId).toString(),
        });

        await TrialCoinWallet.findOneAndUpdate(
          { userId },
          {
            $inc: {
              balance: campaign.rewardCoins,
              totalEarned: campaign.rewardCoins,
            },
            lastUpdated: new Date(),
          },
          { upsert: true, new: true },
        );
      }

      // Credit Try coins (score)
      if (campaign.rewardTryCoins > 0) {
        const tryScore = await UserTryScore.findOneAndUpdate(
          { userId },
          {
            $inc: { totalScore: campaign.rewardTryCoins },
            lastTrialDate: new Date(),
          },
          { upsert: true, new: true },
        );
      }

      // Mark reward as credited
      await CampaignParticipation.findOneAndUpdate({ userId, campaignId: campaign._id }, { rewardCredited: true });

      logger.info('[CAMPAIGN SERVICE] Campaign rewards credited', {
        userId: userId.toString(),
        campaignId: (campaign._id as Types.ObjectId).toString(),
        coins: campaign.rewardCoins,
        tryCoins: campaign.rewardTryCoins,
      });
    } catch (error: any) {
      logger.error('[CAMPAIGN SERVICE] Error crediting campaign rewards: ' + error.message);
      throw error;
    }
  }

  /**
   * Create a new campaign (admin)
   */
  async createCampaign(data: Partial<IDiscoveryCampaign>, adminId: Types.ObjectId): Promise<IDiscoveryCampaign> {
    try {
      const campaign = await DiscoveryCampaign.create({
        ...data,
        createdBy: adminId,
        participantCount: 0,
        completionCount: 0,
        isActive: true,
      });

      logger.info('[CAMPAIGN SERVICE] Campaign created', {
        campaignId: (campaign._id as Types.ObjectId).toString(),
        adminId: adminId.toString(),
        title: campaign.title,
      });

      return campaign;
    } catch (error: any) {
      logger.error('[CAMPAIGN SERVICE] Error creating campaign: ' + error.message);
      throw error;
    }
  }

  /**
   * List campaigns with optional filters (admin)
   */
  async getCampaigns(filters: { isActive?: boolean; city?: string }): Promise<IDiscoveryCampaign[]> {
    try {
      const query: any = {};

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.city) {
        query.$or = [{ targetCity: null }, { targetCity: filters.city }];
      }

      const campaigns = await DiscoveryCampaign.find(query).sort({ endsAt: -1 }).lean();

      return campaigns as unknown as IDiscoveryCampaign[];
    } catch (error: any) {
      logger.error('[CAMPAIGN SERVICE] Error fetching campaigns: ' + error.message);
      throw error;
    }
  }
}

export default new CampaignService();
