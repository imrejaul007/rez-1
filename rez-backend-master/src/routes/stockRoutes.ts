import express from 'express';
import {
  getProductStockHistory,
  getStockSnapshot,
  detectStockAnomalies,
  generateStockReport,
  getStockMovementSummary,
  getLowStockAlerts,
  getStockValueOverTime
} from '../controllers/stockController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/stock/history/:productId
 * @desc    Get stock history for a product
 * @access  Private
 * @query   variantType, variantValue, startDate, endDate, changeTypes, limit, skip
 */
router.get('/history/:productId', getProductStockHistory);

/**
 * @route   GET /api/stock/snapshot/:productId
 * @desc    Get stock snapshot at a specific date
 * @access  Private
 * @query   date (required), variantType, variantValue
 */
router.get('/snapshot/:productId', getStockSnapshot);

/**
 * @route   GET /api/stock/anomalies/:storeId
 * @desc    Detect stock anomalies for a store
 * @access  Private
 * @query   days, threshold
 */
router.get('/anomalies/:storeId', detectStockAnomalies);

/**
 * @route   GET /api/stock/report/:storeId
 * @desc    Generate stock report for a date range
 * @access  Private
 * @query   startDate (required), endDate (required)
 */
router.get('/report/:storeId', generateStockReport);

/**
 * @route   GET /api/stock/movement/:productId
 * @desc    Get stock movement summary for a product
 * @access  Private
 * @query   startDate (required), endDate (required), variantType, variantValue
 */
router.get('/movement/:productId', getStockMovementSummary);

/**
 * @route   GET /api/stock/alerts/:storeId
 * @desc    Get low stock alerts for a store
 * @access  Private
 * @query   threshold (default: 10)
 */
router.get('/alerts/:storeId', getLowStockAlerts);

/**
 * @route   GET /api/stock/value/:storeId
 * @desc    Get stock value over time for a store
 * @access  Private
 * @query   startDate (required), endDate (required), interval (day/week/month)
 */
router.get('/value/:storeId', getStockValueOverTime);

export default router;
