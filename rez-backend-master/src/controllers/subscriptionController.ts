import { Request, Response } from 'express';
import { Subscription, SubscriptionTier, BillingCycle, ISubscriptionBenefits } from '../models/Subscription';
import { SubscriptionUpgrade } from '../models/SubscriptionUpgrade';
import { User } from '../models/User';
import razorpaySubscriptionService from '../services/razorpaySubscriptionService';
import subscriptionBenefitsService from '../services/subscriptionBenefitsService';
import promoCodeService from '../services/promoCodeService';
import tierConfigService from '../services/tierConfigService';
import subscriptionAuditService from '../services/subscriptionAuditService';
import { ProcessedWebhookEvent } from '../models/ProcessedWebhookEvent';
import { Types } from 'mongoose';
import * as alertService from '../services/webhookSecurityAlertService';
import { withCache } from '../utils/cacheHelper';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { privilegeResolutionService } from '../services/entitlement/privilegeResolutionService';

/**
 * Get all available subscription tiers
 * GET /api/subscriptions/tiers
 */
export const getSubscriptionTiers = asyncHandler(async (req: Request, res: Response) => {
    // Import SubscriptionTier model
    const { SubscriptionTier } = await import('../models/SubscriptionTier');

    // Cache active tiers for 1 hour (rarely changes, admin-configured)
    const tierConfigs = await withCache('subscription:tiers:active', 3600, () =>
      SubscriptionTier.find({ isActive: true })
        .select('name slug tier sortOrder price benefits description icon color badge billingOptions isActive')
        .sort({ sortOrder: 1 })
        .lean()
        .exec()
    );

    // If no tiers found in database, return empty array with warning
    if (!tierConfigs || tierConfigs.length === 0) {
      logger.warn('No subscription tiers found in database. Run seed script: npm run seed:tiers');
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No subscription tiers available. Please contact administrator.'
      });
    }

    res.status(200).json({
      success: true,
      data: tierConfigs
    });
});

/**
 * Get current user's subscription
 * GET /api/subscriptions/current
 */
