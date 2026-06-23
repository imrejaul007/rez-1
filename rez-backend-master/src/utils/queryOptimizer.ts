/**
 * Query Optimization Utilities
 *
 * Helper functions to optimize MongoDB queries
 */

import { Query, Document } from 'mongoose';

/**
 * Apply .lean() to query for read-only operations
 * This returns plain JavaScript objects instead of Mongoose documents
 * ~5-10x faster for read operations
 */
export function optimizeReadQuery<T extends Document>(query: Query<T[], T>): Query<any[], T> {
  return query.lean();
}

/**
 * Apply field projection to limit returned fields
 */
export function selectFields<T extends Document>(
  query: Query<T[], T>,
  fields: string[]
): Query<T[], T> {
  return query.select(fields.join(' '));
}

/**
 * Apply both lean and projection
 */
export function optimizeAndProject<T extends Document>(
  query: Query<T[], T>,
  fields?: string[]
): Query<any[], T> {
  let optimized = query.lean();
  if (fields && fields.length > 0) {
    optimized = optimized.select(fields.join(' '));
  }
  return optimized;
}

/**
 * Add query hints for index usage
 */
export function hintIndex<T extends Document>(
  query: Query<T[], T>,
  indexSpec: any
): Query<T[], T> {
  return query.hint(indexSpec);
}

/**
 * Example optimized queries
 */
export const queryExamples = {
  /**
   * Optimized product list query
   */
  getProducts: (ProductModel: any, merchantId: string, page: number = 1, limit: number = 20) => {
    return ProductModel
      .find({ merchantId, status: 'active' })
      .select('name price images.url inventory.stock')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
  },

  /**
   * Optimized order list query
   */
  getOrders: (OrderModel: any, merchantId: string, status?: string) => {
    const filter: any = { merchantId };
    if (status) filter.status = status;

    return OrderModel
      .find(filter)
      .select('orderNumber customer total status createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  /**
   * Optimized aggregation for analytics
   */
  getAnalytics: (OrderModel: any, merchantId: string, startDate: Date, endDate: Date) => {
    return OrderModel.aggregate([
      {
        $match: {
          merchantId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]).exec();
  }
};

/**
 * Query performance tips
 */
export const performanceTips = {
  DO: [
    'Use .lean() for read-only queries',
    'Use .select() to limit returned fields',
    'Use indexes for frequently queried fields',
    'Use aggregation pipelines instead of multiple queries',
    'Use cursor-based pagination for large datasets',
    'Use .hint() to force index usage',
    'Use compound indexes for multi-field queries',
    'Use partial indexes for filtered queries',
    'Limit array sizes in documents',
    'Use projection in aggregation pipelines'
  ],
  DONT: [
    "Don't use .skip() for large offsets",
    "Don't query without indexes",
    "Don't return entire documents when only a few fields are needed",
    "Don't use regex without anchors (^)",
    "Don't use $where operator",
    "Don't use $exists: true without other filters",
    "Don't fetch all documents at once",
    "Don't forget to use .limit()",
    "Don't use multiple separate queries when aggregation can combine them",
    "Don't forget to monitor slow queries"
  ]
};
