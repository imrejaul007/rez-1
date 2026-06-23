/**
 * Customer Insights Controller
 *
 * Provides merchant-facing customer profile data
 */

import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import mongoose, { Types } from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * GET /api/merchant/customer-insights/:userId/profile
 * Returns a customer's loyalty profile visible to the merchant
 */
export const getCustomerProfile = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const merchantId = (req as any).merchant._id;

  if (!Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  try {
    const User = mongoose.model('User');
    const Wallet = mongoose.model('Wallet');
    const StorePayment = mongoose.model('StorePayment');

    const [user, wallet, payments] = await Promise.all([
      User.findById(userId).select('name phone avatar tierLevel createdAt').lean(),
      Wallet.findOne({ user: userId }).select('balance coins').lean(),
      StorePayment.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            merchantId: new Types.ObjectId(merchantId),
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: '$totalAmount' },
            totalCoinsEarned: { $sum: { $ifNull: ['$rewards.coinsEarned', 0] } },
            count: { $sum: 1 },
            lastVisit: { $max: '$createdAt' },
          },
        },
      ]),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const paymentStats = payments[0] || {
      totalSpend: 0,
      totalCoinsEarned: 0,
      count: 0,
      lastVisit: null,
    };

    res.json({
      success: true,
      data: {
        userId,
        name: (user as any).name || 'Guest',
        phone: (user as any).phone || '',
        avatar: (user as any).avatar || null,
        tierLevel: (user as any).tierLevel || 'standard',
        memberSince: (user as any).createdAt,
        walletBalance: (wallet as any)?.balance || 0,
        walletCoins: (wallet as any)?.coins || 0,
        atThisStore: {
          totalVisits: paymentStats.count,
          totalSpend: paymentStats.totalSpend || 0,
          totalOrders: paymentStats.count,
          totalCoinsEarned: paymentStats.totalCoinsEarned || 0,
          lastVisitDate: paymentStats.lastVisit,
          isFirstVisit: paymentStats.count === 0,
        },
      },
    });
  } catch (err: any) {
    logger.error('Error fetching customer profile:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