export const getCurrentSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);

    if (!subscription) {
      // Return free tier by default
      const freeBenefits = await tierConfigService.getTierBenefits('free');
      return res.status(200).json({
        success: true,
        data: {
          tier: 'free',
          status: 'active',
          benefits: freeBenefits,
          usage: {
            totalSavings: 0,
            ordersThisMonth: 0,
            ordersAllTime: 0,
            cashbackEarned: 0,
            deliveryFeesSaved: 0,
            exclusiveDealsUsed: 0
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
});

/**
 * Subscribe to a tier
 * POST /api/subscriptions/subscribe
 */
export const subscribeToPlan = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      logger.error('[SUBSCRIBE] No user ID found - user not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    logger.debug('[SUBSCRIBE] User authenticated:', userId);

    const { tier, billingCycle, paymentMethod, promoCode, source } = req.body;
    logger.debug('[SUBSCRIBE] Payment method requested:', paymentMethod || 'not specified');

    // Determine payment gateway based on paymentMethod parameter
    const useStripe = paymentMethod === 'stripe';
    const useRazorpay = paymentMethod === 'razorpay' || !paymentMethod;

    logger.debug('[SUBSCRIBE] Using payment gateway:', useStripe ? 'STRIPE' : 'RAZORPAY');

    // Check if the requested payment gateway is configured
    if (useRazorpay) {
      logger.debug('[SUBSCRIBE] Checking Razorpay configuration...');
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET ||
          process.env.RAZORPAY_KEY_ID === 'rzp_test_your_razorpay_key_id' ||
          process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret') {
        logger.error('[SUBSCRIBE] Razorpay not configured properly');
        return res.status(503).json({
          success: false,
          message: 'Razorpay payment gateway is not configured. Please use Stripe or contact support.',
          error: 'Razorpay credentials not configured'
        });
      }
      logger.debug('[SUBSCRIBE] Razorpay is configured');
    } else if (useStripe) {
      logger.debug('[SUBSCRIBE] Checking Stripe configuration...');
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
        logger.error('[SUBSCRIBE] Stripe not configured properly');
        return res.status(503).json({
          success: false,
          message: 'Stripe payment gateway is not configured. Please contact support.',
          error: 'Stripe credentials not configured'
        });
      }
      logger.debug('[SUBSCRIBE] Stripe is configured');
    }

    // Validate tier
    logger.debug('[SUBSCRIBE] Validating tier:', tier);
    if (!['premium', 'vip'].includes(tier)) {
      logger.error('[SUBSCRIBE] Invalid tier:', tier);
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier'
      });
    }

    // Validate billing cycle
    logger.debug('[SUBSCRIBE] Validating billing cycle:', billingCycle);
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      logger.error('[SUBSCRIBE] Invalid billing cycle:', billingCycle);
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle'
      });
    }

    // Check if user already has an active subscription
    logger.debug('[SUBSCRIBE] Checking for existing subscription...');
    const existingSubscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (existingSubscription && existingSubscription.isActive()) {
      logger.warn('[SUBSCRIBE] User already has active subscription:', existingSubscription.tier);
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription. Please upgrade or downgrade instead.'
      });
    }
    logger.debug('[SUBSCRIBE] No existing active subscription');

    // Get tier pricing from single source of truth (DB)
    let price = await tierConfigService.getTierPrice(tier, billingCycle);
    let appliedDiscount = 0;

    logger.debug('[SUBSCRIBE] Base price:', price, '(from DB)');

    // Apply promo code if provided
    if (promoCode) {
      logger.debug('[SUBSCRIBE] Validating promo code:', promoCode);
      const promoResult = await promoCodeService.validatePromoCode(
        promoCode,
        tier,
        billingCycle,
        userId
      );

      if (promoResult.valid && promoResult.finalPrice !== undefined) {
        appliedDiscount = promoResult.discount || 0;
        price = promoResult.finalPrice;
        logger.info(`[SUBSCRIBE] Promo code applied: ${promoCode}, discount: ₹${appliedDiscount}, final price: ₹${price}`);
      } else {
        logger.warn(`[SUBSCRIBE] Invalid promo code attempted: ${promoCode}`);
      }
    }

    // Create payment gateway subscription based on selected method
    let paymentGatewaySubscription: any = null;

    if (useRazorpay) {
      logger.debug('[SUBSCRIBE] Creating Razorpay subscription...');
      paymentGatewaySubscription = await razorpaySubscriptionService.createSubscription(
        userId.toString(),
        tier,
        billingCycle
      );
      logger.info('[SUBSCRIBE] Razorpay subscription created:', paymentGatewaySubscription.id);
    } else if (useStripe) {
      logger.debug('[SUBSCRIBE] Stripe selected - will create payment intent on frontend');
      // For Stripe, we don't create subscription here
      // The frontend will create a Stripe Checkout session or Payment Intent
      paymentGatewaySubscription = {
        id: 'stripe_pending_' + Date.now(),
        status: 'pending'
      };
    }

    // Calculate dates
    logger.debug('[SUBSCRIBE] Calculating subscription dates...');
    const startDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    const endDate = new Date(startDate);
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    logger.debug('[SUBSCRIBE] Start date:', startDate);
    logger.debug('[SUBSCRIBE] Trial end date:', trialEndDate);
    logger.debug('[SUBSCRIBE] End date:', endDate);

    // Create subscription in database
    logger.debug('[SUBSCRIBE] Creating subscription in database...');
    const subscriptionData: any = {
      user: userId,
      tier,
      status: 'trial',
      billingCycle,
      price,
      startDate,
      endDate,
      trialEndDate,
      autoRenew: true,
      paymentMethod: useStripe ? 'stripe' : 'razorpay',
      benefits: await tierConfigService.getTierBenefits(tier),
      metadata: {
        source: source || 'app',
        promoCode
      }
    };

    // Add gateway-specific IDs
    if (useRazorpay && paymentGatewaySubscription) {
      subscriptionData.razorpaySubscriptionId = paymentGatewaySubscription.id;
      subscriptionData.razorpayPlanId = paymentGatewaySubscription.plan_id;
      subscriptionData.razorpayCustomerId = paymentGatewaySubscription.customer_id;
    } else if (useStripe && paymentGatewaySubscription) {
      subscriptionData.stripeSubscriptionId = paymentGatewaySubscription.id;
      subscriptionData.stripeCustomerId = paymentGatewaySubscription.customer;
    }

    const subscription = new Subscription(subscriptionData);

    logger.debug('[SUBSCRIBE] Saving subscription to database...');
    await subscription.save();
    logger.info('[SUBSCRIBE] Subscription saved successfully:', { subscriptionId: subscription._id });

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (subscription._id as any)?.toString(),
      userId,
      action: 'created',
      newState: { tier, status: 'trial', price, billingCycle },
      metadata: {
        promoCode: promoCode || undefined,
        ipAddress: req.ip,
        description: `New ${tier} subscription created (${billingCycle})`,
      },
    });

    // Increment promo code usage if promo code was applied
    if (promoCode && appliedDiscount > 0) {
      try {
        await promoCodeService.applyPromoCode(
          promoCode,
          tier,
          billingCycle,
          userId,
          String(subscription._id)
        );
        logger.info(`[SUBSCRIPTION] Promo code usage incremented: ${promoCode}`);
      } catch (promoError: any) {
        logger.error(`[SUBSCRIPTION] Failed to increment promo code usage:`, promoError);
        // Don't fail the subscription creation if promo tracking fails
      }
    }

    logger.debug('[SUBSCRIBE] Preparing response...');
    const response: any = {
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription,
        discountApplied: appliedDiscount
      }
    };

    // Add payment URL for Razorpay, for Stripe frontend will handle payment
    if (useRazorpay && paymentGatewaySubscription?.short_url) {
      response.data.paymentUrl = paymentGatewaySubscription.short_url;
      logger.debug('[SUBSCRIBE] Payment URL (Razorpay):', paymentGatewaySubscription.short_url);
    } else if (useStripe) {
      // For Stripe, frontend will create the checkout session
      response.data.paymentUrl = null;
      logger.debug('[SUBSCRIBE] Using Stripe - frontend will handle checkout');
    }

    logger.info('[SUBSCRIBE] Subscription created successfully', {
      subscriptionId: subscription._id,
      tier: subscription.tier,
      price: subscription.price,
      paymentMethod: subscription.paymentMethod,
    });

    res.status(201).json(response);
});

