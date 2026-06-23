// Payment Gateway Service
// Unified service for handling multiple payment gateways

import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment } from '../models/Payment';
import { EventBooking } from '../models';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

// Payment Gateway Types
export interface PaymentGatewayConfig {
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
    mode: 'sandbox' | 'live';
    webhookId: string;
  };
}

export interface PaymentRequestData {
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'razorpay' | 'paypal';
  paymentMethodType: 'card' | 'upi' | 'wallet' | 'netbanking';
  userDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponseData {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentUrl?: string;
  qrCode?: string;
  upiId?: string;
  expiryTime?: string;
  transactionId?: string;
  completedAt?: string;
  gatewayResponse?: any;
  gateway: 'stripe' | 'razorpay' | 'paypal';
}

class PaymentGatewayService {
  private stripe?: Stripe;
  private razorpay?: Razorpay;
  private razorpayVerified = false;
  private config: PaymentGatewayConfig;

  constructor() {
    this.config = {
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
      },
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
      },
      paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
        webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
      }
    };

    // Initialize Stripe
    if (this.config.stripe.secretKey) {
      this.stripe = new Stripe(this.config.stripe.secretKey);
      logger.info('✅ [PAYMENT GATEWAY] Stripe initialized');
    } else {
      logger.warn('⚠️ [PAYMENT GATEWAY] Stripe secret key not found. Stripe payments will not work.');
    }

    // Initialize Razorpay
    if (this.config.razorpay.keyId && this.config.razorpay.keySecret) {
      this.razorpay = new Razorpay({
        key_id: this.config.razorpay.keyId,
        key_secret: this.config.razorpay.keySecret
      });
      // Verify credentials async — if they fail, disable Razorpay
      this.verifyRazorpayCredentials();
    }
  }

  /**
   * Verify Razorpay credentials by making a lightweight API call.
   * If invalid, disable Razorpay so it won't be offered to users.
   */
  private async verifyRazorpayCredentials(): Promise<void> {
    if (!this.razorpay) return;
    try {
      // Fetch payments with count=1 — lightweight call to verify auth
      await (this.razorpay as any).payments.all({ count: 1 });
      this.razorpayVerified = true;
      logger.info('✅ [PAYMENT GATEWAY] Razorpay credentials verified');
    } catch (err: any) {
      logger.warn('⚠️ [PAYMENT GATEWAY] Razorpay credentials invalid — disabling Razorpay:', err?.error?.description || err?.message || 'Auth failed');
      this.razorpay = undefined;
      this.razorpayVerified = false;
    }
  }

  /**
   * Initiate payment with the specified gateway
   */
  async initiatePayment(
    paymentData: PaymentRequestData,
    userId: string
  ): Promise<PaymentResponseData> {
    logger.info('💳 [PAYMENT GATEWAY] Initiating payment:', {
      gateway: paymentData.paymentMethod,
      amount: paymentData.amount,
      currency: paymentData.currency,
      userId
    });

    try {
      let response: PaymentResponseData;

      switch (paymentData.paymentMethod) {
        case 'stripe':
          response = await this.initiateStripePayment(paymentData, userId);
          break;
        case 'razorpay':
          response = await this.initiateRazorpayPayment(paymentData, userId);
          break;
        case 'paypal':
          throw new Error('PayPal integration not yet implemented');
          break;
        default:
          throw new Error(`Unsupported payment method: ${paymentData.paymentMethod}`);
      }

      // Save payment record to database
      await this.savePaymentRecord(response, userId, paymentData);

      logger.info('✅ [PAYMENT GATEWAY] Payment initiated successfully:', response.paymentId);
      return response;
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Payment initiation failed:', error);
      throw error;
    }
  }

  /**
   * Initiate Stripe payment
   */
  private async initiateStripePayment(
    paymentData: PaymentRequestData,
    userId: string
  ): Promise<PaymentResponseData> {
    if (!this.stripe) {
      logger.error('❌ [STRIPE] Stripe instance not initialized. Check STRIPE_SECRET_KEY environment variable.');
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    try {
      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        metadata: {
          userId,
          paymentMethodType: paymentData.paymentMethodType,
          ...paymentData.metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      return {
        paymentId: paymentIntent.id,
        orderId: `ORDER_${Date.now()}`,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'pending',
        paymentUrl: `https://checkout.stripe.com/pay/${paymentIntent.id}`,
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        gatewayResponse: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        },
        gateway: 'stripe'
      };
    } catch (error: any) {
      logger.error('❌ [STRIPE] Payment creation failed:', error);
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  /**
   * Initiate Razorpay payment
   */
  private async initiateRazorpayPayment(
    paymentData: PaymentRequestData,
    userId: string
  ): Promise<PaymentResponseData> {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured');
    }

    try {
      const orderId = `ORDER_${Date.now()}`;
      const amount = Math.round(paymentData.amount * 100); // Convert to paise

      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount,
        currency: paymentData.currency,
        receipt: orderId,
        notes: {
          userId,
          paymentMethodType: paymentData.paymentMethodType,
          ...paymentData.metadata
        }
      });

      // Generate payment URL based on payment method type
      let paymentUrl: string;
      let qrCode: string | undefined;
      let upiId: string | undefined;

      if (paymentData.paymentMethodType === 'upi') {
        // For UPI, generate UPI payment URL
        upiId = 'merchant@razorpay';
        qrCode = `upi://pay?pa=${upiId}&pn=REZ&am=${paymentData.amount}&cu=${paymentData.currency}&tn=Wallet+Topup`;
        paymentUrl = `https://rzp.io/l/${order.id}`;
      } else {
        paymentUrl = `https://checkout.razorpay.com/v1/checkout.js?payment_id=${order.id}`;
      }

      return {
        paymentId: order.id,
        orderId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'pending',
        paymentUrl,
        qrCode,
        upiId,
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        gatewayResponse: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency
        },
        gateway: 'razorpay'
      };
    } catch (error: any) {
      logger.error('❌ [RAZORPAY] Payment creation failed:', error);
      throw new Error(`Razorpay payment failed: ${error.message}`);
    }
  }

  /**
   * Initiate PayPal payment (Not implemented yet)
   */
  private async initiatePayPalPayment(
    paymentData: PaymentRequestData,
    userId: string
  ): Promise<PaymentResponseData> {
    throw new Error('PayPal integration not yet implemented');
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string, gateway: string, userId: string): Promise<PaymentResponseData> {
    logger.info('💳 [PAYMENT GATEWAY] Checking payment status:', { paymentId, gateway, userId });

    try {
      let status: PaymentResponseData;

      switch (gateway) {
        case 'stripe':
          status = await this.checkStripePaymentStatus(paymentId);
          break;
        case 'razorpay':
          status = await this.checkRazorpayPaymentStatus(paymentId);
          break;
        case 'paypal':
          throw new Error('PayPal integration not yet implemented');
          break;
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }

      // Update payment record in database
      await this.updatePaymentRecord(paymentId, status, userId);

      return status;
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Status check failed:', error);
      throw error;
    }
  }

  /**
   * Check Stripe payment status
   */
  private async checkStripePaymentStatus(paymentId: string): Promise<PaymentResponseData> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        paymentId: paymentIntent.id,
        orderId: `ORDER_${Date.now()}`,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: this.mapStripeStatus(paymentIntent.status),
        transactionId: paymentIntent.latest_charge as string,
        completedAt: paymentIntent.status === 'succeeded' ? new Date().toISOString() : undefined,
        gatewayResponse: {
          status: paymentIntent.status,
          id: paymentIntent.id
        },
        gateway: 'stripe'
      };
    } catch (error: any) {
      logger.error('❌ [STRIPE] Status check failed:', error);
      throw error;
    }
  }

  /**
   * Check Razorpay payment status
   */
  private async checkRazorpayPaymentStatus(paymentId: string): Promise<PaymentResponseData> {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured');
    }

    try {
      const order = await this.razorpay.orders.fetch(paymentId);
      const payments = await this.razorpay.orders.fetchPayments(paymentId);

      const latestPayment = payments.items[0];

      return {
        paymentId: order.id,
        orderId: order.receipt || order.id,
        amount: Number(order.amount || 0) / 100,
        currency: order.currency.toUpperCase(),
        status: this.mapRazorpayStatus(order.status),
        transactionId: latestPayment?.id,
        completedAt: order.status === 'paid' ? new Date().toISOString() : undefined,
        gatewayResponse: {
          status: order.status,
          payments: payments.items
        },
        gateway: 'razorpay'
      };
    } catch (error: any) {
      logger.error('❌ [RAZORPAY] Status check failed:', error);
      throw error;
    }
  }

  /**
   * Check PayPal payment status (Not implemented yet)
   */
  private async checkPayPalPaymentStatus(paymentId: string): Promise<PaymentResponseData> {
    throw new Error('PayPal integration not yet implemented');
  }

  /**
   * Handle webhook from payment gateway
   */
  async handleWebhook(
    gateway: string,
    payload: any,
    signature: string
  ): Promise<{ success: boolean; message: string }> {
    logger.info('🔔 [PAYMENT GATEWAY] Webhook received:', { gateway, signature });

    try {
      let isValid = false;

      switch (gateway) {
        case 'stripe':
          isValid = await this.verifyStripeWebhook(payload, signature);
          break;
        case 'razorpay':
          isValid = await this.verifyRazorpayWebhook(payload, signature);
          break;
        case 'paypal':
          isValid = await this.verifyPayPalWebhook(payload, signature);
          break;
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on gateway
      await this.processWebhook(gateway, payload);

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Webhook processing failed:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  private async verifyStripeWebhook(payload: any, signature: string): Promise<boolean> {
    if (!this.config.stripe.webhookSecret) {
      return false;
    }

    try {
      const event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        this.config.stripe.webhookSecret
      );
      return !!event;
    } catch (error) {
      logger.error('❌ [STRIPE] Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Razorpay webhook signature
   */
  private async verifyRazorpayWebhook(payload: any, signature: string): Promise<boolean> {
    if (!this.config.razorpay.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.razorpay.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('❌ [RAZORPAY] Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Verify PayPal webhook signature (Not implemented yet)
   */
  private async verifyPayPalWebhook(payload: any, signature: string): Promise<boolean> {
    return false; // Not implemented yet
  }

  /**
   * Process webhook payload
   */
  private async processWebhook(gateway: string, payload: any): Promise<void> {
    logger.info('🔄 [PAYMENT GATEWAY] Processing webhook:', { gateway, eventType: payload.type });

    switch (gateway) {
      case 'stripe':
        await this.processStripeWebhook(payload);
        break;
      case 'razorpay':
        await this.processRazorpayWebhook(payload);
        break;
      case 'paypal':
        await this.processPayPalWebhook(payload);
        break;
    }
  }

  /**
   * Process Stripe webhook
   */
  private async processStripeWebhook(payload: any): Promise<void> {
    const event = payload;

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.updatePaymentFromWebhook(event.data.object.id, 'completed', 'stripe');
        // Update associated booking status
        await this.updateBookingStatusFromPayment(event.data.object.id, 'confirmed');
        break;
      case 'payment_intent.payment_failed':
        await this.updatePaymentFromWebhook(event.data.object.id, 'failed', 'stripe');
        break;
    }
  }

  /**
   * Process Razorpay webhook
   */
  private async processRazorpayWebhook(payload: any): Promise<void> {
    const event = payload.event;

    switch (event) {
      case 'payment.captured':
        await this.updatePaymentFromWebhook(payload.payload.payment.entity.order_id, 'completed', 'razorpay');
        break;
      case 'payment.failed':
        await this.updatePaymentFromWebhook(payload.payload.payment.entity.order_id, 'failed', 'razorpay');
        break;
    }
  }

  /**
   * Process PayPal webhook
   */
  private async processPayPalWebhook(payload: any): Promise<void> {
    const eventType = payload.event_type;

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.updatePaymentFromWebhook(payload.resource.id, 'completed', 'paypal');
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await this.updatePaymentFromWebhook(payload.resource.id, 'failed', 'paypal');
        break;
    }
  }

  /**
   * Update payment record from webhook and credit wallet if applicable
   */
  private async updatePaymentFromWebhook(
    paymentId: string,
    status: string,
    gateway: string
  ): Promise<void> {
    try {
      const payment = await Payment.findOne({ paymentId });
      if (!payment) {
        logger.warn('[PAYMENT GATEWAY] Payment not found for webhook:', paymentId);
        return;
      }

      // Prevent double-processing
      if (payment.status === 'completed' && status === 'completed') {
        logger.info('[PAYMENT GATEWAY] Payment already completed, skipping:', paymentId);
        return;
      }

      payment.status = status as any;
      if (status === 'completed') {
        payment.completedAt = new Date();
      }
      await payment.save();
      logger.info('✅ [PAYMENT GATEWAY] Payment updated from webhook:', paymentId, status);

      // Credit wallet if this is a wallet_topup and payment succeeded
      if (status === 'completed' && payment.purpose === 'wallet_topup') {
        await this.creditWalletFromPayment(payment);
      }
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Failed to update payment from webhook:', error);
    }
  }

  /**
   * Credit wallet with coins after successful topup payment
   */
  async creditWalletFromPayment(payment: any): Promise<void> {
    const userId = payment.user.toString();
    // Use creditAmount from metadata (full NC amount before discount), fallback to payment amount
    const amount = payment.metadata?.creditAmount || payment.amount;

    try {
      // Check if already credited (idempotency via CoinTransaction)
      const existing = await CoinTransaction.findOne({
        user: new mongoose.Types.ObjectId(userId),
        source: 'recharge',
        idempotencyKey: `recharge_${payment.paymentId}`
      }).lean();

      if (existing) {
        logger.info('[PAYMENT GATEWAY] Wallet already credited for payment:', payment.paymentId);
        return;
      }

      // Find or create wallet
      let wallet = await Wallet.findOne({ user: userId }).lean();
      if (!wallet) {
        wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
      }

      if (!wallet) {
        logger.error('[PAYMENT GATEWAY] Failed to find/create wallet for user:', userId);
        return;
      }

      // Credit rez coins atomically
      await Wallet.findOneAndUpdate(
        { user: userId },
        {
          $inc: {
            'balance.available': amount,
            'statistics.totalEarned': amount,
            'statistics.totalTopups': amount
          }
        }
      );

      // Also update the coins array (rez type)
      await Wallet.findOneAndUpdate(
        { user: userId, 'coins.type': 'rez' },
        { $inc: { 'coins.$.amount': amount } }
      );

      // Record CoinTransaction for audit using createTransaction (handles balance + locking)
      await (CoinTransaction as any).createTransaction(
        userId,
        'earned',
        amount,
        'recharge',
        `Wallet recharge via ${payment.paymentMethod}`,
        {
          paymentId: payment.paymentId,
          gateway: payment.paymentMethod,
          idempotencyKey: `recharge_${payment.paymentId}`
        }
      );

      logger.info('✅ [PAYMENT GATEWAY] Wallet credited:', { userId, amount, paymentId: payment.paymentId });
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Failed to credit wallet:', error);
      // This is critical — log for manual resolution
      logger.error('MANUAL_RESOLUTION_NEEDED:', { userId, amount, paymentId: payment.paymentId });
    }
  }

  /**
   * Update booking status from payment intent
   */
  private async updateBookingStatusFromPayment(
    paymentIntentId: string,
    bookingStatus: 'confirmed' | 'cancelled'
  ): Promise<void> {
    try {
      // Find payment by payment intent ID
      // The paymentId is set to paymentIntent.id when creating the payment
      const payment = await Payment.findOne({ 
        $or: [
          { paymentId: paymentIntentId },
          { 'gatewayResponse.paymentIntentId': paymentIntentId },
          { 'gatewayResponse.transactionId': paymentIntentId }
        ]
      }).lean();

      if (!payment) {
        logger.warn('⚠️ [PAYMENT GATEWAY] Payment not found for payment intent:', paymentIntentId);
        return;
      }

      // Get booking ID from payment metadata
      const bookingId = payment.metadata?.bookingId;
      if (!bookingId) {
        logger.warn('⚠️ [PAYMENT GATEWAY] Booking ID not found in payment metadata');
        return;
      }

      // Update booking status
      const booking = await EventBooking.findById(bookingId);
      
      if (booking) {
        booking.status = bookingStatus;
        await booking.save();
        logger.info('✅ [PAYMENT GATEWAY] Booking status updated:', {
          bookingId,
          status: bookingStatus,
          paymentIntentId
        });
      } else {
        logger.warn('⚠️ [PAYMENT GATEWAY] Booking not found:', bookingId);
      }
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Failed to update booking status from payment:', error);
    }
  }

  /**
   * Save payment record to database
   */
  private async savePaymentRecord(
    response: PaymentResponseData,
    userId: string,
    paymentData: PaymentRequestData
  ): Promise<void> {
    try {
      const payment = new Payment({
        paymentId: response.paymentId,
        orderId: response.orderId,
        user: userId,
        amount: response.amount,
        currency: response.currency,
        paymentMethod: response.gateway,
        purpose: paymentData.metadata?.purpose || 'other',
        status: response.status,
        userDetails: paymentData.userDetails,
        metadata: paymentData.metadata || {},
        gatewayResponse: response.gatewayResponse,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await payment.save();
      logger.info('💾 [PAYMENT GATEWAY] Payment record saved:', payment._id);
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Failed to save payment record:', error);
      throw error;
    }
  }

  /**
   * Update payment record in database
   */
  private async updatePaymentRecord(
    paymentId: string,
    response: PaymentResponseData,
    userId: string
  ): Promise<void> {
    try {
      const payment = await Payment.findOne({ paymentId, user: userId });
      if (payment) {
        payment.status = response.status;
        payment.gatewayResponse = response.gatewayResponse;
        if (response.completedAt) {
          payment.completedAt = new Date(response.completedAt);
        }
        await payment.save();
        logger.info('✅ [PAYMENT GATEWAY] Payment record updated:', paymentId);
      }
    } catch (error) {
      logger.error('❌ [PAYMENT GATEWAY] Failed to update payment record:', error);
    }
  }

  /**
   * Map Stripe status to our status
   */
  private mapStripeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'canceled':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  /**
   * Map Razorpay status to our status
   */
  private mapRazorpayStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 'created':
        return 'pending';
      case 'attempted':
        return 'processing';
      case 'paid':
        return 'completed';
      case 'canceled':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  /**
   * Map PayPal status to our status
   */
  private mapPayPalStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 'CREATED':
      case 'SAVED':
        return 'pending';
      case 'APPROVED':
        return 'processing';
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  /**
   * Get available payment methods for a gateway
   */
  getAvailablePaymentMethods(gateway: string, currency?: string): string[] {
    switch (gateway) {
      case 'stripe':
        // UPI is only available in India (INR)
        if (currency === 'INR') return ['card', 'upi', 'wallet'];
        return ['card'];
      case 'razorpay':
        return ['card', 'upi', 'wallet', 'netbanking'];
      case 'paypal':
        return ['card', 'paypal'];
      default:
        return [];
    }
  }

  /**
   * Check if a gateway has valid credentials configured
   */
  isGatewayConfigured(gateway: string): boolean {
    switch (gateway) {
      case 'stripe':
        return !!this.stripe;
      case 'razorpay':
        // Only available after async credential verification succeeds
        return !!this.razorpay && this.razorpayVerified;
      case 'paypal':
        return !!(this.config.paypal.clientId && this.config.paypal.clientSecret &&
          !this.config.paypal.clientId.includes('your_') &&
          !this.config.paypal.clientSecret.includes('your_'));
      default:
        return false;
    }
  }

  /**
   * Get supported currencies for a gateway
   */
  getSupportedCurrencies(gateway: string): string[] {
    switch (gateway) {
      case 'stripe':
        return ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD'];
      case 'razorpay':
        return ['INR'];
      case 'paypal':
        return ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
      default:
        return [];
    }
  }
  /**
   * Return health status of configured payment gateways (no network calls).
   */
  public getHealthStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    if (this.config.stripe.secretKey) {
      status.stripe = this.stripe ? 'configured' : 'error';
    }
    if (this.config.razorpay.keyId) {
      status.razorpay = this.razorpayVerified ? 'verified' : (this.razorpay ? 'configured' : 'error');
    }
    if (this.config.paypal.clientId) {
      status.paypal = 'configured';
    }
    return status;
  }
}

// Export singleton instance
const paymentGatewayService = new PaymentGatewayService();
export default paymentGatewayService;
