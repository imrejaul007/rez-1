import express from 'express';
import {
  getWalletBalance,
  getTransactions,
  getTransactionById,
  getTransactionCounts,
  topupWallet,
  withdrawFunds,
  processPayment,
  getTransactionSummary,
  updateWalletSettings,
  getCategoriesBreakdown,
  initiatePayment,
  confirmPayment,
  checkPaymentStatus,
  getPaymentMethods,

  creditLoyaltyPoints,
  devTopup,
  syncWalletBalance,
  refundPayment,
  getExpiringCoins,
  previewRechargeCashback,
  getScheduledDrops,
  getCoinRules,
  getRedemptionSuggestions,
  getWalletLimits,
  updateWalletLimits,
  createMoneyRequest,
  getMoneyRequests,
  createBillSplit,
  getBillSplits,
  payBillSplitShare,
} from '../controllers/walletController';
import { authenticate, requireSeniorAdmin } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireReAuth } from '../middleware/reAuth';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';
import { validate, validateQuery, Joi } from '../middleware/validation';

const router = express.Router();

// Rate limiters for sensitive wallet operations
const walletWriteLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many wallet operations. Please try again later.' });
const walletWithdrawLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 5, message: 'Daily withdrawal limit reached.' });
const walletRefundLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3, message: 'Too many refund requests.' });
const walletPaymentLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many payment requests. Please try again later.' });
const walletCreditLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many credit requests.' });
const walletSyncLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 1, message: 'Balance sync is limited to once per hour.' });
const walletReadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many wallet read requests. Please try again later.' });


// All wallet routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/wallet/balance
 * @desc    Get user wallet balance and status
 * @access  Private
 */
router.get('/balance', walletReadLimiter, getWalletBalance);

/**
 * @route   POST /api/wallet/credit-loyalty-points
 * @desc    Credit loyalty points to wallet as spendable coins
 * @body    { amount, source }
 * @access  Admin only (senior admin+)
 */
router.post('/credit-loyalty-points', walletCreditLimiter, requireSeniorAdmin, validate(Joi.object({
  amount: Joi.number().positive().max(100000).required(),
  source: Joi.string().max(100),
  idempotencyKey: Joi.string()
})), creditLoyaltyPoints);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get user transaction history with filters
 * @query   page, limit, type, category, status, dateFrom, dateTo, minAmount, maxAmount
 * @access  Private
 */
router.get('/transactions', walletReadLimiter, validateQuery(Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  type: Joi.string(),
  category: Joi.string(),
  status: Joi.string(),
  dateFrom: Joi.date(),
  dateTo: Joi.date()
})), getTransactions);

/**
 * @route   GET /api/wallet/transaction/:id
 * @desc    Get single transaction details
 * @access  Private
 */
router.get('/transaction/:id', walletReadLimiter, getTransactionById);

/**
 * @route   GET /api/wallet/summary
 * @desc    Get transaction summary/statistics
 * @query   period (day, week, month, year)
 * @access  Private
 */
router.get('/summary', walletReadLimiter, getTransactionSummary);

/**
 * @route   GET /api/wallet/transaction-counts
 * @desc    Get transaction counts grouped by category (lightweight)
 * @access  Private
 */
router.get('/transaction-counts', walletReadLimiter, getTransactionCounts);

/**
 * @route   GET /api/wallet/categories
 * @desc    Get spending breakdown by categories
 * @access  Private
 */
router.get('/categories', walletReadLimiter, getCategoriesBreakdown);

/**
 * @route   POST /api/wallet/topup
 * @desc    Add funds to wallet (admin only — users must use initiate-payment → confirm-payment)
 * @body    { amount, paymentMethod, paymentId }
 * @access  Admin only (senior admin+)
 */
router.post('/topup', walletWriteLimiter, requireSeniorAdmin, validate(Joi.object({
  amount: Joi.number().positive().max(1000000).required(),
  paymentMethod: Joi.string(),
  paymentId: Joi.string()
})), topupWallet);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw funds from wallet
 * @body    { amount, method, accountDetails }
 * @access  Private
 */
router.post('/withdraw', walletWithdrawLimiter, requireReAuth(), requireWalletFeature(WALLET_FEATURES.WITHDRAWALS), validate(Joi.object({
  amount: Joi.number().positive().required(),
  method: Joi.string().required(),
  accountDetails: Joi.object().required()
})), withdrawFunds);

/**
 * @route   POST /api/wallet/payment
 * @desc    Process payment (deduct from wallet)
 * @body    { amount, orderId, storeId, storeName, description, items }
 * @access  Private
 */
router.post('/payment', walletPaymentLimiter, validate(Joi.object({
  amount: Joi.number().positive().required(),
  orderId: Joi.string(),
  storeId: Joi.string(),
  storeName: Joi.string(),
  description: Joi.string()
})), processPayment);

/**
 * @route   PUT /api/wallet/settings
 * @desc    Update wallet settings
 * @body    { autoTopup, autoTopupThreshold, autoTopupAmount, lowBalanceAlert, lowBalanceThreshold }
 * @access  Private
 */
