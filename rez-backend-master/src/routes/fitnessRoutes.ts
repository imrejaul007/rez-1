import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { Product } from '../models/Product';
import { logger } from '../config/logger';

const router = Router();

// All fitness routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/fitness/stores/:storeId/plans
 * @desc    Get membership plans for a fitness store
 * @access  Private
 */
router.get('/stores/:storeId/plans', asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    // Query products that are fitness membership plans for this store
    const plans = await Product.find({
      store: storeId,
      isActive: true,
      $or: [
        { type: 'service' },
        { 'category.slug': { $in: ['membership', 'fitness-membership', 'gym-membership'] } },
        { tags: { $in: ['membership', 'fitness-plan', 'gym-plan'] } },
      ],
    })
      .select('name description price pricing images tags metadata')
      .sort({ 'pricing.selling': 1, 'price.current': 1 })
      .lean();

    return res.json({ success: true, data: plans });
  } catch (error) {
    logger.error('Error fetching fitness plans:', error);
    return res.json({ success: true, data: [] });
  }
}));

/**
 * @route   GET /api/fitness/stores/:storeId/classes
 * @desc    Get class schedule for a fitness store
 * @access  Private
 */
router.get('/stores/:storeId/classes', asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    // Query products tagged as fitness classes for this store
    const classes = await Product.find({
      store: storeId,
      isActive: true,
      $or: [
        { 'category.slug': { $in: ['fitness-class', 'group-class', 'yoga', 'zumba', 'crossfit'] } },
        { tags: { $in: ['fitness-class', 'group-class', 'yoga', 'zumba', 'crossfit', 'pilates', 'spin'] } },
      ],
    })
      .select('name description price pricing images tags metadata')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: classes });
  } catch (error) {
    logger.error('Error fetching fitness classes:', error);
    return res.json({ success: true, data: [] });
  }
}));

export default router;
