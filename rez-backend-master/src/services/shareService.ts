import { logger } from '../config/logger';
import Share, { IShare } from '../models/Share';
import { v4 as uuidv4 } from 'uuid';
import type { Lean } from '../types/lean';

// Reward configuration
const SHARE_REWARDS = {
  product: { baseCoins: 5, clickBonus: 1, conversionBonus: 20 },
  store: { baseCoins: 10, clickBonus: 2, conversionBonus: 50 },
  offer: { baseCoins: 5, clickBonus: 1, conversionBonus: 30 },
  referral: { baseCoins: 20, clickBonus: 5, conversionBonus: 100 },
  video: { baseCoins: 3, clickBonus: 1, conversionBonus: 10 },
  article: { baseCoins: 3, clickBonus: 1, conversionBonus: 10 },
  purchase: { baseCoins: 0, clickBonus: 0, conversionBonus: 0, sharePercentage: 0.05 } // 5% of order total
};

// Daily share limits
const DAILY_SHARE_LIMITS = {
  product: 10,
  store: 5,
  offer: 10,
  referral: 20,
  video: 10,
  article: 10,
  purchase: 5  // Max 5 purchase shares per day
};

class ShareService {
  // Get shareable content — fetches real stores, offers, and products from DB
  async getShareableContent(userId: string): Promise<any> {
    const mongoose = require('mongoose');
    const Store = mongoose.model('Store');
    const Product = mongoose.model('Product');

    // Fetch real data in parallel
    const [stores, products] = await Promise.all([
      // Popular active stores
      Store.find({ isActive: true })
        .sort({ 'analytics.viewsCount': -1 })
        .limit(5)
        .select('name logo slug tags')
        .lean(),
      // Trending active products
      Product.find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('name images price')
        .lean(),
    ]);

    // Also try to fetch active offers if Offer model exists
    let offers: any[] = [];
    try {
      const Offer = mongoose.model('Offer');
      offers = await Offer.find({ isActive: true, expiresAt: { $gte: new Date() } })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('title description image discountPercentage store')
        .populate('store', 'name')
        .lean();
    } catch {
      // Offer model may not exist or field names may differ — skip silently
    }

    // Get user referral code
    let referralCode = `REZ${userId.substring(0, 6).toUpperCase()}`;
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('referralCode').lean();
      if (user?.referralCode) {
        referralCode = user.referralCode;
      }
    } catch {
      // Use fallback
    }

