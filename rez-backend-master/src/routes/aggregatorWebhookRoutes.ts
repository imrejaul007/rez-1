// @ts-nocheck
import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import mongoose from 'mongoose';
import AggregatorOrder, { IAggregatorOrder } from '../models/AggregatorOrder';
import { MerchantAggregator } from '../models/MerchantAggregator';
import { logger } from '../config/logger';
import { detectAndNotifyConflicts } from '../services/aggregatorSyncService';
// B4: identity resolution + canonical emit (Sprint 0)
import { resolveCustomerIdentity } from '../events/resolveCustomerIdentity';
import { emitOrderPlaced } from '../events/emitOrderPlaced';

const router = Router();

/**
 * Normalize Swiggy order payload to standard format
 */
function normalizeSwiggyOrder(raw: any, merchantId: string): Partial<IAggregatorOrder> {
  return {
    externalId: raw.order_id || raw.id,
    platform: 'swiggy',
    merchantId: new mongoose.Types.ObjectId(merchantId),
    customerName: raw.customer_name || raw.deliveryPersonDetails?.name,
    customerPhone: raw.customer_phone || raw.deliveryPersonDetails?.phone,
    items: (raw.order_items || []).map((item: any) => ({
      name: item.item_name || item.name,
      qty: item.quantity || item.qty || 1,
      price: item.item_price || item.price || 0,
      externalItemId: item.item_id || item.id,
    })),
    total: raw.order_total || raw.total || 0,
    deliveryAddress: raw.delivery_address
      ? {
          line1: raw.delivery_address.address || '',
          city: raw.delivery_address.city,
          pincode: raw.delivery_address.pincode,
          lat: raw.delivery_address.lat,
          lng: raw.delivery_address.lng,
        }
      : undefined,
    status: (raw.status || 'pending').toLowerCase(),
    rawPayload: raw,
  };
}

/**
 * Normalize Zomato order payload to standard format
 */
function normalizeZomatoOrder(raw: any, merchantId: string): Partial<IAggregatorOrder> {
  return {
    externalId: raw.order_id || raw.id,
    platform: 'zomato',
    merchantId: new mongoose.Types.ObjectId(merchantId),
    customerName: raw.customer?.name || raw.customer_name,
    customerPhone: raw.customer?.phone || raw.customer_phone,
    items: (raw.items || []).map((item: any) => ({
      name: item.item_name || item.name,
      qty: item.quantity || item.qty || 1,
      price: item.price || 0,
      externalItemId: item.item_id || item.id,
    })),
    total: raw.order_value || raw.total || 0,
    deliveryAddress: raw.delivery_address
      ? {
          line1: raw.delivery_address.line1 || raw.delivery_address.address || '',
          city: raw.delivery_address.city,
          pincode: raw.delivery_address.zip_code || raw.delivery_address.pincode,
          lat: raw.delivery_address.latitude || raw.delivery_address.lat,
          lng: raw.delivery_address.longitude || raw.delivery_address.lng,
        }
      : undefined,
    status: (raw.status || 'pending').toLowerCase(),
    rawPayload: raw,
  };
}

/**
 * Verify HMAC-SHA256 signature
 *
 * WS-005 FIX: Replace === with crypto.timingSafeEqual to prevent timing-oracle
 * attacks that let an attacker brute-force the HMAC one byte at a time.
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    // timingSafeEqual throws if the hex buffers are different lengths (malformed sig)
    return false;
  }
}

/**
 * @route POST /api/webhook/swiggy
 * @desc Receive order from Swiggy aggregator
 * @access Public (verified with signature)
 */
