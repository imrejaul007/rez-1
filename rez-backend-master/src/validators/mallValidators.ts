import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Reusable ObjectId param schema — each route passes only its own param,
// so we use .or() to require at least one valid ID
export const objectIdParamsSchema = Joi.object({
  brandId: Joi.string().pattern(objectIdPattern),
  categoryId: Joi.string().pattern(objectIdPattern),
  collectionId: Joi.string().pattern(objectIdPattern),
  offerId: Joi.string().pattern(objectIdPattern),
  bannerId: Joi.string().pattern(objectIdPattern),
  storeId: Joi.string().pattern(objectIdPattern),
}).or('brandId', 'categoryId', 'collectionId', 'offerId', 'bannerId', 'storeId')
  .options({ stripUnknown: true });

// ==================== BRAND SCHEMAS ====================

export const createBrandSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  slug: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(2000).optional().allow(''),
  logo: Joi.string().trim().uri().required(),
  banner: Joi.array().items(Joi.string().trim().uri()).optional(),
  externalUrl: Joi.string().trim().uri().optional().allow(''),
  tier: Joi.string().valid('standard', 'premium', 'exclusive', 'luxury').default('standard'),
  cashback: Joi.object({
    percentage: Joi.number().min(0).max(100).required(),
    maxAmount: Joi.number().min(0).optional(),
    minPurchase: Joi.number().min(0).optional(),
    earlyBirdBonus: Joi.number().min(0).optional(),
  }).required(),
  mallCategory: Joi.string().pattern(objectIdPattern).optional(),
  badges: Joi.array().items(Joi.string().valid('exclusive', 'premium', 'new', 'trending', 'top-rated', 'verified')).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  isLuxury: Joi.boolean().default(false),
  isNewArrival: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
}).options({ stripUnknown: true });

export const updateBrandSchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  slug: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(2000).optional().allow(''),
  logo: Joi.string().trim().uri().optional(),
  banner: Joi.array().items(Joi.string().trim().uri()).optional(),
  externalUrl: Joi.string().trim().uri().optional().allow(''),
  tier: Joi.string().valid('standard', 'premium', 'exclusive', 'luxury').optional(),
  cashback: Joi.object({
    percentage: Joi.number().min(0).max(100),
    maxAmount: Joi.number().min(0).optional(),
    minPurchase: Joi.number().min(0).optional(),
    earlyBirdBonus: Joi.number().min(0).optional(),
  }).optional(),
  mallCategory: Joi.string().pattern(objectIdPattern).optional().allow(null),
  badges: Joi.array().items(Joi.string().trim().max(50)).optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  isLuxury: Joi.boolean().optional(),
  isNewArrival: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
}).min(1).options({ stripUnknown: true });

// ==================== CATEGORY SCHEMAS ====================

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  slug: Joi.string().trim().max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  icon: Joi.string().trim().max(50).required(),
  image: Joi.string().trim().optional().allow(''),
  color: Joi.string().trim().max(20).default('#1a3a52'),
  backgroundColor: Joi.string().trim().max(20).optional().allow(''),
  maxCashback: Joi.number().min(0).max(100).default(0),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
}).options({ stripUnknown: true });

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().max(100).optional(),
  slug: Joi.string().trim().max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  icon: Joi.string().trim().max(50).optional(),
  image: Joi.string().trim().optional().allow(''),
  color: Joi.string().trim().max(20).optional(),
  backgroundColor: Joi.string().trim().max(20).optional().allow(''),
  maxCashback: Joi.number().min(0).max(100).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
}).min(1).options({ stripUnknown: true });

// ==================== COLLECTION SCHEMAS ====================

export const createCollectionSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  slug: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  image: Joi.string().trim().uri().required(),
  type: Joi.string().valid('curated', 'seasonal', 'trending', 'personalized').default('curated'),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  validFrom: Joi.date().iso().optional(),
  validUntil: Joi.date().iso().optional(),
}).options({ stripUnknown: true });

export const updateCollectionSchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  slug: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  image: Joi.string().trim().uri().optional(),
  type: Joi.string().valid('curated', 'seasonal', 'trending', 'personalized').optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  validFrom: Joi.date().iso().optional(),
  validUntil: Joi.date().iso().optional(),
}).min(1).options({ stripUnknown: true });

// ==================== OFFER SCHEMAS ====================

