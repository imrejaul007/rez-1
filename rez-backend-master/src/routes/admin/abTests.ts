// @ts-nocheck
import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import AbTest, { IAbTest } from '../../models/AbTest';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/ab-tests
 * @desc    Get all A/B tests (sorted by createdAt descending)
 * @access  Admin
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tests = await AbTest.find().sort({ createdAt: -1 });
    return sendSuccess(res, tests, 'A/B tests retrieved');
  }),
);

/**
 * @route   GET /api/admin/ab-tests/:id
 * @desc    Get a single A/B test by ID
 * @access  Admin
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const test = await AbTest.findOne({ id });

    if (!test) {
      return res.status(404).json({ success: false, error: 'A/B test not found' });
    }

    return sendSuccess(res, test, 'A/B test retrieved');
  }),
);

/**
 * @route   POST /api/admin/ab-tests
 * @desc    Create a new A/B test
 * @access  Admin
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { id, name, startDate, variants, metric } = req.body;

    // Basic validation
    if (!id || !name || !variants || !Array.isArray(variants) || variants.length === 0 || !metric) {
      return res.status(400).json({
        success: false,
        error: 'id, name, variants (array), and metric are required',
      });
    }

    // Check if test with this ID already exists
    const existing = await AbTest.findOne({ id });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A/B test with this ID already exists',
      });
    }

    const test = new AbTest({
      id,
      name,
      startDate: startDate || new Date(),
      variants,
      metric,
      status: 'running',
    });

    await test.save();
    logger.info(`[ADMIN] A/B test created: ${id}`);
    return sendSuccess(res, test, 'A/B test created', 201);
  }),
);

/**
 * @route   PATCH /api/admin/ab-tests/:id
 * @desc    Update A/B test status or declare winner
 * @access  Admin
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, winner, endDate } = req.body;

    const updates: any = {};
    if (status && ['running', 'paused', 'completed'].includes(status)) {
      updates.status = status;
    }
    if (winner) {
      updates.winner = winner;
    }
    if (endDate) {
      updates.endDate = new Date(endDate);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one of status, winner, or endDate is required',
      });
    }

    const test = await AbTest.findOneAndUpdate({ id }, updates, { new: true, runValidators: true });

    if (!test) {
      return res.status(404).json({ success: false, error: 'A/B test not found' });
    }

    logger.info(`[ADMIN] A/B test updated: ${id}`, { updates });
    return sendSuccess(res, test, 'A/B test updated');
  }),
);

/**
 * Initialize default A/B tests if collection is empty
 */
async function initializeAbTests() {
  try {
    const count = await AbTest.countDocuments();
    if (count === 0) {
      const defaultTests = [
        {
          id: 'checkout-button-color',
          name: 'Checkout Button Color',
          status: 'running' as const,
          startDate: new Date(),
          variants: [
            { name: 'Control (Mustard)', allocation: 50, conversions: 1245, impressions: 5230 },
            { name: 'Variant (Teal)', allocation: 50, conversions: 1420, impressions: 5100 },
          ],
          metric: 'checkout_completion',
        },
        {
          id: 'homepage-hero-banner',
          name: 'Homepage Hero Banner',
          status: 'running' as const,
          startDate: new Date(),
          variants: [
            { name: 'Control (Coin Drop)', allocation: 50, conversions: 3210, impressions: 12500 },
            { name: 'Variant (Services)', allocation: 50, conversions: 3450, impressions: 12200 },
          ],
          metric: 'store_click',
        },
        {
          id: 'notification-timing',
          name: 'Notification Timing',
          status: 'paused' as const,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          variants: [
            { name: 'Control (Morning)', allocation: 50, conversions: 890, impressions: 4200 },
            { name: 'Variant (Evening)', allocation: 50, conversions: 750, impressions: 4100 },
          ],
          metric: 'open_rate',
        },
        {
          id: 'onboarding-flow',
          name: 'Onboarding Flow',
          status: 'completed' as const,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          variants: [
            { name: 'Control (3-Step)', allocation: 50, conversions: 2100, impressions: 8500 },
            { name: 'Variant (5-Step)', allocation: 50, conversions: 2380, impressions: 8400 },
          ],
          metric: 'profile_complete',
          winner: 'Variant (5-Step)',
        },
      ];

      await AbTest.insertMany(defaultTests);
      logger.info('[ADMIN] Default A/B tests initialized');
    }
  } catch (error) {
    logger.error('[ADMIN] Failed to initialize A/B tests:', error);
  }
}

// Initialize A/B tests on module load
initializeAbTests();

export default router;
