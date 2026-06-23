import FlashSale, { IFlashSale } from '../models/FlashSale';
import FlashSalePurchase, { IFlashSalePurchase } from '../models/FlashSalePurchase';
import mongoose from 'mongoose';
import stockSocketService from './stockSocketService'; // Import socket service instead
import stripeService from './stripeService';
import { User } from '../models/User';
import pushNotificationService from './pushNotificationService';
import { logger } from '../config/logger';

interface CreateFlashSaleData {
  title: string;
  description: string;
  image: string;
  banner?: string;
  discountPercentage: number;
  discountAmount?: number;
  priority?: number;
  startTime: Date;
  endTime: Date;
  maxQuantity: number;
  limitPerUser?: number;
  lowStockThreshold?: number;
  products: string[];
  stores?: string[];
  category?: string;
  originalPrice?: number;
  flashSalePrice?: number;
  termsAndConditions?: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  notifyOnStart?: boolean;
  notifyOnEndingSoon?: boolean;
  notifyOnLowStock?: boolean;
  createdBy: string;
}

interface UpdateFlashSaleData {
  title?: string;
  description?: string;
  image?: string;
  banner?: string;
  discountPercentage?: number;
  discountAmount?: number;
  priority?: number;
  startTime?: Date;
  endTime?: Date;
  maxQuantity?: number;
  limitPerUser?: number;
  lowStockThreshold?: number;
  products?: string[];
  stores?: string[];
  category?: string;
  originalPrice?: number;
  flashSalePrice?: number;
  termsAndConditions?: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  notifyOnStart?: boolean;
  notifyOnEndingSoon?: boolean;
  notifyOnLowStock?: boolean;
  isActive?: boolean;
}

interface FlashSalePurchaseData {
  flashSaleId: string;
  userId: string;
  productId: string;
  quantity: number;
}

class FlashSaleService {
  /**
   * Create a new flash sale
   */
  async createFlashSale(data: CreateFlashSaleData): Promise<IFlashSale> {
    try {
      const flashSale = new FlashSale({
        ...data,
        products: data.products.map(id => new mongoose.Types.ObjectId(id)),
        stores: data.stores?.map(id => new mongoose.Types.ObjectId(id)),
        category: data.category ? new mongoose.Types.ObjectId(data.category) : undefined,
        createdBy: new mongoose.Types.ObjectId(data.createdBy),
      });

      await flashSale.save();

      // Populate related data
      await flashSale.populate('products', 'name image price');
      await flashSale.populate('stores', 'name logo');
      await flashSale.populate('category', 'name');

      logger.info('✅ [FlashSaleService] Flash sale created:', flashSale._id);

      // Schedule start notification if in the future
      if (flashSale.notifyOnStart && flashSale.startTime > new Date()) {
        this.scheduleStartNotification(flashSale);
      }

      return flashSale;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error creating flash sale:', error);
      throw error;
    }
  }

