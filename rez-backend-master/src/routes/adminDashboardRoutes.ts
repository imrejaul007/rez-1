// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { CoinTransaction } from '../models/CoinTransaction';
import UserStreak from '../models/UserStreak';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    Aggregate platform stats for admin dashboard
 * @access  Admin
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalUsers, activeMerchants, dailyTransactionCount, dailyRevenueResult, weeklyActiveUsersResult] =
      await Promise.all([
        User.countDocuments({}),
        Store.countDocuments({ isActive: true }),
        CoinTransaction.countDocuments({ createdAt: { $gte: today } }),
        CoinTransaction.aggregate([
          { $match: { createdAt: { $gte: today }, type: { $in: ['earned', 'spent'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]).allowDiskUse(true),
        CoinTransaction.distinct('user', { createdAt: { $gte: weekAgo } }),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeMerchants,
        dailyTransactions: dailyTransactionCount,
        dailyRevenue: dailyRevenueResult[0]?.total || 0,
        weeklyActiveUsers: weeklyActiveUsersResult.length,
      },
    });
  }),
);

/**
 * @route   GET /api/admin/users
 * @desc    Paginated user list with optional search and status filter
 * @access  Admin
 */
router.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;
    const search = ((req.query.search as string) || '').trim();
    const status = req.query.status as string | undefined;

    const filter: Record<string, any> = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { 'profile.firstName': regex },
        { 'profile.lastName': regex },
        { email: regex },
        { phoneNumber: regex },
      ];
    }

    if (status === 'suspended') {
      filter.isSuspended = true;
    } else if (status === 'active') {
      filter.isSuspended = { $ne: true };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        // walletBalance (denormalized coin balance) and referralTier replace the
        // non-existent coinBalance/tier fields that were previously selected.
        .select(
          '_id profile.firstName profile.lastName email phoneNumber walletBalance referralTier createdAt isSuspended',
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const mapped = users.map((u: any) => ({
      _id: u._id,
      profile: {
        firstName: u.profile?.firstName || '',
        lastName: u.profile?.lastName || '',
      },
      email: u.email || '',
      phoneNumber: u.phoneNumber || '',
      coinBalance: u.walletBalance || 0, // walletBalance is the denormalized coin balance on User
      tier: u.referralTier || null, // referralTier is the correct field name
      createdAt: u.createdAt,
      // Normalise suspension state: admin app checks both isActive and isSuspended
      isSuspended: u.isSuspended || false,
      isActive: !(u.isSuspended || false),
      status: (u.isSuspended ? 'suspended' : 'active') as 'active' | 'suspended',
      role: u.role || 'user',
    }));

    res.json({
      success: true,
      data: {
        users: mapped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  }),
);

/**
 * @route   POST /api/admin/users/:id/suspend
 * @desc    Suspend a user (or toggle with boolean flag for legacy callers)
 * @access  Admin
 *
 * Accepts two calling conventions:
 *   1. Legacy: { suspend: true|false, reason? }  — used by older admin clients
 *   2. Modern: { reason? }                        — used by admin app usersService.suspendUser
 *      In the modern form, hitting this endpoint always suspends (unsuspend goes to /unsuspend).
 */
router.post(
  '/users/:id/suspend',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body as { suspend?: boolean; reason?: string };

    // Legacy callers pass `suspend` as boolean; modern callers omit it (always=suspend).
    const shouldSuspend = typeof body.suspend === 'boolean' ? body.suspend : true;
    const reason = body.reason;

    const update: Record<string, any> = {
      isSuspended: shouldSuspend,
      suspendedAt: shouldSuspend ? new Date() : null,
      suspendReason: shouldSuspend ? reason || '' : null,
    };

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, select: '_id isSuspended suspendedAt suspendReason' },
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: shouldSuspend ? 'User suspended' : 'User unsuspended',
      data: user,
    });
  }),
);

/**
 * @route   POST /api/admin/users/:id/unsuspend
 * @desc    Unsuspend a user (Sprint 10 compat layer — delegates to isSuspended=false)
 * @access  Admin
 */
router.post(
  '/users/:id/unsuspend',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isSuspended: false, suspendedAt: null, suspendReason: null } },
      { new: true, select: '_id isSuspended' },
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User unsuspended', data: user });
  }),
);

/**
 * @route   GET /api/admin/fraud-queue
 * @desc    Users flagged by coin velocity fraud detection (not yet cleared)
 * @access  Admin
 */
