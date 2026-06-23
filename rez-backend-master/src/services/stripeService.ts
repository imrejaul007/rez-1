import Stripe from 'stripe';
import { logger } from '../config/logger';

class StripeService {
  private stripe: Stripe | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe with secret key from environment
   */
  private initializeStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      logger.warn('[STRIPE SERVICE] STRIPE_SECRET_KEY not configured');
      this.isConfigured = false;
      return;
    }

    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia' as any, // Latest stable Stripe API version
      });
      this.isConfigured = true;
      logger.info('[STRIPE SERVICE] Stripe initialized successfully');
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Failed to initialize Stripe', { error: error.message });
      this.isConfigured = false;
    }
  }

  /**
   * Check if Stripe is configured
   */
  public isStripeConfigured(): boolean {
    return this.isConfigured && this.stripe !== null;
  }

  /**
   * Create a checkout session for subscription payment
   */
  public async createCheckoutSession(params: {
    subscriptionId: string;
    tier: string;
    amount: number;
    billingCycle: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    logger.info('[STRIPE SERVICE] Creating checkout session', {
      subscriptionId: params.subscriptionId,
      tier: params.tier,
      amount: params.amount,
      billingCycle: params.billingCycle,
    });

    try {
      // Convert amount to smallest currency unit (paise for INR)
      const amountInPaise = Math.round(params.amount * 100);

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `${params.tier.toUpperCase()} Subscription`,
                description: `${params.billingCycle.charAt(0).toUpperCase() + params.billingCycle.slice(1)} billing for ${params.tier.toUpperCase()} tier`,
              },
              unit_amount: amountInPaise,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: {
          subscriptionId: params.subscriptionId,
          tier: params.tier,
          billingCycle: params.billingCycle,
          ...params.metadata,
        },
      });

      logger.info('[STRIPE SERVICE] Checkout session created', { sessionId: session.id });

      return session;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error creating checkout session', { error: error.message });
      throw new Error(`Failed to create Stripe checkout session: ${error.message}`);
    }
  }

  /**
   * Create a checkout session for general order payment (products, services)
   */
  public async createCheckoutSessionForOrder(params: {
    orderId: string;
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerName?: string;
    successUrl: string;
    cancelUrl: string;
    items?: Array<{
      name: string;
      description?: string;
      amount: number;
      quantity: number;
      itemType?: 'product' | 'service' | 'event';
    }>;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    logger.info('[STRIPE SERVICE] Creating checkout session for order', {
      orderId: params.orderId,
      amount: params.amount,
      itemCount: params.items?.length,
    });

    try {
      // Convert amount to smallest currency unit (paise for INR)
      const amountInPaise = Math.round(params.amount * 100);

      // Build line items from order items or use total amount
      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

      if (params.items && params.items.length > 0) {
        // Create line items from order items
        lineItems = params.items.map(item => ({
          price_data: {
            currency: params.currency || 'inr',
            product_data: {
              name: item.name,
              description: item.description || (item.itemType === 'service' ? 'Service Booking' : 'Product'),
            },
            unit_amount: Math.round(item.amount * 100),
          },
          quantity: item.quantity,
        }));
      } else {
        // Use total amount as single line item
        lineItems = [
          {
            price_data: {
              currency: params.currency || 'inr',
              product_data: {
                name: `Order ${params.orderId}`,
                description: 'Order payment',
              },
              unit_amount: amountInPaise,
            },
            quantity: 1,
          },
        ];
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: {
          orderId: params.orderId,
          paymentType: 'order',
          ...params.metadata,
        },
        payment_intent_data: {
          metadata: {
            orderId: params.orderId,
            paymentType: 'order',
          },
        },
      });

      logger.info('[STRIPE SERVICE] Order checkout session created', { sessionId: session.id });

      return session;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error creating order checkout session', { error: error.message });
      throw new Error(`Failed to create Stripe checkout session for order: ${error.message}`);
    }
  }

  /**
   * Retrieve a checkout session
   */
  public async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error retrieving checkout session', { error: error.message });
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  /**
   * Create a payment intent (alternative to checkout session)
   */
  public async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const amountInSmallestUnit = Math.round(params.amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: params.currency || 'inr',
        metadata: params.metadata || {},
      });

      logger.info('[STRIPE SERVICE] Payment intent created', { paymentIntentId: paymentIntent.id });

      return paymentIntent;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error creating payment intent', { error: error.message });
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  public async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      logger.info('[STRIPE SERVICE] Payment intent retrieved', { paymentIntentId: paymentIntent.id });
      return paymentIntent;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error retrieving payment intent', { error: error.message });
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * Cancel a payment intent
   */
  public async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      logger.info('[STRIPE SERVICE] Payment intent cancelled', { paymentIntentId: paymentIntent.id });
      return paymentIntent;
    } catch (error: any) {
      // If already cancelled or in terminal state, that's OK
      if (error.code === 'payment_intent_unexpected_state') {
        logger.warn('[STRIPE SERVICE] Payment intent already in terminal state');
        return await this.stripe.paymentIntents.retrieve(paymentIntentId);
      }
      logger.error('[STRIPE SERVICE] Error cancelling payment intent', { error: error.message });
      throw new Error(`Failed to cancel payment intent: ${error.message}`);
    }
  }

  /**
   * Verify payment intent status
   * Returns true if payment is successful
   */
  public async verifyPaymentIntent(paymentIntentId: string): Promise<{
    verified: boolean;
    status: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      logger.info('[STRIPE SERVICE] Verifying payment intent', { paymentIntentId });

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      const verified = paymentIntent.status === 'succeeded';

      if (verified) {
        logger.info('[STRIPE SERVICE] Payment intent verified successfully', { paymentIntentId });
      } else {
        logger.warn('[STRIPE SERVICE] Payment intent not verified', { paymentIntentId, status: paymentIntent.status });
      }

      return {
        verified,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from smallest unit to rupees
        currency: paymentIntent.currency.toUpperCase(),
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error verifying payment intent', { error: error.message });
      throw new Error(`Failed to verify payment intent: ${error.message}`);
    }
  }

  /**
   * Verify checkout session and retrieve payment details
   */
  public async verifyCheckoutSession(sessionId: string): Promise<{
    verified: boolean;
    paymentStatus: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    paymentIntentId?: string;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      logger.info('[STRIPE SERVICE] Verifying checkout session', { sessionId });

      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      const verified = session.payment_status === 'paid';

      if (verified) {
        logger.info('[STRIPE SERVICE] Checkout session verified successfully', { sessionId });
      } else {
        logger.warn('[STRIPE SERVICE] Checkout session not verified', { sessionId, paymentStatus: session.payment_status });
      }

      return {
        verified,
        paymentStatus: session.payment_status,
        amount: (session.amount_total || 0) / 100, // Convert from smallest unit to rupees
        currency: (session.currency || 'inr').toUpperCase(),
        metadata: session.metadata as Record<string, string>,
        paymentIntentId: session.payment_intent as string,
      };
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error verifying checkout session', { error: error.message });
      throw new Error(`Failed to verify checkout session: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  public verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret?: string
  ): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Use provided webhook secret or fall back to environment variable
    const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      logger.info('[STRIPE SERVICE] Webhook signature verified', { eventType: event.type });
      return event;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Webhook signature verification failed', { error: error.message });
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Create a refund for a payment intent
   */
  public async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // in smallest currency unit (paise)
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      logger.info('[STRIPE SERVICE] Creating refund for payment', { paymentIntentId: params.paymentIntentId });

      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason,
        metadata: params.metadata,
      });

      logger.info('[STRIPE SERVICE] Refund created', { refundId: refund.id });

      return refund;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error creating refund', { error: error.message });
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Retrieve refund status
   */
  public async getRefundStatus(refundId: string): Promise<{
    id: string;
    status: string | null;
    amount: number;
    currency: string;
    created: number;
    reason: string | null;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      logger.info('[STRIPE SERVICE] Retrieving refund status', { refundId });

      const refund = await this.stripe.refunds.retrieve(refundId);

      logger.info('[STRIPE SERVICE] Refund status retrieved', { refundId, status: refund.status });

      return {
        id: refund.id,
        status: refund.status || 'unknown',
        amount: refund.amount,
        currency: refund.currency,
        created: refund.created,
        reason: refund.reason,
      };
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error retrieving refund', { error: error.message });
      throw new Error(`Failed to retrieve refund: ${error.message}`);
    }
  }

  /**
   * Cancel a refund (if still pending)
   */
  public async cancelRefund(refundId: string): Promise<{
    id: string;
    status: string | null;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      logger.info('[STRIPE SERVICE] Cancelling refund', { refundId });

      const refund = await this.stripe.refunds.cancel(refundId);

      logger.info('[STRIPE SERVICE] Refund cancelled', { refundId: refund.id });

      return {
        id: refund.id,
        status: refund.status || 'unknown',
      };
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error cancelling refund', { error: error.message });
      throw new Error(`Failed to cancel refund: ${error.message}`);
    }
  }

  /**
   * Create a checkout session for deal purchase (paid deals in campaigns)
   */
  public async createDealPurchaseSession(params: {
    campaignId: string;
    campaignSlug: string;
    dealIndex: number;
    dealStore: string;
    dealImage?: string;
    userId: string;
    amount: number;
    currency?: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    redemptionId?: string;
  }): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    // Validate currency - only allow supported currencies
    const supportedCurrencies = ['inr', 'aed', 'usd'];
    const currency = (params.currency || 'INR').toLowerCase();

    if (!supportedCurrencies.includes(currency)) {
      throw new Error(`Unsupported currency: ${params.currency}. Supported currencies: INR, AED, USD`);
    }

    // Validate amount
    if (!params.amount || params.amount <= 0) {
      throw new Error('Invalid payment amount. Amount must be greater than 0.');
    }

    logger.info('[STRIPE SERVICE] Creating deal purchase checkout session', {
      campaignSlug: params.campaignSlug,
      dealIndex: params.dealIndex,
      amount: params.amount,
      currency: currency.toUpperCase(),
      userId: params.userId,
    });

    try {
      // Convert amount to smallest currency unit
      const amountInSmallestUnit = Math.round(params.amount * 100);

      // Create checkout session for deal purchase
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: `Deal from ${params.dealStore || 'Campaign'}`,
                description: `Campaign: ${params.campaignSlug} | Deal #${params.dealIndex + 1}`,
                images: params.dealImage ? [params.dealImage] : [],
              },
              unit_amount: amountInSmallestUnit,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: {
          type: 'deal_purchase',
          campaignId: params.campaignId,
          campaignSlug: params.campaignSlug,
          dealIndex: params.dealIndex.toString(),
          userId: params.userId,
          redemptionId: params.redemptionId || '',
        },
        payment_intent_data: {
          metadata: {
            type: 'deal_purchase',
            campaignId: params.campaignId,
            campaignSlug: params.campaignSlug,
            dealIndex: params.dealIndex.toString(),
            userId: params.userId,
            redemptionId: params.redemptionId || '',
          },
        },
        expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // 60 minutes expiry for mobile users
      });

      logger.info('[STRIPE SERVICE] Deal purchase checkout session created', { sessionId: session.id });

      return session;
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error creating deal purchase checkout session', { error: error.message });
      throw new Error(`Failed to create deal purchase checkout session: ${error.message}`);
    }
  }

  /**
   * Verify deal purchase checkout session
   */
  public async verifyDealPurchaseSession(sessionId: string): Promise<{
    verified: boolean;
    paymentStatus: string;
    amount: number;
    currency: string;
    campaignId: string;
    campaignSlug: string;
    dealIndex: number;
    userId: string;
    redemptionId?: string;
    paymentIntentId?: string;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      logger.info('[STRIPE SERVICE] Verifying deal purchase session', { sessionId });

      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      const verified = session.payment_status === 'paid';
      const metadata = session.metadata || {};

      if (verified) {
        logger.info('[STRIPE SERVICE] Deal purchase session verified successfully', { sessionId });
      } else {
        logger.warn('[STRIPE SERVICE] Deal purchase session not verified', { sessionId, paymentStatus: session.payment_status });
      }

      return {
        verified,
        paymentStatus: session.payment_status,
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || 'inr').toUpperCase(),
        campaignId: metadata.campaignId || '',
        campaignSlug: metadata.campaignSlug || '',
        dealIndex: parseInt(metadata.dealIndex || '0', 10),
        userId: metadata.userId || '',
        redemptionId: metadata.redemptionId || undefined,
        paymentIntentId: session.payment_intent as string,
      };
    } catch (error: any) {
      logger.error('[STRIPE SERVICE] Error verifying deal purchase session', { error: error.message });
      throw new Error(`Failed to verify deal purchase session: ${error.message}`);
    }
  }

  /**
   * Handle Stripe errors with specific error codes
   */
  public handleStripeError(error: any): { message: string; code: string; statusCode: number } {
    if (error.type === 'StripeCardError') {
      // Card errors
      return {
        message: error.message || 'Card payment failed',
        code: error.code || 'card_declined',
        statusCode: 402,
      };
    } else if (error.type === 'StripeInvalidRequestError') {
      // Invalid parameters
      return {
        message: error.message || 'Invalid request to payment provider',
        code: 'invalid_request',
        statusCode: 400,
      };
    } else if (error.type === 'StripeAPIError') {
      // API errors
      return {
        message: 'Payment provider error. Please try again.',
        code: 'api_error',
        statusCode: 500,
      };
    } else if (error.type === 'StripeConnectionError') {
      // Network errors
      return {
        message: 'Network error connecting to payment provider',
        code: 'connection_error',
        statusCode: 503,
      };
    } else if (error.type === 'StripeAuthenticationError') {
      // Authentication errors
      return {
        message: 'Payment provider authentication failed',
        code: 'authentication_error',
        statusCode: 500,
      };
    } else {
      // Generic error
      return {
        message: error.message || 'Payment processing failed',
        code: 'processing_error',
        statusCode: 500,
      };
    }
  }
}

// Export singleton instance
export default new StripeService();
