import { Router, Request, Response } from 'express';
import {
  getHomeServicesCategories,
  getFeaturedHomeServices,
  getHomeServicesByCategory,
  getHomeServicesStats,
  getPopularHomeServices
} from '../controllers/homeServicesController';
import { optionalAuth, authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

const router = Router();

/**
 * @swagger
 * /api/home-services/categories:
 *   get:
 *     summary: Get home services categories for homepage
 *     tags: [Home Services]
 *     responses:
 *       200:
 *         description: List of home services categories
 */
router.get('/categories', optionalAuth, getHomeServicesCategories);

/**
 * @swagger
 * /api/home-services/featured:
 *   get:
 *     summary: Get featured home services for homepage
 *     tags: [Home Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of featured home services
 */
router.get('/featured', optionalAuth, getFeaturedHomeServices);

/**
 * @swagger
 * /api/home-services/popular:
 *   get:
 *     summary: Get popular home services
 *     tags: [Home Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of popular home services
 */
router.get('/popular', optionalAuth, getPopularHomeServices);

/**
 * @swagger
 * /api/home-services/stats:
 *   get:
 *     summary: Get home services statistics
 *     tags: [Home Services]
 *     responses:
 *       200:
 *         description: Home services statistics
 */
router.get('/stats', optionalAuth, getHomeServicesStats);

/**
 * @swagger
 * /api/home-services/category/:slug:
 *   get:
 *     summary: Get home services by category
 *     tags: [Home Services]
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
 *         description: List of home services in category
 */
router.get('/category/:slug', optionalAuth, getHomeServicesByCategory);

/**
 * @route   POST /api/home-services/book
 * @desc    Book a home service (delegates to ServiceAppointment)
 * @access  Private
 */
router.post('/book', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { storeId, serviceType, appointmentDate, appointmentTime, duration, customerName, customerPhone, specialInstructions } = req.body;

  if (!storeId || !serviceType || !appointmentDate || !appointmentTime || !customerName || !customerPhone) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }

  const { ServiceAppointment } = await import('../models/ServiceAppointment');
  const appointmentNumber = await (ServiceAppointment as any).generateAppointmentNumber();

  const appointment = await ServiceAppointment.create({
    appointmentNumber,
    store: storeId,
    user: userId,
    serviceType,
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    duration: duration || 60,
    customerName,
    customerPhone,
    specialInstructions,
    status: 'pending',
  });

  logger.info(`✅ [HOME SERVICE] Booked ${serviceType} for store ${storeId}`);

  res.status(201).json({ success: true, data: appointment, message: 'Home service booked successfully' });
}));

export default router;
