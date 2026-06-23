import express from 'express';
import {
  createTravelPaymentOrder,
  verifyTravelPayment,
  createTravelStripeSession,
  verifyTravelStripeSession,
  getTravelPaymentGateways,
} from '../controllers/travelPaymentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Travel Payment Routes
 * Base path: /api/travel-payment
 * Supports both Razorpay (INR) and Stripe (INR, AED, USD, EUR, GBP, CAD, AUD)
 */

// ==================== GATEWAY INFO ====================

// Get available payment gateways for a currency
router.get('/gateways', authenticate, getTravelPaymentGateways);

// ==================== RAZORPAY ROUTES ====================

// Create Razorpay order for travel booking payment (INR only)
router.post('/create-order', authenticate, createTravelPaymentOrder);

// Verify Razorpay payment signature for travel booking
router.post('/verify', authenticate, verifyTravelPayment);

// ==================== STRIPE ROUTES ====================

// Create Stripe checkout session for travel booking payment (all currencies)
router.post('/create-checkout-session', authenticate, createTravelStripeSession);

// Verify Stripe checkout session for travel booking
router.post('/verify-stripe-session', authenticate, verifyTravelStripeSession);

export default router;