  /**
   * Get all active flash sales
   */
  async getActiveFlashSales(): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getActive()
        .populate('products', 'name image price stock')
        .populate('stores', 'name logo location')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting active flash sales:', error);
      throw error;
    }
  }

  /**
   * Get upcoming flash sales
   */
  async getUpcomingFlashSales(): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getUpcoming()
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting upcoming flash sales:', error);
      throw error;
    }
  }

  /**
   * Get flash sales expiring soon
   */
  async getExpiringSoonFlashSales(minutes: number = 5): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getExpiringSoon(minutes)
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting expiring flash sales:', error);
      throw error;
    }
  }

  /**
   * Get flash sale by ID
   */
  async getFlashSaleById(flashSaleId: string): Promise<IFlashSale | null> {
    try {
      const flashSale = await FlashSale.findById(flashSaleId)
        .populate('products', 'name image price stock description')
        .populate('stores', 'name logo location')
        .populate('category', 'name slug')
        .lean();

      return flashSale as unknown as IFlashSale | null;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting flash sale:', error);
      throw error;
    }
  }

  /**
   * Get flash sales by product ID
   */
  async getFlashSalesByProduct(productId: string): Promise<IFlashSale[]> {
    try {
      const now = new Date();
      const flashSales = await FlashSale.find({
        products: new mongoose.Types.ObjectId(productId),
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $nin: ['ended', 'sold_out'] },
      })
        .sort({ priority: -1, discountPercentage: -1 })
        .populate('category', 'name slug')
        .lean();

      return flashSales as unknown as IFlashSale[];
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting flash sales by product:', error);
      throw error;
    }
  }

  /**
   * Get flash sales by category
   */
  async getFlashSalesByCategory(categoryId: string): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getActive()
        .where('category', new mongoose.Types.ObjectId(categoryId))
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting flash sales by category:', error);
      throw error;
    }
  }

  /**
   * Update flash sale
   */
  async updateFlashSale(flashSaleId: string, data: UpdateFlashSaleData): Promise<IFlashSale | null> {
    try {
      const updateData: any = { ...data };

      // Convert string IDs to ObjectIds
      if (data.products) {
        updateData.products = data.products.map(id => new mongoose.Types.ObjectId(id));
      }
      if (data.stores) {
        updateData.stores = data.stores.map(id => new mongoose.Types.ObjectId(id));
      }
      if (data.category) {
        updateData.category = new mongoose.Types.ObjectId(data.category);
      }

      const flashSale = await FlashSale.findByIdAndUpdate(
        flashSaleId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug');

      if (!flashSale) {
        throw new Error('Flash sale not found');
      }

      logger.info('✅ [FlashSaleService] Flash sale updated:', flashSaleId);

      // Emit socket event for update
      if (io) {
        stockSocketService.getIO()?.emit('flashsale:updated', {
          flashSaleId: flashSale._id,
          title: flashSale.title,
          status: flashSale.status,
          remainingQuantity: flashSale.getAvailableQuantity(),
        });
      }

      return flashSale;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error updating flash sale:', error);
      throw error;
    }
  }

  /**
   * Validate flash sale purchase
   */
  async validateFlashSalePurchase(data: FlashSalePurchaseData): Promise<{
    valid: boolean;
    message?: string;
    flashSale?: IFlashSale;
  }> {
    try {
      const flashSale = await FlashSale.findById(data.flashSaleId);

      if (!flashSale) {
        return { valid: false, message: 'Flash sale not found' };
      }

      if (!flashSale.isActive()) {
        return { valid: false, message: 'Flash sale is not active' };
      }

      if (!flashSale.canPurchase(data.quantity)) {
        return { valid: false, message: 'Insufficient stock or quantity exceeds limit' };
      }

      // Check if product is part of flash sale
      const productInSale = flashSale.products.some(
        p => p.toString() === data.productId
      );

      if (!productInSale) {
        return { valid: false, message: 'Product is not part of this flash sale' };
      }

      // Check user purchase limit
      if (flashSale.limitPerUser && data.userId) {
        const purchaseCheck = await this.checkUserPurchaseLimit(data.userId, data.flashSaleId);
        if (!purchaseCheck.canPurchase) {
          return { valid: false, message: `Purchase limit reached (${purchaseCheck.limitPerUser} per user)` };
        }
      }

      return { valid: true, flashSale };
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error validating flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Update sold quantity after purchase
   */
  async updateSoldQuantity(flashSaleId: string, quantity: number, userId: string): Promise<IFlashSale | null> {
    try {
      const userObjId = new mongoose.Types.ObjectId(userId);

      // Atomic increment with $gte guard — prevents overselling
      const flashSale = await FlashSale.findOneAndUpdate(
        {
          _id: flashSaleId,
          $expr: { $lte: [{ $add: ['$soldQuantity', quantity] }, '$maxQuantity'] }
        },
        {
          $inc: { soldQuantity: quantity, purchaseCount: 1 },
          $addToSet: { notifiedUsers: userObjId }
        },
        { new: true }
      );

      if (!flashSale) {
        // Check if flash sale exists at all vs just sold out
        const exists = await FlashSale.findById(flashSaleId).lean();
        if (!exists) {
          throw new Error('Flash sale not found');
        }
        throw new Error(`Flash sale sold out. Max: ${exists.maxQuantity}, Sold: ${exists.soldQuantity}, Requested: ${quantity}`);
      }

      // Update uniqueCustomers count based on addToSet result (approximate)
      // Since $addToSet only adds if not present, we can recalculate
      if (flashSale.notifiedUsers && flashSale.uniqueCustomers !== flashSale.notifiedUsers.length) {
        await FlashSale.findByIdAndUpdate(flashSaleId, { uniqueCustomers: flashSale.notifiedUsers.length });
      }

      logger.info('[FlashSaleService] Updated sold quantity', {
        flashSaleId,
        soldQuantity: flashSale.soldQuantity,
        maxQuantity: flashSale.maxQuantity,
      });

      // Emit socket events
      if (io) {
        // Stock update event
        stockSocketService.getIO()?.emit('flashsale:stock_updated', {
          flashSaleId: flashSale._id,
          soldQuantity: flashSale.soldQuantity,
          remainingQuantity: flashSale.getAvailableQuantity(),
          progress: flashSale.getProgress(),
        });

        // Check for low stock
        const progress = flashSale.getProgress();
        if (progress >= flashSale.lowStockThreshold && flashSale.notifyOnLowStock) {
          stockSocketService.getIO()?.emit('flashsale:stock_low', {
            flashSaleId: flashSale._id,
            title: flashSale.title,
            remainingQuantity: flashSale.getAvailableQuantity(),
            progress,
          });
        }

        // Check if sold out — atomic status transition
        if (flashSale.soldQuantity >= flashSale.maxQuantity) {
          await FlashSale.findOneAndUpdate(
            { _id: flashSale._id, status: { $ne: 'sold_out' } },
            { $set: { status: 'sold_out' } }
          );

          stockSocketService.getIO()?.emit('flashsale:sold_out', {
            flashSaleId: flashSale._id,
            title: flashSale.title,
          });
        }
      }

      return flashSale;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error updating sold quantity:', error);
      throw error;
    }
  }

  /**
   * Track flash sale view
   */
  async trackView(flashSaleId: string): Promise<void> {
    try {
      await FlashSale.findByIdAndUpdate(flashSaleId, {
        $inc: { viewCount: 1 },
      });
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error tracking view:', error);
      // Don't throw - analytics shouldn't break the flow
    }
  }

  /**
   * Track flash sale click
   */
  async trackClick(flashSaleId: string): Promise<void> {
    try {
      await FlashSale.findByIdAndUpdate(flashSaleId, {
        $inc: { clickCount: 1 },
      });
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error tracking click:', error);
      // Don't throw - analytics shouldn't break the flow
    }
  }

  /**
   * Delete flash sale
   */
  async deleteFlashSale(flashSaleId: string): Promise<void> {
    try {
      await FlashSale.findByIdAndDelete(flashSaleId);
      logger.info('✅ [FlashSaleService] Flash sale deleted:', flashSaleId);

      // Emit socket event
      if (io) {
        stockSocketService.getIO()?.emit('flashsale:deleted', { flashSaleId });
      }
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error deleting flash sale:', error);
      throw error;
    }
  }

  /**
   * Schedule start notification (would integrate with notification service)
   */
  private scheduleStartNotification(flashSale: IFlashSale): void {
    const timeUntilStart = flashSale.startTime.getTime() - Date.now();

    if (timeUntilStart > 0) {
      setTimeout(() => {
        logger.info('🔔 [FlashSaleService] Flash sale starting:', flashSale.title);

        // Emit socket event
        if (io) {
          stockSocketService.getIO()?.emit('flashsale:started', {
            flashSaleId: flashSale._id,
            title: flashSale.title,
            discountPercentage: flashSale.discountPercentage,
            endTime: flashSale.endTime,
          });
        }

        // Send push notifications to users with phone numbers
        this.sendFlashSaleNotifications(flashSale).catch(err =>
          logger.error('❌ [FlashSaleService] Error sending flash sale notifications:', err)
        );
      }, timeUntilStart);
    }
  }

  /**
   * Send push notifications to all users about a flash sale starting
   */
  private async sendFlashSaleNotifications(flashSale: IFlashSale): Promise<void> {
    const BATCH_SIZE = 200;
    let skip = 0;
    let notifiedCount = 0;

    while (true) {
      const users = await User.find({ isOnboarded: true })
        .select('_id phoneNumber')
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) break;

      const smsPromises = users
        .filter(u => u.phoneNumber)
        .map(u =>
          pushNotificationService.sendOrderUpdate(
            'FLASH_SALE',
            u.phoneNumber,
            `Flash Sale: ${flashSale.title}`,
            `${flashSale.discountPercentage}% off! Hurry, limited stock available. Ends ${new Date(flashSale.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`
          ).catch((err) => logger.error('[FlashSaleService] Flash sale SMS notification failed', { error: err.message, phone: u.phoneNumber })) // log individual failures
        );

      await Promise.all(smsPromises);
      notifiedCount += smsPromises.length;
      skip += BATCH_SIZE;

      if (users.length < BATCH_SIZE) break;
    }

    logger.info(`📢 [FlashSaleService] Flash sale notifications sent to ${notifiedCount} users`);
  }

  /**
   * Check and emit ending soon events (called by cron job)
   */
  async checkEndingSoon(): Promise<void> {
    try {
      const expiringSales = await this.getExpiringSoonFlashSales(5);

      for (const sale of expiringSales) {
        if (sale.notifyOnEndingSoon && io) {
          stockSocketService.getIO()?.emit('flashsale:ending_soon', {
            flashSaleId: sale._id,
            title: sale.title,
            endTime: sale.endTime,
            remainingQuantity: sale.maxQuantity - sale.soldQuantity,
          });
        }
      }
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error checking ending soon:', error);
    }
  }

  /**
   * Mark ended flash sales (called by cron job)
   */
  async markEndedFlashSales(): Promise<void> {
    try {
      const now = new Date();
      const result = await FlashSale.updateMany(
        {
          isActive: true,
          endTime: { $lt: now },
          status: { $nin: ['ended', 'sold_out'] },
        },
        {
          $set: { status: 'ended' },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`✅ [FlashSaleService] Marked ${result.modifiedCount} flash sales as ended`);

        // Emit socket event
        if (io) {
          stockSocketService.getIO()?.emit('flashsale:batch_ended', {
            count: result.modifiedCount,
          });
        }
      }
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error marking ended flash sales:', error);
    }
  }

  /**
   * Get flash sale statistics
   */
  async getFlashSaleStats(flashSaleId: string): Promise<{
    totalViews: number;
    totalClicks: number;
    totalPurchases: number;
    uniqueCustomers: number;
    conversionRate: number;
    soldPercentage: number;
    remainingTime: number;
  } | null> {
    try {
      const flashSale = await FlashSale.findById(flashSaleId).lean();

      if (!flashSale) {
        return null;
      }

      const conversionRate = flashSale.viewCount > 0
        ? (flashSale.purchaseCount / flashSale.viewCount) * 100
        : 0;

      return {
        totalViews: flashSale.viewCount,
        totalClicks: flashSale.clickCount,
        totalPurchases: flashSale.purchaseCount,
        uniqueCustomers: flashSale.uniqueCustomers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        soldPercentage: flashSale.getProgress(),
        remainingTime: flashSale.getRemainingTime(),
      };
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting flash sale stats:', error);
      throw error;
    }
  }

  // ============================================
  // FLASH SALE PURCHASE METHODS
  // ============================================

  /**
   * Check user's purchase count for a flash sale
   */
  async checkUserPurchaseLimit(userId: string, flashSaleId: string): Promise<{
    currentCount: number;
    limitPerUser: number;
    canPurchase: boolean;
  }> {
    try {
      const flashSale = await FlashSale.findById(flashSaleId).lean();
      if (!flashSale) {
        throw new Error('Flash sale not found');
      }

      const currentCount = await FlashSalePurchase.getUserPurchaseCount(userId, flashSaleId);
      const canPurchase = currentCount < flashSale.limitPerUser;

      return {
        currentCount,
        limitPerUser: flashSale.limitPerUser,
        canPurchase,
      };
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error checking user purchase limit:', error);
      throw error;
    }
  }

  /**
   * Initiate a flash sale purchase - validates and creates Stripe checkout session
   */
  async initiateFlashSalePurchase(
    userId: string,
    flashSaleId: string,
    quantity: number = 1,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      successUrl?: string;
      cancelUrl?: string;
      customerEmail?: string;
    }
  ): Promise<{
    purchaseId: string;
    stripeSessionId: string;
    stripeCheckoutUrl: string;
    amount: number;
    currency: string;
    flashSale: {
      title: string;
      image: string;
      originalPrice: number;
      flashSalePrice: number;
      discountPercentage: number;
    };
  }> {
    try {
      // 1. Get and validate flash sale
      const flashSale = await FlashSale.findById(flashSaleId).populate('stores', 'name logo').lean();
      if (!flashSale) {
        throw new Error('Flash sale not found');
      }

      // 2. Check if flash sale is active
      const now = new Date();
      if (now < flashSale.startTime || now > flashSale.endTime) {
        throw new Error('Flash sale is not active');
      }

      if (flashSale.status === 'ended' || flashSale.status === 'sold_out') {
        throw new Error('Flash sale has ended or sold out');
      }

      // 3. Check stock
      if (flashSale.soldQuantity + quantity > flashSale.maxQuantity) {
        throw new Error('Insufficient stock available');
      }

      // 4. Check user purchase limit
      const purchaseLimitCheck = await this.checkUserPurchaseLimit(userId, flashSaleId);
      if (!purchaseLimitCheck.canPurchase) {
        throw new Error(`You have already purchased the maximum allowed (${purchaseLimitCheck.limitPerUser}) for this deal`);
      }

      // 5. Calculate amount
      const amount = flashSale.flashSalePrice ||
        (flashSale.originalPrice ? flashSale.originalPrice * (1 - flashSale.discountPercentage / 100) : 0);

      if (!amount || amount <= 0) {
        throw new Error('Invalid flash sale price');
      }

      const totalAmount = amount * quantity;

      // 6. Create FlashSalePurchase record with pending status first
      const purchase: IFlashSalePurchase = new FlashSalePurchase({
        user: new mongoose.Types.ObjectId(userId),
        flashSale: new mongoose.Types.ObjectId(flashSaleId),
        store: flashSale.stores?.[0]?._id,
        amount: totalAmount,
        originalPrice: flashSale.originalPrice || 0,
        discountPercentage: flashSale.discountPercentage,
        quantity,
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        promoCode: flashSale.promoCode,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      await purchase.save();

      // 7. Create Stripe checkout session
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      const purchaseIdStr = (purchase._id as any).toString();

      // Replace {purchaseId} placeholder with actual ID, and ensure session_id placeholder exists
      let successUrl = metadata?.successUrl || `${baseUrl}/flash-sale-success?purchaseId=${purchaseIdStr}&session_id={CHECKOUT_SESSION_ID}`;
      successUrl = successUrl.replace('{purchaseId}', purchaseIdStr);
      // Ensure Stripe's session_id placeholder is included
      if (!successUrl.includes('{CHECKOUT_SESSION_ID}') && !successUrl.includes('session_id=')) {
        successUrl += (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}';
      }

      const cancelUrl = metadata?.cancelUrl || `${baseUrl}/flash-sales/${flashSaleId}?cancelled=true`;

      const stripeSession = await stripeService.createCheckoutSessionForOrder({
        orderId: purchaseIdStr,
        amount: totalAmount,
        currency: 'inr',
        customerEmail: metadata?.customerEmail,
        successUrl,
        cancelUrl,
        items: [{
          name: flashSale.title,
          description: `${flashSale.discountPercentage}% OFF - Limited Time Deal`,
          amount: totalAmount,
          quantity: 1,
        }],
        metadata: {
          purchaseId: purchaseIdStr,
          flashSaleId,
          userId,
          type: 'flash_sale_purchase',
        },
      });

      // 8. Update purchase with Stripe session ID
      purchase.razorpayOrderId = stripeSession.id; // Using this field for Stripe session ID
      await purchase.save();

      logger.info('✅ [FlashSaleService] Flash sale purchase initiated with Stripe:', {
        purchaseId: purchaseIdStr,
        stripeSessionId: stripeSession.id,
        amount: totalAmount,
      });

      return {
        purchaseId: purchaseIdStr,
        stripeSessionId: stripeSession.id,
        stripeCheckoutUrl: stripeSession.url || '',
        amount: totalAmount,
        currency: 'INR',
        flashSale: {
          title: flashSale.title,
          image: flashSale.image,
          originalPrice: flashSale.originalPrice || 0,
          flashSalePrice: amount,
          discountPercentage: flashSale.discountPercentage,
        },
      };
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error initiating flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Complete/Verify flash sale payment (for Stripe)
   */
  async completeFlashSalePurchase(
    purchaseId: string,
    paymentDetails: {
      stripeSessionId: string;
    }
  ): Promise<{
    success: boolean;
    purchase: IFlashSalePurchase;
    voucherCode: string;
    promoCode?: string;
    expiresAt: Date;
  }> {
    try {
      // 1. Get purchase record
      let purchase = await FlashSalePurchase.findById(purchaseId).lean() as any;
      if (!purchase) {
        throw new Error('Purchase record not found');
      }

      // 2. Verify this purchase hasn't already been completed
      if (purchase.paymentStatus === 'paid') {
        return {
          success: true,
          purchase,
          voucherCode: purchase.voucherCode,
          promoCode: purchase.promoCode,
          expiresAt: purchase.voucherExpiresAt,
        };
      }

      // 3. Verify Stripe session ID matches
      if (purchase.razorpayOrderId !== paymentDetails.stripeSessionId) {
        throw new Error('Session ID mismatch');
      }

      // 4. Verify Stripe checkout session
      const sessionStatus = await stripeService.verifyCheckoutSession(paymentDetails.stripeSessionId);

      if (!sessionStatus.verified || sessionStatus.paymentStatus !== 'paid') {
        // Mark purchase as failed
        purchase.paymentStatus = 'failed';
        purchase.failureReason = 'Payment not completed';
        await purchase.save();
        throw new Error('Payment verification failed: Session not paid');
      }

      // 5. Atomically mark as paid (prevents double-completion race condition)
      const updatedPurchase = await FlashSalePurchase.findOneAndUpdate(
        { _id: purchase._id, paymentStatus: { $ne: 'paid' } },
        {
          $set: {
            paymentStatus: 'paid',
            razorpayPaymentId: sessionStatus.paymentIntentId || paymentDetails.stripeSessionId,
            paidAt: new Date(),
            purchasedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedPurchase) {
        // Already completed by a concurrent request — return existing data
        const existing = await FlashSalePurchase.findById(purchase._id).lean();
        return {
          success: true,
          purchase: existing as any,
          voucherCode: existing?.voucherCode || '',
          promoCode: existing?.promoCode || '',
          expiresAt: existing?.voucherExpiresAt || new Date(),
        };
      }

      // 6. Update flash sale stock and counters (only runs once due to atomic guard above)
      await this.updateSoldQuantity(
        updatedPurchase.flashSale.toString(),
        updatedPurchase.quantity,
        updatedPurchase.user.toString()
      );

      // Use updatedPurchase from here
      purchase = updatedPurchase;

      logger.info('✅ [FlashSaleService] Flash sale purchase completed:', {
        purchaseId: purchase._id,
        voucherCode: purchase.voucherCode,
        amount: purchase.amount,
      });

      // 7. Emit socket event
      const io = stockSocketService.getIO();
      if (io) {
        io.emit('flashsale:purchase_completed', {
          flashSaleId: purchase.flashSale,
          purchaseId: purchase._id,
          userId: purchase.user,
        });
      }

      return {
        success: true,
        purchase,
        voucherCode: purchase.voucherCode,
        promoCode: purchase.promoCode,
        expiresAt: purchase.voucherExpiresAt,
      };
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error completing flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Mark flash sale purchase as failed
   */
  async failFlashSalePurchase(purchaseId: string, reason: string): Promise<void> {
    try {
      const purchase = await FlashSalePurchase.findById(purchaseId);
      if (!purchase) {
        throw new Error('Purchase record not found');
      }

      if (purchase.paymentStatus === 'paid') {
        throw new Error('Cannot fail a completed purchase');
      }

      purchase.paymentStatus = 'failed';
      purchase.failureReason = reason;
      await purchase.save();

      logger.info('⚠️ [FlashSaleService] Flash sale purchase failed:', {
        purchaseId,
        reason,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error failing flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Get user's flash sale purchases
   */
  async getUserFlashSalePurchases(userId: string): Promise<IFlashSalePurchase[]> {
    try {
      const purchases = await FlashSalePurchase.getUserPurchases(userId);
      return purchases;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting user flash sale purchases:', error);
      throw error;
    }
  }

  /**
   * Get flash sale purchase by ID
   */
  async getFlashSalePurchaseById(purchaseId: string): Promise<IFlashSalePurchase | null> {
    try {
      const purchase = await FlashSalePurchase.findById(purchaseId)
        .populate('flashSale', 'title image discountPercentage stores promoCode')
        .populate('store', 'name logo')
        .populate('user', 'name email').lean();

      return purchase as unknown as IFlashSalePurchase | null;
    } catch (error) {
      logger.error('❌ [FlashSaleService] Error getting flash sale purchase:', error);
      throw error;
    }
  }
}

export default new FlashSaleService();
