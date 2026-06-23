import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import BonusCampaign from '../models/BonusCampaign';
import BonusClaim from '../models/BonusClaim';
import { CoinTransaction } from '../models/CoinTransaction';
import * as bonusCampaignService from '../services/bonusCampaignService';
import whatsNewService from '../services/whatsNewService';

// ============================================
// HELPERS
// ============================================

/** Escape special regex characters to prevent ReDoS */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Validate MongoDB ObjectId format */
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Safe parseInt with NaN fallback */
function safeParseInt(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const VALID_TRANSACTION_REF_TYPES = ['order', 'bill', 'payment', 'none'];
const VALID_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'exhausted', 'expired', 'cancelled'];

// ============================================
// USER-FACING ENDPOINTS
// ============================================

/**
 * GET /api/bonus-zone/campaigns
 * Get active bonus campaigns with per-user state
 */
export const getActiveCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { region } = req.query;

  const campaignsWithState = await bonusCampaignService.getActiveCampaigns(
    userId,
    region as string | undefined
  );

  // Transform for frontend consumption
  const campaigns = campaignsWithState.map(({ campaign, userState, userClaimCount, userTotalReward }) => ({
    id: campaign._id,
    slug: campaign.slug,
    title: campaign.title,
    subtitle: campaign.subtitle,
    description: campaign.description,
    campaignType: campaign.campaignType,
    reward: {
      type: campaign.reward.type,
      value: campaign.reward.value,
      capPerUser: campaign.reward.capPerUser,
      coinType: campaign.reward.coinType,
    },
    display: campaign.display,
    schedule: {
      startTime: campaign.startTime,
      endTime: campaign.endTime,
    },
    deepLink: campaign.deepLink,
    userState,
    userClaimCount,
    userTotalReward,
    maxClaimsPerUser: campaign.limits.maxClaimsPerUser,
    maxClaimsPerUserPerDay: campaign.limits.maxClaimsPerUserPerDay || 0,
    globalClaimsRemaining: campaign.limits.totalGlobalClaims > 0
      ? Math.max(0, campaign.limits.totalGlobalClaims - (campaign.limits.currentGlobalClaims || 0))
      : null,
    terms: campaign.terms,
    fundingSource: campaign.fundingSource.type !== 'platform' ? {
      partnerName: campaign.fundingSource.partnerName,
      partnerLogo: campaign.fundingSource.partnerLogo,
    } : undefined,
  }));

  sendSuccess(res, { campaigns, total: campaigns.length }, 'Bonus zone campaigns retrieved');
});

/**
 * GET /api/bonus-zone/campaigns/:slug
 * Get single campaign detail with eligibility check
 */
