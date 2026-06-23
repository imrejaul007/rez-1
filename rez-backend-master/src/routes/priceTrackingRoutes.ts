/**
 * Price Tracking Routes
 *
 * Routes for price history and price alerts
 */

import express from 'express';
const router = express.Router();
import * as priceTrackingController from '../controllers/priceTrackingController';
import { protect } from '../middleware/auth';

// ============================================
// PRICE HISTORY ROUTES
// ============================================

/**
 * @route   GET /api/price-tracking/history/:productId
 * @desc    Get price history for a product
 * @access  Public
 */
router.get('/history/:productId', priceTrackingController.getPriceHistory);

/**
 * @route   GET /api/price-tracking/stats/:productId
 * @desc    Get price statistics for a product
 * @access  Public
 */
router.get('/stats/:productId', priceTrackingController.getPriceStats);

/**
 * @route   POST /api/price-tracking/record-price
 * @desc    Record a price change (System endpoint)
 * @access  Private (System/Admin)
 */
router.post('/record-price', protect, priceTrackingController.recordPriceChange);

// ============================================
// PRICE ALERT ROUTES
// ============================================

/**
 * @route   POST /api/price-tracking/alerts
 * @desc    Create a price alert
 * @access  Private
 */
router.post('/alerts', protect, priceTrackingController.createPriceAlert);

/**
 * @route   GET /api/price-tracking/alerts/my-alerts
 * @desc    Get user's price alerts
 * @access  Private
 */
router.get('/alerts/my-alerts', protect, priceTrackingController.getMyAlerts);

/**
 * @route   GET /api/price-tracking/alerts/check/:productId
 * @desc    Check if user has active alert for product
 * @access  Private
 */
router.get('/alerts/check/:productId', protect, priceTrackingController.checkAlert);

/**
 * @route   DELETE /api/price-tracking/alerts/:alertId
 * @desc    Cancel a price alert
 * @access  Private
 */
router.delete('/alerts/:alertId', protect, priceTrackingController.cancelAlert);

/**
 * @route   GET /api/price-tracking/alerts/stats/:productId
 * @desc    Get alert statistics for a product
 * @access  Private (Admin/Store)
 */
router.get('/alerts/stats/:productId', protect, priceTrackingController.getAlertStats);

// ============================================
// MAINTENANCE ROUTES
// ============================================

/**
 * @route   POST /api/price-tracking/cleanup
 * @desc    Cleanup old price history and expire alerts (Cron job)
 * @access  Private (System/Admin)
 */
router.post('/cleanup', protect, priceTrackingController.cleanupOldData);

export default router;