    return {
      stores: stores.map((s: any) => ({
        id: s._id.toString(),
        type: 'store',
        name: s.name,
        image: s.logo || null,
        reward: SHARE_REWARDS.store,
      })),
      products: products.map((p: any) => ({
        id: p._id.toString(),
        type: 'product',
        name: p.name,
        image: p.images?.[0] || null,
        price: p.price,
        reward: SHARE_REWARDS.product,
      })),
      offers: offers.map((o: any) => ({
        id: o._id.toString(),
        type: 'offer',
        title: o.title,
        description: o.description,
        image: o.image || null,
        discount: o.discountPercentage,
        storeName: o.store?.name,
        reward: SHARE_REWARDS.offer,
      })),
      referral: {
        code: referralCode,
        reward: SHARE_REWARDS.referral,
        message: 'Join ReZ and get 100 coins free!',
      },
    };
  }

  // Create share tracking
  async createShare(
    userId: string,
    contentType: 'product' | 'store' | 'offer' | 'referral' | 'video' | 'article',
    contentId: string,
    platform: 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'copy_link' | 'other'
  ): Promise<IShare> {
    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sharesToday = await Share.countDocuments({
      user: userId,
      contentType,
      createdAt: { $gte: today }
    });

    const limit = DAILY_SHARE_LIMITS[contentType];
    if (sharesToday >= limit) {
      throw new Error(`Daily share limit (${limit}) reached for ${contentType}`);
    }

    // Generate tracking code
    const trackingCode = `SH${uuidv4().substring(0, 8).toUpperCase()}`;

    // Generate share URL
    const baseUrl = process.env.FRONTEND_URL || 'https://rez.app';
    const shareUrl = `${baseUrl}/s/${trackingCode}`;

    // Set expiry (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const share = await Share.create({
      user: userId,
      contentType,
      contentId,
      platform,
      shareUrl,
      trackingCode,
      expiresAt
    });

    return share;
  }

  // Track share click
  async trackClick(trackingCode: string): Promise<{ success: boolean; redirectUrl: string }> {
    const share = await Share.findOne({ trackingCode });

    if (!share) {
      return { success: false, redirectUrl: '/' };
    }

    if (share.status === 'expired' || new Date() > share.expiresAt) {
      share.status = 'expired';
      await share.save();
      return { success: false, redirectUrl: '/' };
    }

    // Increment clicks
    share.clicks += 1;

    // Award click bonus (max 10 clicks per share)
    if (share.clicks <= 10) {
      const reward = SHARE_REWARDS[share.contentType];
      share.coinsEarned += reward.clickBonus;
    }

    // Mark as verified after first click
    if (share.status === 'pending') {
      share.status = 'verified';
      share.verifiedAt = new Date();
    }

    await share.save();

    // Generate redirect URL based on content type
    const baseUrl = process.env.FRONTEND_URL || 'https://rez.app';
    let redirectUrl = baseUrl;

    switch (share.contentType) {
      case 'product':
        redirectUrl = `${baseUrl}/product/${share.contentId}`;
        break;
      case 'store':
        redirectUrl = `${baseUrl}/store/${share.contentId}`;
        break;
      case 'offer':
        redirectUrl = `${baseUrl}/offer/${share.contentId}`;
        break;
      case 'referral':
        redirectUrl = `${baseUrl}/signup?ref=${share.contentId}`;
        break;
      case 'video':
        redirectUrl = `${baseUrl}/video/${share.contentId}`;
        break;
      case 'article':
        redirectUrl = `${baseUrl}/article/${share.contentId}`;
        break;
    }

    return { success: true, redirectUrl };
  }

  // Track conversion (purchase/signup from share)
  async trackConversion(trackingCode: string): Promise<void> {
    const share = await Share.findOne({ trackingCode }).lean();

    if (!share || share.status === 'expired') {
      return;
    }

    share.conversions += 1;

    // Award conversion bonus
    const reward = SHARE_REWARDS[share.contentType];
    share.coinsEarned += reward.conversionBonus;
    share.status = 'rewarded';
    share.rewardedAt = new Date();

    await share.save();
  }

  // Get user's share history
  async getShareHistory(
    userId: string,
    contentType?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ shares: Lean<IShare>[]; total: number }> {
    const query: any = { user: userId };

    if (contentType) {
      query.contentType = contentType;
    }

    const [shares, total] = await Promise.all([
      Share.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      Share.countDocuments(query)
    ]);

    return { shares, total };
  }

  // Get share statistics
  async getShareStats(userId: string): Promise<any> {
    const stats = await Share.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$contentType',
          totalShares: { $sum: 1 },
          totalClicks: { $sum: '$clicks' },
          totalConversions: { $sum: '$conversions' },
          totalCoins: { $sum: '$coinsEarned' }
        }
      }
    ]);

    const summary = {
      totalShares: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalCoinsEarned: 0,
      byType: {} as any
    };

    stats.forEach(stat => {
      summary.totalShares += stat.totalShares;
      summary.totalClicks += stat.totalClicks;
      summary.totalConversions += stat.totalConversions;
      summary.totalCoinsEarned += stat.totalCoins;
      summary.byType[stat._id] = {
        shares: stat.totalShares,
        clicks: stat.totalClicks,
        conversions: stat.totalConversions,
        coins: stat.totalCoins
      };
    });

    return summary;
  }

  // Get remaining shares for today
  async getDailySharesRemaining(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contentTypes = Object.keys(DAILY_SHARE_LIMITS);

    const counts = await Promise.all(
      contentTypes.map(async contentType => ({
        contentType,
        used: await Share.countDocuments({
          user: userId,
          contentType,
          createdAt: { $gte: today }
        }),
        limit: DAILY_SHARE_LIMITS[contentType as keyof typeof DAILY_SHARE_LIMITS]
      }))
    );

    return counts.reduce((acc, item) => {
      acc[item.contentType] = {
        used: item.used,
        limit: item.limit,
        remaining: Math.max(0, item.limit - item.used)
      };
      return acc;
    }, {} as any);
  }

  /**
   * Share a purchase and earn 5% coins
   * User earns 5% of order total as coins when sharing their purchase on social media
   */
  async sharePurchase(
    userId: string,
    orderId: string,
    platform: 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'copy_link' | 'other'
  ): Promise<{ share: IShare; coinsEarned: number }> {
    // Import Order to validate
    const { Order } = require('../models/Order');
    const { Types } = require('mongoose');

    // Validate order exists and belongs to user
    const order = await Order.findById(orderId).lean();
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.user.toString() !== userId) {
      throw new Error('Order does not belong to this user');
    }

    // Require delivered status before sharing
    if (order.status !== 'delivered') {
      throw new Error('Order must be delivered before sharing');
    }

    // Use order data from DB (not client) for security
    const orderNumber: string = order.orderNumber;
    const orderTotal: number = order.totals.total;

    // Check if order already shared
    const existingShare = await Share.findOne({
      user: userId,
      contentType: 'purchase',
      orderId: new Types.ObjectId(orderId)
    }).lean();

    if (existingShare) {
      throw new Error('This order has already been shared');
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sharesToday = await Share.countDocuments({
      user: userId,
      contentType: 'purchase',
      createdAt: { $gte: today }
    });

    const limit = DAILY_SHARE_LIMITS.purchase;
    if (sharesToday >= limit) {
      throw new Error(`Daily share limit (${limit}) reached for purchases`);
    }

    // Calculate 5% coin reward
    const sharePercentage = SHARE_REWARDS.purchase.sharePercentage || 0.05;
    const coinsEarned = Math.floor(orderTotal * sharePercentage);

    // Generate tracking code
    const trackingCode = `SHP${uuidv4().substring(0, 8).toUpperCase()}`;

    // Generate share URL
    const baseUrl = process.env.FRONTEND_URL || 'https://rez.app';
    const shareUrl = `${baseUrl}/s/${trackingCode}`;

    // Set expiry (30 days for purchase shares)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create share record with pending status (requires admin approval)
    const share = await Share.create({
      user: userId,
      contentType: 'purchase',
      contentId: orderNumber,
      orderId: new Types.ObjectId(orderId),
      orderTotal: orderTotal,
      platform,
      shareUrl,
      trackingCode,
      coinsEarned,
      status: 'pending_approval',  // Requires admin approval for 5% coins
      expiresAt
    });

    // Create pending coin reward for admin approval
    const PendingCoinReward = require('../models/PendingCoinReward').default;
    await PendingCoinReward.create({
      user: new Types.ObjectId(userId),
      amount: coinsEarned,
      percentage: 5,
      source: 'social_media_post',
      referenceType: 'order',
      referenceId: new Types.ObjectId(orderId),
      status: 'pending',
      submittedAt: new Date(),
      metadata: {
        orderNumber: orderNumber,
        orderTotal: orderTotal,
        platform: platform,
        shareId: (String(share._id)).toString(),
        shareUrl: shareUrl
      }
    });

    logger.info(`🎉 [SHARE SERVICE] Purchase shared: ${orderNumber}, User ${userId} - ${coinsEarned} coins pending admin approval`);

    // Emit socket event for admin notification
    try {
      const orderSocketService = require('./orderSocketService').default;
      if (orderSocketService) {
        orderSocketService.emitToAdmins('pending-reward:created', {
          userId,
          amount: coinsEarned,
          source: 'social_media_post',
          orderNumber,
          platform
        });
      }
    } catch (e) {
      logger.info('[SHARE SERVICE] Could not emit admin notification');
    }

    return { share, coinsEarned };
  }

  /**
   * Check if an order can be shared
   */
  async canShareOrder(userId: string, orderId: string): Promise<{ canShare: boolean; reason?: string }> {
    const { Order } = require('../models/Order');
    const { Types } = require('mongoose');

    // Check order exists and belongs to user
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return { canShare: false, reason: 'Order not found' };
    }

    if (order.user.toString() !== userId) {
      return { canShare: false, reason: 'Order does not belong to this user' };
    }

    // Check order is delivered
    if (order.status !== 'delivered') {
      return { canShare: false, reason: 'Order not yet delivered' };
    }

    // Check if already shared
    const existingShare = await Share.findOne({
      user: userId,
      contentType: 'purchase',
      orderId: new Types.ObjectId(orderId)
    }).lean();

    if (existingShare) {
      return { canShare: false, reason: 'Order already shared' };
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sharesToday = await Share.countDocuments({
      user: userId,
      contentType: 'purchase',
      createdAt: { $gte: today }
    });

    if (sharesToday >= DAILY_SHARE_LIMITS.purchase) {
      return { canShare: false, reason: 'Daily purchase share limit reached' };
    }

    return { canShare: true };
  }
}

export default new ShareService();
