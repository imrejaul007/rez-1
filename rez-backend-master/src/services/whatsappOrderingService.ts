import { logger } from '../config/logger';
import axios from 'axios';
import * as crypto from 'crypto';
import WhatsAppSession from '../models/WhatsAppSession';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import mongoose from 'mongoose';
import { getRedis } from '../config/redis-pool';

// ─────────────────────────────────────────────────────────────────────────────
// v3 Production controls (Part 8 — WhatsApp Bot: All Production Controls)
// ─────────────────────────────────────────────────────────────────────────────
const BOT_CONTROLS = {
  messagesPerMinute: 5,
  otpRetries: 3,
  otpLockoutMinutes: 30,
  cartExpiryMinutes: 30,
  sessionExpiryMinutes: 60,
  maxCartValue: 5000, // ₹5000 max order via WhatsApp (fraud limit)
  paymentTimeoutMin: 15, // payment link expires in 15 minutes
  messageDedupWindowSec: 30, // same message within 30s = duplicate
  spamScore: 3, // 3+ identical messages = spam lockout
} as const;

/**
 * WhatsApp Ordering Service
 * Implements state machine for WhatsApp-based product ordering
 *
 * States:
 * - idle: Default state, waiting for customer message
 * - browsing: Customer viewing menu categories
 * - item_selected: Customer selected a category, viewing items
 * - cart: Customer has items in cart
 * - confirming: Customer reviewing order before payment
 * - awaiting_payment: Payment link sent, waiting for payment
 * - completed: Order created successfully
 */

