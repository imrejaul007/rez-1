import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';
import { cacheInvalidationMiddleware } from '../../middleware/cacheMiddleware';
import { Category } from '../../models/Category';
import { Store } from '../../models/Store';
import Joi from 'joi';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Validation helpers
const HEX_COLOR = Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).message('Must be valid hex color');
const FILTER_FIELDS = ['homeDelivery', 'driveThru', 'tableBooking', 'dineIn', 'storePickup'] as const;
const SECTION_TYPES = [
  'loyalty-hub', 'social-proof-ticker', 'browse-grid', 'ai-search',
  'stores-list', 'popular-items', 'new-stores', 'curated-collections',
  'ugc-social', 'offers-section', 'experiences-section', 'order-again',
  'footer-trust', 'streak-loyalty', 'service-types', 'value-proposition'
] as const;

// All routes require authenticated admin (role >= support/60)
router.use(requireAuth);
router.use(requireAdmin);
// Invalidate category + homepage caches on write operations
router.use(cacheInvalidationMiddleware(() => ['categories:*', 'homepage:*']));

// Validate :id param is a valid ObjectId
router.param('id', (req: Request, res: Response, next, id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid category ID format' });
  }
  next();
});

// ============================================
// GET /admin/categories - List all main categories (including inactive)
// ============================================
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const categories = await Category.find({
    parentCategory: null,
    // No isActive filter — admin sees all categories to manage them
  })
    .select('name slug icon image type sortOrder metadata pageConfig isActive maxCashback storeCount productCount updatedAt')
    .sort({ sortOrder: 1 })
    .lean();

  // Compute live store counts via aggregation (include subcategory stores)
  const categoryIds = categories.map((c: any) => c._id);

  // Get all child category IDs for each parent category
  const parentWithChildren = await Category.find({ _id: { $in: categoryIds } })
    .select('_id childCategories')
    .lean();
  const allCategoryIds = new Set<string>();
  const parentToAllIds = new Map<string, mongoose.Types.ObjectId[]>();
  parentWithChildren.forEach((cat: any) => {
    const ids = [cat._id, ...((cat.childCategories || []).map((id: any) => new mongoose.Types.ObjectId(id.toString())))];
    parentToAllIds.set(cat._id.toString(), ids);
    ids.forEach(id => allCategoryIds.add(id.toString()));
  });

  // Single aggregation for ALL category IDs (parents + children)
  const allIdObjects = Array.from(allCategoryIds).map(id => new mongoose.Types.ObjectId(id));
  const storeStats = await Store.aggregate([
    { $match: { category: { $in: allIdObjects }, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const perCategoryCount = new Map<string, number>();
  storeStats.forEach((s: any) => perCategoryCount.set(s._id.toString(), s.count));

  // Sum parent + children counts
  const storeCountMap = new Map<string, number>();
  parentWithChildren.forEach((cat: any) => {
    const ids = parentToAllIds.get(cat._id.toString()) || [cat._id];
    const total = ids.reduce((sum, id) => sum + (perCategoryCount.get(id.toString()) || 0), 0);
    storeCountMap.set(cat._id.toString(), total);
  });

  // Enrich categories with live store counts (including subcategories)
  const enriched = categories.map((cat: any) => ({
    ...cat,
    storeCount: storeCountMap.get(cat._id.toString()) || 0,
  }));

  res.json({ success: true, data: { categories: enriched } });
}));

// ============================================
// GET /admin/categories/:id - Get single category with full config
// ============================================
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id)
    .populate('childCategories', 'name slug icon image sortOrder metadata isActive')
    .lean();

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  // Compute live store count (including subcategory stores)
  const childIds = ((category as any).childCategories || []).map((c: any) => c._id || c);
  const allIds = [(category as any)._id, ...childIds];
  const liveStoreCount = await Store.countDocuments({
    category: { $in: allIds },
    isActive: true,
  });

  res.json({
    success: true,
    data: {
      category: { ...category, storeCount: liveStoreCount },
    },
  });
}));

// ============================================
// PUT /admin/categories/:id - Update category basic info (requires senior admin)
// ============================================
const updateCategorySchema = Joi.object({
  name: Joi.string().trim().max(100),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/),
  description: Joi.string().trim().max(500).allow(''),
  icon: Joi.string().trim(),
  image: Joi.string().trim().allow(''),
  isActive: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
  metadata: Joi.object({
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    featured: Joi.boolean(),
    description: Joi.string().trim().max(1000).allow(''),
  }),
});

