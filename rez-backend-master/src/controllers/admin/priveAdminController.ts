/**
 * Privé Admin Controller
 *
 * Admin handlers for managing Privé offers, vouchers, user reputation, and analytics.
 */

import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';
import PriveOffer from '../../models/PriveOffer';
import PriveVoucher, { calculateVoucherValue, getDefaultExpiry, VoucherType } from '../../models/PriveVoucher';
import { UserReputation, PILLAR_WEIGHTS, ELIGIBILITY_THRESHOLDS } from '../../models/UserReputation';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { reputationService } from '../../services/reputationService';

// ─── Offers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/offers
 * Paginated offers with analytics (views, clicks, redemptions)
 */
export const getOffers = asyncHandler(async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Filters
    if (req.query.status === 'active') {
      filter.isActive = true;
    } else if (req.query.status === 'inactive') {
      filter.isActive = false;
    }
    if (req.query.tier) {
      filter.tierRequired = req.query.tier;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.search) {
      const escaped = escapeRegex(String(req.query.search).substring(0, 200));
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { 'brand.name': { $regex: escaped, $options: 'i' } },
      ];
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    const [offers, total] = await Promise.all([
      PriveOffer.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PriveOffer.countDocuments(filter),
    ]);

    // Enrich with CTR (click-through rate)
    const enrichedOffers = offers.map((offer) => ({
      ...offer,
      ctr: offer.views > 0
        ? Math.round((offer.clicks / offer.views) * 10000) / 100
        : 0,
      redemptionRate: offer.totalLimit && offer.totalLimit > 0
        ? Math.round((offer.redemptions / offer.totalLimit) * 10000) / 100
        : null,
    }));

    return sendSuccess(res, {
      offers: enrichedOffers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Privé offers fetched');
  } catch (error) {
    logger.error('[Admin Privé] Error fetching offers:', error);
    return sendError(res, 'Failed to fetch Privé offers', 500);
  }
});

/**
 * POST /api/admin/prive/offers
 * Create a new Privé offer
 */
export const createOffer = asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      description,
      brand,
      type,
      reward,
      tierRequired,
      startsAt,
      expiresAt,
    } = req.body;

    // Validate required fields
    if (!title || !subtitle || !description || !brand?.name || !reward?.value || !reward?.displayText || !startsAt || !expiresAt) {
      return sendError(res, 'Missing required fields: title, subtitle, description, brand.name, reward.value, reward.displayText, startsAt, expiresAt', 400);
    }

    // SECURITY: explicit allowlist — never spread req.body. Without this, an
    // admin could set internal fields like createdBy, _id, isInternal, etc.
    const ALLOWED = [
      'title', 'subtitle', 'description', 'image', 'brand',
      'category', 'reward', 'termsAndConditions', 'startsAt', 'expiresAt',
      'maxRedemptions', 'eligibleUserIds', 'eligibleTiers', 'isActive',
      'regions', 'priority',
    ];
    const sanitized: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const offer = await PriveOffer.create({
      ...sanitized,
      startsAt: new Date(startsAt),
      expiresAt: new Date(expiresAt),
    });

    return sendSuccess(res, offer, 'Privé offer created', 201);
  } catch (error: any) {
    logger.error('[Admin Privé] Error creating offer:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to create Privé offer', 500);
  }
});

/**
 * PUT /api/admin/prive/offers/:id
 * Update a Privé offer
 */
export const updateOffer = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid offer ID', 400);
    }

    // SECURITY: explicit allowlist (defense against mass-assignment via the
    // global admin guard — even if an admin token leaks, they cannot set
    // fields outside this list like _id, createdBy, isInternal).
    const ALLOWED = [
      'title', 'subtitle', 'description', 'image', 'brand',
      'category', 'reward', 'termsAndConditions', 'startsAt', 'expiresAt',
      'maxRedemptions', 'eligibleUserIds', 'eligibleTiers', 'isActive',
      'regions', 'priority',
    ];
    const updates: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.startsAt) updates.startsAt = new Date(updates.startsAt);
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);

    const offer = await PriveOffer.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!offer) {
      return sendError(res, 'Privé offer not found', 404);
    }

    return sendSuccess(res, offer, 'Privé offer updated');
  } catch (error: any) {
    logger.error('[Admin Privé] Error updating offer:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to update Privé offer', 500);
  }
});

