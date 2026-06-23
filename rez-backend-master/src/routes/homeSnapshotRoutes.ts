// @ts-nocheck
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { withCache } from '../utils/cacheHelper';
import { CacheInvalidator, CacheKeys } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';
import Offer from '../models/Offer';
import { Store } from '../models/Store';
import { UserMission } from '../models/UserMission';
import { Wallet } from '../models/Wallet';
import Campaign from '../models/Campaign';
import { Category } from '../models/Category';
import { TrialOffer } from '../models/TrialOffer';
import streakService from '../services/streakService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/home/snapshot
 * ISSUE #5: Single endpoint for consumer home screen first render.
 * Cached 30s per user. Reduces 5-8 parallel API calls to 1.
 *
 * Aggregates:
 * - Wallet balance (snapshot, 60s TTL)
 * - Current streak
 * - Active offers (5 limit)
 * - Featured stores (12 limit, lite fields)
 * - Active missions (3 limit)
 * - Categories
 * - Active campaigns (4 limit)
 * - Trial offers (8 limit)
 */
router.get(
  '/snapshot',
  authenticate,
  asyncHandler(async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const cacheKey = `home:snapshot:${userId}`;

    const snapshot = await withCache(cacheKey, CacheTTL.HOME_SNAPSHOT || 30, async () => {
      try {
        const [wallet, offers, featuredStores, missions, categories, campaigns, trials] = await Promise.all([
          // Wallet balance (with separate shorter TTL for wallet data)
          (async () => {
            const walletKey = CacheKeys.wallet(userId);
            const cached = await require('../services/redisService').default.get(walletKey);
            if (cached) return cached;

            const w = await Wallet.findOne({ user: userId }).select('balance coins tier').lean();
            const walletData = w || { balance: { total: 0, available: 0 }, coins: [] };

            // Cache wallet separately with 60s TTL (wallets change frequently)
            await require('../services/redisService')
              .default.set(walletKey, walletData, 60)
              .catch(() => {});
            return walletData;
          })(),

          // Active offers (expires in future)
          Offer.find({
            isActive: true,
            expiresAt: { $gt: new Date() },
          })
            .select('title description merchant coinsRequired image category')
            .limit(5)
            .lean(),

          // Featured stores (lite fields only for speed)
          Store.find({ isActive: true, isFeatured: true })
            .select('name slug logo category rating reviewCount address isOpen')
            .limit(12)
            .lean(),

          // Active missions for user
          (UserMission as any)
            .find({ userId, status: 'active' })
            .select('missionId title progress target reward')
            .limit(3)
            .lean(),

          // Categories (rarely change, good cache candidate)
          Category.find({ isActive: true }).sort({ order: 1 }).select('name slug icon color').lean(),

          // Active campaigns
          (async () => {
            try {
              return await Campaign.find({
                isActive: true,
                endDate: { $gt: new Date() },
              })
                .select('title bannerImage discountPct coinReward storeId')
                .limit(4)
                .lean();
            } catch {
              return [];
            }
          })(),

          // Trial offers (active, not expired)
          (async () => {
            try {
              return await TrialOffer.find({
                status: 'active',
              })
                .select('title coinPrice merchantId category images status')
                .limit(8)
                .lean();
            } catch {
              return [];
            }
          })(),
        ]);

        // Get streak if service available (non-critical)
        let streak = null;
        try {
          streak = await streakService.getStreakStats(userId);
        } catch (err) {
          // Log but don't throw — streak is optional
          logger.warn(`[HomeSnapshot] Failed to fetch streak for ${userId}:`, err);
        }

        return {
          wallet: wallet || { balance: { total: 0, available: 0 }, coins: [] },
          streak,
          offers: offers || [],
          featuredStores: featuredStores || [],
          missions: missions || [],
          categories: categories || [],
          campaigns: campaigns || [],
          trials: trials || [],
          snapshotAt: new Date().toISOString(),
        };
      } catch (err) {
        logger.error(`[HomeSnapshot] Error fetching snapshot for ${userId}:`, err);
        throw err;
      }
    });

    return sendSuccess(res, snapshot, 'Home snapshot loaded', 200);
  }),
);

export default router;
