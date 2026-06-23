/**
 * Admin: MallBrand Management Routes
 *
 * CRUD for affiliate brands (Amazon, Myntra, Flipkart, etc.)
 * that appear in the Cash Store brand browser.
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { MallBrand } from '../../models/MallBrand';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';

const router = Router();

// All routes require admin auth
router.use(authenticate);
router.use(requireAdmin);

// ─── Validation Schema ───────────────────────────────────────────────────────

const createBrandSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).trim(),
  slug: Joi.string().required().min(2).max(100).trim().lowercase(),
  logo: Joi.string().uri().required(),
  description: Joi.string().max(500).optional().allow(''),
  externalUrl: Joi.string().uri().required(),
  category: Joi.string().required(),
  cashback: Joi.object({
    percentage: Joi.number().min(0).max(100).required(),
    maxAmount: Joi.number().min(0).optional(),
    minPurchase: Joi.number().min(0).optional(),
  }).required(),
  rezCoinReward: Joi.object({
    coinsPerHundred: Joi.number().min(0).max(50).required(),
    maximumCoinsPerOrder: Joi.number().min(0).default(10000),
    minimumOrderAmount: Joi.number().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }).required(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  tier: Joi.string().valid('standard', 'featured', 'premium').default('standard'),
  tags: Joi.array().items(Joi.string()).default([]),
  affiliateConfig: Joi.object({
    network: Joi.string().valid('direct', 'cuelinks', 'vcommission', 'impact', 'other').optional(),
    merchantId: Joi.string().optional(),
    trackingTemplate: Joi.string().optional(),
    callbackFormat: Joi.string().valid('json', 'query').optional(),
  }).optional(),
});

const updateBrandSchema = createBrandSchema.fork(
  ['name', 'slug', 'logo', 'externalUrl', 'category', 'cashback', 'rezCoinReward'],
  (s) => s.optional()
);

// ─── GET /api/admin/mall/brands ──────────────────────────────────────────────

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const query: Record<string, unknown> = {};
  if (search) {
    query.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
  }
  if (req.query.active !== undefined) {
    query.isActive = req.query.active === 'true';
  }

  const [brands, total] = await Promise.all([
    MallBrand.find(query)
      .select('name slug logo cashback rezCoinReward isActive isFeatured tier tags analytics externalUrl affiliateConfig createdAt')
      .sort({ isFeatured: -1, 'analytics.totalClicks': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MallBrand.countDocuments(query),
  ]);

  return sendSuccess(res, {
    brands,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, 'Brands fetched');
}));

// ─── GET /api/admin/mall/brands/:id ─────────────────────────────────────────

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const brand = await MallBrand.findById(req.params.id).lean();
  if (!brand) return sendNotFound(res, 'Brand not found');
  return sendSuccess(res, brand, 'Brand fetched');
}));

// ─── POST /api/admin/mall/brands ─────────────────────────────────────────────

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createBrandSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendError(res, error.details.map(d => d.message).join(', '), 400);
  }

  const existing = await MallBrand.findOne({ slug: value.slug }).lean();
  if (existing) {
    return sendError(res, `A brand with slug "${value.slug}" already exists`, 409);
  }

  if (value.rezCoinReward.coinsPerHundred > value.cashback.percentage) {
    return sendError(
      res,
      `coinsPerHundred (${value.rezCoinReward.coinsPerHundred}) cannot exceed brand cashback% (${value.cashback.percentage}). REZ must remain profitable.`,
      400
    );
  }

  const brand = new MallBrand(value);
  await brand.save();

  return sendSuccess(res, brand.toObject(), 'Brand created successfully');
}));

// ─── PUT /api/admin/mall/brands/:id ─────────────────────────────────────────

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = updateBrandSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendError(res, error.details.map(d => d.message).join(', '), 400);
  }

  if (value.rezCoinReward?.coinsPerHundred !== undefined && value.cashback?.percentage !== undefined) {
    if (value.rezCoinReward.coinsPerHundred > value.cashback.percentage) {
      return sendError(
        res,
        `coinsPerHundred (${value.rezCoinReward.coinsPerHundred}) cannot exceed brand cashback% (${value.cashback.percentage}).`,
        400
      );
    }
  }

  const brand = await MallBrand.findByIdAndUpdate(
    req.params.id,
    { $set: value },
    { new: true }
  ).lean();

  if (!brand) return sendNotFound(res, 'Brand not found');

  return sendSuccess(res, brand, 'Brand updated successfully');
}));

// ─── PATCH /api/admin/mall/brands/:id/toggle ────────────────────────────────

router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const brand = await MallBrand.findById(req.params.id);
  if (!brand) return sendNotFound(res, 'Brand not found');

  (brand as any).isActive = !(brand as any).isActive;
  await brand.save();

  return sendSuccess(res, { isActive: (brand as any).isActive }, 'Brand status toggled');
}));

// ─── DELETE /api/admin/mall/brands/:id ──────────────────────────────────────

router.delete('/:id', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const brand = await MallBrand.findById(req.params.id);
  if (!brand) return sendNotFound(res, 'Brand not found');

  await MallBrand.findByIdAndDelete(req.params.id);

  return sendSuccess(res, null, 'Brand deleted successfully');
}));

export default router;
