import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import StoreExperience from '../../models/StoreExperience';
import { Store } from '../../models/Store';
import { Category } from '../../models/Category';
import Joi from 'joi';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createExperienceSchema = Joi.object({
  slug: Joi.string().trim().lowercase().required().pattern(/^[a-z0-9-]+$/),
  title: Joi.string().trim().max(100).required(),
  subtitle: Joi.string().trim().max(200).optional().allow(''),
  description: Joi.string().trim().max(500).optional().allow(''),
  icon: Joi.string().trim().required(),
  iconType: Joi.string().valid('emoji', 'url', 'icon-name').default('emoji'),
  type: Joi.string().valid(
    'fastDelivery', 'budgetFriendly', 'premium', 'organic',
    'oneRupee', 'ninetyNine', 'luxury', 'verified', 'partner', 'mall', 'custom'
  ).required(),
  badge: Joi.string().trim().optional().allow(''),
  badgeBg: Joi.string().trim().optional(),
  badgeColor: Joi.string().trim().optional(),
  backgroundColor: Joi.string().trim().optional(),
  gradientColors: Joi.array().items(Joi.string()).optional(),
  image: Joi.string().trim().uri().optional().allow(''),
  bannerImage: Joi.string().trim().uri().optional().allow(''),
  benefits: Joi.array().items(Joi.string().trim()).optional(),
  filterCriteria: Joi.object({
    tags: Joi.array().items(Joi.string().trim()).optional(),
    maxDeliveryTime: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    minRating: Joi.number().min(0).max(5).optional(),
    isPremium: Joi.boolean().optional(),
    isOrganic: Joi.boolean().optional(),
    isPartner: Joi.boolean().optional(),
    isMall: Joi.boolean().optional(),
    isFastDelivery: Joi.boolean().optional(),
    isBudgetFriendly: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    categories: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  regions: Joi.array().items(Joi.string().valid('bangalore', 'dubai')).optional(),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
});

const updateExperienceSchema = createExperienceSchema.fork(
  ['slug', 'title', 'icon', 'type'],
  (schema) => schema.optional()
);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive', 'all').default('all'),
  featured: Joi.string().valid('true', 'false').optional(),
  type: Joi.string().optional(),
  search: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
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
// GET EXPERIENCES STATS
// ============================================

/**
 * @route   GET /api/admin/experiences/stats
 * @desc    Get experience statistics for dashboard
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await StoreExperience.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        active: [{ $match: { isActive: true } }, { $count: 'count' }],
        inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
        featured: [{ $match: { isFeatured: true, isActive: true } }, { $count: 'count' }],
        byType: [
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const result = stats[0];

  return res.json({
    success: true,
    data: {
      total: result.total[0]?.count || 0,
      active: result.active[0]?.count || 0,
      inactive: result.inactive[0]?.count || 0,
      featured: result.featured[0]?.count || 0,
      byType: result.byType.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    },
  });
}));

// ============================================
// SEARCH STORES (for assigning to experience)
// Must be BEFORE /:id routes
// ============================================

/**
 * @route   GET /api/admin/experiences/stores/search
 * @desc    Search stores to assign to an experience
 * @access  Admin
 */
router.get('/stores/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, limit = 10 } = req.query;

  if (!q || (q as string).length < 2) {
    return res.json({
      success: true,
      data: { stores: [], total: 0 },
    });
  }

  // Escape special regex characters to prevent injection
  const escapedQuery = (q as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = new RegExp(escapedQuery, 'i');

  // Optimized: search only in name field for speed, with index hint
  const stores = await Store.find({
    isActive: true,
    name: searchRegex,
  })
    .select('_id name logo banner category city ratings offers')
    .populate('category', 'name')
    .sort({ 'ratings.average': -1 }) // Best rated first
    .limit(Math.min(Number(limit), 10)) // Cap at 10 for performance
    .lean();

  return res.json({
    success: true,
    data: {
      stores: stores.map((s: any) => ({
        _id: s._id,
        name: s.name,
        logo: s.logo || s.banner,
        category: s.category?.name || 'Other',
        city: s.city,
        rating: s.ratings?.average,
        cashback: s.offers?.cashback,
      })),
      total: stores.length,
    },
  });
}));

/**
 * @route   GET /api/admin/experiences/stores/suggested
 * @desc    Get suggested stores (popular/top-rated) for quick assignment
 * @access  Admin
 */
router.get('/stores/suggested', asyncHandler(async (req: Request, res: Response) => {
  // Get top-rated active stores for quick selection
  const stores = await Store.find({
    isActive: true,
    'ratings.average': { $gte: 3.5 }, // Only well-rated stores
  })
    .select('_id name logo banner category city ratings offers tags')
    .populate('category', 'name')
    .sort({ 'ratings.average': -1, 'ratings.count': -1 }) // Best rated first
    .limit(15)
    .lean();

  return res.json({
    success: true,
    data: {
      stores: stores.map((s: any) => ({
        _id: s._id,
        name: s.name,
        logo: s.logo || s.banner,
        category: s.category?.name || 'Other',
        city: s.city,
        rating: s.ratings?.average,
        cashback: s.offers?.cashback,
        tags: s.tags?.slice(0, 3),
      })),
      total: stores.length,
    },
  });
}));

// ============================================
// LIST EXPERIENCES
// ============================================

/**
 * @route   GET /api/admin/experiences
 * @desc    List all experiences with pagination
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = listQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { page, limit, status, featured, type, search, sortBy, sortOrder } = value;

  // Build query
  const query: any = {};

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  if (featured === 'true') {
    query.isFeatured = true;
  } else if (featured === 'false') {
    query.isFeatured = false;
  }

  if (type) {
    query.type = type;
  }

  if (search) {
    const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { subtitle: { $regex: escapedSearch, $options: 'i' } },
      { slug: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Get total count
  const total = await StoreExperience.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  // Get experiences
  const experiences = await StoreExperience.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return res.json({
    success: true,
    data: {
      experiences,
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
// GET CATEGORIES FOR FILTER BUILDER
// ============================================

/**
 * @route   GET /api/admin/experiences/categories/list
 * @desc    Get all categories for filter criteria builder
 * @access  Admin
 */
router.get('/categories/list', asyncHandler(async (req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true })
    .select('_id name slug icon')
    .sort({ name: 1 })
    .lean();

  return res.json({
    success: true,
    data: categories,
  });
}));

