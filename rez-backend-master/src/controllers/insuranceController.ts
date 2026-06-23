import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { sendSuccess, sendError, sendPaginated, sendNotFound } from '../utils/response';
import InsurancePlan from '../models/InsurancePlan';
import redisService from '../services/redisService';
import mongoose from 'mongoose';

const INSURANCE_TYPES_CACHE_KEY = 'insurance:types';
const INSURANCE_FEATURED_CACHE_KEY = 'insurance:featured';
const CACHE_TTL_SHARED = 300; // 5 minutes for shared/public data

/**
 * GET /api/insurance/types
 * Aggregate distinct insurance types with plan counts
 */
export const getTypes = asyncHandler(async (req: Request, res: Response) => {
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();
  const cacheKey = `${INSURANCE_TYPES_CACHE_KEY}:${region || 'all'}`;

  // Try cache first
  const cached = await redisService.get<any[]>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Insurance types fetched successfully');
  }

  const matchFilter: any = { isActive: true };
  if (region) {
    matchFilter.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  const types = await InsurancePlan.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        maxCashback: { $max: '$cashbackPercent' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result = types.map((t) => ({
    type: t._id,
    count: t.count,
    maxCashback: t.maxCashback,
  }));

  // Cache for 5 minutes
  await redisService.set(cacheKey, result, CACHE_TTL_SHARED);

  return sendSuccess(res, result, 'Insurance types fetched successfully');
});

/**
 * GET /api/insurance/plans?type=health&page=1&limit=10
 * Paginated, filterable insurance plans
 */
export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const type = req.query.type as string | undefined;

  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const filter: Record<string, any> = { isActive: true };
  if (type && ['health', 'life', 'vehicle', 'travel', 'home', 'business'].includes(type)) {
    filter.type = type;
  }
  if (region) {
    filter.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  const [plans, total] = await Promise.all([
    InsurancePlan.find(filter)
      .sort({ sortOrder: 1, rating: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InsurancePlan.countDocuments(filter),
  ]);

  return sendPaginated(res, plans, page, limit, total, 'Insurance plans fetched successfully');
});

/**
 * GET /api/insurance/featured
 * Top featured plans, cached
 */
export const getFeaturedPlans = asyncHandler(async (req: Request, res: Response) => {
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();
  const featuredCacheKey = `${INSURANCE_FEATURED_CACHE_KEY}:${region || 'all'}`;

  const cached = await redisService.get<any[]>(featuredCacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Featured insurance plans fetched successfully');
  }

  const featuredFilter: any = { isActive: true, isFeatured: true };
  if (region) {
    featuredFilter.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  const plans = await InsurancePlan.find(featuredFilter)
    .sort({ sortOrder: 1, rating: -1 })
    .limit(10)
    .lean();

  await redisService.set(featuredCacheKey, plans, CACHE_TTL_SHARED);

  return sendSuccess(res, plans, 'Featured insurance plans fetched successfully');
});

/**
 * GET /api/insurance/plans/:id
 * Single plan detail
 */
export const getPlanDetail = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid plan ID', 400);
  }

  const cacheKey = `insurance:plan:${id}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Insurance plan fetched successfully');
  }

  const plan = await InsurancePlan.findOne({ _id: id, isActive: true }).lean();
  if (!plan) {
    return sendNotFound(res, 'Insurance plan not found');
  }

  await redisService.set(cacheKey, plan, CACHE_TTL_SHARED);

  return sendSuccess(res, plan, 'Insurance plan fetched successfully');
});
