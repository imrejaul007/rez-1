/**
 * Integration Test Routes
 * These endpoints help verify the complete demo flow features
 * Only available in development/test environments
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Order } from '../models/Order';
import { MerchantWallet } from '../models/MerchantWallet';
import { CoinTransaction } from '../models/CoinTransaction';
import Share from '../models/Share';
import { PendingCoinReward } from '../models/PendingCoinReward';
import { Wallet } from '../models/Wallet';
import coinService from '../services/coinService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Only enable in development/test
if (process.env.NODE_ENV === 'production') {
  router.use((_req: Request, res: Response) => {
    return res.status(404).json({ success: false, message: 'Not available in production' });
  });
}

// Require authentication even in dev/staging to prevent data leaks
router.use(authenticate as any);

/**
 * @route   GET /api/test/verify-order-fee/:orderId
 * @desc    Verify 15% platform fee calculation on an order
 * @access  Dev/Test only
 */
router.get('/verify-order-fee/:orderId', asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const subtotal = order.totals.subtotal || 0;
    const platformFee = order.totals.platformFee || 0;
    const merchantPayout = order.totals.merchantPayout || 0;
    const expectedFee = Math.round(subtotal * 0.15 * 100) / 100;
    const expectedPayout = subtotal - expectedFee;

    const verification = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      subtotal,
      platformFee,
      merchantPayout,
      expectedFee,
      expectedPayout,
      feePercentage: subtotal > 0 ? ((platformFee / subtotal) * 100).toFixed(2) + '%' : '0%',
      feeCorrect: Math.abs(platformFee - expectedFee) < 0.01,
      payoutCorrect: Math.abs(merchantPayout - expectedPayout) < 0.01
    };

    return res.json({
      success: true,
      message: verification.feeCorrect && verification.payoutCorrect
        ? '✅ 15% fee calculation is correct'
        : '❌ Fee calculation mismatch',
      data: verification
    });
}));

/**
 * @route   GET /api/test/verify-merchant-wallet/:merchantId
 * @desc    Verify merchant wallet was credited after payment
 * @access  Dev/Test only
 */
router.get('/verify-merchant-wallet/:merchantId', asyncHandler(async (req: Request, res: Response) => {
    const wallet = await MerchantWallet.findOne({ merchant: req.params.merchantId });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Merchant wallet not found' });
    }

    const recentTransactions = wallet.transactions
      .filter(t => t.type === 'credit')
      .slice(-5)
      .map(t => ({
        orderId: t.orderId,
        orderNumber: t.orderNumber,
        amount: t.amount,
        platformFee: t.platformFee,
        netAmount: t.netAmount,
        createdAt: t.createdAt
      }));

    return res.json({
      success: true,
      message: '✅ Merchant wallet found',
      data: {
        merchantId: wallet.merchant,
        storeId: wallet.store,
        balance: wallet.balance,
        statistics: wallet.statistics,
        recentCredits: recentTransactions
      }
    });
}));

/**
 * @route   GET /api/test/verify-purchase-coins/:userId
 * @desc    Verify 5% purchase reward coins were awarded
 * @access  Dev/Test only
 */
