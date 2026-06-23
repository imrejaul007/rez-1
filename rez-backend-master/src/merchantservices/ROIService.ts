/**
 * ROI Service - Li Wei
 *
 * Merchant ROI optimization metrics:
 * - Campaign performance (impressions, redemptions, cost per redemption)
 * - Customer acquisition cost (CAC) by source
 * - Visit frequency distribution
 * - Revenue by day-of-week & hour for staffing optimization
 * - Payout month-over-month growth
 * - Subscription value calculation
 */

import { Order } from '../models/Order';
import OfferRedemption from '../models/OfferRedemption';
import { StorePayment } from '../models/StorePayment';
import DealRedemption from '../models/DealRedemption';
import { logger } from '../config/logger';
import { Types } from 'mongoose';

export interface CampaignROI {
  campaignId: string;
  campaignName: string;
  campaignType: 'deal' | 'cashback' | 'offer' | 'bonus';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'ended' | 'scheduled';

  // Impressions & Reach
  totalImpressions: number; // Views/pushes sent
  uniqueCustomers: number; // Unique customers who saw it

  // Redemptions
  totalRedemptions: number;
  uniqueRedeemers: number;
  conversionRate: number; // redemptions / impressions

  // Revenue Impact
  revenueAttributed: number;
  averageOrderValue: number;
  repeatPurchaseRate: number; // % of redeemers who came back

  // Cost Analysis (if available)
  costPerRedemption: number;
  costPerAcquisition: number;
  roi: number; // (Revenue - Cost) / Cost * 100
}

export interface CustomerAcquisitionCost {
  source: string; // 'deal', 'cashback', 'referral', 'organic', 'campaign'
  newCustomers: number;
  totalCost: number;
  cac: number; // Cost per new customer
  retentionRate30d: number; // % still active after 30 days
  ltv30d: number; // Lifetime value in first 30 days
  roiRatio: number; // LTV / CAC
}

