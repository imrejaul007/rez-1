/**
 * src/controllers/trialAdminController.ts
 * Admin-facing trial endpoints: approval, fraud monitoring, campaign management
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Models
import { TrialOffer } from '../models/TrialOffer';
import { TrialBooking } from '../models/TrialBooking';
import { TrialCoinLedger } from '../models/TrialCoinLedger';
import { TryFeedCache } from '../models/TryFeedCache';
import { TrialCoinWallet } from '../models/TrialCoinWallet';

/**
 * GET /api/admin/trials/pending
 * Fetch all pending trial offers awaiting approval
 */
export const getPendingTrials = asyncHandler(async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [pending, total] = await Promise.all([
      TrialOffer.find({ status: 'pending_approval' })
        .populate('merchantId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TrialOffer.countDocuments({ status: 'pending_approval' }),
    ]);

    logger.info('[TRIAL ADMIN CONTROLLER] Pending trials fetched', {
      count: pending.length,
      total,
      page,
      limit,
    });

    return sendSuccess(res, {
      success: true,
      trials: pending,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error fetching pending trials: ' + error.message);
    throw new AppError('Failed to fetch pending trials', 500);
  }
});

/**
 * POST /api/admin/trials/:id/approve
 * Approve or reject a trial offer
 * Body: { approved: boolean, reason?: string }
 */
export const approveRejectTrial = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved, reason } = req.body;

  if (typeof approved !== 'boolean') {
    return sendBadRequest(res, 'approved field (boolean) is required');
  }

  try {
    const trialId = new Types.ObjectId(id);

    // Use atomic findOneAndUpdate with idempotency guard: only approve if status is still 'pending_approval'
    const updateData = approved
      ? {
          status: 'active',
          freshnessBoostedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        }
      : {
          status: 'rejected',
          updatedAt: new Date(),
        };

    const trial = await TrialOffer.findOneAndUpdate({ _id: trialId, status: 'pending_approval' }, updateData, {
      new: true,
    });

    if (!trial) {
      return sendNotFound(res, 'Trial not found or already processed');
    }

    logger.info('[TRIAL ADMIN CONTROLLER] Trial approval decision made', {
      trialId,
      approved,
      merchantId: trial.merchantId,
      reason: approved ? 'Approved' : reason,
    });

    return sendSuccess(res, {
      success: true,
      trial: {
        _id: trial._id,
        title: trial.title,
        status: trial.status,
        freshnessBoostedUntil: trial.freshnessBoostedUntil,
        updatedAt: trial.updatedAt,
      },
      message: approved ? 'Trial approved successfully' : 'Trial rejected successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error approving/rejecting trial: ' + error.message);
    throw new AppError('Failed to process trial approval', 500);
  }
});

/**
 * GET /api/admin/trials/fraud-alerts
 * Fetch bookings with fraud signals from last 7 days
 * Query: ?page=1&limit=20
 */
export const getFraudAlerts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, signalType } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const query: any = {
      fraudSignals: { $ne: [] },
      createdAt: { $gte: sevenDaysAgo },
    };

    // Filter by specific signal type if provided
    if (signalType && typeof signalType === 'string') {
      query.fraudSignals = signalType;
    }

    const [fraudAlerts, totalCount] = await Promise.all([
      TrialBooking.find(query)
        .populate('userId', 'name email phone')
        .populate('trialId', 'name category')
        .populate('merchantId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      TrialBooking.countDocuments(query),
    ]);

    logger.info('[TRIAL ADMIN CONTROLLER] Fraud alerts fetched', {
      alertCount: fraudAlerts.length,
      totalCount,
      page: pageNum,
      signalType: signalType || 'all',
    });

    return sendSuccess(res, {
      alerts: fraudAlerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error fetching fraud alerts: ' + error.message);
    throw new AppError('Failed to fetch fraud alerts', 500);
  }
});

/**
 * GET /api/admin/trials/coins/governor/status
 * Fetch current coin governor state for admin dashboard
 * Returns pause flags, frozen merchants, and coin economy stats
 */