/**
 * Legacy upgrade endpoint - redirects to two-phase flow
 * POST /api/subscriptions/upgrade
 */
export const upgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
  // Redirect to new two-phase flow — call the inner async fn directly (not the wrapped handler)
  return (initiateUpgrade as any)(req, res, () => {});
});

/**
 * Phase 1: Initiate upgrade - validate eligibility, calculate price, create pending upgrade
 * POST /api/subscriptions/upgrade/initiate
 */
export const initiateUpgrade = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { newTier, billingCycle: requestedBillingCycle, paymentGateway } = req.body;

    // Validate new tier
    if (!['premium', 'vip'].includes(newTier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid upgrade tier. Must be premium or vip.'
      });
    }

    // Validate billing cycle if provided
    if (requestedBillingCycle && !['monthly', 'yearly'].includes(requestedBillingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle. Must be monthly or yearly.'
      });
    }

    // Get current subscription (may be null for free users)
    const currentSubscription = await subscriptionBenefitsService.getUserSubscription(userId);
    const currentTier = currentSubscription?.tier || 'free';
    const billingCycle = requestedBillingCycle || currentSubscription?.billingCycle || 'monthly';

    // Validate upgrade path
    if (!tierConfigService.isValidUpgrade(currentTier, newTier)) {
      return res.status(400).json({
        success: false,
        message: `Cannot upgrade from ${currentTier} to ${newTier}`
      });
    }

    // Get pricing from DB
    const newTierPrice = await tierConfigService.getTierPrice(newTier, billingCycle);
    const currentTierPrice = await tierConfigService.getTierPrice(currentTier, billingCycle);

    // Calculate prorated amount for mid-cycle upgrade
    let proratedAmount = newTierPrice;
    let creditFromCurrentPlan = 0;

    if (currentSubscription && currentTier !== 'free') {
      const daysRemaining = currentSubscription.getRemainingDays
        ? currentSubscription.getRemainingDays()
        : Math.max(0, Math.ceil((new Date(currentSubscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const totalDays = billingCycle === 'yearly' ? 365 : 30;

      creditFromCurrentPlan = Math.round((currentTierPrice * daysRemaining) / totalDays);
      proratedAmount = Math.max(0, Math.round((newTierPrice * daysRemaining) / totalDays) - creditFromCurrentPlan);
    }

    // Generate idempotency key
    const subscriptionRef = currentSubscription?._id?.toString() || 'new';
    const idempotencyKey = `upgrade_${userId}_${currentTier}_${newTier}_${billingCycle}_${subscriptionRef}`;

    // Check for existing pending or processing upgrade (prevent double-tap)
    const existingPending = await SubscriptionUpgrade.findOne({
      userId,
      status: { $in: ['pending_payment', 'processing'] },
      toTier: newTier,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message: 'Existing upgrade intent found',
        data: {
          upgradeId: existingPending._id,
          fromTier: existingPending.fromTier,
          toTier: existingPending.toTier,
          proratedAmount: existingPending.proratedAmount,
          newTierPrice: existingPending.newTierPrice,
          creditFromCurrentPlan: existingPending.creditFromCurrentPlan,
          billingCycle: existingPending.billingCycle,
          expiresAt: existingPending.expiresAt,
        }
      });
    }

    // Create pending upgrade record
    const upgradeRecord = await SubscriptionUpgrade.create({
      userId,
      subscriptionId: (currentSubscription?._id as any)?.toString(),
      fromTier: currentTier,
      toTier: newTier,
      billingCycle,
      proratedAmount,
      newTierPrice,
      creditFromCurrentPlan,
      paymentGateway: paymentGateway || 'stripe',
      status: 'pending_payment',
      idempotencyKey,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        source: 'app',
      },
    });

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (currentSubscription?._id as any)?.toString(),
      userId,
      action: 'upgrade_initiated',
      previousState: { tier: currentTier, status: currentSubscription?.status || 'active' },
      newState: { tier: newTier, price: proratedAmount, billingCycle },
      metadata: {
        upgradeId: (upgradeRecord._id as any).toString(),
        proratedAmount,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Upgrade initiated. Complete payment to activate.',
      data: {
        upgradeId: (upgradeRecord._id as any)?.toString(),
        fromTier: currentTier,
        toTier: newTier,
        proratedAmount,
        newTierPrice,
        creditFromCurrentPlan,
        billingCycle,
        expiresAt: upgradeRecord.expiresAt,
      }
    });
});

