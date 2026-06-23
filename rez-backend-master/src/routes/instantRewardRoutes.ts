// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import instantRewardService from '../services/instantRewardService';
import { Joi } from '../middleware/validation';
import { validateBody } from '../middleware/validation';

const router = Router();

router.use(requireAuth);
router.use(generalLimiter);

/**
 * POST /api/rewards/instant/checkin
 * Awards 10 instant REZ coins for a physical store check-in.
 * Body: { storeId: string }
 */
router.post(
  '/checkin',
  validateBody(
    Joi.object({
      storeId: Joi.string().required().trim().max(100),
    }),
  ),
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { storeId } = req.body;
    const result = await instantRewardService.onVisitCheckin(userId, storeId);

    return res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/rewards/instant/scan
 * Awards 5 instant REZ coins for scanning a merchant QR code.
 * Body: { storeId: string }
 */
router.post(
  '/scan',
  validateBody(
    Joi.object({
      storeId: Joi.string().required().trim().max(100),
    }),
  ),
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { storeId } = req.body;
    const result = await instantRewardService.onQRScan(userId, storeId);

    return res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/rewards/instant/payment
 * Awards percentage-based instant REZ coins after a confirmed payment.
 * Body: { orderId: string, amount: number }
 */
router.post(
  '/payment',
  validateBody(
    Joi.object({
      orderId: Joi.string().required().trim().max(100),
      amount: Joi.number().positive().required(),
    }),
  ),
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { orderId, amount } = req.body;
    const result = await instantRewardService.onPaymentConfirmed(userId, orderId, amount);

    return res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/rewards/instant/bill-upload
 * Awards 15 instant REZ coins for uploading a bill or receipt.
 * No body required (userId from auth token).
 */
router.post(
  '/bill-upload',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await instantRewardService.onBillUpload(userId);
    return res.json({ success: true, data: result });
  }),
);

/**
 * GET /api/rewards/instant/daily-usage
 * Returns current daily instant reward usage and remaining cap.
 */
router.get(
  '/daily-usage',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const usage = await instantRewardService.getDailyUsage(userId);
    return res.json({ success: true, data: usage });
  }),
);

export default router;
