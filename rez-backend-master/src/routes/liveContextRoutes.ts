// @ts-nocheck
import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { Store } from '../models/Store';
import Offer from '../models/Offer';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

const router = Router();

/**
 * Determine time slot from current hour (UTC).
 *   morning : 06–10 (6 <= h < 11)
 *   lunch   : 11–13 (11 <= h < 14)
 *   evening : 14–19 (14 <= h < 20)
 *   night   : 20–05 (h >= 20 || h < 6)
 */
function getTimeSlot(hour: number): 'morning' | 'lunch' | 'evening' | 'night' {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 20) return 'evening';
  return 'night';
}

/**
 * @route   GET /api/home/live-context
 * @desc    Returns a lightweight location-aware snapshot: nearby store count,
 *          active offer count, top deal, and current time slot.
 * @access  Public (optionalAuth — works with or without an auth token)
 * @query   {number} lat - Latitude  (optional, defaults to 0)
 * @query   {number} lng - Longitude (optional, defaults to 0)
 *
 * @example
 * GET /api/home/live-context?lat=12.97&lng=77.59
 */
router.get(
  '/live-context',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    // ── 1. Parse coordinates ──────────────────────────────────────────
    const rawLat = parseFloat(req.query.lat as string);
    const rawLng = parseFloat(req.query.lng as string);
    const lat = isNaN(rawLat) ? 0 : rawLat;
    const lng = isNaN(rawLng) ? 0 : rawLng;

    // ── 2. Round to 2 decimal places for cache key granularity ────────
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLng = Math.round(lng * 100) / 100;
    const cacheKey = `live-ctx:${roundedLat}:${roundedLng}`;

    // ── 3. Redis cache check (TTL 60 s) ───────────────────────────────
    const cached = await redisService.get<object>(cacheKey);
    if (cached !== null) {
      return sendSuccess(res, cached);
    }

    // ── 4. Build geo query (1 km radius) ─────────────────────────────
    const geoQuery = {
      $geoWithin: {
        $centerSphere: [[lng, lat], 1 / 6378.1], // 1 km in radians
      },
    };

    const now = new Date();

    // ── 5. Parallel DB queries ────────────────────────────────────────
    const [nearbyStoreCount, nearbyOfferCount, topDealDoc] = await Promise.all([
      Store.countDocuments({
        'location.coordinates': geoQuery,
        isActive: true,
      }).catch((err) => {
        logger.warn('[LiveContext] nearbyStoreCount query failed', { error: err.message });
        return 0;
      }),

      Offer.countDocuments({
        'location.coordinates': geoQuery,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now },
      }).catch((err) => {
        logger.warn('[LiveContext] nearbyOfferCount query failed', { error: err.message });
        return 0;
      }),

      Offer.findOne({
        'location.coordinates': geoQuery,
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now },
      })
        .select(
          'store.id store.name title restrictions.maxDiscountAmount cashbackPercentage originalPrice discountedPrice',
        )
        .sort({ 'metadata.priority': -1, 'restrictions.maxDiscountAmount': -1 })
        .lean()
        .catch((err) => {
          logger.warn('[LiveContext] topDeal query failed', { error: err.message });
          return null;
        }),
    ]);

    // ── 6. Format topDeal ─────────────────────────────────────────────
    let topDeal: {
      storeId: string;
      storeName: string;
      offerTitle: string;
      savingsAmount: number;
      distance: string;
    } | null = null;

    if (topDealDoc) {
      const doc = topDealDoc as any;
      // Best-effort savings amount: maxDiscountAmount, or price diff, or 0
      const savingsAmount =
        doc.restrictions?.maxDiscountAmount ||
        (doc.originalPrice && doc.discountedPrice ? doc.originalPrice - doc.discountedPrice : 0) ||
        0;

      topDeal = {
        storeId: String(doc.store?.id ?? ''),
        storeName: doc.store?.name ?? '',
        offerTitle: doc.title ?? '',
        savingsAmount,
        distance: '< 1km', // precise distance calc skipped for this lightweight endpoint
      };
    }

    // ── 7. Time slot ──────────────────────────────────────────────────
    const timeSlot = getTimeSlot(new Date().getUTCHours());

    // ── 8. Build response payload ─────────────────────────────────────
    const payload = {
      nearbyStoreCount,
      nearbyOfferCount,
      topDeal,
      timeSlot,
      cachedAt: new Date().toISOString(),
    };

    // ── 9. Cache for 60 s ─────────────────────────────────────────────
    await redisService
      .set(cacheKey, payload, 60)
      .catch((err) => logger.warn('[LiveContext] Cache set failed', { error: err.message }));

    return sendSuccess(res, payload);
  }),
);

export default router;
