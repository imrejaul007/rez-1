// @ts-nocheck
/**
 * storeFeedRoutes.ts — Personalized Store Feed
 *
 * GET /api/stores/feed
 *
 * Returns a scored, ranked list of active stores with active offers.
 * Scoring (0-100):
 *   Distance  (40%): closer stores score higher, max 5 km radius
 *   Offer     (30%): store has an active offer
 *   Rating    (20%): proportional to averageRating / 5
 *   Trending  (10%): recent visit streak activity
 *
 * Query params:
 *   userId?  — ObjectId, for interest-based boost
 *   lat?     — latitude
 *   lng?     — longitude
 *   limit    — default 10
 *
 * MUST be mounted BEFORE the general /api/stores router to avoid
 * the /:storeId wildcard absorbing the /feed path.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

const router = Router();

const MAX_DISTANCE_KM = 5;

// ── 2-minute in-memory cache ──────────────────────────────────────────────────
interface FeedCacheEntry {
  data: any;
  expiresAt: number;
}
const feedCache = new Map<string, FeedCacheEntry>();
const FEED_CACHE_TTL_MS = 2 * 60 * 1000;

function getFeedCached(key: string): any | null {
  const entry = feedCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    feedCache.delete(key);
    return null;
  }
  return entry.data;
}

function setFeedCache(key: string, data: any): void {
  feedCache.set(key, { data, expiresAt: Date.now() + FEED_CACHE_TTL_MS });
}

/**
 * Haversine distance in km between two lat/lng pairs.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const lat = req.query.lat !== undefined ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng !== undefined ? parseFloat(req.query.lng as string) : null;
    const userId = req.query.userId as string | undefined;
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const interestsParam = req.query.interests as string | undefined;

    const hasCoords = lat !== null && lng !== null && !isNaN(lat as number) && !isNaN(lng as number);

    // Cache key based on userId + coords + interests
    const cacheKey = `feed:${userId || 'anon'}:${lat ?? ''}:${lng ?? ''}:${interestsParam || ''}:${limit}`;
    const cached = getFeedCached(cacheKey);
    if (cached) {
      res.json({ success: true, fromCache: true, count: cached.length, stores: cached });
      return;
    }

    // Interests from query param (comma-separated) override user profile
    let userInterests: string[] = [];
    if (interestsParam) {
      userInterests = interestsParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (userId && mongoose.isValidObjectId(userId)) {
      // Fetch user interests from profile when no explicit interests param
      try {
        const user = (await User.findById(userId).select('interests').lean()) as any;
        if (user?.interests?.length) {
          userInterests = (user.interests as string[]).map((i: string) => i.toLowerCase());
        }
      } catch (err: any) {
        logger.warn('[StoreFeed] Could not load user interests', { userId, error: err.message });
      }
    }

    // Fetch active stores with location and category
    const now = new Date();

    const stores = await Store.find({ isActive: true })
      .select('_id name logo category location ratings offers tags createdAt')
      .populate('category', 'name slug')
      .lean();

    // Fetch recent streak activity counts (last 7 days) for trending score
    let trendingMap: Map<string, number> = new Map();
    try {
      const UserStreaks = mongoose.connection.collection('userstreaks');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const trendingDocs = await UserStreaks.aggregate([
        {
          $match: {
            type: 'store_visit',
            updatedAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: '$storeId',
            visits: { $sum: '$currentStreak' },
          },
        },
      ]).toArray();

      for (const doc of trendingDocs) {
        if (doc._id) {
          trendingMap.set(String(doc._id), Number(doc.visits) || 0);
        }
      }
    } catch (err: any) {
      logger.warn('[StoreFeed] Could not load trending data', { error: err.message });
    }

    // Normalise trending visits to 0-10 scale
    const maxVisits = trendingMap.size > 0 ? Math.max(...trendingMap.values()) : 1;

    // Fetch active offers — collect storeIds that currently have an active offer
    let activeOfferStoreIds: Set<string> = new Set();
    try {
      // Try CampaignRule model first, fall back to Offer
      const campaignRulesColl = mongoose.connection.collection('campaignrules');
      const activeCampaigns = await campaignRulesColl
        .find(
          {
            isActive: true,
            $or: [{ endDate: { $gte: now } }, { endDate: null }],
          },
          { projection: { storeId: 1 } },
        )
        .toArray();

      for (const c of activeCampaigns) {
        if (c.storeId) activeOfferStoreIds.add(String(c.storeId));
      }
    } catch (err: any) {
      logger.warn('[StoreFeed] Could not load campaign data', { error: err.message });
    }

    // Score each store
    const scored = stores
      .map((store: any) => {
        const storeId = String(store._id);

        // --- Distance score (40 pts) ---
        let distanceScore = 0;
        let distanceKm: number | undefined;
        if (hasCoords && store.location?.coordinates?.length === 2) {
          const [storeLng, storeLat] = store.location.coordinates;
          distanceKm = haversineKm(lat as number, lng as number, storeLat, storeLng);
          if (distanceKm <= MAX_DISTANCE_KM) {
            // Linear: 0 km → 40 pts, MAX_DISTANCE_KM km → 0 pts
            distanceScore = 40 * (1 - distanceKm / MAX_DISTANCE_KM);
          } else {
            // Outside 5 km — exclude from distance scoring but keep in feed
            distanceScore = 0;
          }
        }

        // --- Active offer score (30 pts) ---
        const offerScore = activeOfferStoreIds.has(storeId) ? 30 : 0;

        // --- Rating score (20 pts) ---
        const avgRating = store.ratings?.average ?? 0;
        const ratingScore = (avgRating / 5) * 20;

        // --- Trending score (10 pts) ---
        const visits = trendingMap.get(storeId) || 0;
        const trendingScore = maxVisits > 0 ? (visits / maxVisits) * 10 : 0;

        let total = distanceScore + offerScore + ratingScore + trendingScore;

        // --- Interest boost (+25 pts for category/tag match) ---
        if (userInterests.length > 0) {
          // Match against tags
          const tagSet = new Set(((store.tags as string[]) || []).map((t: string) => t.toLowerCase()));
          const catName = String((store.category as any)?.name || (store.category as any)?.slug || '').toLowerCase();
          const hasMatch = userInterests.some((i) => tagSet.has(i)) || userInterests.some((i) => catName.includes(i));
          if (hasMatch) total += 25;
        }

        // --- Active offer object ---
        let activeOffer: Record<string, any> | null = null;
        if (store.offers?.cashback && store.offers.cashback > 0) {
          activeOffer = { cashback: store.offers.cashback };
        } else if (activeOfferStoreIds.has(storeId)) {
          activeOffer = { isActive: true };
        }

        return {
          _id: storeId,
          name: store.name,
          logo: store.logo || null,
          category: store.category,
          location: store.location
            ? { address: store.location?.address, city: store.location?.city, coordinates: store.location?.coordinates }
            : null,
          distance: distanceKm !== undefined ? Math.round(distanceKm * 100) / 100 : null,
          averageRating: avgRating,
          reviewCount: store.ratings?.count ?? 0,
          activeOffer,
          relevanceScore: Math.round(total * 10) / 10,
        };
      })
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    setFeedCache(cacheKey, scored);

    res.json({
      success: true,
      fromCache: false,
      count: scored.length,
      stores: scored,
    });
  }),
);

export default router;