router.put('/settings', validate(Joi.object({
  autoTopup: Joi.boolean(),
  autoTopupThreshold: Joi.number().min(0),
  autoTopupAmount: Joi.number().positive(),
  lowBalanceAlert: Joi.boolean(),
  lowBalanceThreshold: Joi.number().min(0)
})), updateWalletSettings);

/**
 * @route   POST /api/wallet/initiate-payment
 * @desc    Initiate payment gateway transaction
 * @body    { amount, currency, paymentMethod, paymentMethodId, userDetails, metadata }
 * @access  Private
 */
router.post('/initiate-payment', validate(Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().max(3),
  paymentMethod: Joi.string().required()
})), initiatePayment);

/**
 * @route   POST /api/wallet/confirm-payment
 * @desc    Confirm payment after frontend Stripe confirmCardPayment succeeds
 * @body    { paymentIntentId }
 * @access  Private
 */
router.post('/confirm-payment', validate(Joi.object({
  paymentIntentId: Joi.string().required()
})), confirmPayment);

/**
 * @route   GET /api/wallet/payment-status/:paymentId
 * @desc    Check payment status
 * @access  Private
 */
router.get('/payment-status/:paymentId', checkPaymentStatus);

/**
 * @route   GET /api/wallet/payment-methods
 * @desc    Get available payment methods
 * @access  Private
 */
router.get('/payment-methods', getPaymentMethods);


/**
 * @route   POST /api/wallet/dev-topup
 * @desc    Add test funds to wallet (DEVELOPMENT ONLY)
 * @body    { amount, type: 'rez' | 'promo' | 'cashback' }
 * @access  Private (dev only)
 */
// SECURITY: require explicit opt-in flag, not just "not production". NODE_ENV
// can be unset (defaulting to development) in misconfigured deployments,
// which would silently expose this self-credit endpoint. The endpoint credits
// up to 100,000 of any coin type to the caller's own wallet.
if (process.env.ENABLE_DEV_TOPUP === 'true') {
  router.post('/dev-topup', walletWriteLimiter, devTopup);
}

/**
 * @route   POST /api/wallet/sync-balance
 * @desc    Sync wallet balance from CoinTransaction (fixes discrepancies)
 * @access  Private
 */
router.post('/sync-balance', walletSyncLimiter, syncWalletBalance);

/**
 * @route   POST /api/wallet/refund
 * @desc    Refund a wallet payment (admin only — automatic refunds happen in order cancellation flow)
 * @body    { transactionId, amount, reason }
 * @access  Admin only (senior admin+)
 */
router.post('/refund', walletRefundLimiter, requireSeniorAdmin, validate(Joi.object({
  transactionId: Joi.string().required(),
  amount: Joi.number().positive(),
  reason: Joi.string().max(500).required()
})), refundPayment);

/**
 * @route   GET /api/wallet/expiring-coins
 * @desc    Get coins grouped by expiry period (this_week, this_month, next_month)
 * @access  Private
 */
router.get('/expiring-coins', getExpiringCoins);

/**
 * @route   GET /api/wallet/recharge/preview
 * @desc    Preview recharge cashback calculation before purchase
 * @query   amount
 * @access  Private
 */
router.get('/recharge/preview', previewRechargeCashback);

/**
 * @route   GET /api/wallet/scheduled-drops
 * @desc    Get upcoming coin drops and claimable rewards
 * @access  Private
 */
router.get('/scheduled-drops', getScheduledDrops);

/**
 * @route   GET /api/wallet/coin-rules
 * @desc    Get dynamic coin usage/earning rules
 * @access  Private
 */
router.get('/coin-rules', getCoinRules);
router.get('/redemption-suggestions', getRedemptionSuggestions);

// ─── Wallet Limits ──────────────────────────────────────────────────────
router.get('/limits', walletReadLimiter, getWalletLimits);
router.put('/limits', walletWriteLimiter, validate(Joi.object({
  limitsEnabled: Joi.boolean(),
  dailySpendLimit: Joi.number().min(0).max(1000000),
  monthlySpendLimit: Joi.number().min(0).max(10000000),
})), updateWalletLimits);

// ─── Money Requests ─────────────────────────────────────────────────────
router.get('/money-requests', walletReadLimiter, getMoneyRequests);
router.post('/money-requests', walletWriteLimiter, validate(Joi.object({
  recipientId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  note: Joi.string().max(200),
})), createMoneyRequest);

// ─── Bill Splits ────────────────────────────────────────────────────────
router.get('/splits', walletReadLimiter, getBillSplits);
router.post('/splits', walletWriteLimiter, validate(Joi.object({
  amount: Joi.number().positive().required(),
  participants: Joi.array().items(Joi.object({
    userId: Joi.string().required(),
    share: Joi.number().positive().required(),
  })).min(1).required(),
  note: Joi.string().max(200),
})), createBillSplit);
router.post('/splits/:id/pay', walletWriteLimiter, payBillSplitShare);

export default router;