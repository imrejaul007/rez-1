import { logger } from '../config/logger';
import mongoose from 'mongoose';
import BonusCampaign, { IBonusCampaign, BonusCampaignType } from '../models/BonusCampaign';
import whatsNewService from './whatsNewService';
import BonusClaim, { IBonusClaim } from '../models/BonusClaim';
import { CoinTransaction, MainCategorySlug } from '../models/CoinTransaction';
import { User } from '../models/User';
import ProgramMembership from '../models/ProgramMembership';
import { NotificationService } from './notificationService';
import redisService from './redisService';
import { getCachedWalletConfig } from './walletCacheService';
import { CURRENCY_RULES } from '../config/currencyRules';
import { Lean } from '../types/lean';

const CACHE_TTL = 60; // 60 seconds for active campaigns list

// ============================================
// TYPES
// ============================================

export interface UserCampaignState {
  campaign: IBonusCampaign;
  userState: 'eligible' | 'claimed' | 'limit_reached' | 'not_eligible' | 'budget_exhausted' | 'expired';
  userClaimCount: number;
  userTotalReward: number;
}

export interface ClaimContext {
  transactionRef: {
    type: 'order' | 'bill' | 'payment' | 'none';
    refId?: string;
  };
  paymentMethod?: string;
  bankCode?: string;
  cardBin?: string;
  transactionAmount?: number;
  category?: MainCategorySlug;
  storeId?: string;
  ipAddress?: string;
  deviceId?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface CampaignAnalytics {
  totalClaims: number;
  creditedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
  uniqueUsers: number;
  totalCoinsDistributed: number;
  budgetUsedPercent: number;
  avgRewardPerUser: number;
}

// ============================================
// GET ACTIVE CAMPAIGNS WITH USER STATE
// ============================================

export async function getActiveCampaigns(
  userId: string,
  region?: string
): Promise<UserCampaignState[]> {
  // Try cache for campaign list (not user-specific state)
  const cacheKey = `bonus-zone:active:${region || 'all'}`;
  let campaigns: IBonusCampaign[];

  try {
    const cached = await redisService.get(cacheKey);
    if (cached && typeof cached === 'string') {
      campaigns = JSON.parse(cached);
    } else {
      campaigns = await BonusCampaign.getActiveCampaigns(region);
      await redisService.set(cacheKey, JSON.stringify(campaigns), CACHE_TTL);
    }
  } catch {
    campaigns = await BonusCampaign.getActiveCampaigns(region);
  }

  if (campaigns.length === 0) return [];

  // Filter campaigns by user segment (e.g. new_user, student, corporate, prive)
  if (userId) {
    const userDoc = await User.findById(userId).select('verifications createdAt').lean();
    const userSegments: string[] = ['all'];

    // Check if new user (account < 30 days)
    if (userDoc?.createdAt) {
      const accountAgeDays = (Date.now() - new Date(userDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays <= 30) userSegments.push('new_user');
    }

    // Check verified zones
    const verifications = userDoc?.verifications as Record<string, any> | undefined;
    if (verifications?.student?.verified) userSegments.push('student');
    if (verifications?.corporate?.verified) userSegments.push('corporate');

    // Check Privé membership
    try {
      const priveMembership = await ProgramMembership.findOne({
        user: userId, programSlug: 'nuqta_prive', status: 'active',
      }).lean();
      if (priveMembership) userSegments.push('prive');
    } catch { /* ignore */ }

    // Filter: keep campaigns with no segment restriction OR matching segments
    campaigns = campaigns.filter(c => {
      const segments = c.eligibility?.userSegments;
      if (!segments || segments.length === 0 || segments.includes('all')) return true;
      return segments.some((s: string) => userSegments.includes(s));
    });

    // Filter: exclude campaigns that specifically exclude this user
    campaigns = campaigns.filter(c => {
      const excluded = c.eligibility?.excludeUserIds;
      if (!excluded || excluded.length === 0) return true;
      return !excluded.some((id: any) => id.toString() === userId);
    });
  }

  // Batch fetch user claims for all active campaigns
  const campaignIds = campaigns.map(c => c._id);
  const userClaims = await BonusClaim.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        campaignId: { $in: campaignIds },
        status: { $in: ['pending', 'verified', 'credited'] },
      },
    },
    {
      $group: {
        _id: '$campaignId',
        claimCount: { $sum: 1 },
        totalReward: {
          $sum: {
            $cond: [{ $in: ['$status', ['verified', 'credited']] }, '$rewardAmount', 0],
          },
        },
      },
    },
  ]);

  const claimMap = new Map(
    userClaims.map((c: any) => [c._id.toString(), { count: c.claimCount, total: c.totalReward }])
  );

  return campaigns.map(campaign => {
    const claims = claimMap.get(campaign._id.toString()) || { count: 0, total: 0 };
    let userState: UserCampaignState['userState'] = 'eligible';

    // Check budget exhaustion
    if (campaign.reward.consumedBudget >= campaign.reward.totalBudget) {
      userState = 'budget_exhausted';
    }
    // Check if user already claimed max
    else if (campaign.limits.maxClaimsPerUser > 0 && claims.count >= campaign.limits.maxClaimsPerUser) {
      userState = 'limit_reached';
    }
    // Check if user already hit per-user cap
    else if (campaign.reward.capPerUser > 0 && claims.total >= campaign.reward.capPerUser) {
      userState = 'limit_reached';
    }
    // Check global claim limit
    else if (campaign.limits.totalGlobalClaims > 0 && campaign.limits.currentGlobalClaims >= campaign.limits.totalGlobalClaims) {
      userState = 'budget_exhausted';
    }

    // Mark claimed campaigns
    if (userState === 'eligible' && claims.count > 0) {
      userState = 'claimed';
    }

    return {
      campaign,
      userState,
      userClaimCount: claims.count,
      userTotalReward: claims.total,
    };
  });
}

