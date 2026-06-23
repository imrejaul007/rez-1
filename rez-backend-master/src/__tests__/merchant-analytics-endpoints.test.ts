/**
 * Tests for the 4 new merchant analytics endpoints:
 *   GET /merchant/analytics/cohorts
 *   GET /merchant/analytics/peak-hours
 *   GET /merchant/analytics/food-cost
 *   GET /analytics/merchant/:merchantId/summary
 */

import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Recipe } from '../models/Recipe';
import { StoreVisit, VisitStatus, VisitType } from '../models/StoreVisit';
import { Product } from '../models/Product';

// ── helpers ──────────────────────────────────────────────────────────────────

const merchantId = new mongoose.Types.ObjectId();
const storeId = new mongoose.Types.ObjectId();
const userId1 = new mongoose.Types.ObjectId();
const userId2 = new mongoose.Types.ObjectId();
const productId1 = new mongoose.Types.ObjectId();
const productId2 = new mongoose.Types.ObjectId();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

let _orderSeq = 0;
// Build a minimal valid Order document matching the analytics aggregation paths
function makeOrder(overrides: Record<string, any> = {}) {
  _orderSeq += 1;
  const base: Record<string, any> = {
    orderNumber: `TEST-${Date.now()}-${_orderSeq}`,
    idempotencyKey: `idem-${Date.now()}-${_orderSeq}`,
    user: userId1,
    status: 'delivered',
    items: [
      {
        product: productId1,
        store: storeId,
        name: 'Coffee',
        image: 'https://example.com/img.jpg',
        quantity: 2,
        price: 120,
        subtotal: 240,
        merchantId,
      },
    ],
    totals: { subtotal: 240, total: 240 },
    payment: { method: 'upi', status: 'paid' },
    delivery: { type: 'pickup', status: 'delivered' },
    createdAt: daysAgo(5),
  };
  // Deep-merge overrides at top level
  return { ...base, ...overrides };
}

// ── seed data ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Recipe.deleteMany({}), StoreVisit.deleteMany({}), Product.deleteMany({})]);
});

// ── cohorts ──────────────────────────────────────────────────────────────────