router.get('/verify-purchase-coins/:userId', asyncHandler(async (req: Request, res: Response) => {
    // Get purchase reward transactions
    const purchaseRewards = await CoinTransaction.find({
      user: req.params.userId,
      source: 'purchase_reward'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get user's current balance
    const balance = await coinService.getCoinBalance(req.params.userId);

    // Get wallet
    const wallet = await Wallet.findOne({ user: req.params.userId });

    return res.json({
      success: true,
      message: purchaseRewards.length > 0
        ? '✅ Purchase reward coins found'
        : '❌ No purchase reward coins found',
      data: {
        userId: req.params.userId,
        currentBalance: balance,
        walletBalance: wallet?.balance || null,
        purchaseRewards: purchaseRewards.map(r => ({
          amount: r.amount,
          description: r.description,
          orderId: (r.metadata as any)?.orderId,
          createdAt: r.createdAt
        }))
      }
    });
}));

/**
 * @route   GET /api/test/verify-share-coins/:userId
 * @desc    Verify 5% social share coins were awarded
 * @access  Dev/Test only
 */
router.get('/verify-share-coins/:userId', asyncHandler(async (req: Request, res: Response) => {
    // Get purchase shares
    const purchaseShares = await Share.find({
      user: req.params.userId,
      contentType: 'purchase'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get social share reward transactions
    const shareRewards = await CoinTransaction.find({
      user: req.params.userId,
      source: 'social_share_reward'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      message: purchaseShares.length > 0
        ? '✅ Purchase shares found'
        : '❌ No purchase shares found',
      data: {
        userId: req.params.userId,
        purchaseShares: purchaseShares.map(s => ({
          orderId: s.orderId,
          orderTotal: s.orderTotal,
          coinsEarned: s.coinsEarned,
          platform: s.platform,
          status: s.status,
          createdAt: s.createdAt
        })),
        shareRewards: shareRewards.map(r => ({
          amount: r.amount,
          description: r.description,
          createdAt: r.createdAt
        }))
      }
    });
}));

/**
 * @route   GET /api/test/verify-pending-rewards
 * @desc    Get all pending coin rewards awaiting admin approval
 * @access  Dev/Test only
 */
router.get('/verify-pending-rewards', asyncHandler(async (_req: Request, res: Response) => {
    const pendingRewards = await PendingCoinReward.find({ status: 'pending' })
      .populate('user', 'profile.firstName profile.lastName phoneNumber')
      .sort({ submittedAt: -1 })
      .limit(20)
      .lean();

    const stats = await PendingCoinReward.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    return res.json({
      success: true,
      message: `Found ${pendingRewards.length} pending rewards`,
      data: {
        pending: pendingRewards,
        stats: stats.reduce((acc, s) => {
          acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
          return acc;
        }, {} as any)
      }
    });
}));

/**
 * @route   GET /api/test/full-flow-check/:orderId
 * @desc    Complete verification of all demo flow features for an order
 * @access  Dev/Test only
 */
router.get('/full-flow-check/:orderId', asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'profile.firstName profile.lastName')
      .populate('items.store', 'name owner');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderId = (order._id as any).toString();
    const userId = (order.user as any)._id?.toString() || order.user.toString();
    const storeItem = order.items[0];
    const merchantId = storeItem?.store ? (storeItem.store as any).owner?.toString() || (storeItem.store as any).merchantId?.toString() : null;

    // 1. Check 15% fee
    const feeCheck = {
      subtotal: order.totals.subtotal,
      platformFee: order.totals.platformFee,
      merchantPayout: order.totals.merchantPayout,
      feePercentage: order.totals.subtotal > 0
        ? ((order.totals.platformFee / order.totals.subtotal) * 100).toFixed(2) + '%'
        : 'N/A',
      passed: order.totals.platformFee > 0
    };

    // 2. Check merchant wallet
    let walletCheck: any = { passed: false, message: 'Merchant not found' };
    if (merchantId) {
      const wallet = await MerchantWallet.findOne({ merchant: merchantId });
      if (wallet) {
        const orderTransaction = wallet.transactions.find(
          t => t.orderId?.toString() === orderId
        );
        walletCheck = {
          passed: !!orderTransaction,
          balance: wallet.balance,
          orderTransaction: orderTransaction || null
        };
      }
    }

    // 3. Check purchase reward coins
    const purchaseReward = await CoinTransaction.findOne({
      user: userId,
      source: 'purchase_reward',
      'metadata.orderId': orderId
    });
    const coinsCheck = {
      passed: !!purchaseReward,
      expectedCoins: Math.floor(order.totals.total * 0.05),
      actualCoins: purchaseReward?.amount || 0
    };

    // 4. Check if order was shared
    const share = await Share.findOne({
      user: userId,
      contentType: 'purchase',
      orderId: orderId
    });
    const shareCheck = {
      passed: !!share,
      coinsEarned: share?.coinsEarned || 0,
      platform: share?.platform || null
    };

    const allPassed = feeCheck.passed && walletCheck.passed && coinsCheck.passed;

    return res.json({
      success: true,
      message: allPassed
        ? '✅ All demo flow features verified!'
        : '⚠️ Some features need attention',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        checks: {
          '15% Fee': feeCheck,
          'Merchant Wallet': walletCheck,
          '5% Purchase Coins': coinsCheck,
          'Social Share': shareCheck
        },
        summary: {
          feeDeducted: feeCheck.passed,
          merchantCredited: walletCheck.passed,
          purchaseCoinsAwarded: coinsCheck.passed,
          orderShared: shareCheck.passed
        }
      }
    });
}));

export default router;