router.get(
  '/fraud-queue',
  asyncHandler(async (req: Request, res: Response) => {
    const status = ((req.query.status as string) || 'all').trim().toLowerCase();
    const baseFilter: Record<string, any> = {
      'fraudFlags.coinVelocity.flaggedAt': { $exists: true },
    };

    if (status === 'pending') {
      baseFilter['fraudFlags.coinVelocity.cleared'] = { $ne: true };
    } else if (status === 'cleared') {
      baseFilter['fraudFlags.coinVelocity.cleared'] = true;
    }

    const [flagged, allCount, pendingCount, clearedCount, suspendedCount] = await Promise.all([
      User.find(baseFilter)
        .sort({ 'fraudFlags.coinVelocity.flaggedAt': -1 })
        .limit(500) // cap: admin dashboard shows worst offenders first, not all users
        .select('_id profile.firstName profile.lastName email phoneNumber isSuspended fraudFlags.coinVelocity')
        .lean(),
      User.countDocuments({ 'fraudFlags.coinVelocity.flaggedAt': { $exists: true } }),
      User.countDocuments({
        'fraudFlags.coinVelocity.flaggedAt': { $exists: true },
        'fraudFlags.coinVelocity.cleared': { $ne: true },
      }),
      User.countDocuments({
        'fraudFlags.coinVelocity.flaggedAt': { $exists: true },
        'fraudFlags.coinVelocity.cleared': true,
      }),
      User.countDocuments({
        'fraudFlags.coinVelocity.flaggedAt': { $exists: true },
        isSuspended: true,
      }),
    ]);

    const data = flagged.map((u: any) => ({
      _id: String(u._id),
      name: [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') || '',
      email: u.email || '',
      phoneNumber: u.phoneNumber || '',
      earnedLast24h: u.fraudFlags?.coinVelocity?.earnedLast24h ?? 0,
      zScore: u.fraudFlags?.coinVelocity?.zScore ?? 0,
      flaggedAt: u.fraudFlags?.coinVelocity?.flaggedAt ?? null,
      clearedAt: u.fraudFlags?.coinVelocity?.clearedAt ?? null,
      reviewStatus: u.fraudFlags?.coinVelocity?.cleared ? 'cleared' : 'pending',
      isSuspended: Boolean(u.isSuspended),
      status: u.isSuspended ? 'suspended' : 'active',
      fraudFlags: {
        coinVelocity: {
          flaggedAt: u.fraudFlags?.coinVelocity?.flaggedAt ?? null,
          earnedLast24h: u.fraudFlags?.coinVelocity?.earnedLast24h ?? 0,
          zScore: u.fraudFlags?.coinVelocity?.zScore ?? 0,
          cleared: Boolean(u.fraudFlags?.coinVelocity?.cleared),
          clearedAt: u.fraudFlags?.coinVelocity?.clearedAt ?? null,
        },
      },
    }));

    res.json({
      success: true,
      data: {
        users: data,
        summary: {
          all: allCount,
          pending: pendingCount,
          cleared: clearedCount,
          suspended: suspendedCount,
        },
      },
    });
  }),
);

/**
 * @route   POST /api/admin/users/:id/clear-fraud-flag
 * @desc    Mark a user's coinVelocity fraud flag as cleared
 * @access  Admin
 */
router.post(
  '/users/:id/clear-fraud-flag',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          'fraudFlags.coinVelocity.cleared': true,
          'fraudFlags.coinVelocity.clearedAt': new Date(),
        },
      },
      { new: true, select: '_id fraudFlags.coinVelocity' },
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Fraud flag cleared', data: user });
  }),
);

/**
 * @route   POST /api/admin/users/:id/reset-streak
 * @desc    Reset a user's current streak to 0
 * @access  Admin
 */
router.post(
  '/users/:id/reset-streak',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const result = await UserStreak.updateMany(
      { user: new mongoose.Types.ObjectId(id) },
      { $set: { currentStreak: 0, updatedAt: new Date() } },
    );

    res.json({
      success: true,
      message: 'Streak reset',
      data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
    });
  }),
);

/**
 * @route   GET /api/admin/revenue
 * @desc    Daily revenue data for the last N days
 * @access  Admin
 */
router.get(
  '/revenue',
  asyncHandler(async (req: Request, res: Response) => {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string, 10) || 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyRevenue = await CoinTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          type: { $in: ['earned', 'spent'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).allowDiskUse(true);

    const data = dailyRevenue.map((d: any) => ({
      date: d._id,
      revenue: Math.round((d.revenue || 0) * 100) / 100,
      transactions: d.transactions || 0,
    }));

    res.json({ success: true, data });
  }),
);

/**
 * @route   GET /api/admin/top-merchants
 * @desc    Top merchants by monthly revenue
 * @access  Admin
 */
router.get(
  '/top-merchants',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topStores = await CoinTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          type: 'spent',
          store: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$store',
          monthlyRevenue: { $sum: '$amount' },
          visitCount: { $sum: 1 },
        },
      },
      { $sort: { monthlyRevenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'storeInfo',
        },
      },
      { $unwind: { path: '$storeInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          merchantId: '$_id',
          storeName: { $ifNull: ['$storeInfo.name', 'Unknown Store'] },
          monthlyRevenue: { $round: ['$monthlyRevenue', 2] },
          visitCount: 1,
        },
      },
    ]).allowDiskUse(true);

    res.json({ success: true, data: topStores });
  }),
);

/**
 * @route   GET /api/admin/user-tiers
 * @desc    User tier distribution counts
 * @access  Admin
 */
router.get(
  '/user-tiers',
  asyncHandler(async (req: Request, res: Response) => {
    const tierCounts = await User.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$referralTier', 'STARTER'] },
          count: { $sum: 1 },
        },
      },
    ]);

    const tierMap: Record<string, number> = {};
    tierCounts.forEach((t: any) => {
      tierMap[t._id] = t.count;
    });

    res.json({
      success: true,
      data: {
        bronze: tierMap['BRONZE'] || 0,
        silver: tierMap['SILVER'] || 0,
        gold: tierMap['GOLD'] || 0,
        platinum: (tierMap['PLATINUM'] || 0) + (tierMap['DIAMOND'] || 0),
      },
    });
  }),
);

export default router;
