import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getFollowerCount,
  getFollowersList,
  getFollowerAnalytics,
  getTopFollowers
} from '../controllers/followerStatsController';

const router = Router();

/**
 * @route   GET /api/stores/:storeId/followers/count
 * @desc    Get total follower count for a store
 * @access  Private (Merchant must own the store)
 */
router.get('/:storeId/followers/count', authenticate, getFollowerCount);

/**
 * @route   GET /api/stores/:storeId/followers/list
 * @desc    Get paginated list of followers with their details
 * @access  Private (Merchant must own the store)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/:storeId/followers/list', authenticate, getFollowersList);

/**
 * @route   GET /api/stores/:storeId/followers/analytics
 * @desc    Get follower analytics including growth rate and trends
 * @access  Private (Merchant must own the store)
 */
router.get('/:storeId/followers/analytics', authenticate, getFollowerAnalytics);

/**
 * @route   GET /api/stores/:storeId/followers/top
 * @desc    Get top followers by engagement (orders, reviews)
 * @access  Private (Merchant must own the store)
 * @query   limit - Number of top followers to return (default: 10)
 */
router.get('/:storeId/followers/top', authenticate, getTopFollowers);

export default router;