router.put('/:id', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = updateCategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { $set: value },
    { new: true }
  ).lean();

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  res.json({ success: true, data: { category }, message: 'Category updated successfully' });
}));

// ============================================
// PUT /admin/categories/:id/page-config - Update entire pageConfig (requires senior admin)
// ============================================
const pageConfigSchema = Joi.object({
  isMainCategory: Joi.boolean(),
  theme: Joi.object({
    primaryColor: HEX_COLOR,
    gradientColors: Joi.array().items(HEX_COLOR),
    icon: Joi.string(),
    accentColor: HEX_COLOR.allow('', null),
    backgroundColor: HEX_COLOR.allow('', null),
  }),
  banner: Joi.object({
    title: Joi.string(),
    subtitle: Joi.string(),
    discount: Joi.string().allow(''),
    tag: Joi.string().allow(''),
    image: Joi.string().allow(''),
    ctaText: Joi.string().allow(''),
    ctaRoute: Joi.string().allow(''),
  }),
  tabs: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    icon: Joi.string().required(),
    serviceFilter: Joi.string().allow('', null),
    sectionOverride: Joi.string().allow('', null),
    enabled: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
  })),
  quickActions: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    icon: Joi.string().required(),
    route: Joi.string().required(),
    color: HEX_COLOR.default('#6B7280'),
    enabled: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
  })),
  sections: Joi.array().items(Joi.object({
    id: Joi.string().allow(''),
    type: Joi.string().valid(...SECTION_TYPES).required(),
    title: Joi.string().allow(''),
    subtitle: Joi.string().allow(''),
    icon: Joi.string().allow(''),
    enabled: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
    config: Joi.object().unknown(true),
  })),
  serviceTypes: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    icon: Joi.string().required(),
    description: Joi.string().allow(''),
    filterField: Joi.string().valid(...FILTER_FIELDS).required(),
    color: HEX_COLOR.default('#3B82F6'),
    gradient: Joi.array().items(HEX_COLOR).max(3),
    enabled: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
  })),
  dietaryOptions: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    icon: Joi.string().required(),
    color: HEX_COLOR.required(),
    tags: Joi.array().items(Joi.string()).default([]),
  })),
  curatedCollections: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    title: Joi.string().required(),
    subtitle: Joi.string().allow(''),
    icon: Joi.string().allow(''),
    gradient: Joi.array().items(HEX_COLOR).max(3),
    tags: Joi.string().allow(''),
  })),
  searchPlaceholders: Joi.object().pattern(Joi.string(), Joi.array().items(Joi.string())),
  valuePropItems: Joi.array().items(Joi.object({
    icon: Joi.string().required(),
    text: Joi.string().required(),
    color: HEX_COLOR.required(),
  })),
  sortOptions: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    icon: Joi.string().required(),
    enabled: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
  })),
  filterOptions: Joi.object({
    priceMax: Joi.number().min(0).optional(),
    priceLabel: Joi.string().allow('').optional(),
    ratingThreshold: Joi.number().min(0).max(5).optional(),
    showPriceFilter: Joi.boolean().optional(),
    showRatingFilter: Joi.boolean().optional(),
    showOpenNow: Joi.boolean().optional(),
  }),
  storeDisplayConfig: Joi.object({
    storesPerPage: Joi.number().min(1).max(100).optional(),
    tagExclusions: Joi.array().items(Joi.string()).optional(),
    defaultCoinsMultiplier: Joi.number().min(0).optional(),
    defaultReviewBonus: Joi.number().min(0).optional(),
    defaultVisitMilestone: Joi.number().min(1).optional(),
  }),
  trustBadges: Joi.array().items(Joi.object({
    icon: Joi.string().required(),
    label: Joi.string().required(),
    color: HEX_COLOR.required(),
  })),
  loyaltyConfig: Joi.object({
    emptyMessage: Joi.string().allow('').optional(),
    displayLimit: Joi.number().min(0).optional(),
  }),
  experienceBenefits: Joi.array().items(Joi.object({
    icon: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
  })),
});

router.put('/:id/page-config', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = pageConfigSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  // Deep merge: only overwrite fields present in the payload, preserve existing config for unset fields
  const existing = (category.pageConfig as any) || {};
  category.pageConfig = { ...existing, ...value } as any;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { category }, message: 'Page config updated successfully' });
}));