// ============================================
// GET COMMON TAGS FROM STORES
// ============================================

/**
 * @route   GET /api/admin/experiences/tags/list
 * @desc    Get common tags used by stores for filter criteria builder
 * @access  Admin
 */
router.get('/tags/list', asyncHandler(async (req: Request, res: Response) => {
  const tags = await Store.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
    { $sort: { count: -1 } },
    { $limit: 100 },
  ]);

  return res.json({
    success: true,
    data: tags.map(t => ({ tag: t._id, count: t.count })),
  });
}));

// ============================================
// PREVIEW MATCHING STORES
// ============================================

/**
 * @route   POST /api/admin/experiences/preview-stores
 * @desc    Preview which stores match the filter criteria
 * @access  Admin
 */
router.post('/preview-stores', asyncHandler(async (req: Request, res: Response) => {
  const { filterCriteria, limit = 10 } = req.body;

  const storeQuery: any = { isActive: true };

  if (filterCriteria) {
    if (filterCriteria.tags && filterCriteria.tags.length > 0) {
      storeQuery.tags = { $in: filterCriteria.tags };
    }
    if (filterCriteria.minRating && filterCriteria.minRating > 0) {
      storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
    }
    if (filterCriteria.isPremium === true) {
      storeQuery['deliveryCategories.premium'] = true;
    }
    if (filterCriteria.isOrganic === true) {
      storeQuery['deliveryCategories.organic'] = true;
    }
    if (filterCriteria.isMall === true) {
      storeQuery['deliveryCategories.mall'] = true;
    }
    if (filterCriteria.isPartner === true) {
      storeQuery['offers.isPartner'] = true;
    }
    if (filterCriteria.isFastDelivery === true) {
      storeQuery['deliveryCategories.fastDelivery'] = true;
    }
    if (filterCriteria.isBudgetFriendly === true) {
      storeQuery['deliveryCategories.budgetFriendly'] = true;
    }
    if (filterCriteria.categories && filterCriteria.categories.length > 0) {
      const categories = await Category.find({
        $or: [
          { _id: { $in: filterCriteria.categories.filter((c: string) => mongoose.Types.ObjectId.isValid(c)) } },
          { name: { $in: filterCriteria.categories } },
          { slug: { $in: filterCriteria.categories } },
        ]
      }).select('_id');

      if (categories.length > 0) {
        storeQuery.category = { $in: categories.map(c => c._id) };
      }
    }
  }

  const [total, stores] = await Promise.all([
    Store.countDocuments(storeQuery),
    Store.find(storeQuery)
      .select('name logo location.city ratings.average offers.cashback tags category')
      .populate('category', 'name')
      .sort({ 'ratings.average': -1 })
      .limit(Number(limit))
      .lean(),
  ]);

  return res.json({
    success: true,
    data: {
      total,
      stores: stores.map((store: any) => ({
        _id: store._id,
        name: store.name,
        logo: store.logo,
        city: store.location?.city,
        rating: store.ratings?.average,
        cashback: store.offers?.cashback,
        category: store.category?.name,
        tags: store.tags?.slice(0, 5),
      })),
    },
  });
}));