export const getCampaignDetail = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { slug } = req.params;

  const campaign = await BonusCampaign.findOne({ slug }).lean();
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  const eligibility = await bonusCampaignService.checkEligibility(
    campaign._id.toString(),
    userId
  );

  const [userClaimCount, userTotalReward, userDailyClaimCount] = await Promise.all([
    BonusClaim.getUserClaimCount(campaign._id.toString(), userId),
    BonusClaim.getUserTotalReward(campaign._id.toString(), userId),
    campaign.limits.maxClaimsPerUserPerDay > 0
      ? BonusClaim.getUserDailyClaimCount(campaign._id.toString(), userId)
      : Promise.resolve(0),
  ]);

  // Compute the UserCampaignState enum (same logic as getActiveCampaigns list endpoint)
  let computedUserState: 'eligible' | 'claimed' | 'limit_reached' | 'not_eligible' | 'budget_exhausted' | 'expired' = 'eligible';

  const now = new Date();
  if (campaign.endTime < now) {
    computedUserState = 'expired';
  } else if (campaign.reward.consumedBudget >= campaign.reward.totalBudget) {
    computedUserState = 'budget_exhausted';
  } else if (campaign.limits.totalGlobalClaims > 0 && (campaign.limits.currentGlobalClaims || 0) >= campaign.limits.totalGlobalClaims) {
    computedUserState = 'budget_exhausted';
  } else if (campaign.limits.maxClaimsPerUser > 0 && userClaimCount >= campaign.limits.maxClaimsPerUser) {
    computedUserState = 'limit_reached';
  } else if (campaign.reward.capPerUser > 0 && userTotalReward >= campaign.reward.capPerUser) {
    computedUserState = 'limit_reached';
  } else if (!eligibility.eligible) {
    computedUserState = 'not_eligible';
  } else if (userClaimCount > 0) {
    computedUserState = 'claimed';
  }

  sendSuccess(res, {
    campaign: {
      id: campaign._id,
      slug: campaign.slug,
      title: campaign.title,
      subtitle: campaign.subtitle,
      description: campaign.description,
      campaignType: campaign.campaignType,
      reward: {
        type: campaign.reward.type,
        value: campaign.reward.value,
        capPerUser: campaign.reward.capPerUser,
        capPerTransaction: campaign.reward.capPerTransaction,
        coinType: campaign.reward.coinType,
      },
      eligibility: {
        paymentMethods: campaign.eligibility.paymentMethods,
        bankCodes: campaign.eligibility.bankCodes,
        merchantCategories: campaign.eligibility.merchantCategories,
        minSpend: campaign.eligibility.minSpend,
        firstTransactionOnly: campaign.eligibility.firstTransactionOnly,
      },
      display: campaign.display,
      schedule: {
        startTime: campaign.startTime,
        endTime: campaign.endTime,
      },
      deepLink: campaign.deepLink,
      terms: campaign.terms,
      fundingSource: campaign.fundingSource.type !== 'platform' ? {
        partnerName: campaign.fundingSource.partnerName,
        partnerLogo: campaign.fundingSource.partnerLogo,
      } : undefined,
      globalClaimsRemaining: campaign.limits.totalGlobalClaims > 0
        ? Math.max(0, campaign.limits.totalGlobalClaims - (campaign.limits.currentGlobalClaims || 0))
        : null,
      // Include per-user state on the campaign object (matches list endpoint shape)
      userState: computedUserState,
      userClaimCount,
      userTotalReward,
      maxClaimsPerUser: campaign.limits.maxClaimsPerUser,
      maxClaimsPerUserPerDay: campaign.limits.maxClaimsPerUserPerDay || 0,
    },
    userState: {
      eligible: eligibility.eligible,
      reasons: eligibility.reasons,
      claimCount: userClaimCount,
      totalReward: userTotalReward,
      maxClaimsPerUser: campaign.limits.maxClaimsPerUser,
      maxClaimsPerUserPerDay: campaign.limits.maxClaimsPerUserPerDay || 0,
      dailyClaimCount: userDailyClaimCount,
    },
  }, 'Campaign detail retrieved');
});

/**
 * POST /api/bonus-zone/campaigns/:slug/claim
 * Claim a bonus campaign reward
 */
export const claimCampaignReward = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { slug } = req.params;
  const {
    transactionRef,
    paymentMethod,
    bankCode,
    cardBin,
    transactionAmount,
  } = req.body;

  const campaign = await BonusCampaign.findOne({ slug }).lean();
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  if (!transactionRef || !transactionRef.type) {
    return sendBadRequest(res, 'transactionRef with type is required');
  }
  if (!VALID_TRANSACTION_REF_TYPES.includes(transactionRef.type)) {
    return sendBadRequest(res, `Invalid transactionRef.type. Must be one of: ${VALID_TRANSACTION_REF_TYPES.join(', ')}`);
  }
  if (transactionRef.refId && !isValidObjectId(transactionRef.refId)) {
    return sendBadRequest(res, 'Invalid transactionRef.refId format');
  }

  try {
    const result = await bonusCampaignService.claimReward(
      campaign._id.toString(),
      userId,
      {
        transactionRef,
        paymentMethod,
        bankCode,
        cardBin,
        transactionAmount,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
        deviceId: req.headers['x-device-id'] as string,
      }
    );

    sendSuccess(res, {
      claim: {
        id: result.claim._id,
        status: result.claim.status,
        rewardAmount: result.claim.rewardAmount,
        rewardType: result.claim.rewardType,
      },
      coinTransaction: result.coinTransaction ? {
        id: result.coinTransaction._id,
        amount: result.coinTransaction.amount,
        balance: result.coinTransaction.balance,
      } : null,
    }, 'Reward claimed successfully');
  } catch (error: any) {
    return sendBadRequest(res, error.message || 'Failed to claim reward');
  }
});