/**
 * DELETE /api/admin/prive/offers/:id
 * Soft delete (set isActive=false)
 */
export const deleteOffer = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid offer ID', 400);
    }

    const offer = await PriveOffer.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!offer) {
      return sendError(res, 'Privé offer not found', 404);
    }

    return sendSuccess(res, offer, 'Privé offer deactivated');
  } catch (error) {
    logger.error('[Admin Privé] Error deleting offer:', error);
    return sendError(res, 'Failed to delete Privé offer', 500);
  }
});

/**
 * PATCH /api/admin/prive/offers/:id/status
 * Toggle offer active/inactive
 */
export const toggleOfferStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid offer ID', 400);
    }

    const offer = await PriveOffer.findById(req.params.id);
    if (!offer) {
      return sendError(res, 'Privé offer not found', 404);
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    return sendSuccess(res, offer, `Privé offer ${offer.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    logger.error('[Admin Privé] Error toggling offer status:', error);
    return sendError(res, 'Failed to toggle offer status', 500);
  }
});

// ─── Vouchers ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/vouchers
 * All vouchers with filters (status, userId, type, search)
 */
export const getVouchers = asyncHandler(async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.userId) {
      if (!Types.ObjectId.isValid(req.query.userId as string)) {
        return sendError(res, 'Invalid user ID', 400);
      }
      filter.userId = new Types.ObjectId(req.query.userId as string);
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.search) {
      const escaped = escapeRegex(String(req.query.search).substring(0, 200));
      filter.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { partnerName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [vouchers, total] = await Promise.all([
      PriveVoucher.find(filter)
        .populate('userId', 'fullName phoneNumber email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PriveVoucher.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      vouchers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Privé vouchers fetched');
  } catch (error) {
    logger.error('[Admin Privé] Error fetching vouchers:', error);
    return sendError(res, 'Failed to fetch Privé vouchers', 500);
  }
});

/**
 * PATCH /api/admin/prive/vouchers/:id/invalidate
 * Cancel/invalidate a voucher and refund coins to user wallet
 */
export const invalidateVoucher = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid voucher ID', 400);
    }

    const { reason } = req.body;
    const adminId = (req as any).userId || 'unknown';

    const voucher = await PriveVoucher.findById(req.params.id).lean();
    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    if (voucher.status !== 'active') {
      return sendError(res, `Cannot invalidate a voucher with status "${voucher.status}"`, 400);
    }

    // Use a transaction for atomicity: cancel voucher + refund coins
    const session = await mongoose.startSession();
    try {
      await session.startTransaction();

      voucher.status = 'cancelled';
      await voucher.save({ session });

      // Refund coins to user wallet
      await Wallet.findOneAndUpdate(
        { user: voucher.userId },
        {
          $inc: {
            'balance.available': voucher.coinAmount,
            'balance.total': voucher.coinAmount,
          },
        },
        { session }
      );

      // Create refund CoinTransaction record (audit trail)
      await CoinTransaction.create([{
        user: voucher.userId,
        type: 'earned',
        amount: voucher.coinAmount,
        source: 'admin',
        description: `Refund for invalidated voucher ${voucher.code}${reason ? ` — ${reason}` : ''}`,
        metadata: {
          voucherId: voucher._id,
          voucherCode: voucher.code,
          adminAction: 'voucher_invalidation',
          adminId,
          reason: reason || 'Admin invalidation',
        },
      }], { session });

      await session.commitTransaction();
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }

    return sendSuccess(res, {
      voucher,
      refunded: voucher.coinAmount,
    }, 'Voucher invalidated and coins refunded');
  } catch (error) {
    logger.error('[Admin Privé] Error invalidating voucher:', error);
    return sendError(res, 'Failed to invalidate voucher', 500);
  }
});

/**
 * PATCH /api/admin/prive/vouchers/:id/extend
 * Extend voucher expiry date
 */
export const extendVoucher = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid voucher ID', 400);
    }

    const { newExpiresAt, extendDays, reason } = req.body;
    const adminId = (req as any).userId || 'unknown';

    if (!newExpiresAt && !extendDays) {
      return sendError(res, 'Provide either newExpiresAt (date) or extendDays (number)', 400);
    }

    const voucher = await PriveVoucher.findById(req.params.id).lean();
    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    if (voucher.status === 'used' || voucher.status === 'cancelled') {
      return sendError(res, `Cannot extend a voucher with status "${voucher.status}"`, 400);
    }

    const previousExpiresAt = new Date(voucher.expiresAt);
    const previousStatus = voucher.status;

    if (newExpiresAt) {
      const newDate = new Date(newExpiresAt);
      if (isNaN(newDate.getTime())) {
        return sendError(res, 'Invalid date format for newExpiresAt', 400);
      }
      voucher.expiresAt = newDate;
    } else if (extendDays) {
      const days = parseInt(extendDays);
      if (isNaN(days) || days <= 0) {
        return sendError(res, 'extendDays must be a positive integer', 400);
      }
      const current = new Date(voucher.expiresAt);
      current.setDate(current.getDate() + days);
      voucher.expiresAt = current;
    }

    // If was expired, reactivate
    if (voucher.status === 'expired' && voucher.expiresAt > new Date()) {
      voucher.status = 'active';
    }

    await voucher.save();

    // 4D: Audit trail for voucher extension
    await CoinTransaction.create({
      user: voucher.userId,
      type: 'earned',
      amount: 0, // No coin movement
      source: 'admin',
      description: `Voucher ${voucher.code} expiry extended${reason ? ` — ${reason}` : ''}`,
      metadata: {
        voucherId: voucher._id,
        voucherCode: voucher.code,
        adminAction: 'voucher_extension',
        adminId,
        reason: reason || 'Admin extension',
        previousExpiresAt,
        newExpiresAt: voucher.expiresAt,
        previousStatus,
        newStatus: voucher.status,
      },
    });

    return sendSuccess(res, voucher, 'Voucher expiry extended');
  } catch (error) {
    logger.error('[Admin Privé] Error extending voucher:', error);
    return sendError(res, 'Failed to extend voucher', 500);
  }
});

/**
 * POST /api/admin/prive/vouchers
 * Admin-issued voucher (no coin deduction). For support resolution, promotions, etc.
 */
export const issueVoucher = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId, type, coinAmount, category, partnerName, partnerLogo, reason } = req.body;
    const adminId = (req as any).userId || 'unknown';

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Valid userId is required', 400);
    }
    if (!type || !['gift_card', 'bill_pay', 'experience', 'charity'].includes(type)) {
      return sendError(res, 'Valid type is required (gift_card, bill_pay, experience, charity)', 400);
    }
    if (!coinAmount || coinAmount < 1) {
      return sendError(res, 'coinAmount must be at least 1', 400);
    }
    if (!reason || reason.length < 5) {
      return sendError(res, 'A reason with at least 5 characters is required', 400);
    }

    const userObjectId = new Types.ObjectId(userId);
    const voucherCode = await PriveVoucher.generateUniqueCode();
    const voucherValue = calculateVoucherValue(coinAmount, type as VoucherType);
    const expiresAt = getDefaultExpiry(type as VoucherType);
    const currency = process.env.PLATFORM_CURRENCY || 'INR';

    const voucher = await PriveVoucher.create({
      userId: userObjectId,
      code: voucherCode,
      type,
      coinAmount,
      coinType: 'rez',
      value: voucherValue,
      currency,
      status: 'active',
      expiresAt,
      category,
      partnerName,
      partnerLogo,
      terms: ['Admin-issued voucher', 'Standard terms apply'],
      howToUse: 'Present this voucher code at checkout or enter it in the promo code field.',
    });

    // Audit trail — record admin issuance
    await CoinTransaction.create({
      user: userObjectId,
      type: 'earned',
      amount: 0, // No coins were deducted
      source: 'admin',
      description: `Admin-issued voucher: ${voucherCode} (${type})`,
      metadata: {
        voucherId: voucher._id,
        voucherCode,
        voucherType: type,
        voucherValue,
        adminAction: 'voucher_issuance',
        adminId,
        reason,
      },
    });

    return sendSuccess(res, voucher, 'Voucher issued successfully', 201);
  } catch (error: any) {
    logger.error('[Admin Privé] Error issuing voucher:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to issue voucher', 500);
  }
});

// ─── User Reputation ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/users/:userId/reputation
 * View a user's reputation details
 */
export const getUserReputation = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }

    const reputation = await UserReputation.findOne({
      userId: new Types.ObjectId(req.params.userId),
    }).lean();

    if (!reputation) {
      return sendError(res, 'User reputation not found', 404);
    }

    // Calculate weighted scores for display
    const weightedScores = {
      engagement: Math.round(reputation.pillars.engagement.score * PILLAR_WEIGHTS.engagement * 100) / 100,
      trust: Math.round(reputation.pillars.trust.score * PILLAR_WEIGHTS.trust * 100) / 100,
      influence: Math.round(reputation.pillars.influence.score * PILLAR_WEIGHTS.influence * 100) / 100,
      economicValue: Math.round(reputation.pillars.economicValue.score * PILLAR_WEIGHTS.economicValue * 100) / 100,
      brandAffinity: Math.round(reputation.pillars.brandAffinity.score * PILLAR_WEIGHTS.brandAffinity * 100) / 100,
      network: Math.round(reputation.pillars.network.score * PILLAR_WEIGHTS.network * 100) / 100,
    };

    return sendSuccess(res, {
      reputation,
      weightedScores,
      thresholds: ELIGIBILITY_THRESHOLDS,
      pillarWeights: PILLAR_WEIGHTS,
    }, 'User reputation fetched');
  } catch (error) {
    logger.error('[Admin Privé] Error fetching user reputation:', error);
    return sendError(res, 'Failed to fetch user reputation', 500);
  }
});

/**
 * PATCH /api/admin/prive/users/:userId/reputation
 * Override pillar scores with admin audit trail
 *
 * Body: { pillars: { engagement?: number, trust?: number, ... }, reason: string }
 */
export const overrideUserReputation = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }

    const { pillars, reason } = req.body;

    if (!pillars || typeof pillars !== 'object') {
      return sendError(res, 'pillars object is required with at least one pillar score', 400);
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return sendError(res, 'reason is required for admin override', 400);
    }
    if (reason.trim().length < 10) {
      return sendError(res, 'reason must be at least 10 characters', 400);
    }
    if (reason.trim().length > 500) {
      return sendError(res, 'reason must be at most 500 characters', 400);
    }

    const validPillars = ['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network'];
    const updates: Record<string, number> = {};

    for (const [key, value] of Object.entries(pillars)) {
      if (!validPillars.includes(key)) {
        return sendError(res, `Invalid pillar: ${key}. Valid pillars: ${validPillars.join(', ')}`, 400);
      }
      const score = Number(value);
      if (isNaN(score) || score < 0 || score > 100) {
        return sendError(res, `Pillar score for "${key}" must be between 0 and 100`, 400);
      }
      updates[key] = score;
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 'At least one pillar score must be provided', 400);
    }

    // Find or create reputation
    let reputation = await UserReputation.findOne({
      userId: new Types.ObjectId(req.params.userId),
    }) as any;

    if (!reputation) {
      reputation = new UserReputation({
        userId: new Types.ObjectId(req.params.userId),
      });
    }

    // Apply pillar overrides
    for (const [key, score] of Object.entries(updates)) {
      const pillarKey = key as keyof typeof reputation.pillars;
      reputation.pillars[pillarKey].score = score;
      reputation.pillars[pillarKey].lastCalculated = new Date();
    }

    // Recalculate total score (pre-save hook also does this, but we want the result)
    const result = reputation.calculateTotalScore();

    // Add snapshot with admin override trigger
    const adminId = req.userId || 'unknown';
    reputation.addSnapshot(`admin_override by ${adminId}: ${reason}`);

    await reputation.save();

    return sendSuccess(res, {
      reputation,
      appliedOverrides: updates,
      newTotalScore: result.totalScore,
      newTier: result.tier,
      newEligibility: result.isEligible,
    }, 'User reputation overridden');
  } catch (error) {
    logger.error('[Admin Privé] Error overriding reputation:', error);
    return sendError(res, 'Failed to override user reputation', 500);
  }
});

/**
 * POST /api/admin/prive/users/:userId/recalculate
 * Trigger a full reputation recalculation from real data
 */
export const recalculateUserReputation = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }

    const userId = new Types.ObjectId(req.params.userId);
    const adminId = req.userId || 'unknown';

    const reputation = await reputationService.recalculateReputation(
      userId,
      `admin_recalculation by ${adminId}`
    );

    return sendSuccess(res, {
      totalScore: reputation.totalScore,
      tier: reputation.tier,
      isEligible: reputation.isEligible,
      pillars: {
        engagement: reputation.pillars.engagement.score,
        trust: reputation.pillars.trust.score,
        influence: reputation.pillars.influence.score,
        economicValue: reputation.pillars.economicValue.score,
        brandAffinity: reputation.pillars.brandAffinity.score,
        network: reputation.pillars.network.score,
      },
      lastCalculated: reputation.lastCalculated,
    }, 'Reputation recalculated from data');
  } catch (error) {
    logger.error('[Admin Privé] Error recalculating reputation:', error);
    return sendError(res, 'Failed to recalculate reputation', 500);
  }
});

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/analytics
 * Offer CTR, redemption stats, tier distribution
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  try {
    // 1. Offer performance (CTR, views, clicks, redemptions)
    const offerStats = await PriveOffer.aggregate([
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          activeOffers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
          totalViews: { $sum: '$views' },
          totalClicks: { $sum: '$clicks' },
          totalRedemptions: { $sum: '$redemptions' },
        },
      },
    ]);

    const offerPerformance = offerStats[0] || {
      totalOffers: 0,
      activeOffers: 0,
      totalViews: 0,
      totalClicks: 0,
      totalRedemptions: 0,
    };
    offerPerformance.overallCTR = offerPerformance.totalViews > 0
      ? Math.round((offerPerformance.totalClicks / offerPerformance.totalViews) * 10000) / 100
      : 0;

    // 2. Offers by tier
    const offersByTier = await PriveOffer.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$tierRequired',
          count: { $sum: 1 },
          avgRedemptions: { $avg: '$redemptions' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Offers by type
    const offersByType = await PriveOffer.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalRedemptions: { $sum: '$redemptions' },
        },
      },
      { $sort: { totalRedemptions: -1 } },
    ]);

    // 4. Top performing offers (by CTR)
    const topOffers = await PriveOffer.find({ isActive: true, views: { $gt: 10 } })
      .sort({ clicks: -1 })
      .limit(10)
      .select('title brand.name type tierRequired views clicks redemptions')
      .lean();

    const topOffersWithCTR = topOffers.map((o) => ({
      ...o,
      ctr: o.views > 0 ? Math.round((o.clicks / o.views) * 10000) / 100 : 0,
    }));

    // 5. Voucher stats
    const voucherStats = await PriveVoucher.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          totalCoinsSpent: { $sum: '$coinAmount' },
        },
      },
    ]);

    const voucherByStatus: Record<string, { count: number; totalValue: number; totalCoinsSpent: number }> = {};
    for (const stat of voucherStats) {
      voucherByStatus[stat._id] = {
        count: stat.count,
        totalValue: stat.totalValue,
        totalCoinsSpent: stat.totalCoinsSpent,
      };
    }

    // 6. Tier distribution from UserReputation
    const tierDistribution = await UserReputation.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          avgScore: { $avg: '$totalScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 7. Reputation score distribution (buckets)
    const scoreDistribution = await UserReputation.aggregate([
      {
        $bucket: {
          groupBy: '$totalScore',
          boundaries: [0, 20, 40, 60, 80, 100, 101],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$totalScore' },
          },
        },
      },
    ]);

    return sendSuccess(res, {
      offerPerformance,
      offersByTier,
      offersByType,
      topOffers: topOffersWithCTR,
      voucherByStatus,
      tierDistribution,
      scoreDistribution,
    }, 'Privé analytics fetched');
  } catch (error) {
    logger.error('[Admin Privé] Error fetching analytics:', error);
    return sendError(res, 'Failed to fetch Privé analytics', 500);
  }
});
