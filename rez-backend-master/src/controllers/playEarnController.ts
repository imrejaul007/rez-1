/**
 * Play & Earn Controller
 *
 * Returns configuration data for the Play & Earn page sections.
 * Includes batch endpoint to reduce API calls from ~15 to 1.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { BRAND } from '../config/brand';
import QuickAction from '../models/QuickAction';
import ValueCard from '../models/ValueCard';

/**
 * GET /api/play-earn/shopping-methods
 * Returns the Earn While Shopping section cards
 *
 * These are admin-configurable shopping entry points.
 * Currently returns static config; can later be stored in a DB collection.
 */
export const getShoppingMethods = asyncHandler(async (req: Request, res: Response) => {
  // In the future, fetch from a PlayEarnConfig collection
  // For now, return static config that matches the frontend design
  const shoppingMethods = [
    {
      id: 'online-shopping',
      icon: 'bag',
      title: `Shop Online via ${BRAND.APP_NAME}`,
      description: 'Amazon, Flipkart, Myntra & more',
      reward: 'Up to 8% Cashback',
      extraReward: '+ Branded Coins',
      path: '/cash-store',
      enabled: true,
      order: 1,
    },
    {
      id: 'offline-payment',
      icon: 'storefront',
      title: 'Pay at Partner Stores',
      description: `Instant ${BRAND.COIN_NAME} on every purchase`,
      reward: 'Always Better Price',
      extraReward: '+ First visit bonus',
      path: '/pay-in-store',
      enabled: true,
      order: 2,
    },
    {
      id: 'lock-price',
      icon: 'lock-closed',
      title: 'Lock Price Deals',
      description: 'Lock with 10%, earn on both actions',
      reward: 'Double Earnings',
      extraReward: '+ Pickup bonus',
      path: '/lock-deals',
      enabled: true,
      order: 3,
    },
  ];

  // Filter enabled and sort by order
  const activeMethods = shoppingMethods
    .filter(m => m.enabled)
    .sort((a, b) => a.order - b.order);

  sendSuccess(res, {
    shoppingMethods: activeMethods,
    valueBanner: {
      text: `Pay via ${BRAND.APP_NAME} = Always Better Price`,
      icon: 'locate',
      enabled: true,
    },
  }, 'Shopping methods retrieved');
});

/**
 * GET /api/play-earn/batch
 * Batch endpoint for Play & Earn page — combines multiple data sources
 * into a single response. Reduces frontend API calls from ~18 to 1.
 *
 * Aggregates: streak, challenges, achievements, leaderboard, creators,
 * games, tournaments, bonus campaigns, quick actions, value cards,
 * shopping methods, special programs, event categories
 */
export const getPlayEarnBatch = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const region = (req.headers['x-rez-region'] as string) || 'all';

  // Cache non-personalized data for 2 minutes
  const cacheKey = `play-earn:batch:${region}`;
  const cached = await redisService.get<any>(cacheKey);

  // For non-personalized sections, serve from cache
  let sharedData = cached;

  if (!sharedData) {
    // Fetch all non-personalized data in parallel
    const [
      quickActions,
      valueCards,
      shoppingMethodsData,
    ] = await Promise.all([
      QuickAction.find({ isActive: true }).sort({ priority: -1 }).limit(10).lean().catch(() => []),
      ValueCard.find({ isActive: true }).sort({ priority: -1 }).limit(10).lean().catch(() => []),
      Promise.resolve([
        { id: 'online-shopping', icon: 'bag', title: `Shop Online via ${BRAND.APP_NAME}`, description: 'Amazon, Flipkart, Myntra & more', reward: 'Up to 8% Cashback', extraReward: '+ Branded Coins', path: '/cash-store', enabled: true, order: 1 },
        { id: 'offline-payment', icon: 'storefront', title: 'Pay at Partner Stores', description: `Instant ${BRAND.COIN_NAME} on every purchase`, reward: 'Always Better Price', extraReward: '+ First visit bonus', path: '/pay-in-store', enabled: true, order: 2 },
        { id: 'lock-price', icon: 'lock-closed', title: 'Lock Price Deals', description: 'Lock with 10%, earn on both actions', reward: 'Double Earnings', extraReward: '+ Pickup bonus', path: '/lock-deals', enabled: true, order: 3 },
      ]),
    ]);

    sharedData = {
      quickActions,
      valueCards,
      shoppingMethods: shoppingMethodsData.filter((m: any) => m.enabled).sort((a: any, b: any) => a.order - b.order),
    };

    // Cache shared data for 2 minutes
    redisService.set(cacheKey, sharedData, 120).catch((err) => logger.warn('[PlayEarn] Cache set for shared data failed', { error: err.message }));
  }

  // Per-user data must be fetched fresh (streak, achievements, etc.)
  // These are fetched by the frontend from their individual endpoints
  // This batch endpoint covers the static/shared data that doesn't need auth

  sendSuccess(res, sharedData, 'Play & Earn batch data retrieved');
});
