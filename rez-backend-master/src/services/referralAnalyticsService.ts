import Referral, { ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Types } from 'mongoose';

interface ReferralMetrics {
  totalReferrals: number;
  qualifiedReferrals: number;
  conversionRate: number;
  averageTimeToQualification: number; // in days
  topReferrers: any[];
  sourceBreakdown: Record<string, number>;
  viralCoefficient: number;
  customerAcquisitionCost: number;
  lifetimeValuePerReferral: number;
}

export class ReferralAnalyticsService {
  /**
   * Get comprehensive referral metrics
   */
  async getMetrics(startDate?: Date, endDate?: Date): Promise<ReferralMetrics> {
    const dateFilter = this.getDateFilter(startDate, endDate);

    const [
      totalReferrals,
      qualifiedReferrals,
      topReferrers,
      sourceBreakdown,
      avgTimeToQualification
    ] = await Promise.all([
      this.getTotalReferrals(dateFilter),
      this.getQualifiedReferrals(dateFilter),
      this.getTopReferrers(dateFilter),
      this.getSourceBreakdown(dateFilter),
      this.getAverageTimeToQualification(dateFilter)
    ]);

    const conversionRate = totalReferrals > 0
      ? (qualifiedReferrals / totalReferrals) * 100
      : 0;

    const viralCoefficient = await this.calculateViralCoefficient(dateFilter);
    const cac = await this.calculateCAC(dateFilter);
    const ltv = await this.calculateLTV(dateFilter);

    return {
      totalReferrals,
      qualifiedReferrals,
      conversionRate,
      averageTimeToQualification: avgTimeToQualification,
      topReferrers,
      sourceBreakdown,
      viralCoefficient,
      customerAcquisitionCost: cac,
      lifetimeValuePerReferral: ltv
    };
  }

  /**
   * Get leaderboard of top referrers
   */
  async getLeaderboard(limit: number = 100) {
    const referralCounts = await Referral.aggregate([
      {
        $match: {
          status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
        }
      },
      {
        $group: {
          _id: '$referrer',
          totalReferrals: { $sum: 1 },
          lifetimeEarnings: {
            $sum: {
              $reduce: {
                input: '$rewards',
                initialValue: 0,
                in: {
                  $cond: [
                    { $and: [{ $eq: ['$$this.type', 'coins'] }, { $eq: ['$$this.claimed', true] }] },
                    { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] },
                    '$$value'
                  ]
                }
              }
            }
          }
        }
      },
      {
        $sort: { totalReferrals: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          fullName: '$user.fullName',
          avatar: '$user.avatar',
          totalReferrals: 1,
          lifetimeEarnings: 1,
          tier: '$user.referralTier'
        }
      }
    ]);

