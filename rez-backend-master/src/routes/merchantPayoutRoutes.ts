// @ts-nocheck
/**
 * merchantPayoutRoutes.ts — Sprint 7 Merchant Payout, Customer Segments,
 * Analytics Cohorts, and Staff Management
 *
 * GET    /api/merchant/payouts            — list payout history
 * POST   /api/merchant/payouts/request    — request a payout
 * GET    /api/merchant/customers/segments — customer segmentation
 * GET    /api/merchant/analytics/cohorts  — cohort return rates
 * GET    /api/merchant/staff              — list staff
 * POST   /api/merchant/staff/invite       — invite staff member
 * DELETE /api/merchant/staff/:id          — remove staff member
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { MerchantPayout } from '../models/MerchantPayout';
import { MerchantStaff } from '../models/MerchantStaff';
import { CoinTransaction } from '../models/CoinTransaction';
import { logger } from '../config/logger';

const router = Router();

// All routes require auth
router.use(requireAuth);
router.use(generalLimiter);

/**
 * GET /api/merchant/payouts
 * List payout history for the authenticated merchant.
 * Query: page=1&limit=20
 */
router.get(
  '/payouts',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      MerchantPayout.find({ merchantId }).sort({ requestedAt: -1 }).skip(skip).limit(limit).lean(),
      MerchantPayout.countDocuments({ merchantId }),
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      payouts,
    });
  }),
);

/**
 * POST /api/merchant/payouts/request
 * Request a payout.
 * Body: { amountPaise, bankAccountId? }
 */
router.post(
  '/payouts/request',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { amountPaise, bankAccountId } = req.body;

    // BE-MER-007: Validate payout amount — must be positive integer, upper bounded, paise precision
    if (!amountPaise || typeof amountPaise !== 'number') {
      return res.status(400).json({ success: false, message: 'amountPaise must be a positive number' });
    }
    if (amountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'amountPaise must be positive' });
    }
    if (!Number.isInteger(amountPaise)) {
      return res.status(400).json({ success: false, message: 'amountPaise must be an integer (whole paise)' });
    }
    if (amountPaise > 999999999) {
      // Max ₹99,99,999 (~1 crore)
      return res.status(400).json({ success: false, message: 'amountPaise exceeds maximum allowed payout' });
    }

    // C10: Prevent double-payout race condition with an atomic balance check + insert.
    // We compute pending balance, then immediately insert the payout document inside a
    // single session+transaction so no concurrent request can slip through between the
    // read and the write.
    const session = await mongoose.startSession();
    let payout: any;
    try {
      await session.withTransaction(async () => {
        // Re-compute balance inside the transaction so the read is serialised
        const pendingResult = await CoinTransaction.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(merchantId),
              type: 'earned',
              'metadata.merchantPayout': { $exists: false },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]).session(session);

        const pendingBalance = pendingResult[0]?.total ?? 0;

        // Convert amountPaise to coins for balance check (1 paise = 0.05 coins)
        const requiredCoins = amountPaise * 0.05;
        if (pendingBalance < requiredCoins) {
          throw Object.assign(new Error('Insufficient pending balance for this payout amount'), {
            statusCode: 400,
            pendingBalance,
            required: requiredCoins,
          });
        }

        [payout] = await MerchantPayout.create(
          [
            {
              merchantId,
              amountPaise,
              status: 'pending',
              requestedAt: new Date(),
              bankAccountId: bankAccountId || undefined,
            },
          ],
          { session },
        );
      });
    } catch (txErr: any) {
      session.endSession();
      if (txErr.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: txErr.message,
          pendingBalance: txErr.pendingBalance,
          required: txErr.required,
        });
      }
      throw txErr;
    }
    session.endSession();

    logger.info('[MerchantPayout] Payout requested', { merchantId, payoutId: payout._id, amountPaise });

    return res.status(201).json({
      success: true,
      payoutId: payout._id,
      status: payout.status,
      amountPaise: payout.amountPaise,
    });
  }),
);

/**
 * GET /api/merchant/customers/segments
 * Aggregate CoinTransaction by user for this merchant's store,
 * bucket into high_value / at_risk / new_users.
 */
