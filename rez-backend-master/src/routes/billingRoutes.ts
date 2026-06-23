import express from 'express';
import {
  getBillingHistory,
  getInvoice,
  downloadInvoice,
  getBillingSummary,
} from '../controllers/billingController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/billing/history
 * @desc    Get user's billing transaction history
 * @access  Private
 */
router.get('/history', authenticate, getBillingHistory);

/**
 * @route   GET /api/billing/summary
 * @desc    Get billing statistics and summary
 * @access  Private
 */
router.get('/summary', authenticate, getBillingSummary);

/**
 * @route   GET /api/billing/invoice/:transactionId
 * @desc    Get specific invoice details
 * @access  Private
 */
router.get('/invoice/:transactionId', authenticate, getInvoice);

/**
 * @route   GET /api/billing/invoice/:transactionId/download
 * @desc    Download invoice as PDF
 * @access  Private
 */
router.get('/invoice/:transactionId/download', authenticate, downloadInvoice);

export default router;