/**
 * GET /api/bonus-zone/my-claims
 * Get user's claim history
 */
export const getMyClaims = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, safeParseInt(page as string, 1));
  const limitNum = Math.min(50, Math.max(1, safeParseInt(limit as string, 20)));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = { userId };
  if (status) {
    filter.status = status;
  }

  const [claims, total] = await Promise.all([
    BonusClaim.find(filter)
      .populate('campaignId', 'slug title campaignType display')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BonusClaim.countDocuments(filter),
  ]);

  sendSuccess(res, {
    claims,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  }, 'Claims retrieved');
});

/**
 * GET /api/bonus-zone/campaigns/:slug/eligibility
 * Pre-check user eligibility for a campaign
 */
export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { slug } = req.params;

  const campaign = await BonusCampaign.findOne({ slug }).lean();
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  const result = await bonusCampaignService.checkEligibility(
    campaign._id.toString(),
    userId
  );

  sendSuccess(res, result, 'Eligibility check complete');
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/admin/bonus-zone/campaigns
 * List all bonus campaigns with filters
 */
export const adminGetCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    campaignType,
    region,
    search,
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, safeParseInt(page as string, 1));
  const limitNum = Math.min(100, Math.max(1, safeParseInt(limit as string, 20)));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};
  if (status) filter.status = status;
  if (campaignType) filter.campaignType = campaignType;

  const andConditions: any[] = [];
  if (region) {
    andConditions.push({
      $or: [
        { 'eligibility.regions': region },
        { 'eligibility.regions': 'all' },
      ],
    });
  }
  if (search) {
    const escaped = escapeRegex(String(search).substring(0, 100));
    andConditions.push({
      $or: [
        { title: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
        { subtitle: { $regex: escaped, $options: 'i' } },
      ],
    });
  }
  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  const [campaigns, total] = await Promise.all([
    BonusCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BonusCampaign.countDocuments(filter),
  ]);

  sendSuccess(res, {
    campaigns,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  }, 'Admin campaigns retrieved');
});

/**
 * POST /api/admin/bonus-zone/campaigns
 * Create a new bonus campaign
 */
export const adminCreateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const {
    slug, title, subtitle, description, campaignType,
    fundingSource, eligibility, reward, limits,
    startTime, endTime, display, deepLink, terms, status,
  } = req.body;

  if (!slug || !title || !subtitle || !campaignType || !reward || !deepLink || !startTime || !endTime) {
    return sendBadRequest(res, 'Missing required fields: slug, title, subtitle, campaignType, reward, deepLink, startTime, endTime');
  }

  // Check slug uniqueness
  const existing = await BonusCampaign.findOne({ slug: slug.toLowerCase().trim() }).lean();
  if (existing) {
    return sendBadRequest(res, `Campaign with slug "${slug}" already exists`);
  }

  // Validate dates
  const parsedStart = new Date(startTime);
  const parsedEnd = new Date(endTime);
  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
    return sendBadRequest(res, 'startTime and endTime must be valid date strings');
  }
  if (parsedStart >= parsedEnd) {
    return sendBadRequest(res, 'startTime must be before endTime');
  }

  const campaign = await BonusCampaign.create({
    slug: slug.toLowerCase().trim(),
    title,
    subtitle,
    description,
    campaignType,
    fundingSource: fundingSource || { type: 'platform' },
    eligibility: eligibility || {},
    reward,
    limits: limits || {},
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    display: display || {},
    deepLink,
    terms: terms || [],
    status: status || 'draft',
    createdBy: (req as any).userId,
  });

  bonusCampaignService.invalidateBonusZoneCache();

  // Auto-create a What's New story if campaign is active
  if (campaign.status === 'active') {
    whatsNewService.autoCreateFromCampaign(campaign).catch(() => {});
  }

  sendSuccess(res, { campaign }, 'Campaign created successfully', 201);
});

/**
 * PUT /api/admin/bonus-zone/campaigns/:id
 * Update a bonus campaign
 */