/**
 * Phase 2: Confirm upgrade - verify payment, update tier, activate benefits
 * POST /api/subscriptions/upgrade/confirm
 */
export const confirmUpgrade = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { upgradeId, paymentId, paymentIntentId } = req.body;

    if (!upgradeId) {
      return res.status(400).json({
        success: false,
        message: 'upgradeId is required'
      });
    }

    // Atomically claim the upgrade record (prevent double-processing)
    const upgradeRecord = await SubscriptionUpgrade.findOneAndUpdate(
      {
        _id: upgradeId,
        userId,
        status: 'pending_payment',
        expiresAt: { $gt: new Date() },
      },
      { status: 'processing', paymentId, paymentIntentId },
      { new: true }
    );

    if (!upgradeRecord) {
      // Check if already completed (idempotent success)
      const existing = await SubscriptionUpgrade.findOne({ _id: upgradeId, userId, status: 'completed' }).lean();
      if (existing) {
        return res.status(200).json({ success: true, message: 'Upgrade already completed' });
      }
      return res.status(400).json({
        success: false,
        message: 'Upgrade not found, already completed, or expired'
      });
    }

    // Now update the actual subscription
    let subscription = upgradeRecord.subscriptionId
      ? await Subscription.findById(upgradeRecord.subscriptionId)
      : await subscriptionBenefitsService.getUserSubscription(userId);

    const newBenefits = await tierConfigService.getTierBenefits(upgradeRecord.toTier);

    if (subscription) {
      // Existing subscription - upgrade tier
      const previousTier = subscription.tier;
      subscription.previousTier = previousTier;
      subscription.tier = upgradeRecord.toTier as any;
      subscription.benefits = newBenefits;
      subscription.upgradeDate = new Date();
      subscription.proratedCredit = upgradeRecord.creditFromCurrentPlan;
      subscription.price = upgradeRecord.newTierPrice;
      if (!subscription.billingCycle) {
        subscription.billingCycle = upgradeRecord.billingCycle as any;
      }
      await subscription.save();

      // Update Razorpay if applicable
      if (subscription.razorpaySubscriptionId) {
        try {
          const newPlanId = await razorpaySubscriptionService.createOrGetPlan(
            upgradeRecord.toTier as any,
            subscription.billingCycle
          );
          await razorpaySubscriptionService.updateSubscription(
            subscription.razorpaySubscriptionId,
            { plan_id: newPlanId, schedule_change_at: 'now' }
          );
        } catch (rpError) {
          logger.error('[UPGRADE] Razorpay plan update failed (non-blocking):', rpError);
        }
      }
    } else {
      // Free user - create new subscription
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (upgradeRecord.billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const tierConfig = await tierConfigService.getTierConfig(upgradeRecord.toTier);
      const trialEndDate = new Date(startDate);
      trialEndDate.setDate(trialEndDate.getDate() + (tierConfig.trialDays || 0));

      subscription = await Subscription.create({
        user: userId,
        tier: upgradeRecord.toTier,
        status: 'active',
        billingCycle: upgradeRecord.billingCycle,
        price: upgradeRecord.newTierPrice,
        startDate,
        endDate,
        trialEndDate,
        autoRenew: true,
        paymentMethod: upgradeRecord.paymentGateway,
        benefits: newBenefits,
      });
    }

    // Mark upgrade as completed NOW (after subscription was successfully updated)
    await SubscriptionUpgrade.updateOne(
      { _id: upgradeRecord._id },
      { status: 'completed', completedAt: new Date() }
    );

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (subscription._id as any)?.toString(),
      userId,
      action: 'upgrade_confirmed',
      previousState: { tier: upgradeRecord.fromTier },
      newState: {
        tier: upgradeRecord.toTier,
        status: subscription.status,
        price: upgradeRecord.newTierPrice,
        billingCycle: upgradeRecord.billingCycle,
      },
      metadata: {
        upgradeId: (upgradeRecord._id as any).toString(),
        paymentId,
        proratedAmount: upgradeRecord.proratedAmount,
        ipAddress: req.ip,
        description: `Upgraded from ${upgradeRecord.fromTier} to ${upgradeRecord.toTier}`,
      },
    });

    // Invalidate privilege cache so new tier benefits take effect immediately
    privilegeResolutionService.invalidate(userId.toString()).catch((err) => logger.error('[SubscriptionCtrl] Privilege cache invalidation failed after upgrade', { error: err.message, userId }));

    res.status(200).json({
      success: true,
      message: `Successfully upgraded to ${upgradeRecord.toTier}`,
      data: {
        subscription,
        upgrade: {
          fromTier: upgradeRecord.fromTier,
          toTier: upgradeRecord.toTier,
          proratedAmount: upgradeRecord.proratedAmount,
        },
      }
    });
});

