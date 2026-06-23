// @ts-nocheck
/**
 * Merchant QR Routes — Sprint 8
 *
 * GET  /api/merchant/qr/:storeId           — QR payload for store check-in
 * GET  /api/merchant/marketing/templates   — list marketing templates
 * POST /api/merchant/marketing/templates   — create marketing template
 * DELETE /api/merchant/marketing/templates/:id — delete marketing template
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { Store } from '../models/Store';
import { MerchantTemplate } from '../models/MerchantTemplate';

const router = Router();
router.use(generalLimiter);

// ── QR Check-In ──────────────────────────────────────────────────────────────

/**
 * GET /api/merchant/qr/:storeId
 * Returns a QR payload and deep-link for store check-in.
 * The authenticated merchant must own the requested store.
 */
router.get(
  '/qr/:storeId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = (req as any).merchantId || (req as any).userId;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid storeId' });
    }

    const store = await Store.findOne({ _id: storeId, merchantId }).select('name logo merchantId').lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found or does not belong to this merchant' });
    }

    const qrPayload = {
      storeId: storeId,
      action: 'checkin' as const,
      v: 1,
    };

    return res.json({
      success: true,
      data: {
        storeId,
        storeName: (store as any).name,
        logo: (store as any).logo,
        qrPayload,
        qrString: JSON.stringify(qrPayload),
        deepLink: `rezapp://checkin?storeId=${storeId}`,
      },
    });
  }),
);

// ── Marketing Templates ───────────────────────────────────────────────────────

/**
 * GET /api/merchant/marketing/templates
 * List all templates belonging to the authenticated merchant.
 */
router.get(
  '/marketing/templates',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchantId || (req as any).userId;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, parseInt((req.query.limit as string) || '20', 10));
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      MerchantTemplate.find({ merchantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MerchantTemplate.countDocuments({ merchantId }),
    ]);

    return res.json({
      success: true,
      data: templates,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * POST /api/merchant/marketing/templates
 * Create a new marketing template.
 */
router.post(
  '/marketing/templates',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchantId || (req as any).userId;
    const { title, body, variables } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    const template = await MerchantTemplate.create({
      merchantId,
      title,
      body,
      variables: Array.isArray(variables) ? variables : [],
    });

    return res.status(201).json({ success: true, data: template });
  }),
);

/**
 * DELETE /api/merchant/marketing/templates/:id
 * Delete a marketing template owned by the authenticated merchant.
 */
router.delete(
  '/marketing/templates/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchantId || (req as any).userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }

    const deleted = await MerchantTemplate.findOneAndDelete({ _id: id, merchantId });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Template not found or does not belong to this merchant' });
    }

    return res.json({ success: true, message: 'Template deleted' });
  }),
);

export default router;