// ============================================
// PATCH /admin/categories/:id/tabs - Update tabs only (requires senior admin)
// ============================================
router.patch('/:id/tabs', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const tabsSchema = Joi.object({ tabs: pageConfigSchema.extract('tabs').required() });
  const { error, value } = tabsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).tabs = value.tabs;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { tabs: (category.pageConfig as any).tabs }, message: 'Tabs updated' });
}));

// ============================================
// PATCH /admin/categories/:id/quick-actions - Update quickActions only (requires senior admin)
// ============================================
router.patch('/:id/quick-actions', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const quickActionsSchema = Joi.object({ quickActions: pageConfigSchema.extract('quickActions').required() });
  const { error, value } = quickActionsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).quickActions = value.quickActions;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { quickActions: (category.pageConfig as any).quickActions }, message: 'Quick actions updated' });
}));

// ============================================
// PATCH /admin/categories/:id/sections - Update sections only (requires senior admin)
// ============================================
router.patch('/:id/sections', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const sectionsSchema = Joi.object({ sections: pageConfigSchema.extract('sections').required() });
  const { error, value } = sectionsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).sections = value.sections;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { sections: (category.pageConfig as any).sections }, message: 'Sections updated' });
}));

// ============================================
// PATCH /admin/categories/:id/service-types - Update serviceTypes only (requires senior admin)
// ============================================
router.patch('/:id/service-types', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const serviceTypesSchema = Joi.object({ serviceTypes: pageConfigSchema.extract('serviceTypes').required() });
  const { error, value } = serviceTypesSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).serviceTypes = value.serviceTypes;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { serviceTypes: (category.pageConfig as any).serviceTypes }, message: 'Service types updated' });
}));

// ============================================
// PATCH /admin/categories/:id/banner - Update banner only (requires senior admin)
// ============================================
router.patch('/:id/banner', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const bannerSchema = Joi.object({ banner: pageConfigSchema.extract('banner').required() });
  const { error, value } = bannerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).banner = value.banner;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { banner: (category.pageConfig as any).banner }, message: 'Banner updated' });
}));

// ============================================
// PATCH /admin/categories/:id/theme - Update theme only (requires senior admin)
// ============================================
router.patch('/:id/theme', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const themeSchema = Joi.object({ theme: pageConfigSchema.extract('theme').required() });
  const { error, value } = themeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).theme = value.theme;
  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { theme: (category.pageConfig as any).theme }, message: 'Theme updated' });
}));

// ============================================
// PATCH /admin/categories/:id/dietary-options
// ============================================
router.patch('/:id/dietary-options', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schema = Joi.object({ dietaryOptions: pageConfigSchema.extract('dietaryOptions').required() });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).dietaryOptions = value.dietaryOptions;
  category.markModified('pageConfig');
  await category.save();
  res.json({ success: true, data: { dietaryOptions: (category.pageConfig as any).dietaryOptions }, message: 'Dietary options updated' });
}));

// ============================================
// PATCH /admin/categories/:id/curated-collections
// ============================================
router.patch('/:id/curated-collections', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schema = Joi.object({ curatedCollections: pageConfigSchema.extract('curatedCollections').required() });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).curatedCollections = value.curatedCollections;
  category.markModified('pageConfig');
  await category.save();
  res.json({ success: true, data: { curatedCollections: (category.pageConfig as any).curatedCollections }, message: 'Curated collections updated' });
}));

// ============================================
// PATCH /admin/categories/:id/search-placeholders
// ============================================
router.patch('/:id/search-placeholders', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schema = Joi.object({ searchPlaceholders: pageConfigSchema.extract('searchPlaceholders').required() });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).searchPlaceholders = value.searchPlaceholders;
  category.markModified('pageConfig');
  await category.save();
  res.json({ success: true, data: { searchPlaceholders: (category.pageConfig as any).searchPlaceholders }, message: 'Search placeholders updated' });
}));

// ============================================
// PATCH /admin/categories/:id/value-prop-items
// ============================================
router.patch('/:id/value-prop-items', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const schema = Joi.object({ valuePropItems: pageConfigSchema.extract('valuePropItems').required() });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }
  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }
  (category.pageConfig as any).valuePropItems = value.valuePropItems;
  category.markModified('pageConfig');
  await category.save();
  res.json({ success: true, data: { valuePropItems: (category.pageConfig as any).valuePropItems }, message: 'Value prop items updated' });
}));

