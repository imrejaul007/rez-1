// @ts-nocheck
/**
 * routes/admin/corporate.ts
 *
 * Admin endpoints for Corporate B2B accounts.
 *
 *   GET    /api/admin/corporate              — list all corporate accounts (paginated)
 *   GET    /api/admin/corporate/:id          — single account + members summary
 *   POST   /api/admin/corporate/:id/topup    — add coins to a corporate balance
 *   PATCH  /api/admin/corporate/:id/status   — activate / deactivate account
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Corporate } from '../../models/Corporate';
import { CorporateMember } from '../../models/CorporateMember';
import { asyncHandler } from '../../utils/asyncHandler';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('admin-corporate');
const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ── List all corporate accounts ───────────────────────────────────────────────

router.get(
  '/corporate',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { companyEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const [accounts, total] = await Promise.all([
      Corporate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Corporate.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: accounts,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  }),
);

// ── Get single corporate account with members ─────────────────────────────────

router.get(
  '/corporate/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid corporate ID' });
    }

    const [account, members] = await Promise.all([
      Corporate.findById(req.params.id).lean(),
      CorporateMember.find({ corporateId: req.params.id })
        .select('name email department status coinsReceived coinsSpent pendingCoins')
        .sort({ name: 1 })
        .lean(),
    ]);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Corporate account not found' });
    }

    return res.json({ success: true, data: { account, members } });
  }),
);

// ── Top up corporate coin balance ─────────────────────────────────────────────

router.post(
  '/corporate/:id/topup',
  asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid corporate ID' });
    }

    const { coins, note } = req.body;
    const amount = Math.floor(Number(coins));
    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'coins must be a positive integer' });
    }

    const account = await Corporate.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { coinBalance: amount, totalCoinsLoaded: amount },
      },
      { new: true },
    );

    if (!account) {
      return res.status(404).json({ success: false, message: 'Corporate account not found' });
    }

    logger.info('Admin topped up corporate account', {
      corporateId: req.params.id,
      coins: amount,
      note,
      adminId: (req as any).user?._id?.toString(),
    });

    return res.json({
      success: true,
      message: `${amount} coins added to ${account.companyName}`,
      data: { coinBalance: account.coinBalance, totalCoinsLoaded: account.totalCoinsLoaded },
    });
  }),
);

// ── Activate / deactivate corporate account ───────────────────────────────────

router.patch(
  '/corporate/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid corporate ID' });
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive (boolean) is required' });
    }

    const account = await Corporate.findByIdAndUpdate(req.params.id, { $set: { isActive } }, { new: true });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Corporate account not found' });
    }

    logger.info('Admin updated corporate account status', {
      corporateId: req.params.id,
      isActive,
      adminId: (req as any).user?._id?.toString(),
    });

    return res.json({
      success: true,
      message: `Corporate account ${isActive ? 'activated' : 'deactivated'}`,
      data: { isActive: account.isActive },
    });
  }),
);

export default router;