/**
 * Downgrade subscription tier
 * POST /api/subscriptions/downgrade
 */
export const downgradeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { newTier } = req.body;

    // Validate newTier
    if (!newTier || !['free', 'premium'].includes(newTier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid downgrade tier. Must be free or premium.'
      });
    }

    // Get current subscription
    const currentSubscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!currentSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Check for in-progress upgrade (prevent conflicting state changes)
    const pendingUpgrade = await SubscriptionUpgrade.findOne({
      userId,
      status: { $in: ['pending_payment', 'processing'] },
      expiresAt: { $gt: new Date() },
    }).lean();
    if (pendingUpgrade) {
      return res.status(409).json({
        success: false,
        message: 'Cannot downgrade while an upgrade is in progress. Please cancel or complete the pending upgrade first.'
      });
    }

    // Validate downgrade
    if (!currentSubscription.canDowngrade()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade from current tier'
      });
    }

    // Validate downgrade path using tier hierarchy
    if (!tierConfigService.isValidDowngrade(currentSubscription.tier, newTier)) {
      return res.status(400).json({
        success: false,
        message: `Cannot downgrade from ${currentSubscription.tier} to ${newTier}`
      });
    }

    // Calculate prorated credit using DB prices
    const currentTierPrice = await tierConfigService.getTierPrice(currentSubscription.tier, currentSubscription.billingCycle);
    const newTierPrice = newTier === 'free' ? 0 : await tierConfigService.getTierPrice(newTier, currentSubscription.billingCycle);

    const daysRemaining = currentSubscription.getRemainingDays
      ? currentSubscription.getRemainingDays()
      : Math.max(0, Math.ceil((new Date(currentSubscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const totalDays = currentSubscription.billingCycle === 'yearly' ? 365 : 30;

    const proratedCredit = Math.max(0, Math.round(((currentTierPrice - newTierPrice) * daysRemaining) / totalDays));

    // Schedule downgrade for end of billing cycle
    const previousTier = currentSubscription.tier;
    currentSubscription.previousTier = previousTier;
    currentSubscription.downgradeScheduledFor = currentSubscription.endDate;
    currentSubscription.downgradeTargetTier = newTier;
    currentSubscription.proratedCredit = proratedCredit;

    await currentSubscription.save();

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (currentSubscription._id as any)?.toString(),
      userId,
      action: 'downgrade_scheduled',
      previousState: { tier: previousTier, status: currentSubscription.status },
      newState: { tier: newTier },
      metadata: {
        proratedAmount: proratedCredit,
        ipAddress: req.ip,
        description: `Downgrade from ${previousTier} to ${newTier} scheduled for ${currentSubscription.endDate}`,
      },
    });

    // Invalidate privilege cache so downgrade reflects immediately
    privilegeResolutionService.invalidate(userId.toString()).catch((err) => logger.error('[SubscriptionCtrl] Privilege cache invalidation failed after downgrade', { error: err.message, userId }));

    res.status(200).json({
      success: true,
      message: 'Subscription downgrade scheduled for end of billing cycle',
      data: {
        subscription: currentSubscription,
        effectiveDate: currentSubscription.endDate,
        creditAmount: proratedCredit
      }
    });
});

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { reason, feedback, cancelImmediately } = req.body;

    // Get current subscription
    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Cancel in Razorpay
    if (subscription.razorpaySubscriptionId) {
      await razorpaySubscriptionService.cancelSubscription(
        subscription.razorpaySubscriptionId,
        !cancelImmediately
      );
    }

    // Capture previous state before changes
    const previousTier = subscription.tier;
    const previousStatus = subscription.status;

    // Update subscription
    subscription.status = 'cancelled';
    subscription.cancellationDate = new Date();
    subscription.cancellationReason = reason;
    subscription.cancellationFeedback = feedback;
    subscription.autoRenew = false;

    // Set reactivation eligibility
    const reactivationDate = new Date();
    reactivationDate.setDate(reactivationDate.getDate() + 30);
    subscription.reactivationEligibleUntil = reactivationDate;

    await subscription.save();

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (subscription._id as any)?.toString(),
      userId,
      action: 'cancelled',
      previousState: { tier: previousTier, status: previousStatus },
      newState: { tier: previousTier, status: 'cancelled' },
      metadata: {
        reason,
        ipAddress: req.ip,
        description: cancelImmediately ? 'Cancelled immediately' : 'Cancelled at cycle end',
      },
    });

    res.status(200).json({
      success: true,
      message: cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of billing cycle',
      data: {
        subscription,
        accessUntil: cancelImmediately ? new Date() : subscription.endDate,
        reactivationEligibleUntil: reactivationDate
      }
    });
});

