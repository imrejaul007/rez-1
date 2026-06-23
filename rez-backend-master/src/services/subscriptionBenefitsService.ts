import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { Subscription, ISubscription, SubscriptionTier } from '../models/Subscription';
import { User, IUser } from '../models/User';
import { Order } from '../models/Order';
import { CoinTransaction } from '../models/CoinTransaction';
import tierConfigService from './tierConfigService';

class SubscriptionBenefitsService {
  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string | Types.ObjectId): Promise<ISubscription | null> {
    try {
      logger.info('🔍 [SUBSCRIPTION SERVICE] Getting subscription for user:', userId);

      const subscription = await Subscription.findOne({
        user: userId,
        status: { $in: ['active', 'trial', 'grace_period'] }
      }).sort({ createdAt: -1 }); // Removed .lean() — isActive() and .save() need full Mongoose document

      if (subscription) {
        logger.info('📊 [SUBSCRIPTION SERVICE] Found subscription:', {
          id: subscription._id,
          tier: subscription.tier,
          price: subscription.price,
          status: subscription.status,
          createdAt: subscription.createdAt,
        });
      } else {
        logger.info('⚠️ [SUBSCRIPTION SERVICE] No active subscription found for user');
      }

      return subscription;
    } catch (error) {
      logger.error('❌ [SUBSCRIPTION SERVICE] Error fetching user subscription:', error);
      return null;
    }
  }

  /**
   * Get cashback multiplier based on user's subscription tier
   */
  async getCashbackMultiplier(userId: string | Types.ObjectId): Promise<number> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return 1; // Free tier: 1x multiplier
      }

      return subscription.benefits.cashbackMultiplier;
    } catch (error) {
      logger.error('Error getting cashback multiplier:', error);
      return 1;
    }
  }

  /**
   * Check if user has free delivery benefit
   */
  async hasFreeDelivery(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.freeDelivery;
    } catch (error) {
      logger.error('Error checking free delivery:', error);
      return false;
    }
  }

  /**
   * Check if user can access exclusive deals
   */
  async canAccessExclusiveDeals(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.exclusiveDeals;
    } catch (error) {
      logger.error('Error checking exclusive deals access:', error);
      return false;
    }
  }

  /**
   * Check if user has priority support
   */
  async hasPrioritySupport(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.prioritySupport;
    } catch (error) {
      logger.error('Error checking priority support:', error);
      return false;
    }
  }

  /**
   * Check if user has unlimited wishlists
   */
  async hasUnlimitedWishlists(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.unlimitedWishlists;
    } catch (error) {
      logger.error('Error checking unlimited wishlists:', error);
      return false;
    }
  }

  /**
   * Check if user has early flash sale access
   */
  async hasEarlyFlashSaleAccess(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.earlyFlashSaleAccess;
    } catch (error) {
      logger.error('Error checking early flash sale access:', error);
      return false;
    }
  }

  /**
   * Check if user has personal shopper access
   */
  async hasPersonalShopper(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.personalShopper;
    } catch (error) {
      logger.error('Error checking personal shopper:', error);
      return false;
    }
  }

  /**
   * Check if user can access premium events
   */
  async canAccessPremiumEvents(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.premiumEvents;
    } catch (error) {
      logger.error('Error checking premium events access:', error);
      return false;
    }
  }

  /**
   * Check if user has concierge service
   */
  async hasConciergeService(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      return subscription.benefits.conciergeService;
    } catch (error) {
      logger.error('Error checking concierge service:', error);
      return false;
    }
  }

  /**
   * Apply subscription benefits to an order
   */
  async applyTierBenefits(
    userId: string | Types.ObjectId,
    orderData: {
      subtotal: number;
      deliveryFee: number;
      cashbackRate: number;
    }
  ): Promise<{
    cashbackRate: number;
    deliveryFee: number;
    totalSavings: number;
    appliedBenefits: string[];
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const appliedBenefits: string[] = [];
      let totalSavings = 0;

      // Default values
      let cashbackRate = orderData.cashbackRate;
      let deliveryFee = orderData.deliveryFee;

      if (subscription && subscription.isActive()) {
        // Apply cashback multiplier
        const multiplier = subscription.benefits.cashbackMultiplier;
        if (multiplier > 1) {
          cashbackRate = orderData.cashbackRate * multiplier;
          const extraCashback = (orderData.subtotal * orderData.cashbackRate * (multiplier - 1)) / 100;
          totalSavings += extraCashback;
          appliedBenefits.push(`${multiplier}x Cashback`);
        }

        // Apply free delivery
        if (subscription.benefits.freeDelivery && deliveryFee > 0) {
          totalSavings += deliveryFee;
          deliveryFee = 0;
          appliedBenefits.push('Free Delivery');

          // Update delivery fees saved
          subscription.usage.deliveryFeesSaved += orderData.deliveryFee;
        }

        // Update usage stats
        subscription.usage.ordersThisMonth += 1;
        subscription.usage.ordersAllTime += 1;
        subscription.usage.totalSavings += totalSavings;
        subscription.usage.lastUsedAt = new Date();

        await subscription.save();
      }

      return {
        cashbackRate,
        deliveryFee,
        totalSavings,
        appliedBenefits
      };
    } catch (error) {
      logger.error('Error applying tier benefits:', error);
      return {
        cashbackRate: orderData.cashbackRate,
        deliveryFee: orderData.deliveryFee,
        totalSavings: 0,
        appliedBenefits: []
      };
    }
  }

  /**
   * Get all benefits for a user
   */
  async getUserBenefits(userId: string | Types.ObjectId): Promise<{
    tier: SubscriptionTier;
    isActive: boolean;
    benefits: any;
    usage: any;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        const freeBenefits = await tierConfigService.getTierBenefits('free');
        return {
          tier: 'free',
          isActive: false,
          benefits: freeBenefits,
          usage: {
            totalSavings: 0,
            ordersThisMonth: 0,
            ordersAllTime: 0,
            cashbackEarned: 0,
            deliveryFeesSaved: 0,
            exclusiveDealsUsed: 0
          }
        };
      }

      return {
        tier: subscription.tier,
        isActive: subscription.isActive(),
        benefits: subscription.benefits,
        usage: subscription.usage
      };
    } catch (error) {
      logger.error('Error getting user benefits:', error);
      throw error;
    }
  }

  /**
   * Track exclusive deal usage
   */
  async trackExclusiveDealUsage(userId: string | Types.ObjectId, savingsAmount: number): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (subscription && subscription.isActive()) {
        subscription.usage.exclusiveDealsUsed += 1;
        subscription.usage.totalSavings += savingsAmount;
        await subscription.save();
      }
    } catch (error) {
      logger.error('Error tracking exclusive deal usage:', error);
    }
  }

  /**
   * Track cashback earned
   */
  async trackCashbackEarned(userId: string | Types.ObjectId, cashbackAmount: number): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (subscription && subscription.isActive()) {
        subscription.usage.cashbackEarned += cashbackAmount;
        await subscription.save();
      }
    } catch (error) {
      logger.error('Error tracking cashback earned:', error);
    }
  }

  /**
   * Get subscription ROI (Return on Investment)
   */
  async getSubscriptionROI(userId: string | Types.ObjectId): Promise<{
    subscriptionCost: number;
    totalSavings: number;
    netSavings: number;
    roi: number;
    roiPercentage: number;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || subscription.tier === 'free') {
        return {
          subscriptionCost: 0,
          totalSavings: 0,
          netSavings: 0,
          roi: 0,
          roiPercentage: 0
        };
      }

      const totalValue = subscription.usage.totalSavings + subscription.usage.cashbackEarned;
      const netSavings = totalValue - subscription.price;
      const roiPercentage = subscription.price > 0 ? ((netSavings / subscription.price) * 100) : 0;

      return {
        subscriptionCost: subscription.price,
        totalSavings: totalValue,
        netSavings,
        roi: netSavings,
        roiPercentage
      };
    } catch (error) {
      logger.error('Error calculating subscription ROI:', error);
      throw error;
    }
  }

  /**
   * Get current month subscription savings breakdown
   * Calculates extra coins earned due to tier cashback multiplier
   */
  async getMonthlySubscriptionSavings(userId: string | Types.ObjectId): Promise<{
    totalCoinsEarned: number;
    extraCoinsFromSubscription: number;
    month: string;
    monthLabel: string;
    tier: string;
    cashbackMultiplier: number;
  }> {
    const zeroResult = {
      totalCoinsEarned: 0,
      extraCoinsFromSubscription: 0,
      month: '',
      monthLabel: '',
      tier: 'free' as string,
      cashbackMultiplier: 1,
    };

    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || subscription.tier === 'free') {
        const now = new Date();
        zeroResult.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        zeroResult.monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return zeroResult;
      }

      const multiplier = subscription.benefits.cashbackMultiplier || 1;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const result = await CoinTransaction.aggregate([
        {
          $match: {
            user: new Types.ObjectId(userId.toString()),
            type: 'earned',
            source: { $in: ['purchase_reward', 'cashback', 'smart_spend_reward'] },
            createdAt: { $gte: monthStart, $lt: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalCoinsEarned: { $sum: '$amount' },
          },
        },
      ]);

      const totalCoinsEarned = result[0]?.totalCoinsEarned || 0;
      const extraCoinsFromSubscription = multiplier > 1
        ? Math.round(totalCoinsEarned * (1 - 1 / multiplier))
        : 0;

      return {
        totalCoinsEarned,
        extraCoinsFromSubscription,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        tier: subscription.tier,
        cashbackMultiplier: multiplier,
      };
    } catch (error) {
      logger.error('Error calculating monthly subscription savings:', error);
      throw error;
    }
  }

  /**
   * Check if user qualifies for birthday offer
   */
  async qualifiesForBirthdayOffer(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const user = await User.findById(userId).lean();

      if (!subscription || !subscription.isActive() || !user) {
        return false;
      }

      if (!subscription.benefits.birthdayOffer) {
        return false;
      }

      // Check if it's user's birthday month
      if (user.profile.dateOfBirth) {
        const now = new Date();
        const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
        const currentMonth = now.getMonth();

        return birthMonth === currentMonth;
      }

      return false;
    } catch (error) {
      logger.error('Error checking birthday offer qualification:', error);
      return false;
    }
  }

  /**
   * Check if user qualifies for anniversary offer
   */
  async qualifiesForAnniversaryOffer(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      if (!subscription.benefits.anniversaryOffer) {
        return false;
      }

      // Check if it's subscription anniversary month
      const now = new Date();
      const anniversaryMonth = new Date(subscription.startDate).getMonth();
      const currentMonth = now.getMonth();

      return anniversaryMonth === currentMonth;
    } catch (error) {
      logger.error('Error checking anniversary offer qualification:', error);
      return false;
    }
  }

  /**
   * Reset monthly usage stats (to be run via cron job)
   */
  async resetMonthlyUsageStats(): Promise<void> {
    try {
      await Subscription.updateMany(
        { status: { $in: ['active', 'trial', 'grace_period'] } },
        { $set: { 'usage.ordersThisMonth': 0 } }
      );

      logger.info('Monthly usage stats reset successfully');
    } catch (error) {
      logger.error('Error resetting monthly usage stats:', error);
    }
  }

  /**
   * Get subscription value proposition for upselling
   */
  async getValueProposition(
    userId: string | Types.ObjectId,
    targetTier: SubscriptionTier
  ): Promise<{
    estimatedMonthlySavings: number;
    estimatedYearlySavings: number;
    paybackPeriod: number; // in days
    benefits: string[];
  }> {
    try {
      // Calculate average order value and frequency
      const recentOrders = await Order.find({
        user: userId,
        status: 'delivered',
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      }).lean();

      // Get tier config from DB (single source of truth)
      const tierConfig = await tierConfigService.getTierConfig(targetTier);

      if (recentOrders.length === 0) {
        // Default estimates for new users
        return {
          estimatedMonthlySavings: targetTier === 'premium' ? 300 : 1000,
          estimatedYearlySavings: targetTier === 'premium' ? 3600 : 12000,
          paybackPeriod: targetTier === 'premium' ? 10 : 9,
          benefits: tierConfig.features
        };
      }

      // Calculate averages
      const totalSpent = recentOrders.reduce((sum, order) => sum + order.totals.total, 0);
      const avgOrderValue = totalSpent / recentOrders.length;
      const ordersPerMonth = recentOrders.length / 3; // 90 days = 3 months

      const multiplier = tierConfig.benefits.cashbackMultiplier;

      // Calculate savings
      const avgCashbackRate = 0.05; // 5% average
      const extraCashbackPerOrder = avgOrderValue * avgCashbackRate * (multiplier - 1);
      const deliverySavingsPerOrder = tierConfig.benefits.freeDelivery ? 30 : 0; // Avg delivery fee

      const monthlySavings = (extraCashbackPerOrder + deliverySavingsPerOrder) * ordersPerMonth;
      const yearlySavings = monthlySavings * 12;

      // Calculate payback period using DB price
      const subscriptionCost = tierConfig.pricing.monthly;
      const paybackPeriod = Math.ceil((subscriptionCost / monthlySavings) * 30); // in days

      return {
        estimatedMonthlySavings: Math.round(monthlySavings),
        estimatedYearlySavings: Math.round(yearlySavings),
        paybackPeriod,
        benefits: tierConfig.features
      };
    } catch (error) {
      logger.error('Error calculating value proposition:', error);
      throw error;
    }
  }
}

export default new SubscriptionBenefitsService();