export interface VisitFrequencyDistribution {
  range: string; // '0-1', '2-4', '5-10', '10+'
  customerCount: number;
  percentage: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export interface DayOfWeekRevenue {
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  dayIndex: number; // 0-6
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  peakHour: number; // Hour with most orders (0-23)
  recommendedStaffing: string; // 'Light', 'Normal', 'Heavy'
}

export interface PayoutGrowth {
  month: string; // 'Mar 2026'
  totalPayout: number;
  previousMonthPayout: number;
  growthPercentage: number;
  orderCount: number;
  previousMonthOrders: number;
  orderCountGrowth: number;
}

export interface SubscriptionValue {
  monthlyRecurringCost: number;
  estimatedSavingsPerAction: number;
  averageActionsPerMonth: number;
  estimatedMonthlySavings: number;
  breakEvenActionsPerMonth: number;
  paybackMonths: number;
  roi: number;
  recommendation: string;
}

export class ROIService {
  /**
   * Get campaign ROI metrics for ended campaigns
   */
  static async getCampaignROI(storeId: string, campaignId?: string, limit: number = 10): Promise<CampaignROI[]> {
    try {
      const ObjectId = Types.ObjectId;
      const storeObjectId = new ObjectId(storeId);

      // Get deals/offers with redemption stats
      const OfferModel = require('../models/Offer').default;

      const campaignQuery: any = {
        storeId: storeObjectId,
        status: { $in: ['ended', 'active'] },
      };

      if (campaignId) {
        campaignQuery._id = new ObjectId(campaignId);
      }

      const campaigns = await OfferModel.find(campaignQuery).sort({ endDate: -1 }).limit(limit).lean();

      const result: CampaignROI[] = [];

      for (const campaign of campaigns) {
        // Get redemption stats
        const redemptionStats = await OfferRedemption.aggregate([
          {
            $match: {
              offer: new ObjectId(campaign._id),
              status: { $in: ['used', 'pending'] },
            },
          },
          {
            $group: {
              _id: '$offer',
              totalRedemptions: { $sum: 1 },
              uniqueRedeemers: { $addToSet: '$user' },
              totalRevenue: { $sum: '$redemptionValue' },
            },
          },
          {
            $project: {
              totalRedemptions: 1,
              uniqueRedeemers: { $size: '$uniqueRedeemers' },
              totalRevenue: 1,
            },
          },
        ]);

        const stats = redemptionStats[0] || {
          totalRedemptions: 0,
          uniqueRedeemers: 0,
          totalRevenue: 0,
        };

        // Calculate repeat purchase rate
        const redeemersOrders = await Order.countDocuments({
          'items.store': storeObjectId,
          user: { $in: Array.from(new Set((stats.uniqueRedeemers as any[]) || [])) },
        });

        const repeatRate = stats.uniqueRedeemers > 0 ? (redeemersOrders / stats.uniqueRedeemers) * 100 : 0;

        result.push({
          campaignId: campaign._id.toString(),
          campaignName: campaign.title || 'Untitled Campaign',
          campaignType: campaign.type || 'offer',
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: campaign.status,
          totalImpressions: campaign.impressions || 0,
          uniqueCustomers: campaign.uniqueViews || 0,
          totalRedemptions: stats.totalRedemptions,
          uniqueRedeemers: stats.uniqueRedeemers,
          conversionRate: (stats.totalRedemptions / (campaign.uniqueViews || 1)) * 100,
          revenueAttributed: stats.totalRevenue || 0,
          averageOrderValue: stats.totalRedemptions > 0 ? stats.totalRevenue / stats.totalRedemptions : 0,
          repeatPurchaseRate: repeatRate,
          costPerRedemption: campaign.budget && stats.totalRedemptions ? campaign.budget / stats.totalRedemptions : 0,
          costPerAcquisition: campaign.budget && stats.uniqueRedeemers ? campaign.budget / stats.uniqueRedeemers : 0,
          roi:
            campaign.budget && stats.totalRevenue
              ? ((stats.totalRevenue - campaign.budget) / campaign.budget) * 100
              : 0,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error calculating campaign ROI:', error);
      throw error;
    }
  }

  /**
   * Get customer acquisition cost by source
   */
  static async getCustomerAcquisitionCost(storeId: string, days: number = 90): Promise<CustomerAcquisitionCost[]> {
    try {
      const ObjectId = Types.ObjectId;
      const storeObjectId = new ObjectId(storeId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get new customers by source
      const newCustomers = await Order.aggregate([
        {
          $match: {
            'items.store': storeObjectId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$user',
            firstOrderDate: { $min: '$createdAt' },
            totalSpent: { $sum: '$totalAmount' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $project: {
            userId: '$_id',
            firstOrderDate: 1,
            totalSpent: 1,
            source: { $arrayElemAt: ['$userInfo.acquisitionSource', 0] },
          },
        },
      ]);

      // Group by source and calculate CAC
      const bySource = new Map<string, any>();

      for (const customer of newCustomers) {
        const source = customer.source || 'organic';
        if (!bySource.has(source)) {
          bySource.set(source, {
            newCustomers: 0,
            totalSpent: 0,
            customers: [],
          });
        }
        const entry = bySource.get(source)!;
        entry.newCustomers += 1;
        entry.totalSpent += customer.totalSpent;
        entry.customers.push(customer._id);
      }

      const result: CustomerAcquisitionCost[] = [];

      for (const [source, data] of bySource) {
        // Check retention (still active after 30 days)
        const activeCount = await Order.countDocuments({
          'items.store': storeObjectId,
          user: { $in: data.customers },
          createdAt: { $gte: thirtyDaysAgo },
        });

        result.push({
          source,
          newCustomers: data.newCustomers,
          totalCost: 0, // Would need campaign budget data
          cac: 0, // CAC = Cost / New Customers
          retentionRate30d: (activeCount / data.newCustomers) * 100,
          ltv30d: data.totalSpent / data.newCustomers,
          roiRatio: 0, // Would need cost data
        });
      }

      return result;
    } catch (error) {
      logger.error('Error calculating CAC:', error);
      throw error;
    }
  }

  /**
   * Get visit frequency distribution
   */
  static async getVisitFrequencyDistribution(
    storeId: string,
    days: number = 90,
  ): Promise<VisitFrequencyDistribution[]> {
    try {
      const ObjectId = Types.ObjectId;
      const storeObjectId = new ObjectId(storeId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get order counts per customer
      const customerOrders = await Order.aggregate([
        {
          $match: {
            'items.store': storeObjectId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      // Bucket customers into visit frequency ranges
      const ranges = [
        { range: '0-1 visits', min: 0, max: 1 },
        { range: '2-4 visits', min: 2, max: 4 },
        { range: '5-10 visits', min: 5, max: 10 },
        { range: '10+ visits', min: 11, max: Infinity },
      ];

      const result: VisitFrequencyDistribution[] = ranges.map((r) => ({
        range: r.range,
        customerCount: 0,
        percentage: 0,
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
      }));

      for (const customer of customerOrders) {
        const bucketIndex = ranges.findIndex((r) => customer.orderCount >= r.min && customer.orderCount <= r.max);
        if (bucketIndex >= 0) {
          result[bucketIndex].customerCount += 1;
          result[bucketIndex].totalOrders += customer.orderCount;
          result[bucketIndex].totalRevenue += customer.totalRevenue;
        }
      }

      const totalCustomers = customerOrders.length;
      for (const bucket of result) {
        bucket.percentage = totalCustomers > 0 ? (bucket.customerCount / totalCustomers) * 100 : 0;
        bucket.avgOrderValue = bucket.customerCount > 0 ? bucket.totalRevenue / bucket.customerCount : 0;
      }

      return result;
    } catch (error) {
      logger.error('Error calculating visit frequency distribution:', error);
      throw error;
    }
  }

  /**
   * Get revenue by day of week with staffing recommendations
   */
  static async getDayOfWeekRevenue(storeId: string, days: number = 90): Promise<DayOfWeekRevenue[]> {
    try {
      const ObjectId = Types.ObjectId;
      const storeObjectId = new ObjectId(storeId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Aggregate by day-of-week + hour to find peak hour per day
      const revenueByDayHour = await Order.aggregate([
        {
          $match: {
            'items.store': storeObjectId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              dayOfWeek: { $dayOfWeek: '$createdAt' },
              hour: { $hour: '$createdAt' },
            },
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
        { $sort: { '_id.dayOfWeek': 1, totalOrders: -1 } },
      ]);

      // Build per-day aggregates and find peak hour (hour with most orders)
      const dayMap: Record<
        number,
        { totalRevenue: number; totalOrders: number; avgOrderValue: number; peakHour: number; peakHourOrders: number }
      > = {};
      for (const row of revenueByDayHour) {
        const dow = row._id.dayOfWeek as number;
        const hour = row._id.hour as number;
        if (!dayMap[dow]) {
          dayMap[dow] = { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, peakHour: hour, peakHourOrders: 0 };
        }
        dayMap[dow].totalRevenue += row.totalRevenue;
        dayMap[dow].totalOrders += row.totalOrders;
        // Track peak hour (highest order count)
        if (row.totalOrders > dayMap[dow].peakHourOrders) {
          dayMap[dow].peakHour = hour;
          dayMap[dow].peakHourOrders = row.totalOrders;
        }
      }

      // Re-compute avgOrderValue per day
      for (const dow of Object.keys(dayMap)) {
        const d = dayMap[Number(dow)];
        d.avgOrderValue = d.totalOrders > 0 ? d.totalRevenue / d.totalOrders : 0;
      }

      const revenueByDay = Object.entries(dayMap)
        .map(([dow, data]) => ({ _id: Number(dow), ...data }))
        .sort((a, b) => a._id - b._id);

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const avgRevenue = revenueByDay.reduce((sum, d) => sum + d.totalRevenue, 0) / Math.max(revenueByDay.length, 1);

      return revenueByDay.map((day) => ({
        dayOfWeek: dayNames[day._id - 1] || 'Unknown',
        dayIndex: day._id - 1,
        totalRevenue: day.totalRevenue,
        totalOrders: day.totalOrders,
        avgOrderValue: day.avgOrderValue,
        peakHour: day.peakHour, // actual peak hour from aggregated order data
        recommendedStaffing:
          day.totalRevenue > avgRevenue * 1.2 ? 'Heavy' : day.totalRevenue < avgRevenue * 0.8 ? 'Light' : 'Normal',
      }));
    } catch (error) {
      logger.error('Error calculating day-of-week revenue:', error);
      throw error;
    }
  }

  /**
   * Get month-over-month payout growth
   */
  static async getPayoutGrowth(storeId: string, months: number = 6): Promise<PayoutGrowth[]> {
    try {
      const ObjectId = Types.ObjectId;
      const storeObjectId = new ObjectId(storeId);

      const payouts = await StorePayment.aggregate([
        {
          $match: {
            storeId: storeObjectId,
            status: 'completed',
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            totalPayout: { $sum: '$amount' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: months },
      ]);

      const result: PayoutGrowth[] = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = 0; i < payouts.length; i++) {
        const current = payouts[i];
        const previous = payouts[i + 1];

        result.push({
          month: `${monthNames[current._id.month - 1]} ${current._id.year}`,
          totalPayout: current.totalPayout,
          previousMonthPayout: previous?.totalPayout || current.totalPayout,
          growthPercentage: previous ? ((current.totalPayout - previous.totalPayout) / previous.totalPayout) * 100 : 0,
          orderCount: current.orderCount,
          previousMonthOrders: previous?.orderCount || current.orderCount,
          orderCountGrowth: previous ? ((current.orderCount - previous.orderCount) / previous.orderCount) * 100 : 0,
        });
      }

      return result.reverse();
    } catch (error) {
      logger.error('Error calculating payout growth:', error);
      throw error;
    }
  }

  /**
   * Calculate subscription value (savings vs pay-per-action)
   */
  static async getSubscriptionValue(
    storeId: string,
    monthlySubscriptionCost: number,
    costPerAction: number,
    days: number = 30,
  ): Promise<SubscriptionValue> {
    try {
      const ObjectId = Types.ObjectId;
      const storeObjectId = new ObjectId(storeId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Count actions (orders, deals used, etc.)
      const actionCount = await Order.countDocuments({
        'items.store': storeObjectId,
        createdAt: { $gte: startDate },
      });

      const payAsYouGoCost = actionCount * costPerAction;
      const monthlySavings = Math.max(0, payAsYouGoCost - monthlySubscriptionCost);
      const breakEvenActions = Math.ceil(monthlySubscriptionCost / costPerAction);
      const paybackMonths = monthlySavings > 0 ? monthlySubscriptionCost / (monthlySavings / (days / 30)) : 0;

      return {
        monthlyRecurringCost: monthlySubscriptionCost,
        estimatedSavingsPerAction: costPerAction,
        averageActionsPerMonth: Math.round((actionCount / days) * 30),
        estimatedMonthlySavings: monthlySavings,
        breakEvenActionsPerMonth: breakEvenActions,
        paybackMonths,
        roi: monthlySubscriptionCost > 0 ? (monthlySavings / monthlySubscriptionCost) * 100 : 0,
        recommendation:
          monthlySavings > 0
            ? `Save ₹${Math.round(monthlySavings)}/month with current usage`
            : `Need ${breakEvenActions} actions/month to break even`,
      };
    } catch (error) {
      logger.error('Error calculating subscription value:', error);
      throw error;
    }
  }
}
