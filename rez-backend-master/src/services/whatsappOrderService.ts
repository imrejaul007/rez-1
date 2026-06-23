/**
 * WhatsApp Order Service (R6 Feature A)
 *
 * Creates orders from WhatsApp AI-detected order items and generates
 * Razorpay payment links for customers.
 *
 * Flow:
 *   1. Parse item string (format: "Margherita Pizza x2, Garlic Bread x1")
 *   2. Look up product prices from Product model
 *   3. Create a guest Customer if not exists (phone-based)
 *   4. Create an Order document with source='whatsapp_ai'
 *   5. Create Razorpay order (amount from cart)
 *   6. Generate payment link via Razorpay Orders API
 *   7. Return { orderId, paymentLink, total }
 */

import { logger } from '../config/logger';
import { createRazorpayOrder } from './razorpayService';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { User } from '../models/User';
import mongoose, { Types } from 'mongoose';
import * as crypto from 'crypto';

export interface ParsedOrderItem {
  name: string;
  qty: number;
}

export interface OrderCreationResult {
  orderId: string;
  paymentLink: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number; total: number }>;
}

/**
 * Parse an order string into structured items.
 * Format: "Margherita Pizza x2, Garlic Bread x1" or "Margherita Pizza x 2"
 */
function parseOrderString(orderStr: string): ParsedOrderItem[] {
  const items: ParsedOrderItem[] = [];
  // Split by comma
  const parts = orderStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match: "Item Name x2" or "Item Name x 2" or "2x Item Name"
    const qtyMatch = trimmed.match(/x\s*(\d+)/i) || trimmed.match(/(\d+)\s*x\s/i);

    if (qtyMatch) {
      const qtyStr = qtyMatch[1];
      const qty = parseInt(qtyStr, 10);
      // Remove the qty part from the name
      const name = trimmed
        .replace(/x\s*\d+/i, '')
        .replace(/\d+\s*x\s*/i, '')
        .trim();

      if (name && qty > 0) {
        items.push({ name, qty });
      }
    }
  }

  return items;
}

/**
 * Normalise a phone number for consistent storage.
 */
function normalisePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
  return cleaned;
}

