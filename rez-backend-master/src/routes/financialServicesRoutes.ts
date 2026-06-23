import { Router, Request, Response } from 'express';
import {
  getFinancialCategories,
  getFeaturedFinancialServices,
  getFinancialStats,
  getFinancialServicesByCategory,
  getFinancialServiceById,
  searchFinancialServices,
} from '../controllers/financialServicesController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

const router = Router();

/**
 * @swagger
 * /api/financial-services/categories:
 *   get:
 *     summary: Get all financial service categories
 *     tags: [Financial Services]
 *     responses:
 *       200:
 *         description: List of financial service categories
 */
router.get('/categories', getFinancialCategories);

/**
 * @swagger
 * /api/financial-services/featured:
 *   get:
 *     summary: Get featured financial services
 *     tags: [Financial Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of services to return
 *     responses:
 *       200:
 *         description: List of featured financial services
 */
router.get('/featured', getFeaturedFinancialServices);

/**
 * @swagger
 * /api/financial-services/stats:
 *   get:
 *     summary: Get financial services statistics
 *     tags: [Financial Services]
 *     responses:
 *       200:
 *         description: Financial services statistics
 */
router.get('/stats', getFinancialStats);

/**
 * @swagger
 * /api/financial-services/category/:slug:
 *   get:
 *     summary: Get financial services by category
 *     tags: [Financial Services]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug (bills, ott, recharge, gold, insurance, offers)
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
 *           enum: [rating, price_low, price_high, newest, popular]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of financial services in category
 */
router.get('/category/:slug', getFinancialServicesByCategory);

/**
 * @swagger
 * /api/financial-services/search:
 *   get:
 *     summary: Search financial services
 *     tags: [Financial Services]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
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
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', searchFinancialServices);

/**
 * @swagger
 * /api/financial-services/:id:
 *   get:
 *     summary: Get financial service by ID
 *     tags: [Financial Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Financial service details
 */
router.get('/:id', getFinancialServiceById);

/**
 * @route   POST /api/financial-services/leads
 * @desc    Submit a financial services lead/application
 * @access  Private
 */
router.post('/leads', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { storeId, serviceType, applicantName, phone, annualIncome, loanAmount, documents, notes } = req.body;

  if (!storeId || !serviceType || !applicantName || !phone) {
    res.status(400).json({ success: false, message: 'Missing required fields: storeId, serviceType, applicantName, phone' });
    return;
  }

  const FinancialLead = (await import('../models/FinancialLead')).default;
  const lead = await FinancialLead.create({
    userId,
    storeId,
    serviceType,
    applicantName,
    phone,
    annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
    loanAmount: loanAmount ? parseFloat(loanAmount) : undefined,
    documents: documents || [],
    notes,
  });

  logger.info(`✅ [FINANCIAL LEAD] Created lead ${lead._id} for user ${userId}`);

  res.status(201).json({ success: true, data: lead, message: 'Application submitted successfully' });
}));

export default router;