router.get(
  '/customers/segments',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Aggregate spend (earned coins from purchase_reward) per user associated with merchant
    const userSpend = await CoinTransaction.aggregate([
      {
        $match: {
          source: 'purchase_reward',
          type: 'earned',
          'metadata.merchantId': new mongoose.Types.ObjectId(merchantId),
        },
      },
      {
        $group: {
          _id: '$user',
          totalCoins: { $sum: '$amount' },
          lastTransaction: { $max: '$createdAt' },
          firstTransaction: { $min: '$createdAt' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const segments = { high_value: 0, at_risk: 0, new_users: 0 };

    for (const u of userSpend) {
      const isNew = u.firstTransaction >= thirtyDaysAgo;
      const isAtRisk = u.lastTransaction < thirtyDaysAgo && u.lastTransaction >= ninetyDaysAgo;
      const isHighValue = u.totalCoins >= 500;

      if (isNew) {
        segments.new_users++;
      } else if (isHighValue) {
        segments.high_value++;
      } else if (isAtRisk) {
        segments.at_risk++;
      }
    }

    return res.json({
      success: true,
      totalUsers: userSpend.length,
      segments,
    });
  }),
);

/**
 * GET /api/merchant/analytics/cohorts
 * Aggregate UserStreak to compute return rates at week 0/1/2/4.
 */
router.get(
  '/analytics/cohorts',
  asyncHandler(async (req: Request, res: Response) => {
    const UserStreak = mongoose.model('UserStreak');

    // Count users with active streaks at each week milestone
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const [week0, week1, week2, week4] = await Promise.all([
      UserStreak.countDocuments({ lastActivityDate: { $gte: new Date(now - weekMs) } }),
      UserStreak.countDocuments({
        lastActivityDate: { $gte: new Date(now - 2 * weekMs), $lt: new Date(now - weekMs) },
      }),
      UserStreak.countDocuments({
        lastActivityDate: { $gte: new Date(now - 3 * weekMs), $lt: new Date(now - 2 * weekMs) },
      }),
      UserStreak.countDocuments({
        lastActivityDate: { $gte: new Date(now - 5 * weekMs), $lt: new Date(now - 4 * weekMs) },
      }),
    ]);

    const base = week0 || 1; // avoid division by zero

    return res.json({
      success: true,
      cohorts: [
        { week: 0, activeUsers: week0, returnRate: 100 },
        { week: 1, activeUsers: week1, returnRate: Math.round((week1 / base) * 100) },
        { week: 2, activeUsers: week2, returnRate: Math.round((week2 / base) * 100) },
        { week: 4, activeUsers: week4, returnRate: Math.round((week4 / base) * 100) },
      ],
    });
  }),
);

/**
 * GET /api/merchant/staff
 * List active staff for the merchant.
 */
router.get(
  '/staff',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id;

    const staff = await MerchantStaff.find({ merchantId, isActive: true }).sort({ addedAt: -1 }).lean();

    return res.json({
      success: true,
      count: staff.length,
      staff,
    });
  }),
);

/**
 * POST /api/merchant/staff/invite
 * Add/invite a staff member.
 * Body: { name, email?, phone?, role? }
 */
router.post(
  '/staff/invite',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id;
    const { name, email, phone, role } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const staffMember = await MerchantStaff.create({
      merchantId,
      name: name.trim(),
      email: email || undefined,
      phone: phone || undefined,
      role: role || 'staff',
      isActive: true,
      addedAt: new Date(),
    });

    logger.info('[MerchantStaff] Staff invited', { merchantId, staffId: staffMember._id });

    return res.status(201).json({
      success: true,
      staff: staffMember,
    });
  }),
);

/**
 * DELETE /api/merchant/staff/:id
 * Soft-delete (deactivate) a staff member.
 */
router.delete(
  '/staff/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid staff id' });
    }

    const staffMember = await MerchantStaff.findOne({ _id: id, merchantId });

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staffMember.isActive = false;
    await staffMember.save();

    logger.info('[MerchantStaff] Staff deactivated', { merchantId, staffId: id });

    return res.json({ success: true, message: 'Staff member removed' });
  }),
);

export default router;
