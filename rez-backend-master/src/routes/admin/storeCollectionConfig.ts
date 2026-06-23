import { logger } from '../../config/logger';
/**
 * Admin API for Store Collection Configuration
 * Controls which delivery categories appear on the Store Categories page,
 * their display order, and UI metadata.
 */

import { Router, Request, Response } from 'express';
import StoreCollectionConfig from '../../models/StoreCollectionConfig';
import { requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin auth
router.use(requireAdmin);

// Default category configurations for seeding (maps from hardcoded storeController categories)
const DEFAULT_CATEGORIES = [
  { categoryKey: 'fastDelivery', displayName: '30 min delivery', description: 'Fast food delivery in 30 minutes or less', icon: '🚀', color: '#7B61FF', sortOrder: 1 },
  { categoryKey: 'budgetFriendly', displayName: '1 rupees store', description: 'Ultra-budget items starting from 1 rupee', icon: '💰', color: '#6E56CF', sortOrder: 2 },
  { categoryKey: 'premium', displayName: 'Luxury store', description: 'Premium brands and luxury products', icon: '👑', color: '#A78BFA', sortOrder: 3 },
  { categoryKey: 'organic', displayName: 'Organic Store', description: '100% organic and natural products', icon: '🌱', color: '#34D399', sortOrder: 4 },
  { categoryKey: 'alliance', displayName: 'Alliance Store', description: 'Trusted neighborhood supermarkets', icon: '🤝', color: '#9F7AEA', sortOrder: 5 },
  { categoryKey: 'lowestPrice', displayName: 'Lowest Price', description: 'Guaranteed lowest prices with price match', icon: '💸', color: '#22D3EE', sortOrder: 6 },
  { categoryKey: 'mall', displayName: 'Rez Mall', description: 'One-stop shopping destination', icon: '🏬', color: '#60A5FA', sortOrder: 7 },
  { categoryKey: 'cashStore', displayName: 'Cash Store', description: 'Cash-only transactions with exclusive discounts', icon: '💵', color: '#8B5CF6', sortOrder: 8 },
] as const;

/**
 * GET /api/admin/store-collections
 * List all store collection configurations, sorted by sortOrder
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const configs = await StoreCollectionConfig.find()
      .sort({ sortOrder: 1 })
      .lean();

    sendSuccess(res, configs, 'Store collection configs retrieved');
  }));

/**
 * PUT /api/admin/store-collections/:categoryKey
 * Update a store collection config
 */
router.put('/:categoryKey', asyncHandler(async (req: Request, res: Response) => {
    const { categoryKey } = req.params;
    const {
      isEnabled, sortOrder, displayName, description,
      icon, color, badgeText, imageUrl, regions, tags
    } = req.body;
    const adminId = (req as any).user?._id;

    const update: any = { updatedBy: adminId };
    if (typeof isEnabled === 'boolean') update.isEnabled = isEnabled;
    if (typeof sortOrder === 'number') update.sortOrder = sortOrder;
    if (typeof displayName === 'string') update.displayName = displayName;
    if (typeof description === 'string') update.description = description;
    if (typeof icon === 'string') update.icon = icon;
    if (typeof color === 'string') update.color = color;
    if (typeof badgeText === 'string') update.badgeText = badgeText;
    if (typeof imageUrl === 'string') update.imageUrl = imageUrl;
    if (Array.isArray(regions)) update.regions = regions;
    if (Array.isArray(tags)) update.tags = tags;

    const config = await StoreCollectionConfig.findOneAndUpdate(
      { categoryKey },
      { $set: update },
      { new: true }
    );

    if (!config) {
      return sendError(res, 'Store collection config not found', 404);
    }

    sendSuccess(res, config, 'Store collection config updated');
  }));

/**
 * POST /api/admin/store-collections/seed
 * Seed default configurations from the hardcoded categories
 */
router.post('/seed', asyncHandler(async (req: Request, res: Response) => {
    const results = [];

    for (const category of DEFAULT_CATEGORIES) {
      const existing = await StoreCollectionConfig.findOne({ categoryKey: category.categoryKey });
      if (!existing) {
        await StoreCollectionConfig.create({
          ...category,
          isEnabled: true,
          regions: [],
          tags: [],
          badgeText: '',
          imageUrl: '',
        });
        results.push({ categoryKey: category.categoryKey, action: 'created' });
      } else {
        results.push({ categoryKey: category.categoryKey, action: 'exists' });
      }
    }

    sendSuccess(res, results, 'Store collection configs seeded');
  }));

/**
 * POST /api/admin/store-collections/reorder
 * Bulk reorder categories: [{ categoryKey, sortOrder }]
 */
router.post('/reorder', asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return sendError(res, 'items array is required', 400);
    }

    const adminId = (req as any).user?._id;
    const results = [];

    for (const item of items) {
      if (item.categoryKey && typeof item.sortOrder === 'number') {
        await StoreCollectionConfig.findOneAndUpdate(
          { categoryKey: item.categoryKey },
          { $set: { sortOrder: item.sortOrder, updatedBy: adminId } }
        );
        results.push({ categoryKey: item.categoryKey, sortOrder: item.sortOrder });
      }
    }

    sendSuccess(res, results, 'Store collections reordered');
  }));

export default router;
