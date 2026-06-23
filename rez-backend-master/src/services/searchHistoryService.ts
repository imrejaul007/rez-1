import mongoose from 'mongoose';
import { SearchHistory } from '../models/SearchHistory';
import { logger } from '../config/logger';

/**
 * Search History Service
 * Provides async logging of search queries without blocking API responses
 */

interface LogSearchParams {
  userId: mongoose.Types.ObjectId;
  query: string;
  type: 'product' | 'store' | 'general';
  resultCount: number;
  region?: string;
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    location?: string;
    tags?: string[];
  };
}

/**
 * Log search query asynchronously
 * This function doesn't block - it fires and forgets
 */
export const logSearch = async (params: LogSearchParams): Promise<void> => {
  const { userId, query, type, resultCount, filters, region } = params;

  try {
    // Skip if query is empty
    if (!query || query.trim().length === 0) {
      return;
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Check for duplicate searches within last 5 minutes (non-blocking)
    const isDuplicate = await (SearchHistory as any).isDuplicate(
      userId,
      trimmedQuery,
      type,
      5
    );

    if (isDuplicate) {
      logger.debug('[SEARCH SERVICE] Duplicate search detected, skipping', { query: trimmedQuery });
      return;
    }

    // Merge region into filters.location if provided
    const mergedFilters = { ...(filters || {}) };
    if (region && typeof region === 'string') {
      mergedFilters.location = region.trim().toLowerCase();
    }

    // Create search history entry
    await SearchHistory.create({
      user: userId,
      query: trimmedQuery,
      type,
      resultCount: Number(resultCount) || 0,
      filters: mergedFilters
    });

    logger.info('[SEARCH SERVICE] Logged search', {
      userId: userId.toString(),
      query: trimmedQuery,
      type,
      resultCount
    });

    // Maintain max 50 entries per user (fire and forget)
    (SearchHistory as any).maintainUserLimit(userId, 50).catch((err: Error) => {
      logger.error('[SEARCH SERVICE] Error maintaining user limit', { error: err.message });
    });
  } catch (error) {
    // Log error but don't throw - we don't want to break the search API
    logger.error('[SEARCH SERVICE] Error logging search', { error });
  }
};

/**
 * Log search for products
 * Convenience wrapper for product searches
 */
export const logProductSearch = async (
  userId: mongoose.Types.ObjectId,
  query: string,
  resultCount: number,
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
  }
): Promise<void> => {
  // Fire and forget - don't await
  setImmediate(() => {
    logSearch({
      userId,
      query,
      type: 'product',
      resultCount,
      filters
    });
  });
};

/**
 * Log search for stores
 * Convenience wrapper for store searches
 */
export const logStoreSearch = async (
  userId: mongoose.Types.ObjectId,
  query: string,
  resultCount: number,
  filters?: {
    category?: string;
    location?: string;
    rating?: number;
    tags?: string[];
  }
): Promise<void> => {
  // Fire and forget - don't await
  setImmediate(() => {
    logSearch({
      userId,
      query,
      type: 'store',
      resultCount,
      filters
    });
  });
};

/**
 * Log general search
 * For global/multi-type searches
 */
export const logGeneralSearch = async (
  userId: mongoose.Types.ObjectId,
  query: string,
  resultCount: number
): Promise<void> => {
  // Fire and forget - don't await
  setImmediate(() => {
    logSearch({
      userId,
      query,
      type: 'general',
      resultCount
    });
  });
};

/**
 * Get user's search suggestions for autocomplete
 * Returns recent and popular searches combined
 */
export const getSearchSuggestions = async (
  userId: mongoose.Types.ObjectId,
  type?: 'product' | 'store' | 'general',
  limit: number = 10
): Promise<any[]> => {
  try {
    const query: any = { user: userId };

    if (type && ['product', 'store', 'general'].includes(type)) {
      query.type = type;
    }

    // Get unique recent searches with their metadata
    const suggestions = await SearchHistory.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$query',
          type: { $first: '$type' },
          lastSearched: { $first: '$createdAt' },
          searchCount: { $sum: 1 },
          avgResults: { $avg: '$resultCount' },
          clicked: { $max: '$clicked' }
        }
      },
      { $sort: { searchCount: -1, lastSearched: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          query: '$_id',
          type: 1,
          lastSearched: 1,
          searchCount: 1,
          avgResults: 1,
          clicked: 1
        }
      }
    ]);

    return suggestions;
  } catch (error) {
    logger.error('[SEARCH SERVICE] Error getting suggestions', { error });
    return [];
  }
};

/**
 * Clean up old search history entries
 * Should be run as a cron job
 */
export const cleanupOldSearches = async (daysToKeep: number = 30): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await SearchHistory.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info(`[SEARCH SERVICE] Cleaned up ${result.deletedCount} old search entries`);

    return result.deletedCount || 0;
  } catch (error) {
    logger.error('[SEARCH SERVICE] Error cleaning up old searches', { error });
    return 0;
  }
};

export default {
  logSearch,
  logProductSearch,
  logStoreSearch,
  logGeneralSearch,
  getSearchSuggestions,
  cleanupOldSearches
};