export const createOfferSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  subtitle: Joi.string().trim().max(200).optional().allow(''),
  description: Joi.string().trim().max(1000).optional().allow(''),
  image: Joi.string().trim().uri().required(),
  brand: Joi.string().pattern(objectIdPattern).optional(),
  store: Joi.string().pattern(objectIdPattern).optional(),
  offerType: Joi.string().valid('cashback', 'discount', 'coins', 'combo').default('cashback'),
  value: Joi.number().min(0).required(),
  valueType: Joi.string().valid('percentage', 'fixed').default('percentage'),
  extraCoins: Joi.number().min(0).default(0),
  validFrom: Joi.date().iso().required(),
  validUntil: Joi.date().iso().required(),
  isActive: Joi.boolean().default(true),
  minPurchase: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).optional(),
  usageLimit: Joi.number().integer().min(0).optional(),
  isMallExclusive: Joi.boolean().default(true),
  badge: Joi.string().valid('limited-time', 'mall-exclusive', 'flash-sale', 'best-deal', '').optional().allow(''),
  priority: Joi.number().integer().min(0).default(0),
  termsAndConditions: Joi.array().items(Joi.string().trim().max(500)).optional(),
}).custom((value, helpers) => {
  const hasBrand = !!value.brand;
  const hasStore = !!value.store;
  if (!hasBrand && !hasStore) {
    return helpers.error('any.custom', { message: 'Either brand or store must be provided' });
  }
  if (hasBrand && hasStore) {
    return helpers.error('any.custom', { message: 'Only one of brand or store can be set, not both' });
  }
  return value;
}).options({ stripUnknown: true });

export const updateOfferSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  subtitle: Joi.string().trim().max(200).optional().allow(''),
  description: Joi.string().trim().max(1000).optional().allow(''),
  image: Joi.string().trim().uri().optional(),
  brand: Joi.string().pattern(objectIdPattern).optional().allow(null),
  store: Joi.string().pattern(objectIdPattern).optional().allow(null),
  offerType: Joi.string().valid('cashback', 'discount', 'coins', 'combo').optional(),
  value: Joi.number().min(0).optional(),
  valueType: Joi.string().valid('percentage', 'fixed').optional(),
  extraCoins: Joi.number().min(0).optional(),
  validFrom: Joi.date().iso().optional(),
  validUntil: Joi.date().iso().optional(),
  isActive: Joi.boolean().optional(),
  minPurchase: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).optional(),
  usageLimit: Joi.number().integer().min(0).optional(),
  isMallExclusive: Joi.boolean().optional(),
  badge: Joi.string().valid('limited-time', 'mall-exclusive', 'flash-sale', 'best-deal', '').optional().allow(''),
  priority: Joi.number().integer().min(0).optional(),
  termsAndConditions: Joi.array().items(Joi.string().trim().max(500)).optional(),
}).min(1).options({ stripUnknown: true });

// ==================== BANNER SCHEMAS ====================

export const createBannerSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  subtitle: Joi.string().trim().max(300).optional().allow(''),
  badge: Joi.string().trim().max(50).optional().allow(''),
  image: Joi.string().trim().required(),
  backgroundColor: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#00C06A'),
  gradientColors: Joi.array().items(Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)).optional(),
  textColor: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default('#FFFFFF'),
  ctaText: Joi.string().trim().max(50).optional().default('Shop Now'),
  ctaAction: Joi.string().valid('navigate', 'external', 'brand', 'category', 'collection').optional().default('navigate'),
  ctaUrl: Joi.string().trim().optional().allow(''),
  ctaBrand: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  ctaCategory: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  ctaCollection: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  position: Joi.string().valid('hero', 'inline', 'footer').default('hero'),
  priority: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  validFrom: Joi.date().iso().required(),
  validUntil: Joi.date().iso().required(),
}).options({ stripUnknown: true });

export const updateBannerSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  subtitle: Joi.string().trim().max(300).optional().allow(''),
  badge: Joi.string().trim().max(50).optional().allow(''),
  image: Joi.string().trim().optional(),
  backgroundColor: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  gradientColors: Joi.array().items(Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)).optional(),
  textColor: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  ctaText: Joi.string().trim().max(50).optional(),
  ctaAction: Joi.string().valid('navigate', 'external', 'brand', 'category', 'collection').optional(),
  ctaUrl: Joi.string().trim().optional().allow(''),
  ctaBrand: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  ctaCategory: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  ctaCollection: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  position: Joi.string().valid('hero', 'inline', 'footer').optional(),
  priority: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  validFrom: Joi.date().iso().optional(),
  validUntil: Joi.date().iso().optional(),
}).min(1).options({ stripUnknown: true });

// ==================== ALLIANCE ADMIN SCHEMA ====================

export const toggleAllianceSchema = Joi.object({
  alliance: Joi.boolean().required(),
});