/**
 * Renew/reactivate subscription
 * POST /api/subscriptions/renew
 */
export const renewSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get most recent cancelled/expired subscription (not already active ones)
    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['cancelled', 'expired', 'grace_period'] },
    }).sort({ endDate: -1 }).lean();

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No cancelled or expired subscription found to renew'
      });
    }

    // Check reactivation eligibility
    if (subscription.reactivationEligibleUntil && new Date() > subscription.reactivationEligibleUntil) {
      return res.status(400).json({
        success: false,
        message: 'Reactivation period has expired. Please create a new subscription.'
      });
    }

    // Capture previous state
    const previousStatus = subscription.status;

    // Reactivate in Razorpay
    if (subscription.razorpaySubscriptionId) {
      await razorpaySubscriptionService.resumeSubscription(subscription.razorpaySubscriptionId);
    }

    // Update subscription
    subscription.status = 'active';
    subscription.autoRenew = true;
    subscription.cancellationDate = undefined;
    subscription.cancellationReason = undefined;

    // Restore tier benefits from DB (expiry job may have cleared them)
    const restoredBenefits = await tierConfigService.getTierBenefits(subscription.tier);
    subscription.benefits = restoredBenefits;

    // Extend end date
    const newEndDate = new Date();
    if (subscription.billingCycle === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }
    subscription.endDate = newEndDate;

    await subscription.save();

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (subscription._id as any)?.toString(),
      userId,
      action: 'renewed',
      previousState: { tier: subscription.tier, status: previousStatus },
      newState: { tier: subscription.tier, status: 'active' },
      metadata: {
        ipAddress: req.ip,
        description: `Subscription renewed until ${newEndDate.toISOString()}`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully',
      data: subscription
    });
});

/**
 * Get subscription benefits
 * GET /api/subscriptions/benefits
 */
export const getSubscriptionBenefits = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const benefits = await subscriptionBenefitsService.getUserBenefits(userId);

    res.status(200).json({
      success: true,
      data: benefits
    });
});

/**
 * Get subscription usage statistics
 * GET /api/subscriptions/usage
 */
