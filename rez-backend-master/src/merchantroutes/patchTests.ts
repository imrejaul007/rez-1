import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/merchant/patch-tests/record
 * Merchant records a patch test result for a client by clientId.
 * Body: { clientId, serviceCategory, result: 'pass'|'reaction', notes?, testedAt? }
 */
router.post(
  '/record',
  asyncHandler(async (req: any, res) => {
    const { clientId, serviceCategory, result, notes, testedAt } = req.body;

    if (!clientId || !serviceCategory || !result) {
      sendError(res, 'clientId, serviceCategory and result are required', 400);
      return;
    }

    if (!['pass', 'reaction'].includes(result)) {
      sendError(res, 'result must be "pass" or "reaction"', 400);
      return;
    }

    const testedDate = testedAt ? new Date(testedAt) : new Date();
    const expiresAt = new Date(testedDate);
    expiresAt.setDate(expiresAt.getDate() + 48 * 7); // 48 weeks validity

    const entry: Record<string, any> = {
      serviceCategory,
      result,
      testedAt: testedDate,
      expiresAt,
      conductedBy: req.merchantUser?.name || req.merchant?.businessName || 'merchant',
      storeId: (req as any).storeId || req.merchant?._id,
    };
    if (notes) entry.notes = notes;

    const user = await User.findByIdAndUpdate(clientId, { $push: { patchTests: entry } }, { new: false });

    if (!user) {
      sendError(res, 'Client not found', 404);
      return;
    }

    sendSuccess(res, entry, 'Patch test recorded');
  }),
);

/**
 * GET /api/merchant/patch-tests/:clientId
 * Returns the patch test history for a given client.
 */
router.get(
  '/:clientId',
  asyncHandler(async (req: any, res) => {
    const user = await User.findById(req.params.clientId).select('patchTests name phoneNumber').lean();

    if (!user) {
      sendError(res, 'Client not found', 404);
      return;
    }

    const u = user as any;
    sendSuccess(
      res,
      { name: u.name, phoneNumber: u.phoneNumber, patchTests: u.patchTests || [] },
      'Patch test history',
    );
  }),
);

export default router;