// ============================================
// REFRESH ALL STORE COUNTS
// ============================================

/**
 * @route   POST /api/admin/experiences/refresh-all-counts
 * @desc    Refresh store counts for all experiences
 * @access  Admin
 */
router.post('/refresh-all-counts', asyncHandler(async (req: Request, res: Response) => {
  const experiences = await StoreExperience.find();
  let updated = 0;

  for (const experience of experiences) {
    const storeQuery: any = { isActive: true };
    const filterCriteria = experience.filterCriteria;
    let hasFilterCriteria = false;

    if (filterCriteria) {
      if (filterCriteria.tags && filterCriteria.tags.length > 0) {
        storeQuery.tags = { $in: filterCriteria.tags };
        hasFilterCriteria = true;
      }
      if (filterCriteria.minRating && filterCriteria.minRating > 0) {
        storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
        hasFilterCriteria = true;
      }
      if ((filterCriteria as any).isPremium === true) {
        storeQuery['deliveryCategories.premium'] = true;
        hasFilterCriteria = true;
      }
      if ((filterCriteria as any).isOrganic === true) {
        storeQuery['deliveryCategories.organic'] = true;
        hasFilterCriteria = true;
      }
      if ((filterCriteria as any).isMall === true) {
        storeQuery['deliveryCategories.mall'] = true;
        hasFilterCriteria = true;
      }
      if ((filterCriteria as any).isPartner === true) {
        storeQuery['offers.isPartner'] = true;
        hasFilterCriteria = true;
      }
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        storeQuery.category = { $in: filterCriteria.categories };
        hasFilterCriteria = true;
      }
    }

    // Count filter-matched stores
    let filterMatchCount = 0;
    if (hasFilterCriteria) {
      filterMatchCount = await Store.countDocuments(storeQuery);
    }

    // Count manually assigned stores (excluding duplicates)
    const assignedCount = experience.assignedStores?.length || 0;

    // Total unique stores = filter matched + assigned (for simplicity, we add them)
    // In practice, there could be overlap, but this gives a reasonable estimate
    const storeCount = filterMatchCount + assignedCount;

    if (experience.storeCount !== storeCount) {
      experience.storeCount = storeCount;
      await experience.save();
      updated++;
    }
  }


  return res.json({
    success: true,
    message: `Store counts refreshed for ${updated} experiences`,
    data: { totalExperiences: experiences.length, updated },
  });
}));

// ============================================
// BULK REORDER EXPERIENCES
// ============================================

/**
 * @route   PATCH /api/admin/experiences/reorder
 * @desc    Bulk update sort order
 * @access  Admin
 */
router.patch('/reorder', asyncHandler(async (req: Request, res: Response) => {
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

  await StoreExperience.bulkWrite(bulkOps);


  return res.json({
    success: true,
    message: 'Experiences reordered successfully',
  });
}));

// ============================================
// GET SINGLE EXPERIENCE
// ============================================

