import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireOperator } from '../../middleware/auth';
import HomepageDealsSection from '../../models/HomepageDealsSection';
import HomepageDealsItem from '../../models/HomepageDealsItem';
import Joi from 'joi';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// SECURITY: require admin authentication AND at least operator role.
// Previously only `requireAuth` was applied, so any logged-in user could
// edit the home page shown to every customer. Use requireOperator (the
// minimum privilege) — promote to requireSeniorAdmin for stricter policy.
router.use(requireAuth);
router.use(requireOperator);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateConfigSchema = Joi.object({
  title: Joi.string().trim().max(100).optional(),
  subtitle: Joi.string().trim().max(200).optional().allow(''),
  icon: Joi.string().trim().optional(),
  isActive: Joi.boolean().optional(),
  regions: Joi.array().items(Joi.string().valid('bangalore', 'dubai', 'all')).optional(),
  tabs: Joi.object({
    offers: Joi.object({
      isEnabled: Joi.boolean(),
      displayName: Joi.string().trim().max(50),
      sortOrder: Joi.number().integer().min(0),
      maxItems: Joi.number().integer().min(1).max(20),
    }).optional(),
    cashback: Joi.object({
      isEnabled: Joi.boolean(),
      displayName: Joi.string().trim().max(50),
      sortOrder: Joi.number().integer().min(0),
      maxItems: Joi.number().integer().min(1).max(20),
    }).optional(),
    exclusive: Joi.object({
      isEnabled: Joi.boolean(),
      displayName: Joi.string().trim().max(50),
      sortOrder: Joi.number().integer().min(0),
      maxItems: Joi.number().integer().min(1).max(20),
    }).optional(),
  }).optional(),
});

const createItemSchema = Joi.object({
  tabType: Joi.string().valid('offers', 'cashback', 'exclusive').required(),
  itemType: Joi.string().valid('category', 'campaign', 'zone', 'custom').required(),
  title: Joi.string().trim().max(100).required(),
  subtitle: Joi.string().trim().max(200).optional().allow(''),
  icon: Joi.string().trim().required(),
  iconType: Joi.string().valid('emoji', 'ionicon', 'url').default('emoji'),
  gradientColors: Joi.array().items(Joi.string()).optional(),
  backgroundColor: Joi.string().trim().optional(),
  badgeText: Joi.string().trim().max(50).optional().allow(''),
  badgeBg: Joi.string().trim().optional(),
  badgeColor: Joi.string().trim().optional(),
  navigationPath: Joi.string().trim().required(),
  referenceType: Joi.string().valid('ExclusiveZone', 'DoubleCashbackCampaign', 'OfferCategory', 'Campaign').optional(),
  referenceId: Joi.string().optional(),
  showCount: Joi.boolean().default(true),
  countLabel: Joi.string().trim().default('offers'),
  cachedCount: Joi.number().integer().min(0).default(0),
  requiresVerification: Joi.boolean().default(false),
  verificationType: Joi.string().valid('student', 'corporate', 'defence', 'senior', 'birthday', 'women', 'none').optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).optional(),
  regions: Joi.array().items(Joi.string().valid('bangalore', 'dubai', 'all')).optional(),
});

const updateItemSchema = createItemSchema.fork(
  ['tabType', 'itemType', 'title', 'icon', 'navigationPath'],
  (schema) => schema.optional()
);

const listItemsQuerySchema = Joi.object({
  tabType: Joi.string().valid('offers', 'cashback', 'exclusive').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').default('all'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const reorderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      sortOrder: Joi.number().integer().min(0).required(),
    })
  ).min(1).required(),
});

// ============================================
// GET SECTION CONFIG
// ============================================

router.get('/config', asyncHandler(async (req: Request, res: Response) => {
    let config = await HomepageDealsSection.findOne({ sectionId: 'deals-that-save-money' });

    // Create default config if it doesn't exist
    if (!config) {
      config = await (HomepageDealsSection as any).getOrCreateDefault();
    }

    return res.json({
      success: true,
      data: config,
    });
}));

// ============================================
// UPDATE SECTION CONFIG
// ============================================

router.put('/config', asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = updateConfigSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let config = await HomepageDealsSection.findOne({ sectionId: 'deals-that-save-money' });

    if (!config) {
      config = await (HomepageDealsSection as any).getOrCreateDefault();
    }

    // Ensure config exists after getOrCreateDefault
    if (!config) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create or retrieve configuration',
      });
    }

    // Update fields
    if (value.title !== undefined) config.title = value.title;
    if (value.subtitle !== undefined) config.subtitle = value.subtitle;
    if (value.icon !== undefined) config.icon = value.icon;
    if (value.isActive !== undefined) config.isActive = value.isActive;
    if (value.regions !== undefined) config.regions = value.regions;

    // Update tab configs
    if (value.tabs) {
      if (value.tabs.offers) {
        config.tabs.offers = { ...config.tabs.offers, ...value.tabs.offers };
      }
      if (value.tabs.cashback) {
        config.tabs.cashback = { ...config.tabs.cashback, ...value.tabs.cashback };
      }
      if (value.tabs.exclusive) {
        config.tabs.exclusive = { ...config.tabs.exclusive, ...value.tabs.exclusive };
      }
    }

    // Set updatedBy if user info available
    if ((req as any).user?._id) {
      config.updatedBy = (req as any).user._id;
    }

    await config.save();

    logger.info(`[ADMIN HOMEPAGE DEALS] Config updated: ${config.title}`);

    return res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config,
    });
}));

