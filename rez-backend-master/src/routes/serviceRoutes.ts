import { Router } from 'express';
import {
  getServices,
  getPopularServices,
  getNearbyServices,
  getServiceById,
  getRelatedServices,
  getFeaturedServices,
  searchServices
} from '../controllers/serviceController';

const router = Router();

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services with filters
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug filter
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [home, store, online]
 *         description: Service type filter
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Minimum rating filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, newest, popular]
 *         description: Sort order
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Store ID filter
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/', getServices);

/**
 * @swagger
 * /api/services/popular:
 *   get:
 *     summary: Get popular services for homepage
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of popular services
 */
router.get('/popular', getPopularServices);

/**
 * @swagger
 * /api/services/nearby:
 *   get:
 *     summary: Get nearby services based on user location
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User latitude
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in km (default 10)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug filter
 *     responses:
 *       200:
 *         description: List of nearby services
 *       400:
 *         description: Latitude and longitude required
 */
router.get('/nearby', getNearbyServices);

/**
 * @swagger
 * /api/services/featured:
 *   get:
 *     summary: Get featured services for homepage
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of featured services
 */
router.get('/featured', getFeaturedServices);

/**
 * @swagger
 * /api/services/search:
 *   get:
 *     summary: Search services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug filter
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [home, store, online]
 *         description: Service type filter
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid search query
 */
router.get('/search', searchServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service details
 *       400:
 *         description: Invalid service ID
 *       404:
 *         description: Service not found
 */
router.get('/:id', getServiceById);

/**
 * @swagger
 * /api/services/{id}/related:
 *   get:
 *     summary: Get related services
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of related services to return
 *     responses:
 *       200:
 *         description: List of related services
 *       404:
 *         description: Service not found
 */
router.get('/:id/related', getRelatedServices);

export default router;
