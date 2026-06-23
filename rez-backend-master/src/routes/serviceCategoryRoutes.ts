import { Router } from 'express';
import {
  getServiceCategories,
  getServiceCategoryBySlug,
  getServicesInCategory,
  getChildCategories
} from '../controllers/serviceCategoryController';

const router = Router();

/**
 * @swagger
 * /api/service-categories:
 *   get:
 *     summary: Get all active service categories
 *     tags: [Service Categories]
 *     parameters:
 *       - in: query
 *         name: includeCount
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Include service count for each category
 *     responses:
 *       200:
 *         description: List of service categories
 */
router.get('/', getServiceCategories);

/**
 * @swagger
 * /api/service-categories/{slug}:
 *   get:
 *     summary: Get a service category by slug
 *     tags: [Service Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *     responses:
 *       200:
 *         description: Service category details
 *       404:
 *         description: Category not found
 */
router.get('/:slug', getServiceCategoryBySlug);

/**
 * @swagger
 * /api/service-categories/{slug}/services:
 *   get:
 *     summary: Get services in a category
 *     tags: [Service Categories]
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
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, newest, popular]
 *         description: Sort order
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
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [home, store, online]
 *         description: Service type filter
 *     responses:
 *       200:
 *         description: List of services in category
 *       404:
 *         description: Category not found
 */
router.get('/:slug/services', getServicesInCategory);

/**
 * @swagger
 * /api/service-categories/{slug}/children:
 *   get:
 *     summary: Get child categories of a parent category
 *     tags: [Service Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent category slug
 *     responses:
 *       200:
 *         description: List of child categories
 *       404:
 *         description: Parent category not found
 */
router.get('/:slug/children', getChildCategories);

export default router;
