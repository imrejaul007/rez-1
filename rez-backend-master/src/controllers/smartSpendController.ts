import { logger } from '../config/logger';
/**
 * Smart Spend Controller
 *
 * User-facing endpoints for the Privé Smart Spend marketplace.
 * Serves admin-curated stores and products with enhanced coin earning.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import SmartSpendItem from '../models/SmartSpendItem';
import { reputationService } from '../services/reputationService';
import { asyncHandler } from '../utils/asyncHandler';

const TIER_HIERARCHY: Record<string, number> = {
  none: 0,
  entry: 1,
  signature: 2,
  elite: 3,
};

/**
 * GET /api/prive/smart-spend
 * Paginated Smart Spend catalog with section filtering and tier-based access
 */
export const getSmartSpendCatalog = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const { section, itemType } = req.query;

    // Get user's Privé tier
    const eligibility = await reputationService.checkPriveEligibility(userId);
    const userTier = eligibility?.tier || 'none';

    // Build query
    const now = new Date();
    const query: any = {
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    };

    // Tier-based access
    const userTierLevel = TIER_HIERARCHY[userTier] ?? 0;
    const accessibleTiers = Object.keys(TIER_HIERARCHY).filter(
      (t) => TIER_HIERARCHY[t] <= userTierLevel
    );
    query.tierRequired = { $in: accessibleTiers };

    if (section && section !== 'All') {
      query.sectionLabel = section;
    }
    if (itemType && ['store', 'product'].includes(itemType as string)) {
      query.itemType = itemType;
    }

    const [items, total] = await Promise.all([
      SmartSpendItem.find(query)
        .populate('store', 'name slug logo rating location tags deliveryCategories isVerified')
        .populate({
          path: 'product',
          select: 'name images pricing store cashback status',
          populate: { path: 'store', select: 'name slug logo' },
        })
        .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SmartSpendItem.countDocuments(query),
    ]);

    // Get distinct sections for tab navigation
    const sectionsAgg = await SmartSpendItem.aggregate([
      {
        $match: {
          isActive: true,
          tierRequired: { $in: accessibleTiers },
        },
      },
      {
        $group: {
          _id: '$sectionLabel',
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
    ]);

    const sections = sectionsAgg.map((s) => ({
      label: String(s._id),
      count: s.count as number,
    }));

    return res.status(200).json({
      success: true,
      data: {
        items,
        sections,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
});

/**
 * GET /api/prive/smart-spend/:id
 * Single Smart Spend item detail with populated store/product
 */
export const getSmartSpendItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    // Atomically increment views and fetch
    const item = await SmartSpendItem.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('store', 'name slug logo rating location tags deliveryCategories isVerified description')
      .populate({
        path: 'product',
        select: 'name images pricing store cashback status description',
        populate: { path: 'store', select: 'name slug logo' },
      })
      .lean();

    if (!item) {
      return res.status(404).json({ success: false, error: 'Smart Spend item not found' });
    }

    if (!item.isActive) {
      return res.status(404).json({ success: false, error: 'Smart Spend item is not available' });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
});

/**
 * POST /api/prive/smart-spend/:id/click
 * Track click analytics (fire-and-forget from frontend)
 */
export const trackSmartSpendClick = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }

    // Fire-and-forget increment
    SmartSpendItem.findByIdAndUpdate(id, { $inc: { clicks: 1 } }).exec();

    return res.status(200).json({ success: true });
});