// ============================================
// CHECK ELIGIBILITY
// ============================================

export async function checkEligibility(
  campaignId: string,
  userId: string,
  context?: Partial<ClaimContext>
): Promise<EligibilityResult> {
  const reasons: string[] = [];

  const campaign = await BonusCampaign.findById(campaignId).lean();
  if (!campaign) {
    return { eligible: false, reasons: ['Campaign not found'] };
  }

  const now = new Date();

  // Status check
  if (campaign.status !== 'active') {
    reasons.push(`Campaign is ${campaign.status}`);
  }

  // Time check
  if (campaign.startTime > now) {
    reasons.push('Campaign has not started yet');
  }
  if (campaign.endTime < now) {
    reasons.push('Campaign has expired');
  }

  // Budget check
  if (campaign.reward.consumedBudget >= campaign.reward.totalBudget) {
    reasons.push('Campaign budget exhausted');
  }

  // Global claim limit
  if (campaign.limits.totalGlobalClaims > 0 && campaign.limits.currentGlobalClaims >= campaign.limits.totalGlobalClaims) {
    reasons.push('Campaign has reached maximum claims');
  }

  // Per-user claim limit
  const userClaimCount = await BonusClaim.getUserClaimCount(campaignId, userId);
  if (campaign.limits.maxClaimsPerUser > 0 && userClaimCount >= campaign.limits.maxClaimsPerUser) {
    reasons.push(`You have already claimed this bonus ${userClaimCount} time(s)`);
  }

  // Per-user daily limit
  if (campaign.limits.maxClaimsPerUserPerDay > 0) {
    const dailyCount = await BonusClaim.getUserDailyClaimCount(campaignId, userId);
    if (dailyCount >= campaign.limits.maxClaimsPerUserPerDay) {
      reasons.push('Daily claim limit reached');
    }
  }

  // Per-user cap
  if (campaign.reward.capPerUser > 0) {
    const userTotalReward = await BonusClaim.getUserTotalReward(campaignId, userId);
    if (userTotalReward >= campaign.reward.capPerUser) {
      reasons.push('You have reached the maximum reward for this campaign');
    }
  }

  // Excluded users
  if (campaign.eligibility.excludeUserIds?.some(id => id.toString() === userId)) {
    reasons.push('You are not eligible for this campaign');
  }

  // Context-based eligibility checks (only if context is provided)
  if (context) {
    const elig = campaign.eligibility;

    // Payment method
    if (elig.paymentMethods && elig.paymentMethods.length > 0 && context.paymentMethod) {
      if (!elig.paymentMethods.includes(context.paymentMethod)) {
        reasons.push(`Payment method ${context.paymentMethod} not eligible`);
      }
    }

    // Bank code
    if (elig.bankCodes && elig.bankCodes.length > 0 && context.bankCode) {
      if (!elig.bankCodes.includes(context.bankCode.toUpperCase())) {
        reasons.push(`Bank ${context.bankCode} not eligible`);
      }
    }

    // BIN prefix
    if (elig.binPrefixes && elig.binPrefixes.length > 0 && context.cardBin) {
      const matches = elig.binPrefixes.some(prefix => context.cardBin!.startsWith(prefix));
      if (!matches) {
        reasons.push('Card not eligible for this offer');
      }
    }

    // Minimum spend
    if (elig.minSpend && elig.minSpend > 0 && context.transactionAmount !== undefined) {
      if (context.transactionAmount < elig.minSpend) {
        reasons.push(`Minimum spend of ${elig.minSpend} required`);
      }
    }

    // Merchant category
    if (elig.merchantCategories && elig.merchantCategories.length > 0 && context.category) {
      if (!elig.merchantCategories.includes(context.category)) {
        reasons.push('This category is not eligible');
      }
    }

    // Store restriction
    if (elig.storeIds && elig.storeIds.length > 0 && context.storeId) {
      if (!elig.storeIds.some(id => id.toString() === context.storeId)) {
        reasons.push('This store is not eligible');
      }
    }

    // First transaction only
    if (elig.firstTransactionOnly) {
      const existingClaims = await BonusClaim.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['verified', 'credited'] },
      });
      if (existingClaims > 0) {
        reasons.push('This bonus is only for first-time transactions');
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

// ============================================
// CALCULATE REWARD AMOUNT
// ============================================

function calculateRewardAmount(
  campaign: Lean<IBonusCampaign>,
  transactionAmount?: number
): number {
  const { type, value, capPerTransaction } = campaign.reward;
  let amount = 0;

  switch (type) {
    case 'percentage':
      amount = transactionAmount ? Math.floor((transactionAmount * value) / 100) : 0;
      break;
    case 'flat':
      amount = value;
      break;
    case 'multiplier':
      // Multiplier acts on base reward; if no transaction amount, use flat value
      amount = transactionAmount ? Math.floor(transactionAmount * value) : value;
      break;
  }

  // Apply per-transaction cap
  if (capPerTransaction > 0 && amount > capPerTransaction) {
    amount = capPerTransaction;
  }

  return Math.max(0, Math.floor(amount));
}

// ============================================
// CLAIM REWARD (ATOMIC)
// ============================================

export async function claimReward(
  campaignId: string,
  userId: string,
  context: ClaimContext
): Promise<{ claim: IBonusClaim; coinTransaction: any }> {
  // Acquire per-user distributed lock to prevent TOCTOU race on maxClaimsPerUser
  const lockKey = `bonus_claim:${campaignId}:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    throw new Error('Another claim is being processed. Please try again.');
  }

  try {
    // 1. Fetch campaign
    const campaign = await BonusCampaign.findById(campaignId).lean();
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // 2. Validate eligibility
    const eligibility = await checkEligibility(campaignId, userId, context);
    if (!eligibility.eligible) {
      throw new Error(`Not eligible: ${eligibility.reasons.join(', ')}`);
    }

    // 3. Calculate reward
    const rewardAmount = calculateRewardAmount(campaign, context.transactionAmount);
    if (rewardAmount <= 0) {
      throw new Error('Calculated reward amount is zero');
    }

    // Check per-user cap remaining (single query, reuse result)
    let finalRewardAmount = rewardAmount;
    if (campaign.reward.capPerUser > 0) {
      const userTotalReward = await BonusClaim.getUserTotalReward(campaignId, userId);
      const remaining = campaign.reward.capPerUser - userTotalReward;
      if (remaining <= 0) {
        throw new Error('User reward cap reached');
      }
      finalRewardAmount = Math.min(rewardAmount, remaining);
    }

    // 4. Atomic budget consumption — fails if insufficient budget
    const budgetUpdate = await BonusCampaign.findOneAndUpdate(
      {
        _id: campaignId,
        status: 'active',
        'reward.consumedBudget': { $lte: campaign.reward.totalBudget - finalRewardAmount },
      },
      {
        $inc: {
          'reward.consumedBudget': finalRewardAmount,
          'limits.currentGlobalClaims': 1,
        },
      },
      { new: true }
    );

    if (!budgetUpdate) {
      throw new Error('Campaign budget exhausted or campaign no longer active');
    }

    // Auto-exhaust if budget is now depleted
    if (budgetUpdate.reward.consumedBudget >= budgetUpdate.reward.totalBudget) {
      budgetUpdate.status = 'exhausted';
      await budgetUpdate.save();
      // Invalidate cache
      invalidateCache();
    }

    // 5. Create BonusClaim (with budget rollback on failure)
    let claim: IBonusClaim;
    try {
      claim = await BonusClaim.create({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        userId: new mongoose.Types.ObjectId(userId),
        transactionRef: {
          type: context.transactionRef.type,
          refId: context.transactionRef.refId
            ? new mongoose.Types.ObjectId(context.transactionRef.refId)
            : undefined,
        },
        status: campaign.campaignType === 'bill_upload_bonus' ? 'pending' : 'credited',
        rewardAmount: finalRewardAmount,
        rewardType: campaign.reward.coinType,
        metadata: {
          ipAddress: context.ipAddress,
          deviceId: context.deviceId,
          paymentMethod: context.paymentMethod,
          bankCode: context.bankCode,
          cardBin: context.cardBin,
          transactionAmount: context.transactionAmount,
        },
      });
    } catch (claimError: any) {
      // Rollback budget consumption if claim creation fails (e.g. duplicate claim)
      await BonusCampaign.findByIdAndUpdate(campaignId, {
        $inc: {
          'reward.consumedBudget': -finalRewardAmount,
          'limits.currentGlobalClaims': -1,
        },
      });
      throw claimError;
    }

    // 6. Credit coins immediately (unless bill_upload_bonus which needs verification)
    let coinTransaction = null;
    if (campaign.campaignType !== 'bill_upload_bonus') {
      try {
        coinTransaction = await creditRewardToWallet(
          userId,
          finalRewardAmount,
          campaign,
          claim._id.toString()
        );

        // Update claim with CoinTransaction reference
        claim.coinTransactionId = (coinTransaction as any)._id;
        claim.verifiedAt = new Date();
        claim.verifiedBy = 'system';
        await claim.save();

        // Send notification for bonus reward
        try {
          await NotificationService.createNotification({
            userId,
            title: 'Bonus Coins Earned!',
            message: `You earned ${finalRewardAmount} bonus coins from "${campaign.title}"`,
            type: 'success',
            category: 'earning',
            priority: 'medium',
            data: {
              amount: finalRewardAmount,
              deepLink: '/bonus-zone-history',
              actionButton: {
                text: 'View Details',
                action: 'navigate',
                target: '/bonus-zone-history',
              },
            },
            source: 'automated',
          });
        } catch (notifError) {
          logger.error('[BONUS] Failed to send reward notification:', notifError);
        }
      } catch (creditError: any) {
        // Full rollback: revert budget + delete the orphaned claim
        logger.error('[BONUS] creditRewardToWallet failed, rolling back claim and budget:', creditError.message);
        await BonusClaim.deleteOne({ _id: claim._id });
        await BonusCampaign.findByIdAndUpdate(campaignId, {
          $inc: {
            'reward.consumedBudget': -finalRewardAmount,
            'limits.currentGlobalClaims': -1,
          },
        });
        throw new Error(`Failed to credit reward: ${creditError.message}`);
      }
    }

    return { claim, coinTransaction };
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
}

// ============================================
// CREDIT REWARD TO WALLET
// ============================================

async function creditRewardToWallet(
  userId: string,
  amount: number,
  campaign: IBonusCampaign | Lean<IBonusCampaign>,
  claimId: string
) {
  // Determine category from campaign eligibility
  const category = campaign.eligibility.merchantCategories?.[0] || null;

  // Calculate expiry if campaign awards branded coins
  const coinType = campaign.reward?.coinType || 'rez';
  let expiresAtMeta: Date | undefined;
  if (coinType === 'branded') {
    try {
      const walletConfig = await getCachedWalletConfig();
      const expiryDays = walletConfig?.coinExpiryConfig?.branded?.expiryDays ?? CURRENCY_RULES.branded.expiryDays;
      if (expiryDays > 0) { expiresAtMeta = new Date(); expiresAtMeta.setDate(expiresAtMeta.getDate() + expiryDays); }
    } catch { /* fallback handled by backfill job */ }
  }

  // Use rewardEngine for unified reward issuance
  const { rewardEngine } = await import('../core/rewardEngine');
  const result = await rewardEngine.issue({
    userId,
    amount,
    rewardType: 'bonus_campaign',
    source: 'bonus_campaign',
    description: `Bonus: ${campaign.title}`,
    operationType: 'bonus_campaign',
    referenceId: `bonus:${claimId}`,
    referenceModel: 'BonusClaim',
    coinType: coinType as 'rez' | 'prive' | 'promo' | 'branded',
    metadata: {
      bonusCampaignId: campaign._id,
      bonusClaimId: claimId,
      campaignType: campaign.campaignType,
      campaignSlug: campaign.slug,
      ...(coinType !== 'rez' && { coinType }),
      ...(expiresAtMeta && { expiresAt: expiresAtMeta }),
      idempotencyKey: `bonus-campaign:${claimId}`,
    },
    category,
    skipCap: true,
    skipMultiplier: true,
  });

  // Track merchant liability for non-platform campaigns (fire-and-forget)
  if (campaign.fundingSource?.type !== 'platform' && campaign.fundingSource?.partnerId) {
    import('./liabilityService').then(({ liabilityService }) => {
      liabilityService.recordIssuance({
        merchantId: campaign.fundingSource.partnerId!.toString(),
        storeId: campaign.fundingSource.partnerId!.toString(), // Partner acts as store
        campaignId: campaign._id.toString(),
        campaignType: 'bonus_campaign',
        amount: result.amount,
        referenceId: `bonus:${claimId}`,
        referenceModel: 'BonusClaim',
      }).catch((err) => logger.error('[BonusCampaignService] Liability recording failed for bonus claim', { error: err.message, claimId }));
    }).catch((err) => logger.error('[BonusCampaignService] Failed to load liabilityService module', { error: err.message }));
  }

  // Return a compatible object for callers that read ._id
  return { _id: result.transactionId, amount: result.amount, balance: result.newBalance };
}

// ============================================
// VERIFY AND CREDIT BILL CLAIM
// ============================================

export async function verifyAndCreditBillClaim(claimId: string): Promise<IBonusClaim | null> {
  const claim = await BonusClaim.findById(claimId);
  if (!claim) return null;
  // Already credited — return idempotently
  if (claim.status === 'credited' || claim.status === 'verified') return claim;
  // Only process pending claims
  if (claim.status !== 'pending') return claim;

  const campaign = await BonusCampaign.findById(claim.campaignId);
  if (!campaign) {
    claim.status = 'rejected';
    claim.rejectionReason = 'Campaign no longer exists';
    await claim.save();
    return claim;
  }

  // Credit the reward
  const coinTransaction = await creditRewardToWallet(
    claim.userId.toString(),
    claim.rewardAmount,
    campaign,
    claim._id.toString()
  );

  claim.status = 'credited';
  claim.coinTransactionId = (coinTransaction as any)._id;
  claim.verifiedAt = new Date();
  claim.verifiedBy = 'system';
  await claim.save();

  // Send notification for bill bonus credit
  try {
    await NotificationService.createNotification({
      userId: claim.userId.toString(),
      title: 'Bill Bonus Credited!',
      message: `Your bill upload bonus of ${claim.rewardAmount} coins has been verified and credited.`,
      type: 'success',
      category: 'earning',
      priority: 'medium',
      data: {
        amount: claim.rewardAmount,
        deepLink: '/bonus-zone-history',
        actionButton: {
          text: 'View Details',
          action: 'navigate',
          target: '/bonus-zone-history',
        },
      },
      source: 'automated',
    });
  } catch (notifError) {
    logger.error('[BONUS] Failed to send bill bonus notification:', notifError);
  }

  return claim;
}

// ============================================
// EXPIRE PENDING CLAIMS (CRON JOB)
// ============================================

export async function expirePendingClaims(): Promise<number> {
  const now = new Date();

  // Find pending claims whose campaign has ended or been cancelled
  const expiredCampaigns = await BonusCampaign.find({
    $or: [
      { endTime: { $lt: now }, status: { $in: ['expired', 'cancelled', 'paused'] } },
      { status: 'cancelled' }, // Always expire pending claims for cancelled campaigns
    ],
  }).select('_id').lean();

  if (expiredCampaigns.length === 0) return 0;

  const campaignIds = expiredCampaigns.map(c => c._id);

  // Find pending claims BEFORE updating (so we only refund these specific ones)
  const pendingClaims = await BonusClaim.find({
    campaignId: { $in: campaignIds },
    status: 'pending',
  }).lean();

  if (pendingClaims.length === 0) return 0;

  const pendingClaimIds = pendingClaims.map(c => c._id);

  // Expire only these specific pending claims (not previously expired ones)
  const result = await BonusClaim.updateMany(
    { _id: { $in: pendingClaimIds } },
    { $set: { status: 'expired' } }
  );

  // Group refunds by campaign using only the claims we just expired
  const refundMap = new Map<string, { amount: number; count: number }>();
  for (const claim of pendingClaims) {
    const key = claim.campaignId.toString();
    const existing = refundMap.get(key) || { amount: 0, count: 0 };
    existing.amount += claim.rewardAmount;
    existing.count += 1;
    refundMap.set(key, existing);
  }

  // Refund budget to each campaign
  for (const [cId, refund] of refundMap) {
    await BonusCampaign.findByIdAndUpdate(cId, {
      $inc: {
        'reward.consumedBudget': -refund.amount,
        'limits.currentGlobalClaims': -refund.count,
      },
    });
  }

  return result.modifiedCount;
}

// ============================================
// AUTO-TRANSITION CAMPAIGN STATUSES (CRON JOB)
// ============================================

export async function transitionCampaignStatuses(): Promise<{ activated: number; expired: number }> {
  const now = new Date();

  // Find scheduled campaigns that should be activated (before updateMany changes them)
  const campaignsToActivate = await BonusCampaign.find({
    status: 'scheduled',
    startTime: { $lte: now },
    endTime: { $gte: now },
  }).lean();

  // Activate scheduled campaigns that have reached their start time
  const activated = await BonusCampaign.updateMany(
    {
      status: 'scheduled',
      startTime: { $lte: now },
      endTime: { $gte: now },
    },
    { $set: { status: 'active' } }
  );

  // Auto-create What's New stories for newly activated campaigns
  for (const campaign of campaignsToActivate) {
    whatsNewService.autoCreateFromCampaign(campaign).catch(() => {});
  }

  // Expire active/scheduled/paused campaigns that have passed their end time
  const expired = await BonusCampaign.updateMany(
    {
      status: { $in: ['active', 'scheduled', 'paused'] },
      endTime: { $lt: now },
    },
    { $set: { status: 'expired' } }
  );

  if (activated.modifiedCount > 0 || expired.modifiedCount > 0) {
    invalidateCache();
  }

  return {
    activated: activated.modifiedCount,
    expired: expired.modifiedCount,
  };
}

// ============================================
// CAMPAIGN ANALYTICS
// ============================================

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const campaign = await BonusCampaign.findById(campaignId).lean();
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const [claimStats, uniqueUserCount] = await Promise.all([
    BonusClaim.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalReward: { $sum: '$rewardAmount' },
        },
      },
    ]),
    BonusClaim.distinct('userId', {
      campaignId: new mongoose.Types.ObjectId(campaignId),
      status: { $in: ['verified', 'credited'] },
    }),
  ]);

  const statMap = new Map(claimStats.map((s: any) => [s._id, s]));
  const credited = statMap.get('credited') || { count: 0, totalReward: 0 };
  const verified = statMap.get('verified') || { count: 0, totalReward: 0 };
  const pending = statMap.get('pending') || { count: 0, totalReward: 0 };
  const rejected = statMap.get('rejected') || { count: 0, totalReward: 0 };

  const totalDistributed = credited.totalReward + verified.totalReward;
  const totalClaims = claimStats.reduce((sum: number, s: any) => sum + s.count, 0);

  return {
    totalClaims,
    creditedClaims: credited.count + verified.count,
    pendingClaims: pending.count,
    rejectedClaims: rejected.count,
    uniqueUsers: uniqueUserCount.length,
    totalCoinsDistributed: totalDistributed,
    budgetUsedPercent: campaign.reward.totalBudget > 0
      ? Math.round((campaign.reward.consumedBudget / campaign.reward.totalBudget) * 100)
      : 0,
    avgRewardPerUser: uniqueUserCount.length > 0
      ? Math.round(totalDistributed / uniqueUserCount.length)
      : 0,
  };
}

// ============================================
// DASHBOARD AGGREGATE STATS
// ============================================

export async function getDashboardStats() {
  const now = new Date();

  const [campaignStats, claimOverview] = await Promise.all([
    BonusCampaign.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$reward.totalBudget' },
          consumedBudget: { $sum: '$reward.consumedBudget' },
        },
      },
    ]),
    BonusClaim.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalReward: { $sum: '$rewardAmount' },
        },
      },
    ]),
  ]);

  const campaignMap = new Map(campaignStats.map((s: any) => [s._id, s]));
  const claimMap = new Map(claimOverview.map((s: any) => [s._id, s]));

  const active = campaignMap.get('active') || { count: 0, totalBudget: 0, consumedBudget: 0 };
  const credited = claimMap.get('credited') || { count: 0, totalReward: 0 };

  return {
    activeCampaigns: active.count,
    totalBudgetAllocated: campaignStats.reduce((s: number, c: any) => s + c.totalBudget, 0),
    totalBudgetConsumed: campaignStats.reduce((s: number, c: any) => s + c.consumedBudget, 0),
    totalClaimsLast30d: claimOverview.reduce((s: number, c: any) => s + c.count, 0),
    totalDistributedLast30d: credited.totalReward,
    campaignsByStatus: Object.fromEntries(campaignStats.map((s: any) => [s._id, s.count])),
  };
}

// ============================================
// FRAUD ALERTS
// ============================================

export async function getFraudAlerts(limit: number = 50) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Users with unusually high claim velocity
  const highVelocityUsers = await BonusClaim.aggregate([
    {
      $match: {
        createdAt: { $gte: oneDayAgo },
        status: { $in: ['pending', 'verified', 'credited'] },
      },
    },
    {
      $group: {
        _id: '$userId',
        claimCount: { $sum: 1 },
        totalReward: { $sum: '$rewardAmount' },
        campaigns: { $addToSet: '$campaignId' },
        ips: { $addToSet: '$metadata.ipAddress' },
      },
    },
    {
      $match: {
        $or: [
          { claimCount: { $gte: 10 } },
          { totalReward: { $gte: 1000 } },
        ],
      },
    },
    { $sort: { claimCount: -1 } },
    { $limit: limit },
  ]);

  // Same IP multiple user claims
  const sameIpClaims = await BonusClaim.aggregate([
    {
      $match: {
        createdAt: { $gte: oneDayAgo },
        'metadata.ipAddress': { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$metadata.ipAddress',
        users: { $addToSet: '$userId' },
        claimCount: { $sum: 1 },
      },
    },
    {
      $match: {
        'users.1': { $exists: true }, // At least 2 different users
      },
    },
    { $sort: { claimCount: -1 } },
    { $limit: limit },
  ]);

  return {
    highVelocityUsers,
    sameIpClaims,
  };
}

// ============================================
// CHECK FOR MATCHING CAMPAIGNS (auto-trigger hook)
// ============================================

export async function findMatchingCampaigns(
  campaignType: BonusCampaignType,
  context: {
    userId: string;
    category?: MainCategorySlug;
    storeId?: string;
    transactionAmount?: number;
    paymentMethod?: string;
    bankCode?: string;
    cardBin?: string;
  }
): Promise<IBonusCampaign[]> {
  const now = new Date();
  const query: any = {
    campaignType,
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  const campaigns = await BonusCampaign.find(query).lean();

  // Filter by eligibility in-memory (fast path for common checks)
  return campaigns.filter(campaign => {
    const elig = campaign.eligibility;

    // Budget check
    if (campaign.reward.consumedBudget >= campaign.reward.totalBudget) return false;

    // Category check
    if (elig.merchantCategories && elig.merchantCategories.length > 0 && context.category) {
      if (!elig.merchantCategories.includes(context.category)) return false;
    }

    // Store check
    if (elig.storeIds && elig.storeIds.length > 0 && context.storeId) {
      if (!elig.storeIds.some((id: any) => id.toString() === context.storeId)) return false;
    }

    // Min spend
    if (elig.minSpend && elig.minSpend > 0 && context.transactionAmount !== undefined) {
      if (context.transactionAmount < elig.minSpend) return false;
    }

    // Bank code
    if (elig.bankCodes && elig.bankCodes.length > 0 && context.bankCode) {
      if (!elig.bankCodes.includes(context.bankCode.toUpperCase())) return false;
    }

    // BIN prefix
    if (elig.binPrefixes && elig.binPrefixes.length > 0 && context.cardBin) {
      if (!elig.binPrefixes.some((prefix: string) => context.cardBin!.startsWith(prefix))) return false;
    }

    // Excluded users
    if (elig.excludeUserIds && elig.excludeUserIds.some((id: any) => id.toString() === context.userId)) {
      return false;
    }

    return true;
  }) as unknown as IBonusCampaign[];
}

// ============================================
// AUTO-CLAIM FOR QUALIFYING TRANSACTION
// ============================================

export async function autoClaimForTransaction(
  campaignType: BonusCampaignType,
  userId: string,
  context: ClaimContext & {
    category?: MainCategorySlug;
    storeId?: string;
  }
): Promise<Array<{ claim: IBonusClaim; coinTransaction: any }>> {
  const matchingCampaigns = await findMatchingCampaigns(campaignType, {
    userId,
    category: context.category,
    storeId: context.storeId,
    transactionAmount: context.transactionAmount,
    paymentMethod: context.paymentMethod,
    bankCode: context.bankCode,
    cardBin: context.cardBin,
  });

  const results: Array<{ claim: IBonusClaim; coinTransaction: any }> = [];

  for (const campaign of matchingCampaigns) {
    try {
      const result = await claimReward(campaign._id.toString(), userId, context);
      results.push(result);
    } catch (error: any) {
      // Skip campaigns that fail eligibility (user already claimed, budget exhausted, etc.)
      logger.info(`[BonusCampaign] Auto-claim skipped for ${campaign.slug}: ${error.message}`);
    }
  }

  return results;
}

// ============================================
// CACHE INVALIDATION
// ============================================

function invalidateCache() {
  try {
    redisService.delPattern('bonus-zone:active:*');
  } catch {
    // Best-effort cache invalidation
  }
}

export function invalidateBonusZoneCache() {
  invalidateCache();
}
