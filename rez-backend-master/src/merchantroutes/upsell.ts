/**
 * merchantroutes/upsell.ts
 * Upsell rule management + suggestion engine
 */
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/merchantauth';
import { UpsellRule } from '../models/UpsellRule';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

// ─── CRUD: manage upsell rules ────────────────────────────────────────────────

/** GET /merchant/upsell/rules */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { storeId, active } = req.query;
    const filter: any = { merchantId: req.merchantId };
    if (storeId) filter.storeId = storeId;
    if (active === 'true') filter.isActive = true;

    const rules = await UpsellRule.find(filter).sort({ priority: 1, createdAt: -1 });
    return res.json({ success: true, data: rules });
  } catch (err) {
    logger.error('upsell/rules GET error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch upsell rules' });
  }
});

/** POST /merchant/upsell/rules */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      name,
      triggerType,
      triggerProductId,
      triggerCategory,
      suggestedProductId,
      suggestedProductName,
      suggestedProductPrice,
      suggestedProductImage,
      badgeText,
      discountPercent,
      priority,
    } = req.body;

    if (!name || !triggerType || !suggestedProductId || !suggestedProductName || suggestedProductPrice == null) {
      return res.status(400).json({
        success: false,
        message: 'name, triggerType, suggestedProductId, suggestedProductName, and suggestedProductPrice are required',
      });
    }
    if (triggerType === 'product' && !triggerProductId) {
      return res.status(400).json({ success: false, message: 'triggerProductId required for product trigger' });
    }
    if (triggerType === 'category' && !triggerCategory) {
      return res.status(400).json({ success: false, message: 'triggerCategory required for category trigger' });
    }

    const rule = await UpsellRule.create({
      merchantId: req.merchantId,
      storeId: storeId || undefined,
      name,
      triggerType,
      triggerProductId: triggerProductId || undefined,
      triggerCategory: triggerCategory || undefined,
      suggestedProductId,
      suggestedProductName,
      suggestedProductPrice,
      suggestedProductImage: suggestedProductImage || undefined,
      badgeText: badgeText || undefined,
      discountPercent: discountPercent ?? undefined,
      priority: priority ?? 0,
    });

    return res.status(201).json({ success: true, data: rule });
  } catch (err) {
    logger.error('upsell/rules POST error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create upsell rule' });
  }
});

/** PUT /merchant/upsell/rules/:ruleId */
router.put('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const {
      name: urUpName,
      triggerType: urUpTriggerType,
      triggerProductId: urUpTriggerProd,
      triggerCategory: urUpTriggerCat,
      suggestedProductId: urUpSugProd,
      suggestedProductName: urUpSugName,
      suggestedProductPrice: urUpSugPrice,
      suggestedProductImage: urUpSugImg,
      badgeText: urUpBadge,
      discountPercent: urUpDiscount,
      isActive: urUpIsActive,
      priority: urUpPriority,
      storeId: urUpStoreId,
    } = req.body;
    const urUpFields: Record<string, any> = {};
    if (urUpName !== undefined) urUpFields.name = urUpName;
    if (urUpTriggerType !== undefined) urUpFields.triggerType = urUpTriggerType;
    if (urUpTriggerProd !== undefined) urUpFields.triggerProductId = urUpTriggerProd;
    if (urUpTriggerCat !== undefined) urUpFields.triggerCategory = urUpTriggerCat;
    if (urUpSugProd !== undefined) urUpFields.suggestedProductId = urUpSugProd;
    if (urUpSugName !== undefined) urUpFields.suggestedProductName = urUpSugName;
    if (urUpSugPrice !== undefined) urUpFields.suggestedProductPrice = urUpSugPrice;
    if (urUpSugImg !== undefined) urUpFields.suggestedProductImage = urUpSugImg;
    if (urUpBadge !== undefined) urUpFields.badgeText = urUpBadge;
    if (urUpDiscount !== undefined) urUpFields.discountPercent = urUpDiscount;
    if (urUpIsActive !== undefined) urUpFields.isActive = urUpIsActive;
    if (urUpPriority !== undefined) urUpFields.priority = urUpPriority;
    if (urUpStoreId !== undefined) urUpFields.storeId = urUpStoreId;
    const rule = await UpsellRule.findOneAndUpdate(
      { _id: req.params.ruleId, merchantId: req.merchantId },
      { $set: urUpFields },
      { new: true, runValidators: true },
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    return res.json({ success: true, data: rule });
  } catch (err) {
    logger.error('upsell/rules PUT error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update upsell rule' });
  }
});

/** DELETE /merchant/upsell/rules/:ruleId */
router.delete('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const rule = await UpsellRule.findOneAndDelete({ _id: req.params.ruleId, merchantId: req.merchantId });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    return res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    logger.error('upsell/rules DELETE error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete upsell rule' });
  }
});

// ─── Suggestion engine ────────────────────────────────────────────────────────

/**
 * POST /merchant/upsell/suggest
 * Given a cart (array of { productId, category }), returns matching upsell suggestions.
 * Called by POS/checkout before payment.
 */
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { storeId, cartItems } = req.body as {
      storeId?: string;
      cartItems: Array<{ productId: string; category?: string }>;
    };

    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ success: false, message: 'cartItems array required' });
    }

    const productIds = cartItems.map((i) => i.productId).filter(Boolean);
    const categories = [...new Set(cartItems.map((i) => i.category).filter(Boolean))];
    const cartProductIdSet = new Set(productIds);

    const filter: any = {
      merchantId: req.merchantId,
      isActive: true,
      $or: [
        { triggerType: 'any' },
        { triggerType: 'product', triggerProductId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        ...(categories.length ? [{ triggerType: 'category', triggerCategory: { $in: categories } }] : []),
      ],
    };
    // storeId is an AND condition — must be top-level, not inside $or
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const rules = await UpsellRule.find(filter).sort({ priority: 1 }).limit(5);

    // Filter out items already in cart
    const suggestions = rules.filter((r) => !cartProductIdSet.has(r.suggestedProductId.toString()));

    // Track impressions (fire-and-forget)
    const ruleIds = suggestions.map((r) => r._id);
    UpsellRule.updateMany({ _id: { $in: ruleIds } }, { $inc: { totalImpressions: 1 } }).catch((err: any) =>
      logger.warn('[Upsell] Failed to track impressions', { error: err.message }),
    );

    return res.json({
      success: true,
      data: suggestions.map((r) => ({
        ruleId: r._id,
        productId: r.suggestedProductId,
        name: r.suggestedProductName,
        price: r.suggestedProductPrice,
        image: r.suggestedProductImage,
        badgeText: r.badgeText || 'Add-on',
        discountPercent: r.discountPercent,
        finalPrice: r.discountPercent
          ? Math.round(r.suggestedProductPrice * (1 - r.discountPercent / 100) * 100) / 100
          : r.suggestedProductPrice,
      })),
    });
  } catch (err) {
    logger.error('upsell/suggest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get suggestions' });
  }
});

/**
 * POST /merchant/upsell/accept
 * Called when customer accepts an upsell suggestion — increments totalAccepted.
 */
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.body;
    if (!ruleId) return res.status(400).json({ success: false, message: 'ruleId required' });
    await UpsellRule.updateOne({ _id: ruleId, merchantId: req.merchantId }, { $inc: { totalAccepted: 1 } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to record acceptance' });
  }
});

export default router;
