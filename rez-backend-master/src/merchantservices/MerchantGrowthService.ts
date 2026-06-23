/**
 * MerchantGrowthService
 * Phase 3.2 — Merchant-Driven Growth
 *
 * Provides:
 *  - getGrowthMetrics(merchantId, storeId): REZ customer count, repeat rate, revenue attribution
 *  - getLoyalCustomers(storeId): Users with 3+ visits, sorted by visit count
 *  - sendCustomerPush(merchantId, storeId, message, template): Push to loyal customers (2/week limit)
 *  - getPushStatus(storeId): How many pushes sent this week, limit, recipient count
 *  - getCustomerTrend(storeId, months): Monthly REZ vs total customers trend
 */

import mongoose from 'mongoose';
import { logger } from '../config/logger';
import pushNotificationService from '../services/pushNotificationService';
import redisService from '../services/redisService';

// Model imports — using dynamic require to stay compatible with existing patterns
// and avoid circular deps with models that are owned by other agents.
const getModel = (name: string) => mongoose.model(name);

export interface GrowthMetrics {
  totalRezCustomers: number;
  newRezCustomersThisMonth: number;
  repeatCustomersThisMonth: number;
  repeatRate: number;
  revenueFromRez: number;
  totalRezRevenue: number;
  revenueGrowth: number;
  avgVisitsPerCustomer: number;
}

export interface LoyalCustomer {
  userId: string;
  name: string;
  phone?: string;
  visitCount: number;
  totalSpend: number;
  lastVisit: Date;
  tier: string;
}

export interface TrendDataPoint {
  label: string;
  rezCustomers: number;
  totalCustomers: number;
}

export interface PushStatus {
  sentThisWeek: number;
  weeklyLimit: number;
  canSend: boolean;
  nextAvailableAt?: Date;
  recipientCount: number;
}

const WEEKLY_PUSH_LIMIT = 2;
const MIN_VISITS_FOR_LOYAL = 3;

// Redis key helpers
const pushCountKey = (storeId: string) => `merchant:push:count:${storeId}:${getWeekKey()}`;
const cacheKey = (type: string, id: string) => `merchant_growth:${type}:${id}`;

function getWeekKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}W${week}`;
}

// Month labels for trend
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class MerchantGrowthService {
  /**
   * Get growth metrics for a merchant store.
   * Uses StoreVisit model for visit data and Order model for revenue.
   */
  async getGrowthMetrics(merchantId: string, storeId: string): Promise<GrowthMetrics> {
    const cKey = cacheKey('metrics', storeId);
    try {
      const cached = await redisService.get<GrowthMetrics>(cKey);
      if (cached) return cached;
    } catch {
      /* Redis unavailable */
    }

    const StoreVisit = getModel('StoreVisit');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Aggregate: distinct REZ users per store (all time)
    const [totalUsers] = await StoreVisit.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId),
          status: 'completed',
        },
      },
      {
        $group: { _id: '$user' },
      },
      { $count: 'total' },
    ]);

    // Users this month
    const [monthUsersAgg] = await StoreVisit.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId),
          status: 'completed',
          completedAt: { $gte: monthStart },
        },
      },
      { $group: { _id: '$user' } },
      { $count: 'total' },
    ]);

    // Repeat users this month: users with 2+ completed visits to this store
    const repeatUsersAgg = await StoreVisit.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId),
          status: 'completed',
          completedAt: { $gte: monthStart },
        },
      },
      { $group: { _id: '$user', visits: { $sum: 1 } } },
      { $match: { visits: { $gte: 2 } } },
      { $count: 'total' },
    ]);

    // Average visits per user
    const avgVisitsAgg = await StoreVisit.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId),
          status: 'completed',
        },
      },
      { $group: { _id: '$user', visits: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: '$visits' } } },
    ]);

    // Revenue via REZ: sum of cashback-eligible transactions
    // Using CoinTransaction as proxy for REZ-attributed revenue
    let revenueFromRez = 0;
    let prevMonthRevenue = 0;
    try {
      const CoinTransaction = getModel('CoinTransaction');
      const [revAgg] = await CoinTransaction.aggregate([
        {
          $match: {
            store: new mongoose.Types.ObjectId(storeId),
            type: { $in: ['cashback', 'store_cashback'] },
            createdAt: { $gte: monthStart },
          },
        },
        {
          $group: { _id: null, total: { $sum: '$metadata.purchaseAmount' } },
        },
      ]);
      const [prevRevAgg] = await CoinTransaction.aggregate([
        {
          $match: {
            store: new mongoose.Types.ObjectId(storeId),
            type: { $in: ['cashback', 'store_cashback'] },
            createdAt: { $gte: prevMonthStart, $lt: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$metadata.purchaseAmount' } } },
      ]);
      revenueFromRez = revAgg?.total ?? 0;
      prevMonthRevenue = prevRevAgg?.total ?? 0;
    } catch {
      /* Model may not exist in all envs */
    }

    const totalRezCustomers = totalUsers?.total ?? 0;
    const monthCustomers = monthUsersAgg?.total ?? 0;
    const repeatCustomers = repeatUsersAgg?.[0]?.total ?? 0;
    const repeatRate = monthCustomers > 0 ? (repeatCustomers / monthCustomers) * 100 : 0;
    const avgVisits = avgVisitsAgg?.[0]?.avg ?? 0;
    const revenueGrowth = prevMonthRevenue > 0 ? ((revenueFromRez - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    const metrics: GrowthMetrics = {
      totalRezCustomers,
      newRezCustomersThisMonth: monthCustomers,
      repeatCustomersThisMonth: repeatCustomers,
      repeatRate: parseFloat(repeatRate.toFixed(1)),
      revenueFromRez,
      totalRezRevenue: revenueFromRez,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      avgVisitsPerCustomer: parseFloat(avgVisits.toFixed(1)),
    };

    // Cache for 10 minutes
    try {
      await redisService.set(cKey, metrics, 600);
    } catch {
      /* Redis unavailable */
    }

    return metrics;
  }

  /**
   * Get loyal customers (3+ visits) sorted by visit count descending.
   */
  async getLoyalCustomers(
    storeId: string,
    minVisits: number = MIN_VISITS_FOR_LOYAL,
    limit: number = 50,
  ): Promise<LoyalCustomer[]> {
    const cKey = cacheKey('loyal', storeId);
    try {
      const cached = await redisService.get<LoyalCustomer[]>(cKey);
      if (cached) return cached;
    } catch {
      /* Redis unavailable */
    }

    const StoreVisit = getModel('StoreVisit');

    const rawCustomers = await StoreVisit.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(storeId),
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$user',
          visitCount: { $sum: 1 },
          totalSpend: { $sum: { $ifNull: ['$amount', 0] } },
          lastVisit: { $max: '$completedAt' },
        },
      },
      { $match: { visitCount: { $gte: minVisits } } },
      { $sort: { visitCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'userloyalties',
          let: { userId: '$_id', storeId: new mongoose.Types.ObjectId(storeId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$user', '$$userId'] }, { $eq: ['$store', '$$storeId'] }],
                },
              },
            },
          ],
          as: 'loyalty',
        },
      },
      {
        $project: {
          userId: '$_id',
          name: { $ifNull: ['$user.name', 'Customer'] },
          phone: '$user.phoneNumber',
          visitCount: 1,
          totalSpend: 1,
          lastVisit: 1,
          tier: {
            $ifNull: [{ $arrayElemAt: ['$loyalty.tier', 0] }, 'Bronze'],
          },
        },
      },
    ]);

    const customers: LoyalCustomer[] = rawCustomers.map((c: any) => ({
      userId: String(c.userId),
      name: c.name,
      phone: c.phone,
      visitCount: c.visitCount,
      totalSpend: c.totalSpend ?? 0,
      lastVisit: c.lastVisit,
      tier: c.tier ?? 'Bronze',
    }));

    try {
      await redisService.set(cKey, customers, 300);
    } catch {
      /* Redis unavailable */
    }

    return customers;
  }

  /**
   * Get how many pushes were sent this week and how many can still be sent.
   */
  async getPushStatus(storeId: string): Promise<PushStatus> {
    const key = pushCountKey(storeId);
    let sentThisWeek = 0;
    try {
      const count = await redisService.get<number>(key);
      sentThisWeek = count ?? 0;
    } catch {
      /* Redis unavailable — assume 0 */
    }

    const loyalCustomers = await this.getLoyalCustomers(storeId);
    const canSend = sentThisWeek < WEEKLY_PUSH_LIMIT;

    return {
      sentThisWeek,
      weeklyLimit: WEEKLY_PUSH_LIMIT,
      canSend,
      recipientCount: loyalCustomers.length,
    };
  }

  /**
   * Send a push notification to all loyal customers of a store.
   * Enforces the 2 per week limit.
   */
  async sendCustomerPush(
    merchantId: string,
    storeId: string,
    message: string,
    template: string,
  ): Promise<{ success: boolean; recipientCount: number }> {
    // Validate weekly limit
    const status = await this.getPushStatus(storeId);
    if (!status.canSend) {
      throw new Error(
        `Weekly push limit reached (${WEEKLY_PUSH_LIMIT} per week). ` +
          `You have sent ${status.sentThisWeek} this week.`,
      );
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
    if (message.length > 200) {
      throw new Error('Message must be 200 characters or fewer');
    }

    // Get store name for notification title
    let storeName = 'Your Store';
    try {
      const Store = getModel('Store');
      const store = await Store.findById(storeId).select('name').lean();
      if (store) storeName = (store as any).name;
    } catch {
      /* Model lookup failed */
    }

    // Fetch loyal customer push tokens
    const loyalCustomers = await this.getLoyalCustomers(storeId);
    if (loyalCustomers.length === 0) {
      logger.info(`[MerchantGrowthService] No loyal customers for store ${storeId}`);
      return { success: true, recipientCount: 0 };
    }

    // Send push to each loyal customer (batched)
    let sent = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < loyalCustomers.length; i += BATCH_SIZE) {
      const batch = loyalCustomers.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (customer) => {
          try {
            await pushNotificationService.sendPushToUser(customer.userId, {
              title: storeName,
              body: message,
              data: {
                type: 'merchant_push',
                storeId,
                template,
                merchantId,
              },
            });
            sent++;
          } catch (err) {
            logger.warn(`[MerchantGrowthService] Failed to push to user ${customer.userId}:`, err);
          }
        }),
      );
    }

    // Increment Redis counter
    try {
      const key = pushCountKey(storeId);
      const current = (await redisService.get<number>(key)) ?? 0;
      // TTL: end of week (7 days max)
      await redisService.set(key, current + 1, 7 * 24 * 60 * 60);
    } catch {
      /* Redis unavailable */
    }

    logger.info(
      `[MerchantGrowthService] Merchant ${merchantId} sent push to ${sent}/${loyalCustomers.length} loyal customers of store ${storeId}`,
    );

    return { success: true, recipientCount: sent };
  }

  /**
   * Get monthly trend: REZ customers vs total store customers over N months.
   */
  async getCustomerTrend(storeId: string, months: number = 6): Promise<TrendDataPoint[]> {
    const cKey = cacheKey('trend', storeId);
    try {
      const cached = await redisService.get<TrendDataPoint[]>(cKey);
      if (cached) return cached;
    } catch {
      /* Redis unavailable */
    }

    const StoreVisit = getModel('StoreVisit');
    const now = new Date();
    const result: TrendDataPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [rezAgg] = await StoreVisit.aggregate([
        {
          $match: {
            store: new mongoose.Types.ObjectId(storeId),
            status: 'completed',
            completedAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: '$user' } },
        { $count: 'total' },
      ]).catch(() => [{ total: 0 }]);

      result.push({
        label: MONTH_LABELS[start.getMonth()],
        rezCustomers: rezAgg?.total ?? 0,
        // totalCustomers approximation: REZ + estimated 20% non-REZ buffer
        // Real implementation should use POS transaction data
        totalCustomers: Math.round((rezAgg?.total ?? 0) * 1.2),
      });
    }

    try {
      await redisService.set(cKey, result, 1800); // 30 min cache
    } catch {
      /* Redis unavailable */
    }

    return result;
  }
}

export default new MerchantGrowthService();