/**
 * @route   GET /api/admin/experiences/:id
 * @desc    Get single experience by ID
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const experience = await StoreExperience.findById(id).lean();

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  return res.json({
    success: true,
    data: experience,
  });
}));

// ============================================
// CREATE EXPERIENCE
// ============================================

/**
 * @route   POST /api/admin/experiences
 * @desc    Create new experience
 * @access  Admin
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createExperienceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  // Check if slug already exists
  const existingSlug = await StoreExperience.findOne({ slug: value.slug });
  if (existingSlug) {
    return res.status(400).json({
      success: false,
      message: 'An experience with this slug already exists',
    });
  }

  // Get max sortOrder for new item
  if (!value.sortOrder) {
    const maxSort = await StoreExperience.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    value.sortOrder = (maxSort?.sortOrder || 0) + 1;
  }

  const experience = new StoreExperience(value);
  await experience.save();


  return res.status(201).json({
    success: true,
    message: 'Experience created successfully',
    data: experience,
  });
}));

// ============================================
// UPDATE EXPERIENCE
// ============================================

/**
 * @route   PUT /api/admin/experiences/:id
 * @desc    Update experience
 * @access  Admin
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const { error, value } = updateExperienceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  // Check slug uniqueness if being updated
  if (value.slug) {
    const existingSlug = await StoreExperience.findOne({
      slug: value.slug,
      _id: { $ne: id },
    });
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: 'An experience with this slug already exists',
      });
    }
  }

  const experience = await StoreExperience.findByIdAndUpdate(
    id,
    { $set: value },
    { new: true, runValidators: true }
  );

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }


  return res.json({
    success: true,
    message: 'Experience updated successfully',
    data: experience,
  });
}));

// ============================================
// DELETE EXPERIENCE
// ============================================

/**
 * @route   DELETE /api/admin/experiences/:id
 * @desc    Delete experience
 * @access  Admin
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const experience = await StoreExperience.findByIdAndDelete(id);

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }


  return res.json({
    success: true,
    message: 'Experience deleted successfully',
  });
}));

// ============================================
// TOGGLE EXPERIENCE ACTIVE STATUS
// ============================================

/**
 * @route   PATCH /api/admin/experiences/:id/toggle
 * @desc    Toggle experience active status
 * @access  Admin
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const experience = await StoreExperience.findById(id);

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  experience.isActive = !experience.isActive;
  await experience.save();


  return res.json({
    success: true,
    message: `Experience ${experience.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { isActive: experience.isActive },
  });
}));

// ============================================
// TOGGLE FEATURED STATUS
// ============================================

/**
 * @route   PATCH /api/admin/experiences/:id/feature
 * @desc    Toggle experience featured status
 * @access  Admin
 */
router.patch('/:id/feature', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const experience = await StoreExperience.findById(id);

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  experience.isFeatured = !experience.isFeatured;
  await experience.save();


  return res.json({
    success: true,
    message: `Experience ${experience.isFeatured ? 'featured' : 'unfeatured'} successfully`,
    data: { isFeatured: experience.isFeatured },
  });
}));

// ============================================
// REFRESH STORE COUNT FOR EXPERIENCE
// ============================================

/**
 * @route   PATCH /api/admin/experiences/:id/refresh-count
 * @desc    Refresh the cached store count for an experience
 * @access  Admin
 */
router.patch('/:id/refresh-count', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const experience = await StoreExperience.findById(id);

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  const storeQuery: any = { isActive: true };
  const filterCriteria = experience.filterCriteria;
  let hasFilterCriteria = false;

  if (filterCriteria) {
    if (filterCriteria.tags && filterCriteria.tags.length > 0) {
      storeQuery.tags = { $in: filterCriteria.tags };
      hasFilterCriteria = true;
    }
    if (filterCriteria.minRating && filterCriteria.minRating > 0) {
      storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
      hasFilterCriteria = true;
    }
    if ((filterCriteria as any).isPremium === true) {
      storeQuery['deliveryCategories.premium'] = true;
      hasFilterCriteria = true;
    }
    if ((filterCriteria as any).isOrganic === true) {
      storeQuery['deliveryCategories.organic'] = true;
      hasFilterCriteria = true;
    }
    if ((filterCriteria as any).isMall === true) {
      storeQuery['deliveryCategories.mall'] = true;
      hasFilterCriteria = true;
    }
    if ((filterCriteria as any).isPartner === true) {
      storeQuery['offers.isPartner'] = true;
      hasFilterCriteria = true;
    }
    if (filterCriteria.categories && filterCriteria.categories.length > 0) {
      storeQuery.category = { $in: filterCriteria.categories };
      hasFilterCriteria = true;
    }
  }

  // Count filter-matched stores
  let filterMatchCount = 0;
  if (hasFilterCriteria) {
    filterMatchCount = await Store.countDocuments(storeQuery);
  }

  // Count manually assigned stores
  const assignedCount = experience.assignedStores?.length || 0;

  // Total = filter matched + manually assigned
  const storeCount = filterMatchCount + assignedCount;

  experience.storeCount = storeCount;
  await experience.save();


  return res.json({
    success: true,
    message: 'Store count refreshed',
    data: { storeCount },
  });
}));

