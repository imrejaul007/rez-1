import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { merchantWalletService } from '../services/merchantWalletService';
import mongoose from 'mongoose';
import { getCachedWalletConfig } from '../services/walletCacheService';
import { CURRENCY_RULES } from '../config/currencyRules';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// Maximum coins a merchant can award per transaction
const MAX_COINS_PER_AWARD = 1000;

/**
 * @route   POST /api/merchant/coins/award
 * @desc    Award branded coins to a customer
 * @access  Merchant
 */
router.post('/award', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const { userId, storeId, amount, reason } = req.body;

    // Validate required fields
    if (!userId || !storeId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'userId, storeId, and amount are required'
      });
    }

    // Validate amount
    const coinAmount = parseInt(amount);
    if (isNaN(coinAmount) || coinAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    if (coinAmount > MAX_COINS_PER_AWARD) {
      return res.status(400).json({
        success: false,
        message: `Maximum coins per award is ${MAX_COINS_PER_AWARD}`
      });
    }

    // Verify store belongs to merchant
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    if (store.merchantId?.toString() !== merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Store does not belong to this merchant'
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get or create user's wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create wallet for user'
      });
    }

    // Deduct coins from merchant's wallet first (1 coin = ₹1)
    let walletDebitResult;
    try {
      walletDebitResult = await merchantWalletService.debitForCoinAward(
        merchantId,
        storeId,
        coinAmount,
        userId,
        reason || `Branded coins awarded to customer for ${store.name}`
      );
    } catch (debitError: any) {
      return res.status(400).json({
        success: false,
        message: debitError.message || 'Failed to debit merchant wallet'
      });
    }

    // Add branded coins to user's wallet
    await wallet.addBrandedCoins(
      new mongoose.Types.ObjectId(storeId),
      store.name,
      coinAmount,
      store.logo,
      '#6366F1'  // Default brand color for merchant coins
    );

    // Calculate expiry for branded coins from admin config
    let brandedExpiresAt: Date | undefined;
    try {
      const walletConfig = await getCachedWalletConfig();
      const expiryDays = walletConfig?.coinExpiryConfig?.branded?.expiryDays ?? CURRENCY_RULES.branded.expiryDays;
      if (expiryDays > 0) {
        brandedExpiresAt = new Date();
        brandedExpiresAt.setDate(brandedExpiresAt.getDate() + expiryDays);
      }
    } catch {
      // Fallback to default
      const expiryDays = CURRENCY_RULES.branded.expiryDays;
      if (expiryDays > 0) {
        brandedExpiresAt = new Date();
        brandedExpiresAt.setDate(brandedExpiresAt.getDate() + expiryDays);
      }
    }

    // Create a coin transaction record for tracking (type 'branded_award' does NOT
    // affect the running ReZ balance — branded coins are tracked in wallet.brandedCoins)
    await CoinTransaction.createTransaction(
      userId,
      'branded_award',
      coinAmount,
      'merchant_award',
      reason || `Bonus coins from ${store.name}`,
      {
        merchantId,
        storeId,
        storeName: store.name,
        coinType: 'branded',
        awardedBy: merchantId,
        ...(brandedExpiresAt && { expiresAt: brandedExpiresAt }),
      }
    );

    // Track merchant liability (fire-and-forget)
    import('../services/liabilityService').then(({ liabilityService }) => {
      liabilityService.recordIssuance({
        merchantId,
        storeId,
        campaignType: 'branded_coin_award',
        amount: coinAmount,
        referenceId: `merchant-coin-award:${merchantId}:${userId}:${Date.now()}`,
        referenceModel: 'CoinTransaction',
      }).catch((err: any) => logger.error('Liability tracking failed for coin award', err));
    });

    logger.info(`🎁 [MERCHANT COINS] ${store.name} awarded ${coinAmount} branded coins to user ${userId}`);

    return res.json({
      success: true,
      message: `Successfully awarded ${coinAmount} ${store.name} coins to customer`,
      data: {
        userId,
        amount: coinAmount,
        storeName: store.name,
        reason: reason || 'Bonus coins',
        newBrandedBalance: wallet.brandedCoins.find(
          (c: any) => c.merchantId.toString() === storeId
        )?.amount || coinAmount,
        merchantWalletBalance: walletDebitResult.newBalance
      }
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT COINS] Error awarding coins:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to award coins'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/history
 * @desc    Get coin award history for merchant
 * @access  Merchant
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const storeId = req.query.storeId as string;

    // Build query
    const query: any = {
      source: 'merchant_award',
      'metadata.merchantId': merchantId
    };

    if (storeId) {
      query['metadata.storeId'] = storeId;
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      CoinTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'profile.firstName profile.lastName phoneNumber')
        .lean(),
      CoinTransaction.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          user: t.user,
          amount: t.amount,
          reason: t.description,
          storeName: (t.metadata as any)?.storeName,
          storeId: (t.metadata as any)?.storeId,
          createdAt: t.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT COINS] Error fetching history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin award history'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/stats
 * @desc    Get coin award statistics for merchant
 * @access  Merchant
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const storeId = req.query.storeId as string;

    // Build match query
    const matchQuery: any = {
      source: 'merchant_award',
      'metadata.merchantId': merchantId
    };

    if (storeId) {
      matchQuery['metadata.storeId'] = storeId;
    }

    // Get statistics
    const stats = await CoinTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCoinsAwarded: { $sum: '$amount' },
          totalAwards: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$user' },
          avgCoinsPerAward: { $avg: '$amount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalCoinsAwarded: 1,
          totalAwards: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          avgCoinsPerAward: { $round: ['$avgCoinsPerAward', 0] }
        }
      }
    ]);

    // Get monthly breakdown
    const monthlyStats = await CoinTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          coinsAwarded: { $sum: '$amount' },
          awardCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await CoinTransaction.aggregate([
      {
        $match: {
          ...matchQuery,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          coinsAwarded: { $sum: '$amount' },
          awardCount: { $sum: 1 }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalCoinsAwarded: 0,
          totalAwards: 0,
          uniqueCustomers: 0,
          avgCoinsPerAward: 0
        },
        today: todayStats[0] || {
          coinsAwarded: 0,
          awardCount: 0
        },
        monthlyBreakdown: monthlyStats.map(m => ({
          year: m._id.year,
          month: m._id.month,
          coinsAwarded: m.coinsAwarded,
          awardCount: m.awardCount
        })),
        limits: {
          maxCoinsPerAward: MAX_COINS_PER_AWARD
        }
      }
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT COINS] Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin statistics'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/search-customer
 * @desc    Search for a customer by name, phone, or email
 * @access  Merchant
 */
router.get('/search-customer', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const { q, phone, email } = req.query;
    const searchTerm = (q as string || '').trim();

    // Support both new unified `q` param and legacy phone/email params
    if (!searchTerm && !phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let query: any = { isActive: true };

    if (searchTerm) {
      // Detect if the input looks like a phone number, email, or name
      const isPhone = /^\d+$/.test(searchTerm.replace(/[\s+\-]/g, ''));
      const isEmail = searchTerm.includes('@');

      if (isPhone) {
        const cleanPhone = searchTerm.replace(/\s+/g, '').replace(/^\+91/, '');
        query.phoneNumber = { $regex: cleanPhone, $options: 'i' };
      } else if (isEmail) {
        query.email = { $regex: searchTerm, $options: 'i' };
      } else {
        // Name search - match against firstName or lastName
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { 'profile.firstName': { $regex: escaped, $options: 'i' } },
          { 'profile.lastName': { $regex: escaped, $options: 'i' } }
        ];
      }
    } else {
      // Legacy params
      if (phone) {
        const cleanPhone = (phone as string).replace(/\s+/g, '').replace(/^\+91/, '');
        query.phoneNumber = { $regex: cleanPhone, $options: 'i' };
      }
      if (email) {
        query.email = { $regex: email as string, $options: 'i' };
      }
    }

    const users = await User.find(query)
      .select('_id profile.firstName profile.lastName phoneNumber email avatar')
      .limit(10)
      .lean();

    return res.json({
      success: true,
      data: users.map((u: any) => ({
        id: u._id,
        name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || 'Unknown',
        phoneNumber: u.phoneNumber,
        email: u.email,
        avatar: u.avatar
      }))
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT COINS] Error searching customer:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search customers'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/recent-customers
 * @desc    Get customers who have purchased from this merchant's store
 * @access  Merchant
 */
router.get('/recent-customers', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    // Find ALL stores owned by this merchant
    const merchantObjId = new mongoose.Types.ObjectId(merchantId);
    const merchantStores = await Store.find({ merchantId: merchantObjId }).select('_id').lean();

    if (merchantStores.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const storeIds = merchantStores.map(s => s._id as mongoose.Types.ObjectId);

    // Aggregate unique customers from orders across all merchant stores
    const recentCustomers = await Order.aggregate([
      {
        $match: {
          'items.store': { $in: storeIds },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totals.total' },
          lastOrderAt: { $max: '$createdAt' }
        }
      },
      { $sort: { lastOrderAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$userInfo.profile.firstName', ''] },
                  ' ',
                  { $ifNull: ['$userInfo.profile.lastName', ''] }
                ]
              }
            }
          },
          phoneNumber: '$userInfo.phoneNumber',
          email: '$userInfo.email',
          avatar: '$userInfo.avatar',
          orderCount: 1,
          totalSpent: { $round: ['$totalSpent', 0] },
          lastOrderAt: 1
        }
      }
    ]);

    // Fix empty names
    const data = recentCustomers.map(c => ({
      ...c,
      name: c.name?.trim() || 'Unknown'
    }));

    return res.json({ success: true, data });
  } catch (error: any) {
    logger.error('❌ [MERCHANT COINS] Error fetching recent customers:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch recent customers'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/wallet-balance
 * @desc    Get merchant's current wallet balance for the coins page
 * @access  Merchant
 */
router.get('/wallet-balance', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const wallet = await merchantWalletService.getOrCreateWallet(merchantId);

    return res.json({
      success: true,
      data: {
        available: wallet.balance.available,
        total: wallet.balance.total
      }
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT COINS] Error fetching wallet balance:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet balance'
    });
  }
});

export default router;