export const adminUpdateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');

  const campaign = await BonusCampaign.findById(id).lean();
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  const updates = req.body;

  // ---- Live campaign edit restrictions ----
  if (['active', 'exhausted'].includes(campaign.status)) {
    const blockedFields: string[] = [];

    // Top-level blocked fields
    if (updates.campaignType !== undefined && updates.campaignType !== campaign.campaignType) {
      blockedFields.push('campaignType');
    }
    if (updates.slug !== undefined && updates.slug !== campaign.slug) {
      blockedFields.push('slug');
    }
    if (updates.eligibility !== undefined) {
      blockedFields.push('eligibility');
    }
    if (updates.startTime !== undefined) {
      const newStart = new Date(updates.startTime);
      if (newStart.getTime() !== campaign.startTime.getTime()) {
        blockedFields.push('startTime');
      }
    }
    if (updates.fundingSource !== undefined) {
      const currentType = campaign.fundingSource?.type || 'platform';
      const currentPartner = campaign.fundingSource?.partnerName || '';
      if (updates.fundingSource.type !== currentType || (updates.fundingSource.partnerName || '') !== currentPartner) {
        blockedFields.push('fundingSource');
      }
    }

    // Blocked nested reward fields
    if (updates.reward) {
      if (updates.reward.type !== undefined && updates.reward.type !== campaign.reward.type) {
        blockedFields.push('reward.type');
      }
      if (updates.reward.value !== undefined && updates.reward.value !== campaign.reward.value) {
        blockedFields.push('reward.value');
      }
      if (updates.reward.coinType !== undefined && updates.reward.coinType !== campaign.reward.coinType) {
        blockedFields.push('reward.coinType');
      }
    }

    if (blockedFields.length > 0) {
      return sendBadRequest(
        res,
        `Cannot change the following fields on a live (${campaign.status}) campaign: ${blockedFields.join(', ')}`
      );
    }

    // endTime: only allow extending, not shortening
    if (updates.endTime !== undefined) {
      const newEnd = new Date(updates.endTime);
      if (newEnd < campaign.endTime) {
        return sendBadRequest(res, 'Cannot shorten endTime on a live campaign. You may only extend it.');
      }
    }

    // reward.totalBudget: only allow increasing
    if (updates.reward?.totalBudget !== undefined && updates.reward.totalBudget < campaign.reward.totalBudget) {
      return sendBadRequest(res, 'Cannot decrease totalBudget on a live campaign. You may only increase it.');
    }

    // limits.maxClaimsPerUser: only allow increasing
    if (updates.limits?.maxClaimsPerUser !== undefined && updates.limits.maxClaimsPerUser < campaign.limits.maxClaimsPerUser) {
      return sendBadRequest(res, 'Cannot decrease maxClaimsPerUser on a live campaign. You may only increase it.');
    }
  }

  // Prevent totalBudget from going below consumedBudget (applies to all statuses)
  if (updates.reward?.totalBudget !== undefined && updates.reward.totalBudget < (campaign.reward.consumedBudget || 0)) {
    return sendBadRequest(
      res,
      `totalBudget (${updates.reward.totalBudget}) cannot be less than consumedBudget (${campaign.reward.consumedBudget})`
    );
  }

  // Prevent updating slug to an existing one
  if (updates.slug && updates.slug !== campaign.slug) {
    const existing = await BonusCampaign.findOne({ slug: updates.slug.toLowerCase().trim() }).lean();
    if (existing) {
      return sendBadRequest(res, `Campaign with slug "${updates.slug}" already exists`);
    }
  }

  // Apply updates
  const allowedFields = [
    'slug', 'title', 'subtitle', 'description', 'campaignType',
    'fundingSource', 'eligibility', 'reward', 'limits',
    'startTime', 'endTime', 'display', 'deepLink', 'terms', 'status',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'startTime' || field === 'endTime') {
        (campaign as any)[field] = new Date(updates[field]);
      } else if (typeof updates[field] === 'object' && !Array.isArray(updates[field])) {
        // Merge nested objects
        Object.assign((campaign as any)[field], updates[field]);
        campaign.markModified(field);
      } else {
        (campaign as any)[field] = updates[field];
      }
    }
  }

  await campaign.save();
  bonusCampaignService.invalidateBonusZoneCache();

  // Auto-create What's New story if campaign was activated
  if (updates.status === 'active') {
    whatsNewService.autoCreateFromCampaign(campaign).catch(() => {});
  }

  sendSuccess(res, { campaign }, 'Campaign updated successfully');
});

