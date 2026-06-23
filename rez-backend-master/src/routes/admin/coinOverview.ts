/**
 * Admin Coin Overview Route
 *
 * A-03  GET  /overview  → Aggregate coin stats by type (rez, branded, promo, prive)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import { CoinTransaction } from '../../models/CoinTransaction';
import { Wallet } from '../../models/Wallet';
import { WalletConfig } from '../../models/WalletConfig';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ── A-03: GET /overview ──
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate CoinTransaction by coin type for totals
  const [coinStats, todayStats, walletStats, config] = await Promise.all([
    // All-time stats per source category
    CoinTransaction.aggregate([
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Today's issuance/redemption
    CoinTransaction.aggregate([
      { $match: { createdAt: { $gte: startOfToday } } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Active balances from Wallet model
    Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalActiveBalance: { $sum: '$balance.total' },
          totalAvailable: { $sum: '$balance.available' },
          totalPending: { $sum: '$balance.pending' },
          walletCount: { $sum: 1 },
        },
      },
    ]),

    // WalletConfig for killSwitch / cap
    WalletConfig.findOne({ singleton: true }).lean(),
  ]);

  // Parse aggregation results
  const allTimeByType: Record<string, { total: number; count: number }> = {};
  for (const row of coinStats) {
    allTimeByType[row._id] = { total: row.totalAmount, count: row.count };
  }

  const todayByType: Record<string, { total: number; count: number }> = {};
  for (const row of todayStats) {
    todayByType[row._id] = { total: row.totalAmount, count: row.count };
  }

  const totalIssued = (allTimeByType['earned']?.total || 0) + (allTimeByType['bonus']?.total || 0);
  const totalRedeemed = allTimeByType['spent']?.total || 0;
  const issuedToday = (todayByType['earned']?.total || 0) + (todayByType['bonus']?.total || 0);
  const redeemedToday = todayByType['spent']?.total || 0;

  // Get branded + promo coin stats from wallets
  const [brandedStats, promoStats] = await Promise.all([
    Wallet.aggregate([
      { $unwind: { path: '$brandedCoins', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$brandedCoins.amount' },
          usersHolding: { $addToSet: '$user' },
        },
      },
    ]),
    Wallet.aggregate([
      { $unwind: { path: '$coins', preserveNullAndEmptyArrays: false } },
      { $match: { 'coins.type': 'promo', 'coins.isActive': true } },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$coins.amount' },
          usersHolding: { $addToSet: '$user' },
        },
      },
    ]),
  ]);

  const walletInfo = walletStats[0] || { totalActiveBalance: 0, totalAvailable: 0, totalPending: 0, walletCount: 0 };
  const branded = brandedStats[0] || { totalBalance: 0, usersHolding: [] };
  const promo = promoStats[0] || { totalBalance: 0, usersHolding: [] };

  const overview = {
    coinTypes: {
      rez: {
        totalIssued,
        totalRedeemed,
        activeBalance: walletInfo.totalActiveBalance,
        usersHolding: walletInfo.walletCount,
        redemptionRate: totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 1000) / 10 : 0,
        issuedToday,
        redeemedToday,
      },
      branded: {
        totalIssued: 0, // Would need branded-specific transaction tracking
        totalRedeemed: 0,
        activeBalance: branded.totalBalance,
        usersHolding: branded.usersHolding?.length || 0,
        redemptionRate: 0,
        issuedToday: 0,
        redeemedToday: 0,
      },
      promo: {
        totalIssued: 0,
        totalRedeemed: 0,
        activeBalance: promo.totalBalance,
        usersHolding: promo.usersHolding?.length || 0,
        redemptionRate: 0,
        issuedToday: 0,
        redeemedToday: 0,
      },
      prive: {
        totalIssued: 0,
        totalRedeemed: 0,
        activeBalance: 0,
        usersHolding: 0,
        redemptionRate: 0,
        issuedToday: 0,
        redeemedToday: 0,
      },
    },
    killSwitchActive: config?.rewardIssuanceEnabled === false,
    dailyIssuanceCap: 500000, // Default cap — could be made configurable via WalletConfig
    issuedTodayTotal: issuedToday,
  };

  return sendSuccess(res, overview, 'Coin overview stats fetched');
}));

export default router;