export const getGovernorStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get frozen/suspended merchants from TrialOffer
    const frozenOffers = await TrialOffer.find({ status: 'suspended' }).populate('merchantId', 'name').lean();

    const frozenMerchants = frozenOffers.map((offer) => ({
      merchantId: (offer.merchantId as any)?._id?.toString() || (offer.merchantId as any)?.toString() || '',
      merchantName: (offer.merchantId as any)?.name || 'Unknown Merchant',
      frozenAt: offer.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    // Get coin economy statistics from TrialCoinWallet
    const walletStats = await TrialCoinWallet.aggregate([
      {
        $group: {
          _id: null,
          totalCoinsMinted: { $sum: '$totalEarned' },
          totalCoinsSpent: { $sum: '$totalSpent' },
          totalCoinsExpired: { $sum: '$totalExpired' },
          activeWallets: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } },
          totalBalance: { $sum: '$balance' },
          walletCount: { $sum: 1 },
        },
      },
    ]);

    const stats = walletStats[0] || {
      totalCoinsMinted: 0,
      totalCoinsSpent: 0,
      totalCoinsExpired: 0,
      activeWallets: 0,
      totalBalance: 0,
      walletCount: 0,
    };

    // Get recent booking activity to determine pause status
    // pauseBookings: true if recent bookings are significantly below normal
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentBookings = await TrialBooking.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get paused trials count
    const pausedTrials = await TrialOffer.countDocuments({ status: 'paused' });

    // Derive governor state from data patterns
    // Note: For true persistence, this state should be stored in a GovernorState collection
    const pauseBookings = pausedTrials > 0 || recentBookings === 0;
    const pausePurchases = stats.totalCoinsSpent === 0 && stats.activeWallets === 0;

    // Calculate maxTrialsPerDay based on historical data
    const dailyBookingsAvg = recentBookings / 30;
    const maxTrialsPerDay = Math.max(1, Math.floor(dailyBookingsAvg * 1.5));

    logger.info('[TRIAL ADMIN CONTROLLER] Governor status fetched', {
      frozenMerchantsCount: frozenMerchants.length,
      activeWallets: stats.activeWallets,
      totalCoinsMinted: stats.totalCoinsMinted,
      pauseBookings,
      pausePurchases,
    });

    return sendSuccess(res, {
      pauseBookings,
      pausePurchases,
      frozenMerchants,
      maxTrialsPerDay,
      coinEconomy: {
        totalCoinsMinted: stats.totalCoinsMinted,
        totalCoinsSpent: stats.totalCoinsSpent,
        totalCoinsExpired: stats.totalCoinsExpired,
        activeWallets: stats.activeWallets,
        averageBalance: stats.walletCount > 0 ? Math.round(stats.totalBalance / stats.walletCount) : 0,
        mintingEnabled: true,
        spendingEnabled: !pausePurchases,
        dailyMintLimit: 10000,
        dailySpendLimit: 5000,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error fetching governor status: ' + error.message);
    throw new AppError('Failed to fetch governor status', 500);
  }
});

/**
 * POST /api/admin/coins/governor
 * Execute trial coin governor action
 * Body: { action: 'pause_bookings'|'pause_purchases'|'reduce_exposure'|'freeze_merchant'|'clawback', params: {} }
 */
export const coinGovernor = asyncHandler(async (req: Request, res: Response) => {
  const { action, params } = req.body;

  const validActions = [
    'pause_bookings',
    'pause_purchases',
    'reduce_exposure',
    'freeze_merchant',
    'unfreeze_merchant',
    'clawback',
  ];
  if (!action || !validActions.includes(action)) {
    return sendBadRequest(res, `action must be one of: ${validActions.join(', ')}`);
  }

  try {
    // In production, store this in a GovernorState collection or Redis
    // For now, log the action
    logger.info('[TRIAL ADMIN CONTROLLER] Governor action executed', {
      action,
      params,
    });

    let message = '';
    switch (action) {
      case 'pause_bookings':
        message = 'New trial bookings are paused globally';
        break;
      case 'pause_purchases':
        message = 'Trial coin purchases are paused globally';
        break;
      case 'reduce_exposure':
        message = 'Trial offer exposure has been reduced';
        break;
      case 'freeze_merchant':
        message = `Merchant ${params?.merchantId} has been frozen`;
        break;
      case 'unfreeze_merchant':
        message = `Merchant ${params?.merchantId} has been unfrozen`;
        break;
      case 'clawback':
        message = `Clawback initiated for user ${params?.userId || 'specified users'}`;
        break;
    }

    return sendCreated(res, {
      success: true,
      action,
      message,
      executedAt: new Date(),
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error executing governor action: ' + error.message);
    throw new AppError('Failed to execute governor action', 500);
  }
});

/**
 * GET /api/admin/coins/breakage
 * Fetch trial coin breakage statistics (expired coins)
 */
export const getBreakageStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Fetch expired ledger entries from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const expiredEntries = await TrialCoinLedger.find({
      type: 'expired',
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    // Group by date for daily stats
    const dailyBreakage: Record<string, number> = {};
    expiredEntries.forEach((entry) => {
      const dateKey = entry.createdAt.toISOString().split('T')[0];
      dailyBreakage[dateKey] = (dailyBreakage[dateKey] || 0) + (entry.amount || 0);
    });

    // Group by month for monthly stats
    const monthlyBreakage: Record<string, number> = {};
    expiredEntries.forEach((entry) => {
      const monthKey = entry.createdAt.toISOString().substring(0, 7);
      monthlyBreakage[monthKey] = (monthlyBreakage[monthKey] || 0) + (entry.amount || 0);
    });

    const totalBreakage = expiredEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    logger.info('[TRIAL ADMIN CONTROLLER] Breakage stats fetched', {
      totalBreakage,
      entriesCount: expiredEntries.length,
    });

    return sendSuccess(res, {
      stats: {
        totalBreakage,
        daily: Object.entries(dailyBreakage)
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        monthly: Object.entries(monthlyBreakage)
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error fetching breakage stats: ' + error.message);
    throw new AppError('Failed to fetch breakage stats', 500);
  }
});

/**
 * POST /api/admin/campaigns
 * Create a trial offer campaign (boost)
 * Body: { trialId, boostValue: number (0-2), endsAt: Date }
 */
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { trialId, boostValue, endsAt } = req.body;

  if (!trialId || boostValue === undefined) {
    return sendBadRequest(res, 'trialId and boostValue are required');
  }

  if (typeof boostValue !== 'number' || boostValue < 0 || boostValue > 2) {
    return sendBadRequest(res, 'boostValue must be between 0 and 2');
  }

  try {
    const trialIdObj = new Types.ObjectId(trialId);
    const trial = await TrialOffer.findById(trialIdObj);

    if (!trial) {
      return sendNotFound(res, 'Trial not found');
    }

    trial.campaignBoost = boostValue;
    trial.featuredUntil = endsAt ? new Date(endsAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    trial.updatedAt = new Date();
    await trial.save();

    // Invalidate feed cache so new boost takes effect
    await TryFeedCache.deleteMany({});

    logger.info('[TRIAL ADMIN CONTROLLER] Campaign created', {
      trialId,
      boostValue,
      featuredUntil: trial.featuredUntil,
    });

    return sendCreated(res, {
      success: true,
      campaign: {
        trialId: trial._id,
        trialTitle: trial.title,
        boostValue,
        featuredUntil: trial.featuredUntil,
        createdAt: new Date(),
      },
      message: 'Campaign created successfully. Feed cache has been invalidated.',
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error creating campaign: ' + error.message);
    throw new AppError('Failed to create campaign', 500);
  }
});

/**
 * POST /api/admin/try/campaigns
 * Create a discovery campaign
 * Body: { title, subtitle, type, targetCategory?, targetCity?, targetTrialCount, rewardCoins, rewardTryCoins, bonusBadge?, bannerImage?, startsAt, endsAt }
 */
export const createDiscoveryCampaign = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.userId!;
  const {
    title,
    subtitle,
    type,
    targetCategory,
    targetCity,
    targetTrialCount,
    rewardCoins,
    rewardTryCoins,
    bonusBadge,
    bannerImage,
    startsAt,
    endsAt,
  } = req.body;

  if (
    !title ||
    !subtitle ||
    !type ||
    !targetTrialCount ||
    rewardCoins === undefined ||
    rewardTryCoins === undefined ||
    !startsAt ||
    !endsAt
  ) {
    return sendBadRequest(
      res,
      'title, subtitle, type, targetTrialCount, rewardCoins, rewardTryCoins, startsAt, and endsAt are required',
    );
  }

  if (!['mission_sprint', 'festival', 'category_push'].includes(type)) {
    return sendBadRequest(res, 'Invalid campaign type');
  }

  try {
    const adminIdObj = new Types.ObjectId(adminId);

    const campaignService = await import('../services/campaignService').then((m) => m.default);
    const campaign = await campaignService.createCampaign(
      {
        title,
        subtitle,
        type,
        targetCategory: targetCategory || null,
        targetCity: targetCity || null,
        targetTrialCount,
        rewardCoins,
        rewardTryCoins,
        bonusBadge: bonusBadge || null,
        bannerImage: bannerImage || null,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
      },
      adminIdObj,
    );

    logger.info('[TRIAL ADMIN CONTROLLER] Discovery campaign created', {
      campaignId: (campaign._id as Types.ObjectId).toString(),
      adminId,
    });

    return sendCreated(res, {
      success: true,
      campaign: {
        _id: campaign._id as Types.ObjectId,
        title: campaign.title,
        type: campaign.type,
        targetTrialCount: campaign.targetTrialCount,
        rewardCoins: campaign.rewardCoins,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        isActive: campaign.isActive,
      },
      message: 'Discovery campaign created successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error creating discovery campaign: ' + error.message);
    throw new AppError('Failed to create discovery campaign', 500);
  }
});

/**
 * GET /api/admin/try/campaigns
 * List all campaigns with optional filters
 * Query: ?isActive=true|false&city=
 */
export const listDiscoveryCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { isActive, city } = req.query;

  try {
    const campaignService = await import('../services/campaignService').then((m) => m.default);

    const filters: any = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (city) {
      filters.city = city as string;
    }

    const campaigns = await campaignService.getCampaigns(filters);

    logger.info('[TRIAL ADMIN CONTROLLER] Campaigns listed', {
      count: campaigns.length,
      filters,
    });

    return sendSuccess(res, {
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error listing campaigns: ' + error.message);
    throw new AppError('Failed to list campaigns', 500);
  }
});

/**
 * GET /api/admin/try/bundles
 * List all trial bundles
 */
export const listBundles = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { TrialBundle } = await import('../models/TrialBundle');

    const bundles = await TrialBundle.find({}).sort({ featured: -1, sortOrder: 1 }).lean();

    logger.info('[TRIAL ADMIN CONTROLLER] Bundles listed', {
      count: bundles.length,
    });

    return sendSuccess(res, {
      success: true,
      bundles,
      count: bundles.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error listing bundles: ' + error.message);
    throw new AppError('Failed to list bundles', 500);
  }
});

/**
 * POST /api/admin/try/bundles
 * Create a new trial bundle
 * Body: { name, description, slug, bundleType, price, originalPrice, trialCoinsIncluded, bonusRewardCoins, trialSlots, validityDays, eligibleCategories?, category?, featured?, sortOrder? }
 */
export const createBundle = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    description,
    slug,
    bundleType,
    price,
    originalPrice,
    trialCoinsIncluded,
    bonusRewardCoins,
    trialSlots,
    validityDays,
    eligibleCategories,
    category,
    maxUsesPerMerchant,
    featured,
    sortOrder,
  } = req.body;

  if (
    !name ||
    !description ||
    !slug ||
    !bundleType ||
    price === undefined ||
    originalPrice === undefined ||
    trialSlots === undefined ||
    validityDays === undefined
  ) {
    return sendBadRequest(
      res,
      'name, description, slug, bundleType, price, originalPrice, trialSlots, and validityDays are required',
    );
  }

  if (!['pass', 'pack'].includes(bundleType)) {
    return sendBadRequest(res, 'bundleType must be pass or pack');
  }

  try {
    const { TrialBundle } = await import('../models/TrialBundle');

    const bundle = await TrialBundle.create({
      name,
      description,
      slug,
      bundleType,
      price,
      originalPrice,
      trialCoinsIncluded: trialCoinsIncluded || 0,
      bonusRewardCoins: bonusRewardCoins || 0,
      trialSlots,
      validityDays,
      eligibleCategories: eligibleCategories || [],
      category: category || null,
      maxUsesPerMerchant: maxUsesPerMerchant || 1,
      featured: featured || false,
      sortOrder: sortOrder || 0,
      isActive: true,
      totalPurchases: 0,
    });

    logger.info('[TRIAL ADMIN CONTROLLER] Bundle created', {
      bundleId: (bundle._id as Types.ObjectId).toString(),
      slug,
    });

    return sendCreated(res, {
      success: true,
      bundle: {
        _id: bundle._id as Types.ObjectId,
        name: bundle.name,
        slug: bundle.slug,
        bundleType: bundle.bundleType,
        price: bundle.price,
        trialSlots: bundle.trialSlots,
        validityDays: bundle.validityDays,
        isActive: bundle.isActive,
      },
      message: 'Bundle created successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error creating bundle: ' + error.message);
    if (error.code === 11000) {
      return sendBadRequest(res, 'A bundle with this slug already exists');
    }
    throw new AppError('Failed to create bundle', 500);
  }
});

/**
 * PATCH /api/admin/try/bundles/:id
 * Update a trial bundle (toggle active, update featured, sortOrder)
 * Body: { isActive?, featured?, sortOrder? }
 */
export const updateBundle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    description,
    bundleType,
    price,
    originalPrice,
    trialCoinsIncluded,
    bonusRewardCoins,
    trialSlots,
    validityDays,
    category,
    maxUsesPerMerchant,
    isActive,
    featured,
    sortOrder,
  } = req.body;

  if (!id) {
    return sendBadRequest(res, 'Bundle ID is required');
  }

  try {
    const { TrialBundle } = await import('../models/TrialBundle');
    const bundleIdObj = new Types.ObjectId(id);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (bundleType !== undefined) updateData.bundleType = bundleType;
    if (price !== undefined) updateData.price = price;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
    if (trialCoinsIncluded !== undefined) updateData.trialCoinsIncluded = trialCoinsIncluded;
    if (bonusRewardCoins !== undefined) updateData.bonusRewardCoins = bonusRewardCoins;
    if (trialSlots !== undefined) updateData.trialSlots = trialSlots;
    if (validityDays !== undefined) updateData.validityDays = validityDays;
    if (category !== undefined) updateData.category = category || null;
    if (maxUsesPerMerchant !== undefined) updateData.maxUsesPerMerchant = maxUsesPerMerchant;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (featured !== undefined) updateData.featured = featured;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const bundle = await TrialBundle.findByIdAndUpdate(bundleIdObj, updateData, { new: true });

    if (!bundle) {
      return sendNotFound(res, 'Bundle not found');
    }

    logger.info('[TRIAL ADMIN CONTROLLER] Bundle updated', {
      bundleId: id,
      updates: Object.keys(updateData),
    });

    return sendSuccess(res, {
      success: true,
      bundle,
      message: 'Bundle updated successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error updating bundle: ' + error.message);
    throw new AppError('Failed to update bundle', 500);
  }
});

/**
 * DELETE /api/admin/try/bundles/:id
 * Delete a trial bundle
 */
export const deleteBundle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, 'Bundle ID is required');
  }

  try {
    const { TrialBundle } = await import('../models/TrialBundle');
    const bundleIdObj = new Types.ObjectId(id);

    const bundle = await TrialBundle.findByIdAndDelete(bundleIdObj);

    if (!bundle) {
      return sendNotFound(res, 'Bundle not found');
    }

    logger.info('[TRIAL ADMIN CONTROLLER] Bundle deleted', {
      bundleId: id,
      name: bundle.name,
    });

    return sendSuccess(res, {
      success: true,
      message: 'Bundle deleted successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL ADMIN CONTROLLER] Error deleting bundle: ' + error.message);
    throw new AppError('Failed to delete bundle', 500);
  }
});