/**
 * DELETE /api/admin/bonus-zone/campaigns/:id
 * Delete a campaign (only draft or cancelled)
 */
export const adminDeleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');

  const campaign = await BonusCampaign.findById(id).lean();
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  if (!['draft', 'cancelled'].includes(campaign.status)) {
    return sendBadRequest(res, `Cannot delete campaign with status "${campaign.status}". Only draft or cancelled campaigns can be deleted.`);
  }

  await BonusCampaign.findByIdAndDelete(id);
  bonusCampaignService.invalidateBonusZoneCache();

  sendSuccess(res, null, 'Campaign deleted successfully');
});

/**
 * PATCH /api/admin/bonus-zone/campaigns/:id/status
 * Change campaign status (pause, resume, cancel)
 */
export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');
  const { status } = req.body;

  if (!status) {
    return sendBadRequest(res, 'Status is required');
  }
  if (!VALID_CAMPAIGN_STATUSES.includes(status)) {
    return sendBadRequest(res, `Invalid status. Must be one of: ${VALID_CAMPAIGN_STATUSES.join(', ')}`);
  }

  const validTransitions: Record<string, string[]> = {
    draft: ['scheduled', 'cancelled'],
    scheduled: ['active', 'paused', 'cancelled'],
    active: ['paused', 'cancelled'],
    paused: ['active', 'cancelled'],
    exhausted: ['cancelled'],
    expired: [],
    cancelled: [],
  };

  const campaign = await BonusCampaign.findById(id).lean();
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  const allowed = validTransitions[campaign.status] || [];
  if (!allowed.includes(status)) {
    return sendBadRequest(res, `Cannot transition from "${campaign.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`);
  }

  campaign.status = status;
  await campaign.save();
  bonusCampaignService.invalidateBonusZoneCache();

  sendSuccess(res, { campaign }, `Campaign status updated to ${status}`);
});

/**
 * GET /api/admin/bonus-zone/campaigns/:id/analytics
 * Campaign performance metrics
 */
export const adminGetAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');

  try {
    const analytics = await bonusCampaignService.getCampaignAnalytics(id);
    sendSuccess(res, analytics, 'Campaign analytics retrieved');
  } catch (error: any) {
    return sendNotFound(res, error.message);
  }
});

/**
 * GET /api/admin/bonus-zone/campaigns/:id/claims
 * List claims for a specific campaign
 */
export const adminGetClaims = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');
  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, safeParseInt(page as string, 1));
  const limitNum = Math.min(100, Math.max(1, safeParseInt(limit as string, 20)));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = { campaignId: new mongoose.Types.ObjectId(id) };
  if (status) filter.status = status;

  const [claims, total] = await Promise.all([
    BonusClaim.find(filter)
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BonusClaim.countDocuments(filter),
  ]);

  sendSuccess(res, {
    claims,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  }, 'Campaign claims retrieved');
});

/**
 * POST /api/admin/bonus-zone/campaigns/:id/fund
 * Add additional budget to a campaign
 */
export const adminFundCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');
  const { amount } = req.body;

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    return sendBadRequest(res, 'Amount must be a positive number up to 10,000,000');
  }

  const campaign = await BonusCampaign.findById(id);
  if (!campaign) {
    return sendNotFound(res, 'Campaign not found');
  }

  campaign.reward.totalBudget += amount;
  campaign.markModified('reward');

  // If campaign was exhausted and we added budget, reactivate if within time window
  const now = new Date();
  if (campaign.status === 'exhausted' && campaign.startTime <= now && campaign.endTime >= now) {
    campaign.status = 'active';
  }

  await campaign.save();
  bonusCampaignService.invalidateBonusZoneCache();

  sendSuccess(res, {
    campaign: {
      id: campaign._id,
      totalBudget: campaign.reward.totalBudget,
      consumedBudget: campaign.reward.consumedBudget,
      budgetRemaining: campaign.reward.totalBudget - campaign.reward.consumedBudget,
      status: campaign.status,
    },
  }, `Budget increased by ${amount} coins`);
});

