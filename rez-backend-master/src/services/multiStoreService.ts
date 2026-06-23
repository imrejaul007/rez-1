import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { WebOrder } from '../models/WebOrder';
import { logger } from '../config/logger';

export interface OutletSummary {
  storeId: string;
  slug: string;
  name: string;
  outletCode: string;
  city?: string;
  isPrimaryOutlet: boolean;
  todayOrders: number;
  todayRevenue: number; // in paise
  pendingOrders: number;
}

export interface AggregateStats {
  totalRevenue: number;
  totalOrders: number;
  outletBreakdown: Array<{
    slug: string;
    name: string;
    revenue: number;
    orders: number;
  }>;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Returns summary for every store belonging to a merchant,
 * enriched with today's order count, revenue, and pending order count.
 */
export async function getOutlets(merchantId: string): Promise<OutletSummary[]> {
  const merchantObjId = new mongoose.Types.ObjectId(merchantId);

  const stores = await Store.find({ merchantId: merchantObjId })
    .select('_id name slug outletCode outletCity isPrimaryOutlet isActive')
    .lean();

  if (stores.length === 0) return [];

  const storeSlugs = stores.map((s) => s.slug);
  const startOfToday = startOfDay(new Date());

  // Aggregate orders per store for today
  const orderAgg = await WebOrder.aggregate([
    {
      $match: {
        storeSlug: { $in: storeSlugs },
        createdAt: { $gte: startOfToday },
      },
    },
    {
      $group: {
        _id: '$storeSlug',
        todayOrders: { $sum: 1 },
        todayRevenue: { $sum: '$amount' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] },
        },
      },
    },
  ]);

  const orderMap = new Map<string, { todayOrders: number; todayRevenue: number; pendingOrders: number }>();
  for (const row of orderAgg) {
    orderMap.set(String(row._id), {
      todayOrders: row.todayOrders,
      todayRevenue: row.todayRevenue,
      pendingOrders: row.pendingOrders,
    });
  }

  return stores.map((store: any) => {
    const stats = orderMap.get(store.slug) ?? {
      todayOrders: 0,
      todayRevenue: 0,
      pendingOrders: 0,
    };
    return {
      storeId: String(store._id),
      slug: store.slug,
      name: store.name,
      outletCode: store.outletCode ?? '',
      city: store.outletCity,
      isPrimaryOutlet: store.isPrimaryOutlet ?? false,
      todayOrders: stats.todayOrders,
      todayRevenue: stats.todayRevenue,
      pendingOrders: stats.pendingOrders,
    };
  });
}

/**
 * Returns aggregate revenue / order counts across all stores for a merchant.
 */
export async function getAggregateStats(merchantId: string): Promise<AggregateStats> {
  const merchantObjId = new mongoose.Types.ObjectId(merchantId);

  const stores = await Store.find({ merchantId: merchantObjId }).select('slug name').lean();

  if (stores.length === 0) {
    return { totalRevenue: 0, totalOrders: 0, outletBreakdown: [] };
  }

  const storeSlugs = stores.map((s) => s.slug);
  const startOfToday = startOfDay(new Date());

  const orderAgg = await WebOrder.aggregate([
    {
      $match: {
        storeSlug: { $in: storeSlugs },
        createdAt: { $gte: startOfToday },
      },
    },
    {
      $group: {
        _id: '$storeSlug',
        revenue: { $sum: '$amount' },
        orders: { $sum: 1 },
      },
    },
  ]);

  const orderMap = new Map<string, { revenue: number; orders: number }>();
  for (const row of orderAgg) {
    orderMap.set(String(row._id), { revenue: row.revenue, orders: row.orders });
  }

  let totalRevenue = 0;
  let totalOrders = 0;
  const outletBreakdown: AggregateStats['outletBreakdown'] = [];

  for (const store of stores) {
    const stats = orderMap.get(store.slug) ?? { revenue: 0, orders: 0 };
    totalRevenue += stats.revenue;
    totalOrders += stats.orders;
    outletBreakdown.push({
      slug: store.slug,
      name: store.name,
      revenue: stats.revenue,
      orders: stats.orders,
    });
  }

  return { totalRevenue, totalOrders, outletBreakdown };
}

export default { getOutlets, getAggregateStats };
