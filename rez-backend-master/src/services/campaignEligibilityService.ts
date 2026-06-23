/**
 * campaignEligibilityService.ts
 *
 * Centralized campaign eligibility checker for DiscoveryCampaign entries.
 * Call this before any join/progress-update to guard against ineligible participants.
 *
 * Models used:
 *   DiscoveryCampaign     — rezbackend/src/models/DiscoveryCampaign.ts
 *   CampaignParticipation — rezbackend/src/models/CampaignParticipation.ts
 *   Campaign              — rezbackend/src/models/Campaign.ts (for redeemDeal eligibility)
 *   DealRedemption        — rezbackend/src/models/DealRedemption.ts (per-user usage)
 *   Subscription          — rezbackend/src/models/Subscription.ts (subscription status)
 *
 * M9: replaces scattered inline eligibility checks across controllers/services.
 */

import mongoose, { Types } from 'mongoose';
import { DiscoveryCampaign } from '../models/DiscoveryCampaign';
import { CampaignParticipation } from '../models/CampaignParticipation';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface CampaignEligibilityOptions {
  /** User's subscription tier, e.g. 'free' | 'silver' | 'gold' | 'platinum' */
  userTier?: string;
  /** User's active subscription status — pass true if the user has an active subscription */
  hasActiveSubscription?: boolean;
  /** User's city for targetCity campaigns */
  userCity?: string;
}

/**
 * Check whether a user is eligible to redeem a Campaign deal (Campaign model, not DiscoveryCampaign).
 * Used by campaignController.redeemDeal() to enforce tier, subscription, and per-user usage limits.
 *
 * @param userId   - MongoDB ObjectId string for the user
 * @param campaign - Campaign document (or lean object) already fetched by the caller
 * @param options  - Optional context: userTier, hasActiveSubscription, userCity
 */
export async function checkDealRedemptionEligibility(
  userId: string,
  campaign: any,
  options?: CampaignEligibilityOptions,
): Promise<EligibilityResult> {
  if (!campaign) {
    return { eligible: false, reason: 'Campaign not found' };
  }

  if (!campaign.isActive) {
    return { eligible: false, reason: 'Campaign is not active' };
  }

  const now = new Date();
  if (campaign.startTime && campaign.startTime > now) {
    return { eligible: false, reason: 'Campaign has not started yet' };
  }
  if (campaign.endTime && campaign.endTime < now) {
    return { eligible: false, reason: 'Campaign has ended' };
  }

  // Tier check — campaign.targetTier restricts eligibility to a specific tier
  if (campaign.targetTier && options?.userTier) {
    if (options.userTier !== campaign.targetTier) {
      return { eligible: false, reason: `Campaign requires ${campaign.targetTier} tier` };
    }
  }

  // Subscription check
  if (campaign.requiresSubscription) {
    if (!options?.hasActiveSubscription) {
      return { eligible: false, reason: 'Active subscription required for this campaign' };
    }
  }

  // Per-user usage limit via userCampaignUsage collection (if present)
  // Falls back to DealRedemption count if userCampaignUsage model is unavailable
  const perUserLimit = campaign.perUserLimit ?? campaign.maxRedemptionsPerUser ?? 0;
  if (perUserLimit > 0 && Types.ObjectId.isValid(userId)) {
    const UserCampaignUsage = mongoose.models['UserCampaignUsage'];
    if (UserCampaignUsage) {
      const usageCount = await UserCampaignUsage.countDocuments({
        userId: new Types.ObjectId(userId),
        campaignId: campaign._id,
      });
      if (usageCount >= perUserLimit) {
        return { eligible: false, reason: 'Per-user redemption limit reached for this campaign' };
      }
    } else {
      // Fallback: count DealRedemptions for this user + campaign
      const DealRedemption = mongoose.models['DealRedemption'];
      if (DealRedemption) {
        const redemptionCount = await DealRedemption.countDocuments({
          user: new Types.ObjectId(userId),
          campaign: campaign._id,
          status: { $in: ['active', 'used'] },
        });
        if (redemptionCount >= perUserLimit) {
          return { eligible: false, reason: 'Per-user redemption limit reached for this campaign' };
        }
      }
    }
  }

  return { eligible: true };
}

/**
 * Check whether a user is eligible to join or participate in a campaign.
 *
 * @param userId     - MongoDB ObjectId string for the user
 * @param campaignId - MongoDB ObjectId string for the DiscoveryCampaign
 * @param userCity   - Optional city from the user's profile/session; used for targetCity check
 * @returns          EligibilityResult with eligible flag and optional human-readable reason
 */
export async function checkCampaignEligibility(
  userId: string,
  campaignId: string,
  userCity?: string,
): Promise<EligibilityResult> {
  if (!Types.ObjectId.isValid(campaignId)) {
    return { eligible: false, reason: 'Invalid campaign ID' };
  }

  if (!Types.ObjectId.isValid(userId)) {
    return { eligible: false, reason: 'Invalid user ID' };
  }

  const campaignObjectId = new Types.ObjectId(campaignId);
  const userObjectId = new Types.ObjectId(userId);

  // Fetch campaign and participation count in parallel
  const [campaign, participationCount] = await Promise.all([
    DiscoveryCampaign.findById(campaignObjectId).lean(),
    CampaignParticipation.countDocuments({ campaignId: campaignObjectId }),
  ]);

  if (!campaign) {
    return { eligible: false, reason: 'Campaign not found' };
  }

  if (!campaign.isActive) {
    return { eligible: false, reason: 'Campaign inactive' };
  }

  const now = new Date();

  if (campaign.startsAt && campaign.startsAt > now) {
    return { eligible: false, reason: 'Campaign not started' };
  }

  if (campaign.endsAt && campaign.endsAt < now) {
    return { eligible: false, reason: 'Campaign ended' };
  }

  // City check — only enforced when the campaign targets a specific city
  if (campaign.targetCity && userCity !== campaign.targetCity) {
    return { eligible: false, reason: 'City not eligible' };
  }

  // DiscoveryCampaign doesn't have a maxParticipants cap field in the current schema,
  // but we check participantCount defensively in case the field is added later.
  const maxParticipants = (campaign as any).maxParticipants as number | undefined;
  if (maxParticipants && participationCount >= maxParticipants) {
    return { eligible: false, reason: 'Campaign full' };
  }

  // Per-user participation limit check
  const maxParticipationsPerUser = (campaign as any).maxParticipationsPerUser as number | undefined;
  if (maxParticipationsPerUser) {
    const userParticipationCount = await CampaignParticipation.countDocuments({
      campaignId: campaignObjectId,
      userId: userObjectId,
    });
    if (userParticipationCount >= maxParticipationsPerUser) {
      return { eligible: false, reason: 'Participation limit reached' };
    }
  }

  return { eligible: true };
}
