import express from 'express';
import {
  getExternalWalletStatus,
  initiatePaytmPayment,
  initiateAmazonPayPayment,
  initiateMobikwikPayment,
  linkExternalWallet,
  unlinkExternalWallet,
  checkExternalPaymentStatus,
} from '../controllers/externalWalletController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * External Wallet Routes
 * Base path: /api/wallets/external
 *
 * This module handles:
 * - Third-party wallet integrations (Paytm, Amazon Pay, Mobikwik)
 * - Wallet linking/unlinking
 * - External wallet payments
 */

// ==================== WALLET STATUS ====================

// Get status of linked external wallets
router.get('/status', authenticate, getExternalWalletStatus);

// ==================== WALLET LINKING ====================

// Link external wallet
router.post('/link', authenticate, linkExternalWallet);

// Unlink external wallet
router.delete('/unlink/:provider', authenticate, unlinkExternalWallet);

// ==================== PAYTM ====================

// Initiate Paytm payment
router.post('/paytm/initiate', authenticate, initiatePaytmPayment);

// ==================== AMAZON PAY ====================

// Initiate Amazon Pay payment
router.post('/amazonpay/initiate', authenticate, initiateAmazonPayPayment);

// ==================== MOBIKWIK ====================

// Initiate Mobikwik payment
router.post('/mobikwik/initiate', authenticate, initiateMobikwikPayment);

// ==================== PAYMENT STATUS ====================

// Check payment status for external wallet
router.get('/status/:provider/:orderId', authenticate, checkExternalPaymentStatus);

export default router;