router.post('/swiggy', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-swiggy-signature'] as string;
    const secret = process.env.SWIGGY_WEBHOOK_SECRET;

    if (!secret) {
      logger.error('[SWIGGY WEBHOOK] Missing SWIGGY_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!signature) {
      logger.warn('[SWIGGY WEBHOOK] Missing x-swiggy-signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature — use raw body captured by express.json({verify}) so the
    // HMAC matches the exact bytes the sender signed.
    const payload = (req as any).rawBody || JSON.stringify(req.body);
    if (!verifySignature(payload, signature, secret)) {
      logger.warn('[SWIGGY WEBHOOK] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const raw = req.body;
    const externalId = raw.order_id || raw.id;
    const merchantId = raw.merchant_id || raw.restaurantId;

    if (!externalId || !merchantId) {
      logger.warn('[SWIGGY WEBHOOK] Missing externalId or merchantId', { raw });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check idempotency: if order already exists, return 200 without duplicate
    const existingOrder = await AggregatorOrder.findOne({
      platform: 'swiggy',
      externalId,
    });

    if (existingOrder) {
      logger.info('[SWIGGY WEBHOOK] Order already processed', { externalId });
      return res.status(200).json({ success: true, message: 'Order already exists' });
    }

    // ROUTE-SEC-014 FIX: Verify this merchant has approved Swiggy integration.
    // Without this check, any Swiggy merchant could create orders for any other
    // merchant's store on our platform (the HMAC sig only proves Swiggy sent the payload,
    // not which merchant it's for).
    const approvedAgg = await MerchantAggregator.findOne({
      platform: 'swiggy',
      externalMerchantId: merchantId,
      status: 'active',
    });
    if (!approvedAgg) {
      logger.warn('[SWIGGY WEBHOOK] Merchant not approved for Swiggy integration', { merchantId, externalId });
      return res.status(403).json({ error: 'Aggregator integration not approved for this merchant' });
    }

    // Normalize and save
    const normalizedData = normalizeSwiggyOrder(raw, merchantId);

    // B4: Resolve customer identity (phone → User._id) BEFORE create so the
    // order row itself links to the resolved user — not just the emitted event.
    const identity = await resolveCustomerIdentity({
      customerPhone: normalizedData.customerPhone,
      customerName: normalizedData.customerName,
      source: 'aggregator-swiggy',
    });
    if (identity.customerId) {
      (normalizedData as any).customerId = new mongoose.Types.ObjectId(identity.customerId);
    }

    const order = await AggregatorOrder.create(normalizedData);

    logger.info('[SWIGGY WEBHOOK] Order created', { orderId: order._id, externalId });

    // B4: Canonical order.placed event. storeId is null for aggregator orders —
    // platform doesn't map to a ReZ store row. Merchant "primary store" heuristic
    // gets wired in Sprint 1. emitOrderPlaced is never-throws — no try/catch needed.
    emitOrderPlaced({
      merchantId: String(merchantId),
      storeId: null,
      customerId: identity.customerId,
      orderId: String(order._id),
      orderNumber: `SWIGGY-${order.externalId}`,
      amount: Number(normalizedData.total ?? 0),
      source: 'aggregator',
      items: normalizedData.items?.map((i: any) => ({
        productId: String(i.externalItemId ?? i._id ?? ''),
        qty: Number(i.qty ?? 1),
        price: Number(i.price ?? 0),
      })),
    });

    // Emit to merchant Socket.IO room (use global.io if available)
    const io = (global as any).io;
    if (io) {
      io.to(`merchant-${merchantId}`).emit('aggregator:new-order', {
        _id: order._id,
        externalId: order.externalId,
        platform: order.platform,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        total: order.total,
        status: order.status,
      });
    }

    return res.status(201).json({ success: true, orderId: order._id });
  } catch (error) {
    logger.error('[SWIGGY WEBHOOK] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/webhook/zomato
 * @desc Receive order from Zomato aggregator
 * @access Public (verified with signature)
 */
router.post('/zomato', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-zomato-signature'] as string;
    const secret = process.env.ZOMATO_WEBHOOK_SECRET;

    if (!secret) {
      logger.error('[ZOMATO WEBHOOK] Missing ZOMATO_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!signature) {
      logger.warn('[ZOMATO WEBHOOK] Missing x-zomato-signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature — use raw body captured by express.json({verify}) so the
    // HMAC matches the exact bytes the sender signed.
    const payload = (req as any).rawBody || JSON.stringify(req.body);
    if (!verifySignature(payload, signature, secret)) {
      logger.warn('[ZOMATO WEBHOOK] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const raw = req.body;
    const externalId = raw.order_id || raw.id;
    const merchantId = raw.merchant_id || raw.restaurantId;

    if (!externalId || !merchantId) {
      logger.warn('[ZOMATO WEBHOOK] Missing externalId or merchantId', { raw });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check idempotency: if order already exists, return 200 without duplicate
    const existingOrder = await AggregatorOrder.findOne({
      platform: 'zomato',
      externalId,
    });

    if (existingOrder) {
      logger.info('[ZOMATO WEBHOOK] Order already processed', { externalId });
      return res.status(200).json({ success: true, message: 'Order already exists' });
    }

    // ROUTE-SEC-014 FIX: Verify this merchant has approved Zomato integration.
    const approvedAgg = await MerchantAggregator.findOne({
      platform: 'zomato',
      externalMerchantId: merchantId,
      status: 'active',
    });
    if (!approvedAgg) {
      logger.warn('[ZOMATO WEBHOOK] Merchant not approved for Zomato integration', { merchantId, externalId });
      return res.status(403).json({ error: 'Aggregator integration not approved for this merchant' });
    }

    // Normalize and save
    const normalizedData = normalizeZomatoOrder(raw, merchantId);

    // B4: Resolve customer identity (phone → User._id) BEFORE create.
    const identity = await resolveCustomerIdentity({
      customerPhone: normalizedData.customerPhone,
      customerName: normalizedData.customerName,
      source: 'aggregator-zomato',
    });
    if (identity.customerId) {
      (normalizedData as any).customerId = new mongoose.Types.ObjectId(identity.customerId);
    }

    const order = await AggregatorOrder.create(normalizedData);

    logger.info('[ZOMATO WEBHOOK] Order created', { orderId: order._id, externalId });

    // B4: Canonical order.placed event — see Swiggy handler for rationale.
    emitOrderPlaced({
      merchantId: String(merchantId),
      storeId: null,
      customerId: identity.customerId,
      orderId: String(order._id),
      orderNumber: `ZOMATO-${order.externalId}`,
      amount: Number(normalizedData.total ?? 0),
      source: 'aggregator',
      items: normalizedData.items?.map((i: any) => ({
        productId: String(i.externalItemId ?? i._id ?? ''),
        qty: Number(i.qty ?? 1),
        price: Number(i.price ?? 0),
      })),
    });

    // Emit to merchant Socket.IO room (use global.io if available)
    const io = (global as any).io;
    if (io) {
      io.to(`merchant-${merchantId}`).emit('aggregator:new-order', {
        _id: order._id,
        externalId: order.externalId,
        platform: order.platform,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        total: order.total,
        status: order.status,
      });
    }

    return res.status(201).json({ success: true, orderId: order._id });
  } catch (error) {
    logger.error('[ZOMATO WEBHOOK] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// v3: Menu sync conflict detection (Part 7 — Aggregator Conflict Notification)
// POST /api/webhook/aggregator/menu-sync
// Called after REZ pulls the current aggregator menu (Swiggy/Zomato) before overwriting.
// Detects price/name/availability drift and notifies merchant.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/webhook/aggregator/menu-sync
 * @desc    Compare REZ menu against aggregator snapshot and report conflicts.
 *          Called by the merchant's menu-push job BEFORE overwriting the aggregator.
 *          On conflict: notifies merchant via in-app notification, logs for audit.
 * @body    { merchantId, platform: 'swiggy'|'zomato', aggregatorItems: [...] }
 * @access  Authenticated via HMAC-SHA256 signature
 * @fix     ROUTE-SEC-004: Added signature verification using MENU_SYNC_WEBHOOK_SECRET.
 *          Previously had zero authentication — any caller could invoke menu-sync.
 */
router.post('/menu-sync', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-menu-sync-signature'] as string;
    const secret = process.env.MENU_SYNC_WEBHOOK_SECRET;

    if (!secret) {
      logger.error('[MENU SYNC] Missing MENU_SYNC_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!signature) {
      logger.warn('[MENU SYNC] Missing x-menu-sync-signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    const payload = JSON.stringify(req.body);
    if (!verifySignature(payload, signature, secret)) {
      logger.warn('[MENU SYNC] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { merchantId, platform, aggregatorItems } = req.body;

    if (!merchantId || !platform || !Array.isArray(aggregatorItems)) {
      return res.status(400).json({
        error: 'Missing required fields: merchantId, platform, aggregatorItems[]',
      });
    }

    // Fetch REZ products for this merchant with aggregator mapping
    const { Product } = await import('../models/Product').catch(() => ({ Product: null }));
    if (!Product) {
      return res.status(200).json({ conflicts: [], message: 'Product model not available' });
    }

    const rezItems = await (Product as any)
      .find({ merchantId, isActive: true })
      .select('name price is86d aggregatorMapping')
      .lean();

    // Run conflict detection (non-blocking notification inside)
    const summary = await detectAndNotifyConflicts(merchantId, platform, rezItems, aggregatorItems);

    logger.info('[AGGREGATOR] Menu sync conflict check complete', {
      merchantId,
      platform,
      conflictCount: summary.conflicts.length,
    });

    return res.status(200).json({
      success: true,
      conflictCount: summary.conflicts.length,
      conflicts: summary.conflicts,
      syncedAt: summary.syncedAt,
    });
  } catch (error) {
    logger.error('[AGGREGATOR] Menu sync conflict check failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