// ============================================
// POST /admin/categories - Create new category (requires senior admin)
// ============================================
const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
  description: Joi.string().trim().max(500).allow('').optional(),
  icon: Joi.string().trim().optional(),
  image: Joi.string().trim().allow('').optional(),
  type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general').required(),
  parentCategory: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null).optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).optional(),
  metadata: Joi.object({
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    featured: Joi.boolean().optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
  }).optional(),
});

router.post('/', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createCategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // Auto-generate slug from name if not provided
  if (!value.slug) {
    value.slug = value.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Guard against empty slugs (e.g. pure unicode names)
  if (!value.slug) {
    return res.status(400).json({ success: false, message: 'Could not generate a valid slug. Please provide a slug manually using only letters, numbers, and hyphens.' });
  }

  // Check slug uniqueness
  const existingSlug = await Category.findOne({ slug: value.slug }).lean();
  if (existingSlug) {
    return res.status(400).json({ success: false, message: `Slug "${value.slug}" is already in use` });
  }

  // If no sortOrder provided, set to max existing sortOrder + 1
  if (value.sortOrder === undefined) {
    const maxSortCategory = await Category.findOne({ parentCategory: value.parentCategory || null })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    value.sortOrder = maxSortCategory ? (maxSortCategory as any).sortOrder + 1 : 0;
  }

  // Create category
  const category = new Category(value);
  await category.save();

  // If parentCategory provided, add to parent's childCategories array
  if (value.parentCategory) {
    await Category.findByIdAndUpdate(value.parentCategory, {
      $addToSet: { childCategories: category._id },
    });
  }

  res.status(201).json({ success: true, data: { category }, message: 'Category created successfully' });
}));

// ============================================
// DELETE /admin/categories/:id - Delete category with safety checks (requires senior admin)
// ============================================
router.delete('/:id', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id).lean();
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  // Check for stores assigned to this category
  const storeCount = await Store.countDocuments({ category: req.params.id });
  if (storeCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category with ${storeCount} stores. Reassign stores first.`,
    });
  }

  // Check for child categories
  const childCount = await Category.countDocuments({ parentCategory: req.params.id });
  if (childCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category with ${childCount} subcategories. Delete or move them first.`,
    });
  }

  // If has parent, remove from parent's childCategories
  if (category.parentCategory) {
    await Category.findByIdAndUpdate(category.parentCategory, {
      $pull: { childCategories: category._id },
    });
  }

  // Delete the category
  await Category.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: 'Category deleted successfully' });
}));

// ============================================
// GET /admin/categories/:id/subcategories - List subcategories
// ============================================
router.get('/:id/subcategories', asyncHandler(async (req: Request, res: Response) => {
  const subcategories = await Category.find({ parentCategory: req.params.id })
    .select('name slug icon image sortOrder isActive metadata storeCount')
    .sort({ sortOrder: 1 })
    .lean();

  // Compute live store counts via aggregation
  const subIds = subcategories.map((s: any) => s._id);
  const storeStats = await Store.aggregate([
    { $match: { category: { $in: subIds }, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const storeCountMap = new Map<string, number>();
  storeStats.forEach((s: any) => storeCountMap.set(s._id.toString(), s.count));

  const enriched = subcategories.map((sub: any) => ({
    ...sub,
    storeCount: storeCountMap.get(sub._id.toString()) || 0,
  }));

  res.json({ success: true, data: { subcategories: enriched } });
}));

// ============================================
// POST /admin/categories/:id/subcategories - Create subcategory
// ============================================
const createSubcategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
  icon: Joi.string().trim().optional(),
  image: Joi.string().trim().allow('').optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).optional(),
  metadata: Joi.object({
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    featured: Joi.boolean().optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
  }).optional(),
});

router.post('/:id/subcategories', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const parent = await Category.findById(req.params.id).lean();
  if (!parent) {
    return res.status(404).json({ success: false, message: 'Parent category not found' });
  }

  const { error, value } = createSubcategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // Auto-generate slug from name if not provided
  if (!value.slug) {
    value.slug = value.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Guard against empty slugs (e.g. pure unicode names)
  if (!value.slug) {
    return res.status(400).json({ success: false, message: 'Could not generate a valid slug. Please provide a slug manually using only letters, numbers, and hyphens.' });
  }

  // Check slug uniqueness
  const existingSlug = await Category.findOne({ slug: value.slug }).lean();
  if (existingSlug) {
    return res.status(400).json({ success: false, message: `Slug "${value.slug}" is already in use` });
  }

  // If no sortOrder provided, set to max existing sortOrder + 1
  if (value.sortOrder === undefined) {
    const maxSortSub = await Category.findOne({ parentCategory: req.params.id })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    value.sortOrder = maxSortSub ? (maxSortSub as any).sortOrder + 1 : 0;
  }

  // Create child category inheriting type from parent
  const subcategory = new Category({
    ...value,
    type: parent.type,
    parentCategory: req.params.id,
  });
  await subcategory.save();

  // Add to parent's childCategories array
  await Category.findByIdAndUpdate(req.params.id, {
    $addToSet: { childCategories: subcategory._id },
  });

  res.status(201).json({ success: true, data: { subcategory }, message: 'Subcategory created successfully' });
}));