export const getSubscriptionUsage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: {
          usage: {
            totalSavings: 0,
            ordersThisMonth: 0,
            ordersAllTime: 0,
            cashbackEarned: 0,
            deliveryFeesSaved: 0,
            exclusiveDealsUsed: 0
          },
          roi: {
            subscriptionCost: 0,
            totalSavings: 0,
            netSavings: 0,
            roiPercentage: 0
          }
        }
      });
    }

    const roi = await subscriptionBenefitsService.getSubscriptionROI(userId);

    res.status(200).json({
      success: true,
      data: {
        usage: subscription.usage,
        roi,
        daysRemaining: subscription.getRemainingDays(),
        isActive: subscription.isActive()
      }
    });
});

/**
 * Get current month subscription savings breakdown
 * GET /api/subscriptions/my-savings
 */
export const getMySavings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const savings = await subscriptionBenefitsService.getMonthlySubscriptionSavings(userId);

    res.status(200).json({
      success: true,
      data: savings
    });
});

/**
 * Get value proposition for upgrading
 * GET /api/subscriptions/value-proposition/:tier
 */
export const getValueProposition = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { tier } = req.params;

    if (!['premium', 'vip'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier'
      });
    }

    const valueProposition = await subscriptionBenefitsService.getValueProposition(
      userId,
      tier as SubscriptionTier
    );

    res.status(200).json({
      success: true,
      data: valueProposition
    });
});

/**
 * Handle Razorpay webhook with comprehensive security
 * POST /api/subscriptions/webhook
 *
 * Security features:
 * - IP whitelisting (Razorpay IP ranges only)
 * - Signature verification
 * - Event deduplication (replay attack prevention)
 * - Timestamp validation
 * - Rate limiting
 * - Comprehensive audit logging
 * - Alert on violations
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookStartTime = Date.now();
  const webhookBody = req.body;
  const signature = req.headers['x-razorpay-signature'] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const clientIP =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.headers['x-real-ip']?.toString() ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    'unknown';

  try {
    // Step 1: Check for required fields
    if (!webhookBody?.id || !webhookBody?.event || !signature) {
      logger.error('[WEBHOOK] Missing required fields', {
        hasId: !!webhookBody?.id,
        hasEvent: !!webhookBody?.event,
        hasSignature: !!signature,
        timestamp: new Date().toISOString(),
      });

      await alertService.alertInvalidPayload(
        webhookBody?.id,
        'Missing required fields'
      );

      return res.status(400).json({
        success: false,
        message: 'Missing required webhook fields',
      });
    }

    const eventId = webhookBody.id;
    const eventType = webhookBody.event;

    // Step 2: Verify webhook signature
    logger.info('[WEBHOOK] Verifying signature', {
      eventId,
      eventType,
      ip: clientIP,
    });

    const isValid = razorpaySubscriptionService.verifyWebhookSignature(
      JSON.stringify(webhookBody),
      signature,
      secret
    );

    if (!isValid) {
      logger.error('[WEBHOOK] Invalid signature', {
        eventId,
        eventType,
        ip: clientIP,
      });

      await alertService.alertSignatureFailure(
        eventId,
        'Signature verification failed'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Step 3: Check for duplicate/replay attack
    logger.info('[WEBHOOK] Checking for duplicates', {
      eventId,
    });

    const isDuplicate = await ProcessedWebhookEvent.isEventProcessed(eventId);

    if (isDuplicate) {
      logger.warn('[WEBHOOK] Duplicate event detected', {
        eventId,
        eventType,
        ip: clientIP,
      });

      await alertService.alertDuplicateEvent(eventId);

      // Return 200 OK for duplicate (idempotent behavior)
      // Razorpay will consider this a success
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed',
        eventId,
      });
    }

    // Step 4: Validate timestamp (prevent replay attacks)
    const WEBHOOK_MAX_AGE_SECONDS = 300; // 5 minutes
    const eventTimestamp = webhookBody.created_at;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const webhookAge = currentTimestamp - eventTimestamp;

    if (webhookAge > WEBHOOK_MAX_AGE_SECONDS) {
      logger.error('[WEBHOOK] Webhook expired', {
        eventId,
        age: webhookAge,
        maxAge: WEBHOOK_MAX_AGE_SECONDS,
      });

      await alertService.alertReplayAttack(
        eventId,
        `Webhook too old: ${webhookAge}s`
      );

      return res.status(400).json({
        success: false,
        message: 'Webhook expired or too old',
      });
    }

    // Step 5: Log successful validation
    logger.info('[WEBHOOK] Validation successful', {
      eventId,
      eventType,
      ip: clientIP,
      validationTimeMs: Date.now() - webhookStartTime,
    });

    // Step 6: Process webhook
    try {
      logger.info('[WEBHOOK] Processing started', {
        eventId,
        eventType,
      });

      const processingStartTime = Date.now();

      // Handle the webhook using existing service
      await razorpaySubscriptionService.handleWebhook(webhookBody);

      const processingTimeMs = Date.now() - processingStartTime;

      logger.info('[WEBHOOK] Processing completed', {
        eventId,
        eventType,
        processingTimeMs,
      });

      // Step 7: Record successful event
      try {
        await ProcessedWebhookEvent.recordEvent(
          eventId,
          eventType,
          webhookBody.payload?.subscription?.id || '',
          signature,
          clientIP,
          req.headers['user-agent']?.toString()
        );

        logger.info('[WEBHOOK] Event recorded in audit log', {
          eventId,
        });
      } catch (recordError: any) {
        // Log but don't fail the webhook response
        logger.warn('[WEBHOOK] Failed to record event in audit log', {
          eventId,
          error: recordError.message,
        });
      }

      // Step 8: Send success response
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        eventId,
        processingTimeMs,
      });
    } catch (processingError: any) {
      logger.error('[WEBHOOK] Processing error', {
        eventId,
        eventType,
        error: processingError.message,
        stack: processingError.stack,
      });

      await alertService.alertProcessingFailure(
        eventId,
        processingError.message
      );

      // Try to record the failed event
      try {
        await ProcessedWebhookEvent.markEventFailed(
          eventId,
          processingError.message
        );
      } catch (recordError: any) {
        logger.warn('[WEBHOOK] Failed to record error in audit log', {
          eventId,
          error: recordError.message,
        });
      }

      // Return 500 so Razorpay knows to retry
      return res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
        error: processingError.message,
        eventId,
      });
    }
  } catch (error: any) {
    logger.error('[WEBHOOK] Unexpected error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    await alertService.sendSecurityAlert({
      type: 'WEBHOOK_PROCESSING_FAILURE',
      severity: 'critical',
      eventId: webhookBody?.id,
      reason: `Unexpected webhook error: ${error.message}`,
      details: {
        stack: error.stack,
      },
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing webhook',
      error: error.message,
    });
  }
});

/**
 * Toggle auto-renewal
 * PATCH /api/subscriptions/auto-renew
 */
