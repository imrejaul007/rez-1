import { Router } from 'express';
import { getNearbyActivity, getCityWideStats } from '../controllers/socialProofController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/social-proof/nearby-activity
 * @desc    Get nearby user activity for social proof display
 * @access  Public (no auth required for social proof visibility)
 * @query   latitude: number (required) - User's latitude
 * @query   longitude: number (required) - User's longitude
 * @query   radius: number (optional) - Search radius in km, default 5
 * @query   limit: number (optional) - Max results, default 10
 * @query   city: string (optional) - City name for fallback stats
 */
router.get('/nearby-activity', getNearbyActivity);

/**
 * @route   GET /api/social-proof/city-stats
 * @desc    Get city-wide statistics when no nearby activity available
 * @access  Public
 * @query   city: string (required) - City name
 */
router.get('/city-stats', getCityWideStats);

export default router;