// ============================================
// PUT /admin/categories/:id/subcategories/:subId - Update subcategory
// ============================================
const updateSubcategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
  icon: Joi.string().trim().optional(),
  image: Joi.string().trim().allow('').optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  metadata: Joi.object({
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    featured: Joi.boolean().optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
  }).optional(),
});

router.put('/:id/subcategories/:subId', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  // Validate subId format
  if (!mongoose.Types.ObjectId.isValid(req.params.subId)) {
    return res.status(400).json({ success: false, message: 'Invalid subcategory ID format' });
  }

  const { error, value } = updateSubcategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  // Verify subcategory exists and belongs to parent
  const subcategory = await Category.findById(req.params.subId).lean();
  if (!subcategory) {
    return res.status(404).json({ success: false, message: 'Subcategory not found' });
  }
  if (!subcategory.parentCategory || subcategory.parentCategory.toString() !== req.params.id) {
    return res.status(400).json({ success: false, message: 'Subcategory does not belong to this parent category' });
  }

  // If slug is being changed, check uniqueness
  if (value.slug && value.slug !== subcategory.slug) {
    const existingSlug = await Category.findOne({ slug: value.slug, _id: { $ne: req.params.subId } }).lean();
    if (existingSlug) {
      return res.status(400).json({ success: false, message: `Slug "${value.slug}" is already in use` });
    }
  }

  const updated = await Category.findByIdAndUpdate(
    req.params.subId,
    { $set: value },
    { new: true }
  ).lean();

  res.json({ success: true, data: { subcategory: updated }, message: 'Subcategory updated successfully' });
}));

// ============================================
// DELETE /admin/categories/:id/subcategories/:subId - Delete subcategory
// ============================================
router.delete('/:id/subcategories/:subId', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  // Validate subId format
  if (!mongoose.Types.ObjectId.isValid(req.params.subId)) {
    return res.status(400).json({ success: false, message: 'Invalid subcategory ID format' });
  }

  const subcategory = await Category.findById(req.params.subId).lean();
  if (!subcategory) {
    return res.status(404).json({ success: false, message: 'Subcategory not found' });
  }
  if (!subcategory.parentCategory || subcategory.parentCategory.toString() !== req.params.id) {
    return res.status(400).json({ success: false, message: 'Subcategory does not belong to this parent category' });
  }

  // Check for stores assigned to this subcategory
  const storeCount = await Store.countDocuments({ category: req.params.subId });
  if (storeCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category with ${storeCount} stores. Reassign stores first.`,
    });
  }

  // Check for child categories of this subcategory
  const childCount = await Category.countDocuments({ parentCategory: req.params.subId });
  if (childCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category with ${childCount} subcategories. Delete or move them first.`,
    });
  }

  // Remove from parent's childCategories
  await Category.findByIdAndUpdate(req.params.id, {
    $pull: { childCategories: subcategory._id },
  });

  // Delete the subcategory
  await Category.findByIdAndDelete(req.params.subId);

  res.json({ success: true, message: 'Subcategory deleted successfully' });
}));

// ============================================
// POST /admin/categories/:id/subcategories/reorder - Reorder subcategories
// ============================================
const reorderSubcategoriesSchema = Joi.object({
  orderedIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required(),
});

