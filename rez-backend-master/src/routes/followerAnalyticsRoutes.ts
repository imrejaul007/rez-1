import express from 'express';
import {
  getDetailedFollowerAnalytics,
  getFollowerGrowthMetrics,
  getFollowerCount,
  triggerDailySnapshot,
  getFollowerAnalyticsSummary
} from '../controllers/followerAnalyticsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/stores/:storeId/followers/analytics/detailed
 * @desc    Get detailed follower analytics with time series data
 * @access  Private (Store owners/admins)
 * @query   startDate, endDate (optional)
 */
router.get('/:storeId/followers/analytics/detailed', authenticate, getDetailedFollowerAnalytics);

/**
 * @route   GET /api/stores/:storeId/followers/analytics/growth
 * @desc    Get follower growth metrics (weekly & monthly)
 * @access  Private (Store owners/admins)
 */
router.get('/:storeId/followers/analytics/growth', authenticate, getFollowerGrowthMetrics);

/**
 * @route   GET /api/stores/:storeId/followers/analytics/summary
 * @desc    Get quick analytics summary
 * @access  Private (Store owners/admins)
 */
router.get('/:storeId/followers/analytics/summary', authenticate, getFollowerAnalyticsSummary);

/**
 * @route   GET /api/stores/:storeId/followers/count
 * @desc    Get current follower count for a store
 * @access  Public
 */
router.get('/:storeId/followers/count', getFollowerCount);

/**
 * @route   POST /api/stores/:storeId/followers/analytics/snapshot
 * @desc    Manually trigger daily analytics snapshot
 * @access  Private (Admin only)
 */
router.post('/:storeId/followers/analytics/snapshot', authenticate, triggerDailySnapshot);

export default router;