// ============================================
// GET ASSIGNED STORES FOR EXPERIENCE
// ============================================

/**
 * @route   GET /api/admin/experiences/:id/assigned-stores
 * @desc    Get stores assigned to an experience
 * @access  Admin
 */
router.get('/:id/assigned-stores', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  const experience = await StoreExperience.findById(id).lean();

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  const assignedStoreIds = (experience as any).assignedStores || [];

  if (assignedStoreIds.length === 0) {
    return res.json({
      success: true,
      data: { stores: [], total: 0 },
    });
  }

  const stores = await Store.find({ _id: { $in: assignedStoreIds } })
    .select('_id name logo banner category city ratings offers')
    .populate('category', 'name')
    .lean();

  return res.json({
    success: true,
    data: {
      stores: stores.map((s: any) => ({
        _id: s._id,
        name: s.name,
        logo: s.logo || s.banner,
        category: s.category?.name || 'Other',
        city: s.city,
        rating: s.ratings?.average,
        cashback: s.offers?.cashback,
      })),
      total: stores.length,
    },
  });
}));

// ============================================
// ASSIGN STORE TO EXPERIENCE
// ============================================

/**
 * @route   POST /api/admin/experiences/:id/assign-store
 * @desc    Assign a store to an experience
 * @access  Admin
 */
router.post('/:id/assign-store', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { storeId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid store ID',
    });
  }

  // Verify store exists
  const store = await Store.findById(storeId).select('name').lean();
  if (!store) {
    return res.status(404).json({
      success: false,
      message: 'Store not found',
    });
  }

  const experience = await StoreExperience.findById(id);

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  // Initialize assignedStores array if it doesn't exist
  if (!(experience as any).assignedStores) {
    (experience as any).assignedStores = [];
  }

  // Check if already assigned
  const isAlreadyAssigned = (experience as any).assignedStores.some(
    (sid: any) => sid.toString() === storeId
  );

  if (isAlreadyAssigned) {
    return res.status(400).json({
      success: false,
      message: 'Store is already assigned to this experience',
    });
  }

  // Add store to assigned stores
  (experience as any).assignedStores.push(new mongoose.Types.ObjectId(storeId));

  // Update store count
  experience.storeCount = (experience.storeCount || 0) + 1;

  await experience.save();


  return res.json({
    success: true,
    message: 'Store assigned successfully',
    data: { storeId, storeName: store.name, storeCount: experience.storeCount },
  });
}));

// ============================================
// REMOVE STORE FROM EXPERIENCE
// ============================================

/**
 * @route   DELETE /api/admin/experiences/:id/remove-store/:storeId
 * @desc    Remove a store from an experience
 * @access  Admin
 */
router.delete('/:id/remove-store/:storeId', asyncHandler(async (req: Request, res: Response) => {
  const { id, storeId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid experience ID',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid store ID',
    });
  }

  const experience = await StoreExperience.findById(id);

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Experience not found',
    });
  }

  if (!(experience as any).assignedStores) {
    return res.status(400).json({
      success: false,
      message: 'No stores assigned to this experience',
    });
  }

  // Remove store from assigned stores
  const previousCount = (experience as any).assignedStores.length;
  (experience as any).assignedStores = (experience as any).assignedStores.filter(
    (sid: any) => sid.toString() !== storeId
  );
  const newCount = (experience as any).assignedStores.length;

  // Update store count if a store was actually removed
  if (newCount < previousCount) {
    experience.storeCount = Math.max(0, (experience.storeCount || 0) - 1);
  }

  await experience.save();


  return res.json({
    success: true,
    message: 'Store removed successfully',
    data: { storeCount: experience.storeCount },
  });
}));

export default router;