    return referralCounts.map((entry: any, index: number) => ({
      rank: index + 1,
      ...entry
    }));
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: string | Types.ObjectId) {
    const userReferrals = await Referral.countDocuments({
      referrer: userId,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
    });

    const usersWithMore = await Referral.aggregate([
      {
        $match: {
          status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
        }
      },
      {
        $group: {
          _id: '$referrer',
          totalReferrals: { $sum: 1 }
        }
      },
      {
        $match: {
          totalReferrals: { $gt: userReferrals }
        }
      },
      {
        $count: 'count'
      }
    ]);

    const rank = usersWithMore.length > 0 ? usersWithMore[0].count + 1 : 1;

    return {
      rank,
      totalReferrals: userReferrals
    };
  }

  /**
   * Track referral attribution
   */
  async trackAttribution(referralId: string | Types.ObjectId, event: string, metadata?: any) {
    const referral = await Referral.findById(referralId).lean();

    if (!referral) {
      throw new Error('Referral not found');
    }

    // Track events in metadata
    const events = (referral.metadata as any).attributionEvents || [];
    events.push({
      event,
      timestamp: new Date(),
      ...metadata
    });

    (referral.metadata as any).attributionEvents = events;

    await referral.save();

    return referral;
  }

  /**
   * Get referral conversion funnel
   */
  async getConversionFunnel(dateFilter: any = {}) {
    const [
      linkClicked,
      registered,
      firstOrder,
      qualified,
      completed
    ] = await Promise.all([
      Referral.countDocuments({ ...dateFilter }),
      Referral.countDocuments({ ...dateFilter, status: { $ne: ReferralStatus.PENDING } }),
      Referral.countDocuments({ ...dateFilter, 'metadata.refereeFirstOrder': { $exists: true } }),
      Referral.countDocuments({ ...dateFilter, status: ReferralStatus.QUALIFIED }),
      Referral.countDocuments({ ...dateFilter, status: ReferralStatus.COMPLETED })
    ]);

    return {
      stages: [
        { name: 'Link Shared/Clicked', count: linkClicked, percentage: 100 },
        { name: 'Registered', count: registered, percentage: (registered / linkClicked) * 100 },
        { name: 'First Order', count: firstOrder, percentage: (firstOrder / linkClicked) * 100 },
        { name: 'Qualified', count: qualified, percentage: (qualified / linkClicked) * 100 },
        { name: 'Completed', count: completed, percentage: (completed / linkClicked) * 100 }
      ],
      overallConversion: linkClicked > 0 ? (qualified / linkClicked) * 100 : 0
    };
  }

  /**
   * Get referral source performance
   */
  async getSourcePerformance(dateFilter: any = {}) {
    const performance = await Referral.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$metadata.shareMethod',
          total: { $sum: 1 },
          qualified: {
            $sum: {
              $cond: [
                { $in: ['$status', [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED]] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          source: '$_id',
          total: 1,
          qualified: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$qualified', '$total'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    return performance;
  }

  /**
   * Calculate viral coefficient (K-factor)
   */
  private async calculateViralCoefficient(dateFilter: any = {}): Promise<number> {
    const users = await User.countDocuments(dateFilter);
    const referrals = await Referral.countDocuments({
      ...dateFilter,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
    });

    // K = (invites sent per user) × (conversion rate)
    // Simplified: qualified referrals / total users
    return users > 0 ? referrals / users : 0;
  }

  /**
   * Calculate Customer Acquisition Cost
   */
  private async calculateCAC(dateFilter: any = {}): Promise<number> {
    const referrals = await Referral.find({
      ...dateFilter,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
    }).lean();

    // Calculate total rewards paid out
    const totalRewardsCost = referrals.reduce((sum: number, ref: any) => {
      // rewards is an object with referrerAmount, refereeDiscount, milestoneBonus
      const rewardSum = (ref.rewards.referrerAmount || 0) +
                        (ref.rewards.refereeDiscount || 0) +
                        (ref.rewards.milestoneBonus || 0);
      return sum + rewardSum;
    }, 0);

    const qualifiedReferrals = referrals.length;

    return qualifiedReferrals > 0 ? totalRewardsCost / qualifiedReferrals : 0;
  }

  /**
   * Calculate Lifetime Value per referred customer
   */
  private async calculateLTV(dateFilter: any = {}): Promise<number> {
    const referrals = await Referral.find({
      ...dateFilter,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
    }).populate('referee').lean();

    let totalValue = 0;

    for (const ref of referrals) {
      if (ref.referee) {
        const orders = await Order.find({
          userId: ref.referee,
          status: { $in: ['delivered', 'completed'] }
        }).lean();

        const customerValue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        totalValue += customerValue;
      }
    }

    return referrals.length > 0 ? totalValue / referrals.length : 0;
  }

  /**
   * Helper: Get total referrals
   */
  private async getTotalReferrals(dateFilter: any): Promise<number> {
    return await Referral.countDocuments(dateFilter);
  }

  /**
   * Helper: Get qualified referrals
   */
  private async getQualifiedReferrals(dateFilter: any): Promise<number> {
    return await Referral.countDocuments({
      ...dateFilter,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
    });
  }

  /**
   * Helper: Get top referrers
   */
  private async getTopReferrers(dateFilter: any, limit: number = 10) {
    return await this.getLeaderboard(limit);
  }

  /**
   * Helper: Get source breakdown
   */
  private async getSourceBreakdown(dateFilter: any): Promise<Record<string, number>> {
    const breakdown = await Referral.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$metadata.shareMethod',
          count: { $sum: 1 }
        }
      }
    ]);

    const result: Record<string, number> = {};
    breakdown.forEach((item: any) => {
      result[item._id || 'unknown'] = item.count;
    });

    return result;
  }

  /**
   * Helper: Get average time to qualification
   */
  private async getAverageTimeToQualification(dateFilter: any): Promise<number> {
    const qualifiedReferrals = await Referral.find({
      ...dateFilter,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] },
      qualifiedAt: { $exists: true },
      registeredAt: { $exists: true }
    }).lean();

    if (qualifiedReferrals.length === 0) return 0;

    const totalDays = qualifiedReferrals.reduce((sum: number, ref: any) => {
      const days = (ref.qualifiedAt!.getTime() - ref.registeredAt!.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return totalDays / qualifiedReferrals.length;
  }

  /**
   * Helper: Get date filter
   */
  private getDateFilter(startDate?: Date, endDate?: Date) {
    const filter: any = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    return filter;
  }
}

export default new ReferralAnalyticsService();