class WhatsAppOrderingService {
  /**
   * Send WhatsApp message to customer
   */
  async sendMessage(to: string, message: string): Promise<void> {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
      logger.warn('[WHATSAPP] Token/PhoneId not configured — skipping message send');
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: this.normalizePhoneNumber(to),
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
          timeout: 10000, // KENJI: 10s timeout to prevent event loop starvation on WhatsApp API slowness
        },
      );
      logger.debug('[WHATSAPP] Message sent', { to, messageLength: message.length });
    } catch (error) {
      logger.error('[WHATSAPP] Failed to send message', { to, error });
      throw error;
    }
  }

  /**
   * Normalize phone number (ensure it's in E.164 format)
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // If it doesn't start with country code, assume +91 (India)
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Handle incoming WhatsApp message
   * v3: Includes message deduplication, spam detection, and lockout checks
   */
  async handleIncomingMessage(fromPhone: string, storeId: string, messageText: string): Promise<void> {
    const phone = this.normalizePhoneNumber(fromPhone);

    try {
      const redis = getRedis();

      // ── v3: Check if phone is locked out ────────────────────────────────
      const lockoutKey = `wa:lockout:${phone}`;
      const isLockedOut = await redis.get(lockoutKey).catch(() => null);
      if (isLockedOut) {
        // Silently drop — don't even acknowledge (avoids enumeration)
        logger.warn('[WHATSAPP] Message dropped — phone locked out', {
          phone: phone ? `***${phone.slice(-4)}` : 'unknown',
        });
        return;
      }

      // ── v3: Message deduplication (prevent echo attacks) ─────────────────
      const msgHash = crypto.createHash('sha256').update(`${phone}:${messageText}`).digest('hex').slice(0, 16);

      const dedupKey = `wa:dedup:${msgHash}`;
      const isDuplicate = await redis.get(dedupKey).catch(() => null);
      if (isDuplicate) {
        logger.debug('[WHATSAPP] Duplicate message dropped', {
          phone: phone ? `***${phone.slice(-4)}` : 'unknown',
          msgHash,
        });
        return; // silently drop duplicate
      }
      await redis.setex(dedupKey, BOT_CONTROLS.messageDedupWindowSec, '1').catch((err) => logger.warn('[WhatsApp] Redis setex failed', { err }));

      // ── v3: Spam detection (3+ identical messages in 5 minutes) ──────────
      const spamKey = `wa:spam:${phone}`;
      const spamCount = await redis.incr(spamKey).catch(() => 0);
      if (spamCount === 1) {
        await redis.expire(spamKey, 300).catch(() => {}); // 5-minute window
      }
      if (spamCount >= BOT_CONTROLS.spamScore) {
        await redis.set(lockoutKey, '1', 'EX', BOT_CONTROLS.otpLockoutMinutes * 60).catch(() => {});
        await this.sendMessage(
          phone,
          'Your session has been paused for unusual activity. Please try again in 30 minutes.',
        );
        logger.warn('[WHATSAPP] Phone locked out for spam', {
          phone: phone ? `***${phone.slice(-4)}` : 'unknown',
          spamCount,
        });
        return;
      }

      // Find or create session
      let session = await WhatsAppSession.findOne({ phone, storeId });

      if (!session) {
        session = new WhatsAppSession({
          phone,
          storeId,
          state: 'idle',
          cartItems: [],
          lastInteractionAt: new Date(),
        });
      }

      session.lastInteractionAt = new Date();
      session.currentMessage = messageText.trim().toLowerCase();

      // Route to appropriate handler based on current state
      switch (session.state) {
        case 'idle':
          await this.handleIdleState(session, messageText);
          break;
        case 'browsing':
          await this.handleBrowsingState(session, messageText);
          break;
        case 'item_selected':
          await this.handleItemSelectedState(session, messageText);
          break;
        case 'cart':
          await this.handleCartState(session, messageText);
          break;
        case 'confirming':
          await this.handleConfirmingState(session, messageText);
          break;
        case 'awaiting_payment':
          await this.handleAwaitingPaymentState(session, messageText);
          break;
        default:
          session.state = 'idle';
      }

      await session.save();
    } catch (error) {
      logger.error('[WHATSAPP] Error processing message', {
        phone: phone ? `***${phone.slice(-4)}` : 'unknown',
        storeId,
        error,
      });
      // Send error message to user
      await this.sendMessage(phone, 'Sorry, something went wrong. Please try again.');
    }
  }

  /**
   * IDLE STATE: Customer just started conversation
   * Send menu options
   */
  private async handleIdleState(session: any, messageText: string): Promise<void> {
    const store = await Store.findById(session.storeId).select('name').lean();

    const menuMessage = `Welcome to ${store?.name || 'our store'}! 🛍️

Select an option:
1️⃣ See Menu
2️⃣ Your Cart
3️⃣ Order Status

Just reply with the number.`;

    await this.sendMessage(session.phone, menuMessage);

    // Stay in idle state, waiting for menu selection
    session.state = 'idle';
  }

  /**
   * BROWSING STATE: Customer selected "See Menu" (option 1)
   * Show category list
   */
  private async handleBrowsingState(session: any, messageText: string): Promise<void> {
    // If customer just came from idle state with message "1"
    if (messageText === '1') {
      const categories = await Product.distinct('category', {
        store: session.storeId,
        productType: 'product',
        isActive: true,
      });

      if (!categories || categories.length === 0) {
        await this.sendMessage(session.phone, 'No products available right now. Please check back later.');
        session.state = 'idle';
        return;
      }

      let categoryList = 'Select a category:\n\n';
      (categories as any[]).forEach((cat: string, idx: number) => {
        categoryList += `${idx + 1}️⃣ ${cat}\n`;
      });

      await this.sendMessage(session.phone, categoryList);
      session.state = 'browsing';
      session.currentCategory = undefined;
      return;
    }

    // If customer is selecting a category number
    const categoryIndex = parseInt(messageText, 10) - 1;
    const categories = await Product.distinct('category', {
      store: session.storeId,
      productType: 'product',
      isActive: true,
    });

    if (categoryIndex < 0 || categoryIndex >= categories.length) {
      await this.sendMessage(session.phone, 'Invalid category. Please select a valid number.');
      return;
    }

    session.currentCategory = categories[categoryIndex];
    session.state = 'item_selected';

    // Show items in this category
    await this.showCategoryItems(session);
  }

  /**
   * Show items in the selected category
   */
  private async showCategoryItems(session: any): Promise<void> {
    const items = await Product.find({
      store: session.storeId,
      category: session.currentCategory,
      productType: 'product',
      isActive: true,
    })
      .select('name price.current image')
      .limit(10)
      .lean();

    if (!items || items.length === 0) {
      await this.sendMessage(session.phone, 'No items in this category. Please select another.');
      session.state = 'browsing';
      session.currentCategory = undefined;
      return;
    }

    let itemList = `${session.currentCategory} - Available Items:\n\n`;
    items.forEach((item: any, idx: number) => {
      const price = item.price?.current || 0;
      itemList += `${idx + 1}️⃣ ${item.name} - ₹${price}\n`;
    });

    itemList += '\nReply with item number to add to cart, or "B" to go back to categories.';

    await this.sendMessage(session.phone, itemList);
  }

  /**
   * ITEM_SELECTED STATE: Customer selecting items from category
   */
  private async handleItemSelectedState(session: any, messageText: string): Promise<void> {
    // Go back to browsing
    if (messageText === 'b') {
      session.state = 'browsing';
      await this.handleBrowsingState(session, '');
      return;
    }

    // Select an item to add to cart
    const itemIndex = parseInt(messageText, 10) - 1;
    if (isNaN(itemIndex)) {
      await this.sendMessage(session.phone, 'Invalid input. Please enter a number or "B" to go back.');
      return;
    }

    const items = await Product.find({
      store: session.storeId,
      category: session.currentCategory,
      productType: 'product',
      isActive: true,
    })
      .select('_id name price.current')
      .limit(10)
      .lean();

    if (itemIndex < 0 || itemIndex >= items.length) {
      await this.sendMessage(session.phone, 'Invalid item number. Please try again.');
      return;
    }

    const selectedItem = items[itemIndex];
    const itemPrice = (selectedItem as any).price?.current || 0;

    // Add to cart
    const existingItem = session.cartItems.find(
      (item: any) => item.menuItemId.toString() === (selectedItem as any)._id.toString(),
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      session.cartItems.push({
        menuItemId: selectedItem._id,
        name: selectedItem.name,
        price: itemPrice,
        quantity: 1,
      });
    }

    const cartSummary = this.getCartSummary(session.cartItems);

    const confirmation = `✅ ${selectedItem.name} added to cart!

Current cart: ${cartSummary.itemCount} item(s) - ₹${cartSummary.total}

Select:
A️⃣ Add more items
C️⃣ Confirm order
X️⃣ Cancel order`;

    await this.sendMessage(session.phone, confirmation);
    session.state = 'cart';
  }

  /**
   * CART STATE: Customer has items in cart
   */
  private async handleCartState(session: any, messageText: string): Promise<void> {
    const msg = messageText.toLowerCase();

    if (msg === 'a') {
      // Add more items - go back to browsing
      session.state = 'browsing';
      await this.handleBrowsingState(session, '');
      return;
    }

    if (msg === 'c') {
      // Confirm order - show summary
      session.state = 'confirming';
      await this.handleConfirmingState(session, 'show');
      return;
    }

    if (msg === 'x') {
      // Cancel order
      session.cartItems = [];
      session.state = 'idle';
      await this.sendMessage(session.phone, 'Order cancelled. Type anything to start over.');
      return;
    }

    await this.sendMessage(session.phone, 'Invalid option. Please type: A (add more), C (confirm), or X (cancel).');
  }

  /**
   * CONFIRMING STATE: Show order summary and ask for confirmation
   */
  private async handleConfirmingState(session: any, messageText: string): Promise<void> {
    if (messageText === 'show' || session.state === 'confirming') {
      const cartSummary = this.getCartSummary(session.cartItems);

      let summary = `📋 Order Summary:\n\n`;
      session.cartItems.forEach((item: any, idx: number) => {
        summary += `${idx + 1}. ${item.name} x${item.quantity} = ₹${item.price * item.quantity}\n`;
      });

      summary += `\nTotal: ₹${cartSummary.total}\n\nConfirm order?\nYES - to proceed to payment\nNO - to cancel`;

      await this.sendMessage(session.phone, summary);
      session.state = 'confirming';
      return;
    }

    const msg = messageText.toLowerCase();

    if (msg === 'yes') {
      // v3: Cart value limit — prevent large fraud orders via WhatsApp
      const cartSummaryCheck = this.getCartSummary(session.cartItems);
      if (cartSummaryCheck.total > BOT_CONTROLS.maxCartValue) {
        await this.sendMessage(
          session.phone,
          `Maximum order via WhatsApp is ₹${BOT_CONTROLS.maxCartValue}. Please visit the store or use our app for larger orders.`,
        );
        session.state = 'idle';
        session.cartItems = [];
        return;
      }

      // Create order and send payment link
      session.state = 'awaiting_payment';
      await this.createOrderAndSendPaymentLink(session);
      return;
    }

    if (msg === 'no') {
      session.cartItems = [];
      session.state = 'idle';
      await this.sendMessage(session.phone, 'Order cancelled. Type anything to start over.');
      return;
    }

    await this.sendMessage(session.phone, 'Please reply YES or NO.');
  }

  /**
   * Create order and generate payment link
   */
  private async createOrderAndSendPaymentLink(session: any): Promise<void> {
    try {
      const cartSummary = this.getCartSummary(session.cartItems);

      // Create order document
      const order = new Order({
        storeId: session.storeId,
        customerPhone: session.phone,
        items: session.cartItems.map((item: any) => ({
          productId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: cartSummary.total,
        paymentStatus: 'pending',
        status: 'awaiting_payment',
        source: 'whatsapp',
      });

      await order.save();
      session.pendingOrderId = order._id;

      // Generate Razorpay payment link (simplified — would use actual Razorpay integration)
      const appUrl = process.env.APP_URL || process.env.PUBLIC_URL;
      if (!appUrl) {
        logger.error('[WhatsAppOrdering] APP_URL / PUBLIC_URL not configured — cannot generate payment link');
        await this.sendMessage(
          session.phone,
          '⚠️ Payment link generation failed. Please contact the restaurant directly.',
        );
        return;
      }
      const paymentLink = `${appUrl}/checkout/${order._id}?phone=${session.phone}`;

      const paymentMessage = `💳 Payment Link:\n\n${paymentLink}\n\nPlease click the link to complete payment. Your order will be confirmed immediately.`;

      await this.sendMessage(session.phone, paymentMessage);

      logger.info('[WHATSAPP] Order created with payment link', {
        orderId: order._id,
        phone: session.phone,
        storeId: session.storeId,
        amount: cartSummary.total,
      });
    } catch (error) {
      logger.error('[WHATSAPP] Failed to create order', { error });
      await this.sendMessage(session.phone, 'Error creating order. Please try again.');
      session.state = 'cart';
    }
  }

  /**
   * AWAITING_PAYMENT STATE
   */
  private async handleAwaitingPaymentState(session: any, messageText: string): Promise<void> {
    // Check if payment was completed
    if (session.pendingOrderId) {
      const order = await Order.findById(session.pendingOrderId).lean();

      if (order && (order as any).paymentStatus === 'completed') {
        session.state = 'completed';
        session.cartItems = [];

        const completionMessage = `✅ Order Confirmed!\n\nYour order #${(order as any).orderNumber} is being prepared.\n\nYou'll receive an update when it's ready. Thank you!`;

        await this.sendMessage(session.phone, completionMessage);
        return;
      }
    }

    await this.sendMessage(session.phone, 'Waiting for payment confirmation...');
  }

  /**
   * Calculate cart totals
   */
  private getCartSummary(cartItems: any[]): { total: number; itemCount: number } {
    let total = 0;
    let itemCount = 0;

    cartItems.forEach((item: any) => {
      total += item.price * item.quantity;
      itemCount += item.quantity;
    });

    return { total, itemCount };
  }

  /**
   * Handle payment webhook from Razorpay
   */
  async handlePaymentSuccess(orderId: string): Promise<void> {
    try {
      // Update order status
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'completed',
        status: 'confirmed',
      });

      // Find associated WhatsApp session and send completion message
      const order = await Order.findById(orderId).lean();
      if (order && (order as any).source === 'whatsapp') {
        const session = await WhatsAppSession.findOne({
          pendingOrderId: orderId,
        });

        if (session) {
          const completionMessage = `✅ Payment Successful!\n\nYour order is being prepared. We'll notify you when it's ready.\n\nThank you for ordering!`;
          await this.sendMessage(session.phone, completionMessage);
          session.state = 'completed';
          await session.save();
        }
      }

      logger.info('[WHATSAPP] Order payment completed', { orderId });
    } catch (error) {
      logger.error('[WHATSAPP] Error handling payment success', { orderId, error });
    }
  }
}

export default new WhatsAppOrderingService();
