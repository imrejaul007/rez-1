/**
 * Pagination Helper Utilities
 *
 * Provides both offset-based and cursor-based pagination
 *
 * Cursor-based pagination is more efficient for large datasets
 * because it doesn't require counting all documents
 */

import { Document, Model, FilterQuery, QueryOptions } from 'mongoose';
import { logger } from '../config/logger';

export interface OffsetPaginationOptions {
  page?: number;
  limit?: number;
  sort?: any;
  select?: string;
}

export interface OffsetPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  sort?: any;
  select?: string;
  sortField?: string;
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasNext: boolean;
    limit: number;
  };
}

/**
 * Offset-based pagination (traditional page-based)
 * Good for small to medium datasets
 */
export async function paginateOffset<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  options: OffsetPaginationOptions = {}
): Promise<OffsetPaginationResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const query = model
      .find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit);
  
  if (options.select) {
    query.select(options.select);
  }
  
  const [data, total] = await Promise.all([
    query.lean().exec(),
    model.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
}

/**
 * Cursor-based pagination (more efficient for large datasets)
 * Does not require total count, more scalable
 */
export async function paginateCursor<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  options: CursorPaginationOptions = {}
): Promise<CursorPaginationResult<T>> {
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const sortField = options.sortField || '_id';
  const sort = options.sort || { [sortField]: -1 };

  // Build query with cursor
  const query: FilterQuery<T> = { ...filter };

  if (options.cursor) {
    try {
      const decodedCursor = Buffer.from(options.cursor, 'base64').toString('utf-8');
      const cursorValue = JSON.parse(decodedCursor);

      // Add cursor condition based on sort direction
      const sortDirection = Object.values(sort)[0] as number;
      const operator = sortDirection === 1 ? '$gt' : '$lt';
      (query as any)[sortField] = { [operator]: cursorValue };
    } catch (error) {
      logger.error('Invalid cursor:', error);
    }
  }

  // Fetch limit + 1 to check if there are more results
  const findQuery = model.find(query);
  if (options.select) {
    findQuery.select(options.select);
  }
  const data = await findQuery
    .sort(sort)
    .limit(limit + 1)
    .lean()
    .exec();

  // Check if there are more results
  const hasNext = data.length > limit;
  const results = hasNext ? data.slice(0, limit) : data;

  // Generate next cursor from last item
  let nextCursor: string | null = null;
  if (hasNext && results.length > 0) {
    const lastItem = results[results.length - 1] as any;
    const cursorValue = lastItem[sortField];
    nextCursor = Buffer.from(JSON.stringify(cursorValue)).toString('base64');
  }

  return {
    data: results as T[],
    pagination: {
      nextCursor,
      hasNext,
      limit
    }
  };
}

/**
 * Helper to build pagination response
 */
export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
}

/**
 * Extract pagination params from request query
 */
export function extractPaginationParams(query: any): {
  page: number;
  limit: number;
  cursor?: string;
} {
  return {
    page: parseInt(query.page) || 1,
    limit: Math.min(100, parseInt(query.limit) || 20),
    cursor: query.cursor
  };
}

/**
 * Extract sort params from request query
 */
export function extractSortParams(query: any, defaultSort: any = { createdAt: -1 }): any {
  if (!query.sortBy) return defaultSort;

  const sortField = query.sortBy;
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  return { [sortField]: sortOrder };
}

/**
 * Advanced pagination with aggregation pipeline
 */
export async function paginateAggregation<T>(
  model: Model<any>,
  pipeline: any[],
  options: OffsetPaginationOptions = {}
): Promise<OffsetPaginationResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  // Add pagination stages to pipeline
  const paginatedPipeline = [
    ...pipeline,
    { $skip: skip },
    { $limit: limit }
  ];

  // Count total documents
  const countPipeline = [
    ...pipeline,
    { $count: 'total' }
  ];

  const [data, countResult] = await Promise.all([
    model.aggregate(paginatedPipeline).exec(),
    model.aggregate(countPipeline).exec()
  ]);

  const total = countResult[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
}

/**
 * Optimize query with field projection
 */
export function optimizeQueryProjection(fields?: string): any {
  if (!fields) return undefined;

  const fieldArray = fields.split(',').map(f => f.trim());
  const projection: any = {};

  fieldArray.forEach(field => {
    if (field.startsWith('-')) {
      projection[field.substring(1)] = 0;
    } else {
      projection[field] = 1;
    }
  });

  return projection;
}
