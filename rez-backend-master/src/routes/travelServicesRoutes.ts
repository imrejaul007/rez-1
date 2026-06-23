import { Router, Request, Response } from 'express';
import {
  getTravelServicesCategories,
  getFeaturedTravelServices,
  getTravelServicesByCategory,
  getTravelServicesStats,
  getPopularTravelServices
} from '../controllers/travelServicesController';
import { optionalAuth, authenticate } from '../middleware/auth';
import { cacheMiddleware, createKeyGenerator } from '../middleware/cacheMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

const router = Router();

/**
 * @swagger
 * /api/travel-services/categories:
 *   get:
 *     summary: Get travel service categories for homepage
 *     tags: [Travel Services]
 *     responses:
 *       200:
 *         description: List of travel service categories
 */
router.get(
  '/categories',
  optionalAuth,
  cacheMiddleware({ ttl: 300, keyPrefix: 'travel', condition: () => true }),
  getTravelServicesCategories
);

/**
 * @swagger
 * /api/travel-services/featured:
 *   get:
 *     summary: Get featured travel services for homepage
 *     tags: [Travel Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of featured travel services
 */
router.get(
  '/featured',
  optionalAuth,
  cacheMiddleware({ ttl: 180, keyPrefix: 'travel', condition: () => true }),
  getFeaturedTravelServices
);

/**
 * @swagger
 * /api/travel-services/popular:
 *   get:
 *     summary: Get popular travel services
 *     tags: [Travel Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of popular travel services
 */
router.get(
  '/popular',
  optionalAuth,
  cacheMiddleware({ ttl: 180, keyPrefix: 'travel', condition: () => true }),
  getPopularTravelServices
);

/**
 * @swagger
 * /api/travel-services/stats:
 *   get:
 *     summary: Get travel services statistics
 *     tags: [Travel Services]
 *     responses:
 *       200:
 *         description: Travel services statistics
 */
router.get(
  '/stats',
  optionalAuth,
  cacheMiddleware({ ttl: 300, keyPrefix: 'travel', condition: () => true }),
  getTravelServicesStats
);

/**
 * @swagger
 * /api/travel-services/category/:slug:
 *   get:
 *     summary: Get travel services by category
 *     tags: [Travel Services]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, newest, popular]
 *     responses:
 *       200:
 *         description: List of travel services in category
 */
router.get(
  '/category/:slug',
  optionalAuth,
  cacheMiddleware({
    ttl: 120,
    keyPrefix: 'travel',
    keyGenerator: createKeyGenerator('slug', 'page', 'sortBy', 'limit'),
    condition: () => true,
  }),
  getTravelServicesByCategory
);

/**
 * @route   POST /api/travel-services/plan
 * @desc    Save user's travel plan preferences
 * @access  Private
 */
router.post('/plan', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { destination, startDate, endDate, tripDays, adults, children, accommodation, activities } = req.body;

  if (!destination) {
    res.status(400).json({ success: false, message: 'Destination is required' });
    return;
  }

  // Store travel plan using the User model's preferences
  const { User } = await import('../models/User');
  const plan = {
    destination,
    startDate,
    endDate,
    tripDays: tripDays || 1,
    adults: adults || 1,
    children: children || 0,
    accommodation,
    activities: activities || [],
    createdAt: new Date(),
  };

  await User.findByIdAndUpdate(userId, {
    $push: { 'preferences.travelPlans': { $each: [plan], $slice: -10 } },
  }, { upsert: true });

  logger.info(`✅ [TRAVEL PLAN] Saved travel plan to ${destination} for user ${userId}`);

  res.status(201).json({ success: true, data: plan, message: 'Travel plan saved successfully' });
}));

export default router;
