import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';
import { Order } from '../../models/Order';
import { CoinTransaction } from '../../models/CoinTransaction';
import { MerchantWallet } from '../../models/MerchantWallet';
import redisService from '../../services/redisService';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const SUMMARY_CACHE_PREFIX = 'admin:finance:summary';
const SUMMARY_CACHE_TTL = 60; // 60 seconds

/**
 * @route   GET /api/admin/finance/summary
 * @desc    Financial KPIs - GMV, Commission, Coin Cost, Net Revenue
 * @access  Admin
 */
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const { period = '30' } = req.query;
  const days = parseInt(period as string) || 30;
  const cacheKey = `${SUMMARY_CACHE_PREFIX}:${days}`;

  // Check Redis cache
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Finance summary fetched (cached)');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Run aggregations in parallel
  const [orderStats, coinStats] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
      { $group: { _id: null, totalGMV: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
    ]),
    CoinTransaction.aggregate([
      { $match: { type: 'earned', createdAt: { $gte: startDate } } },
      { $group: { _id: null, totalIssued: { $sum: '$amount' } } },
    ]),
  ]);

  const gmv = orderStats[0]?.totalGMV || 0;
  const commissionRate = 0.15; // 15% platform fee
  const commission = gmv * commissionRate;
  const coinsIssued = coinStats[0]?.totalIssued || 0;
  const coinCost = coinsIssued * 0.01; // 0.01 per coin
  const netRevenue = commission - coinCost;

  const data = {
    gmv,
    commission,
    commissionRate,
    coinCost,
    netRevenue,
    orderCount: orderStats[0]?.orderCount || 0,
    coinsIssued,
    period: days,
  };

  await redisService.set(cacheKey, data, SUMMARY_CACHE_TTL);
  sendSuccess(res, data, 'Finance summary fetched');
}));

/**
 * @route   GET /api/admin/finance/settlements
 * @desc    Settlement history — merchant wallets with pending/settled amounts
 * @access  Admin
 */
router.get('/settlements', asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const query: Record<string, any> = {};
  if (status === 'pending') {
    query['balance.pending'] = { $gt: 0 };
  } else if (status === 'settled') {
    query['balance.pending'] = 0;
  }

  const [wallets, total] = await Promise.all([
    MerchantWallet.find(query)
      .populate('merchant', 'fullName phoneNumber')
      .populate('store', 'name')
      .sort({ 'balance.pending': -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    MerchantWallet.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendSuccess(res, {
    settlements: wallets,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  }, 'Settlements fetched');
}));

/**
 * @route   POST /api/admin/finance/settlements/:merchantWalletId/process
 * @desc    Process settlement for a merchant — moves pending to withdrawn
 * @access  Senior Admin
 */
router.post('/settlements/:merchantWalletId/process', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { merchantWalletId } = req.params;

  const wallet = await MerchantWallet.findById(merchantWalletId);
  if (!wallet) {
    return sendError(res, 'Merchant wallet not found', 404);
  }

  const pendingAmount = wallet.balance?.pending || 0;
  if (pendingAmount <= 0) {
    return sendError(res, 'No pending balance to settle', 400);
  }

  // Move pending to available (settlement means funds are released)
  wallet.balance.pending = 0;
  wallet.balance.available = (wallet.balance.available || 0) + pendingAmount;
  wallet.lastSettlementAt = new Date();
  await wallet.save();

  logger.info('[Finance] Settlement processed', {
    walletId: merchantWalletId,
    merchantId: wallet.merchant,
    amount: pendingAmount,
    adminId: (req as any).userId,
  });

  sendSuccess(res, {
    walletId: merchantWalletId,
    settledAmount: pendingAmount,
  }, 'Settlement processed successfully');
}));

export default router;
