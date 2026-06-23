/**
 * merchantroutes/postPurchase.ts
 * Post-purchase engagement rule management
 * (automated follow-up messages: warranty reminders, rebooking nudges, "we miss you" offers)
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { PostPurchaseRule } from '../models/PostPurchaseRule';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

/** GET /merchant/post-purchase/rules */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const filter: any = { merchantId: req.merchantId };
    if (active === 'true') filter.isActive = true;
    const rules = await PostPurchaseRule.find(filter).sort({ delayDays: 1 });
    return res.json({ success: true, data: rules });
  } catch (err) {
    logger.error('postPurchase GET error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rules' });
  }
});

/** POST /merchant/post-purchase/rules */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      name,
      triggerType,
      triggerCategory,
      triggerProductId,
      delayDays,
      channel,
      messageTitle,
      messageBody,
      ctaText,
      ctaLink,
      includeDiscount,
      discountPercent,
      maxSendsPerCustomer,
    } = req.body;

    if (!name || !triggerType || !delayDays || !channel || !messageTitle || !messageBody) {
      return res.status(400).json({
        success: false,
        message: 'name, triggerType, delayDays, channel, messageTitle, and messageBody are required',
      });
    }
    if (triggerType === 'category' && !triggerCategory) {
      return res.status(400).json({ success: false, message: 'triggerCategory required for category trigger' });
    }
    if (triggerType === 'product' && !triggerProductId) {
      return res.status(400).json({ success: false, message: 'triggerProductId required for product trigger' });
    }

    const rule = await PostPurchaseRule.create({
      merchantId: req.merchantId,
      storeId: storeId || undefined,
      name,
      triggerType,
      triggerCategory: triggerCategory || undefined,
      triggerProductId: triggerProductId || undefined,
      delayDays,
      channel,
      messageTitle,
      messageBody,
      ctaText: ctaText || undefined,
      ctaLink: ctaLink || undefined,
      includeDiscount: !!includeDiscount,
      discountPercent: discountPercent ?? undefined,
      maxSendsPerCustomer: maxSendsPerCustomer || 1,
    });

    return res.status(201).json({ success: true, data: rule });
  } catch (err) {
    logger.error('postPurchase POST error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create rule' });
  }
});

/** PUT /merchant/post-purchase/rules/:ruleId */
router.put('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const {
      name: ppUpName,
      triggerType: ppUpTriggerType,
      triggerCategory: ppUpTriggerCat,
      triggerProductId: ppUpTriggerProd,
      delayDays: ppUpDelayDays,
      channel: ppUpChannel,
      messageTitle: ppUpMsgTitle,
      messageBody: ppUpMsgBody,
      ctaText: ppUpCtaText,
      ctaLink: ppUpCtaLink,
      includeDiscount: ppUpIncDiscount,
      discountPercent: ppUpDiscPct,
      maxSendsPerCustomer: ppUpMaxSends,
      isActive: ppUpIsActive,
      storeId: ppUpStoreId,
    } = req.body;
    const ppUpFields: Record<string, any> = {};
    if (ppUpName !== undefined) ppUpFields.name = ppUpName;
    if (ppUpTriggerType !== undefined) ppUpFields.triggerType = ppUpTriggerType;
    if (ppUpTriggerCat !== undefined) ppUpFields.triggerCategory = ppUpTriggerCat;
    if (ppUpTriggerProd !== undefined) ppUpFields.triggerProductId = ppUpTriggerProd;
    if (ppUpDelayDays !== undefined) ppUpFields.delayDays = ppUpDelayDays;
    if (ppUpChannel !== undefined) ppUpFields.channel = ppUpChannel;
    if (ppUpMsgTitle !== undefined) ppUpFields.messageTitle = ppUpMsgTitle;
    if (ppUpMsgBody !== undefined) ppUpFields.messageBody = ppUpMsgBody;
    if (ppUpCtaText !== undefined) ppUpFields.ctaText = ppUpCtaText;
    if (ppUpCtaLink !== undefined) ppUpFields.ctaLink = ppUpCtaLink;
    if (ppUpIncDiscount !== undefined) ppUpFields.includeDiscount = ppUpIncDiscount;
    if (ppUpDiscPct !== undefined) ppUpFields.discountPercent = ppUpDiscPct;
    if (ppUpMaxSends !== undefined) ppUpFields.maxSendsPerCustomer = ppUpMaxSends;
    if (ppUpIsActive !== undefined) ppUpFields.isActive = ppUpIsActive;
    if (ppUpStoreId !== undefined) ppUpFields.storeId = ppUpStoreId;
    const rule = await PostPurchaseRule.findOneAndUpdate(
      { _id: req.params.ruleId, merchantId: req.merchantId },
      { $set: ppUpFields },
      { new: true, runValidators: true },
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    return res.json({ success: true, data: rule });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update rule' });
  }
});

/** DELETE /merchant/post-purchase/rules/:ruleId */
router.delete('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const rule = await PostPurchaseRule.findOneAndDelete({ _id: req.params.ruleId, merchantId: req.merchantId });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    return res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete rule' });
  }
});

/** PATCH /merchant/post-purchase/rules/:ruleId/toggle */
router.patch('/rules/:ruleId/toggle', async (req: Request, res: Response) => {
  try {
    const rule = await PostPurchaseRule.findOne({ _id: req.params.ruleId, merchantId: req.merchantId });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    rule.isActive = !rule.isActive;
    await rule.save();
    return res.json({ success: true, data: { isActive: rule.isActive } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle rule' });
  }
});

/**
 * GET /merchant/post-purchase/preview
 * Preview which customers would receive a rule's message right now.
 * Uses last 7-day orders to simulate. Returns up to 10 sample customers.
 */
router.get('/preview/:ruleId', async (req: Request, res: Response) => {
  try {
    const rule = await PostPurchaseRule.findOne({ _id: req.params.ruleId, merchantId: req.merchantId });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    const { Order } = require('../models/Order');
    const targetDate = new Date(Date.now() - rule.delayDays * 86400000);
    const windowStart = new Date(targetDate.getTime() - 86400000);
    const windowEnd = new Date(targetDate.getTime() + 86400000);

    const matchFilter: any = {
      createdAt: { $gte: windowStart, $lte: windowEnd },
      status: { $in: ['delivered', 'completed', 'paid'] },
    };
    if (rule.triggerType === 'category') {
      matchFilter['items.category'] = rule.triggerCategory;
    } else if (rule.triggerType === 'product') {
      matchFilter['items.productId'] = rule.triggerProductId;
    }

    const orders = await Order.find(matchFilter).select('customer.name customer.phone createdAt').limit(10).lean();

    return res.json({
      success: true,
      data: {
        rule: { name: rule.name, delayDays: rule.delayDays, channel: rule.channel },
        sampleCustomers: orders.map((o: any) => ({
          name: o.customer?.name || 'Unknown',
          phone: o.customer?.phone,
          purchaseDate: o.createdAt,
        })),
        estimatedReach: orders.length,
      },
    });
  } catch (err) {
    logger.error('postPurchase preview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to preview rule' });
  }
});

export default router;