/**
 * GET /api/admin/bonus-zone/dashboard
 * Aggregate dashboard stats
 */
export const adminGetDashboard = asyncHandler(async (req: Request, res: Response) => {
  const stats = await bonusCampaignService.getDashboardStats();
  sendSuccess(res, stats, 'Dashboard stats retrieved');
});

/**
 * GET /api/admin/bonus-zone/fraud-alerts
 * Suspicious claim patterns
 */
export const adminGetFraudAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { limit = '50' } = req.query;
  const alerts = await bonusCampaignService.getFraudAlerts(safeParseInt(limit as string, 50));
  sendSuccess(res, alerts, 'Fraud alerts retrieved');
});

/**
 * POST /api/admin/bonus-zone/campaigns/:id/duplicate
 * Duplicate a campaign with a new slug
 */
export const adminDuplicateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid campaign ID');
  const { newSlug } = req.body;

  const source = await BonusCampaign.findById(id).lean();
  if (!source) {
    return sendNotFound(res, 'Campaign not found');
  }

  const slug = newSlug || `${source.slug}-copy-${Date.now()}`;

  const existing = await BonusCampaign.findOne({ slug }).lean();
  if (existing) {
    return sendBadRequest(res, `Slug "${slug}" already exists`);
  }

  const { _id, createdAt, updatedAt, ...rest } = source;

  const duplicate = await BonusCampaign.create({
    ...rest,
    slug,
    status: 'draft',
    reward: {
      ...rest.reward,
      consumedBudget: 0,
    },
    limits: {
      ...rest.limits,
      currentGlobalClaims: 0,
    },
    createdBy: (req as any).userId,
  });

  sendSuccess(res, { campaign: duplicate }, 'Campaign duplicated successfully', 201);
});

/**
 * PATCH /api/admin/bonus-zone/claims/:claimId/reject
 * Reject a bonus claim and optionally reverse credited coins
 */
export const adminRejectClaim = asyncHandler(async (req: Request, res: Response) => {
  const { claimId } = req.params;
  const { reason } = req.body;

  if (!isValidObjectId(claimId)) {
    return sendBadRequest(res, 'Invalid claim ID');
  }

  const claim = await BonusClaim.findById(claimId).lean();
  if (!claim) return sendNotFound(res, 'Claim not found');

  if (claim.status === 'rejected') {
    return sendBadRequest(res, 'Claim is already rejected');
  }

  const wasCredited = claim.status === 'credited';

  // Update claim status
  claim.status = 'rejected';
  claim.rejectionReason = reason || 'Rejected by admin';
  claim.verifiedAt = new Date();
  claim.verifiedBy = (req as any).user?._id?.toString() || (req as any).userId || 'admin';
  await claim.save();

  // Refund budget to campaign
  await BonusCampaign.findByIdAndUpdate(claim.campaignId, {
    $inc: {
      'reward.consumedBudget': -claim.rewardAmount,
      'limits.currentGlobalClaims': -1,
    },
  });

  // If coins were already credited, reverse them via walletService
  if (wasCredited) {
    try {
      const { walletService } = await import('../services/walletService');
      await walletService.debit({
        userId: claim.userId.toString(),
        amount: claim.rewardAmount,
        source: 'admin',
        description: `Bonus reversed: ${reason || 'Admin rejection'}`,
        operationType: 'admin_adjustment',
        referenceId: `bonus-reversal:${claimId}`,
        referenceModel: 'BonusClaim',
        metadata: { bonusClaimId: claimId, reversal: true, idempotencyKey: `bonus-reversal:${claimId}` },
      });
    } catch (reverseErr) {
      logger.error('[BONUS ADMIN] Failed to reverse coins for rejected claim:', reverseErr);
    }
  }

  bonusCampaignService.invalidateBonusZoneCache();

  sendSuccess(res, { claim });
});
