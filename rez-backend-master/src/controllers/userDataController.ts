// ─── userDataController ────────────────────────────────────────────────────────
// GDPR data export and user statistics — extracted from authController.ts
// to keep that file focused on auth flows only.

import { Request, Response } from 'express';
import { sendSuccess, sendUnauthorized } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { Wallet } from '../models/Wallet';

// GDPR data export — returns all user data as JSON
export const exportUserData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const userId = req.user._id;

  const { Order } = await import('../models/Order');
  const { Review } = await import('../models/Review');
  const { CoinTransaction } = await import('../models/CoinTransaction');
  const { Subscription } = await import('../models/Subscription');
  const { Wishlist } = await import('../models/Wishlist');
  const { Favorite } = await import('../models/Favorite');

  const [orders, reviews, transactions, subscriptions, wishlists, favorites, wallet] = await Promise.all([
    Order.find({ user: userId }).select('-__v').lean(),
    Review.find({ user: userId }).select('-__v').lean(),
    CoinTransaction.find({ userId }).select('-__v').lean(),
    Subscription.find({ userId }).select('-__v').lean(),
    Wishlist.find({ user: userId }).select('-__v').lean(),
    Favorite.find({ user: userId }).select('-__v').lean(),
    Wallet.findOne({ userId }).select('-__v').lean(),
  ]);

  const userData = {
    profile: {
      phoneNumber: req.user.phoneNumber,
      email: req.user.email,
      profile: req.user.profile,
      createdAt: req.user.createdAt,
    },
    wallet,
    orders,
    reviews,
    transactions,
    subscriptions,
    wishlists,
    favorites,
    exportedAt: new Date().toISOString(),
  };

  sendSuccess(res, userData, 'User data exported successfully');
});

// Aggregated statistics across user's wallet, orders, videos, projects, vouchers, achievements
export const getUserStatistics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const userId = req.user._id;

  const { Order } = await import('../models/Order');
  const { Video } = await import('../models/Video');
  const { Project } = await import('../models/Project');
  const OfferRedemption = (await import('../models/OfferRedemption')).default;
  const { UserVoucher } = await import('../models/Voucher');
  const { Review } = await import('../models/Review');
  const { UserAchievement } = await import('../models/Achievement');

  // DM-L4: Fetch real wallet data from Wallet collection (not the removed User.wallet sub-doc).
  const walletDoc = await Wallet.findOne({ user: userId }).select('balance statistics').lean();

  const [orderStats, videoStats, projectStats, offerStats, voucherStats, reviewStats, achievementStats] =
    await Promise.all([
      Order.aggregate([
        { $match: { user: userId, status: { $ne: 'pending_payment' } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalPrice' },
            completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]),
      Video.aggregate([
        { $match: { creator: userId } },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalViews: { $sum: '$engagement.views' },
            totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
            totalShares: { $sum: '$engagement.shares' },
          },
        },
      ]),
      Project.aggregate([
        { $match: { 'submissions.user': userId } },
        { $unwind: '$submissions' },
        { $match: { 'submissions.user': userId } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            approvedSubmissions: { $sum: { $cond: [{ $eq: ['$submissions.status', 'approved'] }, 1, 0] } },
            rejectedSubmissions: { $sum: { $cond: [{ $eq: ['$submissions.status', 'rejected'] }, 1, 0] } },
            totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } },
          },
        },
      ]),
      OfferRedemption.countDocuments({ user: userId }),
      UserVoucher.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalVouchers: { $sum: 1 },
            usedVouchers: { $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] } },
            activeVouchers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          },
        },
      ]),
      Review.countDocuments({ user: userId, isActive: true }),
      UserAchievement.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unlocked: { $sum: { $cond: [{ $eq: ['$unlocked', true] }, 1, 0] } },
          },
        },
      ]),
    ]);

  const statistics = {
    user: {
      joinedDate: req.user.createdAt,
      isVerified: req.user.auth.isVerified,
      totalReferrals: req.user.referral.totalReferrals,
      referralEarnings: req.user.referral.referralEarnings,
    },
    wallet: {
      // DM-L4: Read from real Wallet collection, not the removed User.wallet sub-doc.
      balance: walletDoc?.balance?.available ?? 0,
      totalEarned: walletDoc?.statistics?.totalEarned ?? 0,
      totalSpent: walletDoc?.statistics?.totalSpent ?? 0,
      pendingAmount: walletDoc?.balance?.pending ?? 0,
    },
    orders: {
      total: orderStats[0]?.totalOrders || 0,
      completed: orderStats[0]?.completedOrders || 0,
      cancelled: orderStats[0]?.cancelledOrders || 0,
      totalSpent: orderStats[0]?.totalSpent || 0,
    },
    videos: {
      totalCreated: videoStats[0]?.totalVideos || 0,
      totalViews: videoStats[0]?.totalViews || 0,
      totalLikes: videoStats[0]?.totalLikes || 0,
      totalShares: videoStats[0]?.totalShares || 0,
    },
    projects: {
      totalParticipated: projectStats[0]?.totalProjects || 0,
      approved: projectStats[0]?.approvedSubmissions || 0,
      rejected: projectStats[0]?.rejectedSubmissions || 0,
      totalEarned: projectStats[0]?.totalEarned || 0,
    },
    offers: { totalRedeemed: offerStats || 0 },
    vouchers: {
      total: voucherStats[0]?.totalVouchers || 0,
      used: voucherStats[0]?.usedVouchers || 0,
      active: voucherStats[0]?.activeVouchers || 0,
    },
    reviews: { total: reviewStats || 0 },
    achievements: {
      total: achievementStats[0]?.total || 0,
      unlocked: achievementStats[0]?.unlocked || 0,
    },
    summary: {
      totalActivity:
        (orderStats[0]?.totalOrders || 0) +
        (videoStats[0]?.totalVideos || 0) +
        (projectStats[0]?.totalProjects || 0) +
        (offerStats || 0) +
        (voucherStats[0]?.totalVouchers || 0) +
        (reviewStats || 0),
      totalEarnings:
        (walletDoc?.statistics?.totalEarned || 0) +
        (projectStats[0]?.totalEarned || 0) +
        (req.user.referral.referralEarnings || 0),
      totalSpendings: (orderStats[0]?.totalSpent || 0) + (walletDoc?.statistics?.totalSpent || 0),
    },
  };

  sendSuccess(res, statistics, 'User statistics retrieved successfully');
});
