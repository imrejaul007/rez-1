import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { Merchant } from '../models/Merchant';
import { MerchantPlan } from '../models/MerchantPlan';
import { createRateLimiter } from '../middleware/rateLimiter';

// 10 upgrade attempts per hour per merchant
const subscriptionLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, prefix: 'merchant-subscription' });

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// Initialize Razorpay (lazily — only if keys are present)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isRazorpayConfigured = !!(razorpayKeyId && razorpayKeySecret);

if (!isRazorpayConfigured) {
  logger.warn(
    '[MERCHANT SUBSCRIPTION] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured — payment features will be disabled',
  );
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

/**
 * @route   GET /api/merchant/subscription
 * @desc    Get merchant subscription plan and usage stats
 * @access  Private (Merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required',
      });
    }

    // Fetch merchant's actual plan from DB
    const merchant = await Merchant.findById(merchantId).select('currentPlan planExpiresAt').lean();
    const currentPlan = merchant?.currentPlan || 'starter';

    // Fetch plan limits from MerchantPlan collection
    await MerchantPlan.ensureDefaults();
    const planDetails = await MerchantPlan.findOne({ plan: currentPlan, isActive: true }).lean();

    // Fallback limits if plan not found
    const staffLimit = currentPlan === 'starter' ? 2 : currentPlan === 'growth' ? 10 : 999;
    const productsLimit = planDetails?.maxProducts ?? 50;
    const monthlyBookingsLimit = currentPlan === 'starter' ? 100 : currentPlan === 'growth' ? 1000 : 999999;
    const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

    // Query real usage data in parallel
    const [staffCount, productCount, bookingCount] = await Promise.all([
      (async () => {
        try {
          const MerchantUser = mongoose.model('MerchantUser');
          return await MerchantUser.countDocuments({
            merchantId: new mongoose.Types.ObjectId(merchantId),
            status: 'active',
          });
        } catch {
          return 0;
        }
      })(),
      (async () => {
        try {
          const MProduct = mongoose.model('MProduct');
          return await MProduct.countDocuments({
            merchantId: new mongoose.Types.ObjectId(merchantId),
          });
        } catch {
          return 0;
        }
      })(),
      (async () => {
        try {
          const ServiceAppointment = mongoose.model('ServiceAppointment');
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return await ServiceAppointment.countDocuments({
            merchantId: new mongoose.Types.ObjectId(merchantId),
            createdAt: { $gte: monthStart, $lte: monthEnd },
          });
        } catch {
          return 0;
        }
      })(),
    ]);

    // Check if plan is expired
    const planExpiresAt = merchant?.planExpiresAt;
    const isExpired = planExpiresAt && new Date(planExpiresAt) < new Date();
    const effectivePlan = isExpired && currentPlan !== 'starter' ? 'starter' : currentPlan;

    const response = {
      success: true,
      data: {
        plan: effectivePlan,
        planLabel: isExpired && currentPlan !== 'starter' ? 'Starter' : planLabel,
        nextBillingDate: planExpiresAt && !isExpired
          ? new Date(planExpiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
          : null,
        usage: {
          staff: staffCount,
          staffLimit,
          products: productCount,
          productsLimit,
          monthlyBookings: bookingCount,
          monthlyBookingsLimit,
        },
        invoices: [],
      },
    };

    res.json(response);
  } catch (error: any) {
    logger.error('❌ [MERCHANT SUBSCRIPTION] Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subscription',
    });
  }
});

/**
 * @route   GET /api/merchant/subscription/plans
 * @desc    List all available subscription plans
 * @access  Private (Merchant)
 */
router.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    // Ensure defaults exist
    await MerchantPlan.ensureDefaults();

    // Fetch all active plans
    const plans = await MerchantPlan.find({ isActive: true }).sort({ monthlyPrice: 1 });

    res.json({
      success: true,
      data: plans,
    });
  }),
);

/**
 * @route   POST /api/merchant/subscription/upgrade
 * @desc    Initiate upgrade by creating Razorpay order
 * @access  Private (Merchant)
 */