class WhatsAppOrderService {
  /**
   * Create an order from a WhatsApp AI-detected order string.
   *
   * @param phone    - Customer phone number
   * @param orderStr - Comma-separated items with quantities, e.g. "Margherita Pizza x2, Garlic Bread x1"
   * @param storeSlug - Store slug for product lookup
   */
  async createOrderFromWhatsApp(phone: string, orderStr: string, storeSlug: string): Promise<OrderCreationResult> {
    const normalisedPhone = normalisePhone(phone);

    // Step 1: Look up store
    const store = await Store.findOne({ slug: storeSlug }).select('_id name').lean().exec();

    if (!store) {
      throw new Error(`Store not found: ${storeSlug}`);
    }

    const storeId = (store as any)._id as Types.ObjectId;

    // Step 2: Parse order string
    const parsedItems = parseOrderString(orderStr);
    if (parsedItems.length === 0) {
      throw new Error('No valid items found in order string');
    }

    logger.info('[WhatsAppOrder] Parsed items', {
      phone: `***${normalisedPhone.slice(-4)}`,
      items: parsedItems,
    });

    // Step 3: Look up products and prices
    const productItems: Array<{ name: string; qty: number; price: number; total: number }> = [];
    let subtotal = 0;

    for (const item of parsedItems) {
      // Case-insensitive product lookup
      const product = await Product.findOne({
        store: storeId,
        name: { $regex: new RegExp(`^\${item.name.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i') },
        isActive: true,
      })
        .select('_id name price.current')
        .lean()
        .exec();

      const unitPrice = product ? ((product as any).price?.current ?? 0) : 0;
      const itemTotal = unitPrice * item.qty;
      subtotal += itemTotal;

      productItems.push({
        name: item.name,
        qty: item.qty,
        price: unitPrice,
        total: itemTotal,
      });

      if (!product) {
        logger.warn('[WhatsAppOrder] Product not found', {
          phone: `***${normalisedPhone.slice(-4)}`,
          itemName: item.name,
        });
      }
    }

    // If no products were found, use zero prices (graceful degradation)
    if (productItems.every((p) => p.price === 0)) {
      logger.warn('[WhatsAppOrder] No products found for any items — using placeholder prices', {
        phone: `***${normalisedPhone.slice(-4)}`,
        items: parsedItems.map((i) => i.name),
      });
    }

    const taxRate = 0.05; // 5% GST
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Step 4: Find or create guest user
    let user = await User.findOne({ phone: normalisedPhone }).select('_id').lean().exec();

    if (!user) {
      // Create a guest user
      const guestUser = new User({
        phone: normalisedPhone,
        name: `WhatsApp Guest`,
        authProvider: 'guest',
        role: 'user',
        isActive: true,
      });
      await guestUser.save();
      user = guestUser.toObject() as Exclude<typeof user, null>;
    }

    const userId = (user as any)._id as Types.ObjectId;

    // Step 5: Generate idempotency key
    const idempotencyKey = `wa:${normalisedPhone}:${crypto.randomUUID().slice(0, 8)}`;

    // Step 6: Create Order document
    const receipt = `WA-${Date.now()}`;
    const order = new Order({
      user: userId,
      storeId,
      items: productItems.map((item) => ({
        product: undefined, // No product ref for WhatsApp-sourced items
        name: item.name,
        price: item.price,
        quantity: item.qty,
        total: item.total,
      })),
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      paymentStatus: 'pending',
      status: 'awaiting_payment',
      source: 'whatsapp_ai',
      customerPhone: normalisedPhone,
      notes: { whatsappOrder: true, idempotencyKey },
    });

    await order.save();

    logger.info('[WhatsAppOrder] Order created', {
      orderId: order._id,
      phone: `***${normalisedPhone.slice(-4)}`,
      total,
    });

    // Step 7: Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(total, receipt, {
      orderId: (order._id as Types.ObjectId).toString(),
      source: 'whatsapp_ai',
      customerPhone: normalisedPhone,
    });

    // Step 8: Generate payment link
    const appUrl = process.env.APP_URL || process.env.PUBLIC_URL || 'https://now.rez.money';
    const paymentLink = `${appUrl}/checkout/${order._id}?phone=${normalisedPhone}&rp=${razorpayOrder.id}`;

    // Update order with razorpay order ID
    await Order.findByIdAndUpdate(order._id, {
      'paymentDetails.razorpayOrderId': razorpayOrder.id,
      'paymentDetails.paymentLink': paymentLink,
    });

    return {
      orderId: (order._id as Types.ObjectId).toString(),
      paymentLink,
      total,
      items: productItems,
    };
  }

  /**
   * Send order confirmation via WhatsApp.
   * Uses the WhatsApp Marketing Service pattern.
   */
  async sendOrderConfirmation(phone: string, orderId: string, total: number, paymentLink: string): Promise<void> {
    const { whatsAppMarketingService } = await import('./WhatsAppMarketingService');

    const message = `Order confirmed! Total: Rs ${total}\n\nPay here: ${paymentLink}\n\nYour order will be confirmed immediately after payment.`;

    const result = await whatsAppMarketingService.sendText({
      to: phone,
      message,
      campaignId: `wa-order-${orderId}`,
      merchantId: 'whatsapp-ai',
    });

    if (!result.success) {
      logger.warn('[WhatsAppOrder] Failed to send order confirmation', {
        phone: `***${phone.slice(-4)}`,
        orderId,
        error: result.error,
      });
    }
  }
}

// Singleton instance
let instance: WhatsAppOrderService | null = null;

export function getWhatsAppOrderService(): WhatsAppOrderService {
  if (!instance) {
    instance = new WhatsAppOrderService();
  }
  return instance;
}

// Also export default for convenience
export default getWhatsAppOrderService();