router.post('/:id/subcategories/reorder', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = reorderSubcategoriesSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { orderedIds } = value;

  // Validate all IDs are actual subcategories of this parent
  const validSubs = await Category.find({
    _id: { $in: orderedIds },
    parentCategory: req.params.id,
  }).select('_id').lean();
  const validIds = new Set(validSubs.map((s: any) => s._id.toString()));
  const invalidIds = orderedIds.filter((id: string) => !validIds.has(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: `${invalidIds.length} ID(s) are not subcategories of this category`,
    });
  }

  const bulkOps = orderedIds.map((id: string, index: number) => ({
    updateOne: {
      filter: { _id: id, parentCategory: req.params.id },
      update: { $set: { sortOrder: index } },
    },
  }));

  await Category.bulkWrite(bulkOps);

  res.json({ success: true, message: 'Subcategories reordered successfully' });
}));

// ============================================
// PATCH /admin/categories/:id/sort-filter-options - Update sort/filter options (requires senior admin)
// ============================================
const sortFilterOptionsSchema = Joi.object({
  sortOptions: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    icon: Joi.string().required(),
    enabled: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
  })).optional(),
  filterOptions: Joi.object({
    priceMax: Joi.number().min(0).optional(),
    priceLabel: Joi.string().allow('').optional(),
    ratingThreshold: Joi.number().min(0).max(5).optional(),
    showPriceFilter: Joi.boolean().optional(),
    showRatingFilter: Joi.boolean().optional(),
    showOpenNow: Joi.boolean().optional(),
  }).optional(),
  storeDisplayConfig: Joi.object({
    storesPerPage: Joi.number().min(1).max(100).optional(),
    tagExclusions: Joi.array().items(Joi.string()).optional(),
    defaultCoinsMultiplier: Joi.number().min(0).optional(),
    defaultReviewBonus: Joi.number().min(0).optional(),
    defaultVisitMilestone: Joi.number().min(1).optional(),
  }).optional(),
  trustBadges: Joi.array().items(Joi.object({
    icon: Joi.string().required(),
    label: Joi.string().required(),
    color: Joi.string().required(),
  })).optional(),
  loyaltyConfig: Joi.object({
    emptyMessage: Joi.string().allow('').optional(),
    displayLimit: Joi.number().min(1).optional(),
  }).optional(),
  experienceBenefits: Joi.array().items(Joi.object({
    icon: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
  })).optional(),
}).min(1);

router.patch('/:id/sort-filter-options', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = sortFilterOptionsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (!category.pageConfig) {
    category.pageConfig = { isMainCategory: true } as any;
  }

  // Merge each provided field into pageConfig
  const fields = ['sortOptions', 'filterOptions', 'storeDisplayConfig', 'trustBadges', 'loyaltyConfig', 'experienceBenefits'] as const;
  for (const field of fields) {
    if (value[field] !== undefined) {
      (category.pageConfig as any)[field] = value[field];
    }
  }

  category.markModified('pageConfig');
  await category.save();

  res.json({ success: true, data: { pageConfig: category.pageConfig }, message: 'Sort/filter options updated successfully' });
}));

// ============================================
// POST /admin/categories/reorder - Reorder main categories (requires senior admin)
// ============================================
const reorderSchema = Joi.object({
  orderedIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required(),
});

router.post('/reorder', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = reorderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { orderedIds } = value;

  // Check for duplicates
  if (new Set(orderedIds).size !== orderedIds.length) {
    return res.status(400).json({ success: false, message: 'Duplicate IDs in orderedIds' });
  }

  // Verify all IDs are valid main categories and all main categories are included
  const mainCategories = await Category.find({ parentCategory: null }).select('_id').lean();
  const mainCategoryIds = new Set(mainCategories.map((c: any) => c._id.toString()));

  for (const id of orderedIds) {
    if (!mainCategoryIds.has(id)) {
      return res.status(400).json({
        success: false,
        message: `ID ${id} is not a valid main category`,
      });
    }
  }

  if (orderedIds.length !== mainCategoryIds.size) {
    return res.status(400).json({
      success: false,
      message: `Expected ${mainCategoryIds.size} category IDs, received ${orderedIds.length}. All main categories must be included.`,
    });
  }

  const bulkOps = orderedIds.map((id: string, index: number) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { sortOrder: index } },
    },
  }));

  await Category.bulkWrite(bulkOps);

  res.json({ success: true, message: 'Categories reordered successfully' });
}));

// ============================================
// PATCH /admin/categories/:id/toggle - Toggle active/inactive (requires senior admin)
// ============================================
router.patch('/:id/toggle', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  category.isActive = !category.isActive;
  await category.save();

  res.json({
    success: true,
    data: { isActive: category.isActive },
    message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
  });
}));

export default router;
