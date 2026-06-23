import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { Store } from '../models/Store';
import redisService from '../services/redisService';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const CACHE_KEY = 'platform:stats';
const CACHE_TTL = 300; // 5 minutes

export const getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
    // Check Redis cache first
    const cached = await redisService.get<{ averageRating: number; totalStores: number }>(CACHE_KEY);
    if (cached) {
      return sendSuccess(res, cached, 'Platform stats retrieved (cached)');
    }

    // Aggregate average rating from active stores that have ratings
    const [ratingResult, totalStores] = await Promise.all([
      Store.aggregate([
        { $match: { isActive: true, 'ratings.average': { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$ratings.average' } } },
      ]),
      Store.countDocuments({ isActive: true }),
    ]);

    const averageRating = ratingResult.length > 0
      ? Math.round(ratingResult[0].avg * 10) / 10
      : 0;

    const stats = { averageRating, totalStores };

    // Cache in Redis
    await redisService.set(CACHE_KEY, stats, CACHE_TTL);

    return sendSuccess(res, stats, 'Platform stats retrieved');
});