// ============================================
// GET STATS
// ============================================

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await HomepageDealsItem.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
          byTab: [
            { $group: { _id: '$tabType', count: { $sum: 1 } } },
          ],
          totalImpressions: [
            { $group: { _id: null, total: { $sum: '$impressions' } } },
          ],
          totalClicks: [
            { $group: { _id: null, total: { $sum: '$clicks' } } },
          ],
        },
      },
    ]);

    const result = stats[0];
    const totalImpressions = result.totalImpressions[0]?.total || 0;
    const totalClicks = result.totalClicks[0]?.total || 0;
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    return res.json({
      success: true,
      data: {
        total: result.total[0]?.count || 0,
        active: result.active[0]?.count || 0,
        inactive: result.inactive[0]?.count || 0,
        byTab: result.byTab.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        totalImpressions,
        totalClicks,
        ctr: parseFloat(ctr),
      },
    });
}));

// ============================================
// LIST ITEMS
// ============================================

router.get('/items', asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = listItemsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { tabType, status, page, limit } = value;

    const query: any = {};

    if (tabType) {
      query.tabType = tabType;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const total = await HomepageDealsItem.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const items = await HomepageDealsItem.find(query)
      .sort({ tabType: 1, sortOrder: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
}));

// ============================================
// GET SINGLE ITEM
// ============================================

router.get('/items/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    const item = await HomepageDealsItem.findById(id).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    return res.json({
      success: true,
      data: item,
    });
}));

// ============================================
// CREATE ITEM
// ============================================

router.post('/items', asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = createItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Get max sortOrder for this tab if not provided
    if (value.sortOrder === undefined) {
      const maxSort = await HomepageDealsItem.findOne({ tabType: value.tabType })
        .sort({ sortOrder: -1 })
        .select('sortOrder');
      value.sortOrder = (maxSort?.sortOrder || 0) + 1;
    }

    const item = new HomepageDealsItem(value);
    await item.save();

    logger.info(`[ADMIN HOMEPAGE DEALS] Item created: ${item.title} (${item.tabType})`);

    return res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item,
    });
}));

// ============================================
// UPDATE ITEM
// ============================================

router.put('/items/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    const { error, value } = updateItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const item = await HomepageDealsItem.findByIdAndUpdate(
      id,
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    logger.info(`[ADMIN HOMEPAGE DEALS] Item updated: ${item.title}`);

    return res.json({
      success: true,
      message: 'Item updated successfully',
      data: item,
    });
}));

// ============================================
// DELETE ITEM
// ============================================

router.delete('/items/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    const item = await HomepageDealsItem.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    logger.info(`[ADMIN HOMEPAGE DEALS] Item deleted: ${item.title}`);

    return res.json({
      success: true,
      message: 'Item deleted successfully',
    });
}));

// ============================================
// TOGGLE ITEM VISIBILITY
// ============================================

router.patch('/items/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    const item = await HomepageDealsItem.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    item.isActive = !item.isActive;
    await item.save();

    logger.info(`[ADMIN HOMEPAGE DEALS] Item toggled: ${item.title} - isActive: ${item.isActive}`);

    return res.json({
      success: true,
      message: `Item ${item.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: item.isActive },
    });
}));

// ============================================
// REORDER ITEMS
// ============================================

router.patch('/items/reorder', asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = reorderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { items } = value;

    const bulkOps = items.map((item: { id: string; sortOrder: number }) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { sortOrder: item.sortOrder } },
      },
    }));

    await HomepageDealsItem.bulkWrite(bulkOps);

    logger.info(`[ADMIN HOMEPAGE DEALS] Reordered ${items.length} items`);

    return res.json({
      success: true,
      message: 'Items reordered successfully',
    });
}));

// ============================================
// MOVE ITEM UP
// ============================================

router.patch('/items/:id/move-up', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    const item = await HomepageDealsItem.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // Find the item above this one (lower sortOrder)
    const itemAbove = await HomepageDealsItem.findOne({
      tabType: item.tabType,
      sortOrder: { $lt: item.sortOrder },
    }).sort({ sortOrder: -1 });

    if (!itemAbove) {
      return res.status(400).json({
        success: false,
        message: 'Item is already at the top',
      });
    }

    // Swap sort orders
    const tempOrder = item.sortOrder;
    item.sortOrder = itemAbove.sortOrder;
    itemAbove.sortOrder = tempOrder;

    await Promise.all([item.save(), itemAbove.save()]);

    logger.info(`[ADMIN HOMEPAGE DEALS] Moved up: ${item.title}`);

    return res.json({
      success: true,
      message: 'Item moved up successfully',
    });
}));

// ============================================
// MOVE ITEM DOWN
// ============================================

router.patch('/items/:id/move-down', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    const item = await HomepageDealsItem.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // Find the item below this one (higher sortOrder)
    const itemBelow = await HomepageDealsItem.findOne({
      tabType: item.tabType,
      sortOrder: { $gt: item.sortOrder },
    }).sort({ sortOrder: 1 });

    if (!itemBelow) {
      return res.status(400).json({
        success: false,
        message: 'Item is already at the bottom',
      });
    }

    // Swap sort orders
    const tempOrder = item.sortOrder;
    item.sortOrder = itemBelow.sortOrder;
    itemBelow.sortOrder = tempOrder;

    await Promise.all([item.save(), itemBelow.save()]);

    logger.info(`[ADMIN HOMEPAGE DEALS] Moved down: ${item.title}`);

    return res.json({
      success: true,
      message: 'Item moved down successfully',
    });
}));

// ============================================
// UPDATE ITEM COUNT (for caching)
// ============================================

router.patch('/items/:id/update-count', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { count } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
    }

    if (typeof count !== 'number' || count < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid count value',
      });
    }

    const item = await HomepageDealsItem.findByIdAndUpdate(
      id,
      { $set: { cachedCount: count } },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    return res.json({
      success: true,
      message: 'Count updated successfully',
      data: { cachedCount: item.cachedCount },
    });
}));

export default router;