router.post(
  '/upgrade',
  subscriptionLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { planName, storeId } = req.body;
    const merchantId = req.merchantId;

    if (!planName || !storeId || !merchantId) {
      return res.status(400).json({
        success: false,
        message: 'planName, storeId, and merchantId are required',
      });
    }

    // Validate plan exists
    const plan = await MerchantPlan.findOne({ plan: planName, isActive: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Skip Razorpay order creation for starter plan (free)
    if (plan.monthlyPrice === 0) {
      return res.status(400).json({
        success: false,
        message: 'Starter plan is free and does not require payment',
      });
    }

    if (!isRazorpayConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please contact support.',
      });
    }

    try {
      // Create Razorpay order with timeout protection
      const amountInPaise = plan.monthlyPrice * 100;
      const order = await Promise.race([
        razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `order_${merchantId}_${Date.now()}`,
          notes: {
            planName,
            storeId,
            merchantId,
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Razorpay timeout')), 10000)),
      ]);

      res.json({
        success: true,
        data: {
          razorpayOrderId: (order as any).id,
          amount: plan.monthlyPrice,
          amountInPaise,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          planName,
        },
      });
    } catch (error: any) {
      logger.error('Error creating Razorpay order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: error.message,
      });
    }
  }),
);

/**
 * @route   POST /api/merchant/subscription/verify-payment
 * @desc    Verify Razorpay payment and update merchant subscription
 * @access  Private (Merchant)
 */
router.post(
  '/verify-payment',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planName,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planName) {
      return res.status(400).json({
        success: false,
        message: 'All payment verification fields are required',
      });
    }

    // Always use auth-verified merchantId — never trust body
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID is required',
      });
    }

    try {
      // Verify Razorpay signature using timingSafeEqual
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      const isValid = crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(generatedSignature));

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }

      // Update merchant subscription
      const planExpiresAt = new Date();
      planExpiresAt.setDate(planExpiresAt.getDate() + 30);

      const updatedMerchant = await Merchant.findByIdAndUpdate(
        merchantId,
        {
          currentPlan: planName,
          planExpiresAt,
        },
        { new: true },
      );

      if (!updatedMerchant) {
        return res.status(404).json({
          success: false,
          message: 'Merchant not found',
        });
      }

      res.json({
        success: true,
        message: `Successfully upgraded to ${planName} plan`,
        data: {
          newPlan: planName,
          planExpiresAt,
        },
      });
    } catch (error: any) {
      logger.error('Error verifying payment:', error);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      });
    }
  }),
);

/**
 * @route   GET /api/merchant/subscription/usage
 * @desc    Get current subscription plan and usage stats
 * @access  Private (Merchant)
 */
router.get(
  '/usage',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = req.merchantId;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID is required',
      });
    }

    // Fetch merchant subscription info
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found',
      });
    }

    const currentPlan = merchant.currentPlan || 'starter';

    // Fetch plan details
    const planDetails = await MerchantPlan.findOne({ plan: currentPlan });
    if (!planDetails) {
      return res.status(404).json({
        success: false,
        message: 'Plan details not found',
      });
    }

    // Count product and store usage
    const [productCount, storeCount] = await Promise.all([
      (async () => {
        try {
          const MProduct = mongoose.model('MProduct');
          const count = await MProduct.countDocuments({
            merchantId: new mongoose.Types.ObjectId(merchantId),
          });
          return count;
        } catch {
          return 0;
        }
      })(),
      (async () => {
        try {
          const Store = mongoose.model('Store');
          const count = await Store.countDocuments({
            merchantId: new mongoose.Types.ObjectId(merchantId),
          });
          return count;
        } catch {
          return 0;
        }
      })(),
    ]);

    res.json({
      success: true,
      data: {
        currentPlan,
        planExpiresAt: merchant.planExpiresAt || null,
        usage: {
          products: productCount,
          stores: storeCount,
        },
        limits: {
          maxProducts: planDetails.maxProducts,
          maxStores: planDetails.maxStores,
        },
      },
    });
  }),
);

export default router;