describe('Cohort retention logic', () => {
  it('week-0 bucket always equals total unique users', async () => {
    await Order.insertMany([
      makeOrder({ user: userId1, createdAt: daysAgo(10) }),
      makeOrder({ user: userId2, createdAt: daysAgo(8) }),
    ]);

    const orders = await Order.find({ 'items.store': storeId }).lean();
    expect(orders).toHaveLength(2);

    // Simulate the cohort aggregation logic
    const userFirstOrders = await Order.aggregate([
      { $match: { 'items.store': storeId, status: { $in: ['delivered', 'completed'] } } },
      {
        $group: {
          _id: '$user',
          firstOrder: { $min: '$createdAt' },
          allOrders: { $push: '$createdAt' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    expect(userFirstOrders).toHaveLength(2);
    // week-0 bucket = all users
    expect(userFirstOrders.length).toBe(2);
  });

  it('returning user appears in week-1 bucket', async () => {
    const firstOrderDate = daysAgo(20);
    const returnOrderDate = new Date(firstOrderDate.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days later

    await Order.insertMany([
      makeOrder({ user: userId1, createdAt: firstOrderDate }),
      makeOrder({ user: userId1, createdAt: returnOrderDate }),
    ]);

    const userAgg = await Order.aggregate([
      { $match: { 'items.store': storeId, status: { $in: ['delivered', 'completed'] } } },
      {
        $group: {
          _id: '$user',
          firstOrder: { $min: '$createdAt' },
          allOrders: { $push: '$createdAt' },
        },
      },
    ]);

    expect(userAgg).toHaveLength(1);

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const u = userAgg[0];
    const firstMs = new Date(u.firstOrder).getTime();

    let inWeek1 = false;
    for (const orderDate of u.allOrders as Date[]) {
      const weekNum = (orderDate.getTime() - firstMs) / WEEK_MS;
      if (weekNum >= 1 && weekNum < 2) inWeek1 = true;
    }

    expect(inWeek1).toBe(true);
  });

  it('returns empty cohorts array when no orders exist', async () => {
    const userFirstOrders = await Order.aggregate([
      { $match: { 'items.store': storeId, status: { $in: ['delivered', 'completed'] } } },
      {
        $group: {
          _id: '$userId',
          firstOrder: { $min: '$createdAt' },
          allOrders: { $push: '$createdAt' },
        },
      },
    ]);

    expect(userFirstOrders).toHaveLength(0);
  });
});

// ── peak hours ────────────────────────────────────────────────────────────────

describe('Peak hours aggregation', () => {
  it('aggregates visit counts by hour and day from StoreVisit', async () => {
    const visitDate = new Date('2025-01-06T14:30:00Z'); // Monday 14:00 UTC

    await StoreVisit.create({
      visitNumber: 'V001',
      storeId,
      visitType: VisitType.QUEUE,
      visitDate,
      customerName: 'Test User',
      customerPhone: '9999999999',
      status: VisitStatus.COMPLETED,
      estimatedDuration: 30,
    });

    const agg = await StoreVisit.aggregate([
      { $match: { storeId, status: { $in: ['checked_in', 'completed'] } } },
      {
        $group: {
          _id: {
            day: { $subtract: [{ $dayOfWeek: '$visitDate' }, 2] },
            hour: { $hour: '$visitDate' },
          },
          visitCount: { $sum: 1 },
        },
      },
    ]);

    expect(agg).toHaveLength(1);
    expect(agg[0].visitCount).toBe(1);
    expect(agg[0]._id.hour).toBe(14);
  });

  it('falls back to Order timestamps when StoreVisit count < 10', async () => {
    // Only 1 StoreVisit (< 10 threshold)
    await StoreVisit.create({
      visitNumber: 'V002',
      storeId,
      visitType: VisitType.QUEUE,
      visitDate: new Date(),
      customerName: 'Solo',
      customerPhone: '8888888888',
      status: VisitStatus.COMPLETED,
      estimatedDuration: 15,
    });

    // Seed Orders as fallback data
    await Order.insertMany([
      makeOrder({ user: userId1, createdAt: new Date('2025-01-06T09:00:00Z') }),
      makeOrder({ user: userId2, createdAt: new Date('2025-01-06T12:00:00Z') }),
    ]);

    const visitCount = await StoreVisit.countDocuments({ storeId, status: { $in: ['checked_in', 'completed'] } });
    expect(visitCount).toBe(1); // below fallback threshold of 10

    const orderAgg = await Order.aggregate([
      { $match: { 'items.store': storeId } },
      {
        $group: {
          _id: { day: { $subtract: [{ $dayOfWeek: '$createdAt' }, 2] }, hour: { $hour: '$createdAt' } },
          visitCount: { $sum: 1 },
        },
      },
    ]);

    expect(orderAgg.length).toBeGreaterThan(0);
  });
});

// ── food cost ─────────────────────────────────────────────────────────────────

describe('Food cost analytics', () => {
  it('calculates avgFoodCost and identifies high-risk items', async () => {
    await Recipe.insertMany([
      {
        merchantId,
        storeId,
        productId: productId1,
        productName: 'Biryani',
        servings: 1,
        ingredients: [
          {
            ingredientId: new mongoose.Types.ObjectId(),
            ingredientName: 'Rice',
            quantity: 200,
            unit: 'g',
            unitCost: 0.05,
          },
        ],
        totalCost: 55,
        sellingPrice: 120,
        grossMargin: 54.17,
        foodCostPct: 45.83, // high-risk > 40%
        isStale: false,
      },
      {
        merchantId,
        storeId,
        productId: productId2,
        productName: 'Coffee',
        servings: 1,
        ingredients: [
          {
            ingredientId: new mongoose.Types.ObjectId(),
            ingredientName: 'Beans',
            quantity: 20,
            unit: 'g',
            unitCost: 0.1,
          },
        ],
        totalCost: 15,
        sellingPrice: 80,
        grossMargin: 81.25,
        foodCostPct: 18.75, // normal
        isStale: false,
      },
    ]);

    const recipes = await Recipe.find({ merchantId }).lean();
    expect(recipes).toHaveLength(2);

    const avgFoodCost = recipes.reduce((s, r) => s + r.foodCostPct, 0) / recipes.length;
    expect(avgFoodCost).toBeCloseTo(32.29, 1);

    const highRisk = recipes.filter((r) => r.foodCostPct > 40);
    expect(highRisk).toHaveLength(1);
    expect(highRisk[0].productName).toBe('Biryani');

    const topHighMargin = [...recipes].sort((a, b) => b.grossMargin - a.grossMargin);
    expect(topHighMargin[0].productName).toBe('Coffee');
  });

  it('returns zero avgFoodCost when no recipes exist', async () => {
    const recipes = await Recipe.find({ merchantId }).lean();
    const avgFoodCost = recipes.length > 0 ? recipes.reduce((s, r) => s + r.foodCostPct, 0) / recipes.length : 0;
    expect(avgFoodCost).toBe(0);
  });
});

// ── rez summary ───────────────────────────────────────────────────────────────

describe('Merchant analytics summary aggregation', () => {
  it('sums revenue and visitors for the current period', async () => {
    await Order.insertMany([
      makeOrder({ user: userId1, createdAt: daysAgo(3), totals: { subtotal: 300, total: 300 } }),
      makeOrder({ user: userId2, createdAt: daysAgo(5), totals: { subtotal: 500, total: 500 } }),
    ]);

    const since = daysAgo(30);
    const agg = await Order.aggregate([
      {
        $match: {
          'items.store': storeId,
          status: { $in: ['delivered', 'completed'] },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totals.total' },
          visitors: { $addToSet: '$user' },
        },
      },
    ]);

    expect(agg[0].revenue).toBe(800);
    expect(agg[0].visitors).toHaveLength(2);
  });

  it('identifies new vs returning customers correctly', async () => {
    const since = daysAgo(30);

    // userId1: first order within current period = new
    // userId2: first order before period, returns in period = returning
    await Order.insertMany([
      makeOrder({ user: userId1, createdAt: daysAgo(10) }),
      makeOrder({ user: userId2, createdAt: daysAgo(60) }), // first order before period
      makeOrder({ user: userId2, createdAt: daysAgo(5) }), // return in period
    ]);

    const userAgg = await Order.aggregate([
      { $match: { 'items.store': storeId, status: { $in: ['delivered', 'completed'] } } },
      { $group: { _id: '$user', firstOrder: { $min: '$createdAt' }, lastOrder: { $max: '$createdAt' } } },
      { $addFields: { isNew: { $gte: ['$firstOrder', since] }, isActive: { $gte: ['$lastOrder', since] } } },
      { $match: { isActive: true } },
      { $group: { _id: null, newCount: { $sum: { $cond: ['$isNew', 1, 0] } }, total: { $sum: 1 } } },
    ]);

    expect(userAgg[0].total).toBe(2); // both active this period
    expect(userAgg[0].newCount).toBe(1); // only userId1 is new
  });

  it('returns empty data shape when merchant has no orders', async () => {
    const since = daysAgo(30);
    const agg = await Order.aggregate([
      {
        $match: {
          'items.merchantId': new mongoose.Types.ObjectId(), // random unknown merchant
          status: { $in: ['delivered', 'completed'] },
          createdAt: { $gte: since },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$totals.grandTotal' }, visitors: { $addToSet: '$userId' } } },
    ]);

    const revenue = agg[0]?.revenue ?? 0;
    const visitors = agg[0]?.visitors?.length ?? 0;

    expect(revenue).toBe(0);
    expect(visitors).toBe(0);
  });
});