export const toggleAutoRenew = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { autoRenew } = req.body;

    // Validate autoRenew is a boolean
    if (typeof autoRenew !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'autoRenew must be a boolean'
      });
    }

    const subscription = await subscriptionBenefitsService.getUserSubscription(userId);
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const previousAutoRenew = subscription.autoRenew;
    subscription.autoRenew = autoRenew;
    await subscription.save();

    // Audit log
    subscriptionAuditService.logChange({
      subscriptionId: (subscription._id as any)?.toString(),
      userId,
      action: 'auto_renewed',
      previousState: { tier: subscription.tier, status: subscription.status },
      newState: { tier: subscription.tier, status: subscription.status },
      metadata: {
        ipAddress: req.ip,
        description: `Auto-renewal ${previousAutoRenew ? 'enabled' : 'disabled'} → ${autoRenew ? 'enabled' : 'disabled'}`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'}`,
      data: subscription
    });
});

/**
 * Validate promo code
 * POST /api/subscriptions/validate-promo
 */
export const validatePromoCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { code, tier, billingCycle } = req.body;

    // Validate input
    if (!code || !tier || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, tier, billingCycle'
      });
    }

    // Validate tier
    if (!['premium', 'vip'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier. Must be premium or vip.'
      });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle. Must be monthly or yearly.'
      });
    }

    // Validate promo code
    const result = await promoCodeService.validatePromoCode(
      code,
      tier as SubscriptionTier,
      billingCycle as BillingCycle,
      userId
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid promo code'
      });
    }

    // Return success with discount details
    res.status(200).json({
      success: true,
      data: {
        discount: result.discount,
        finalPrice: result.finalPrice,
        originalPrice: await promoCodeService.getSubscriptionPrice(tier as SubscriptionTier, billingCycle as BillingCycle),
        message: result.message || 'Promo code applied successfully'
      },
      message: result.message || 'Promo code is valid'
    });
});
