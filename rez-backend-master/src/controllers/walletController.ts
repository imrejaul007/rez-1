/**
 * Wallet Controller — Barrel re-export
 *
 * Split into focused sub-controllers for maintainability:
 *   - walletBalanceController:     balance, settings, sync, expiring coins, coin rules, scheduled drops, recharge preview
 *   - walletTransactionController: transaction history, details, summary, counts, categories breakdown
 *   - walletPaymentController:     topup, withdraw, payment processing, gateway integration, refunds, dev topup, webhooks
 *
 * All exports are re-exported here for backward compatibility — existing
 * route files continue to import from 'walletController' without changes.
 */

// --- Balance, settings, sync, coin info ---
export {
  getWalletBalance,
  updateWalletSettings,
  syncWalletBalance,
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
} from './walletBalanceController';

// --- Transaction history & analytics ---
export {
  getTransactions,
  getTransactionById,
  getTransactionSummary,
  getTransactionCounts,
  getCategoriesBreakdown,
} from './walletTransactionController';

// --- Payments, topup, withdraw, refunds ---
export {
  creditLoyaltyPoints,
  topupWallet,
  withdrawFunds,
  processPayment,
  initiatePayment,
  confirmPayment,
  checkPaymentStatus,
  getPaymentMethods,
  handlePaymentWebhook,
  devTopup,
  refundPayment,
} from './walletPaymentController';
