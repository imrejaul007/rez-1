import { Router } from 'express';
import {
  getTypes,
  getPlans,
  getFeaturedPlans,
  getPlanDetail,
} from '../controllers/insuranceController';

const router = Router();

/**
 * @route   GET /api/insurance/types
 * @desc    Get distinct insurance types with plan counts
 * @access  Public
 */
router.get('/types', getTypes);

/**
 * @route   GET /api/insurance/featured
 * @desc    Get top featured insurance plans
 * @access  Public
 */
router.get('/featured', getFeaturedPlans);

/**
 * @route   GET /api/insurance/plans
 * @desc    Get paginated insurance plans (filterable by type)
 * @query   type - Insurance type filter (health|life|vehicle|travel|home|business)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 50)
 * @access  Public
 */
router.get('/plans', getPlans);

/**
 * @route   GET /api/insurance/plans/:id
 * @desc    Get insurance plan detail by ID
 * @access  Public
 */
router.get('/plans/:id', getPlanDetail);

export default router;
