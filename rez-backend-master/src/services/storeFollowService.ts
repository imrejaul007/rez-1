import { logger } from '../config/logger';
import { Store } from '../models/Store';
import { Wishlist } from '../models/Wishlist';

/**
 * Store Follow Service
 * Manages the followers count for stores based on wishlist follows
 */

/**
 * Increment the followers count for a store
 * Called when a user adds a store to their wishlist
 */
export const incrementFollowers = async (storeId: string): Promise<void> => {
  try {
    logger.info(`[StoreFollowService] Incrementing followers count for store: ${storeId}`);

    const store = await Store.findByIdAndUpdate(
      storeId,
      { $inc: { 'analytics.followersCount': 1 } },
      { new: true }
    );

    if (!store) {
      logger.error(`[StoreFollowService] Store not found: ${storeId}`);
      throw new Error('Store not found');
    }

    logger.info(`[StoreFollowService] Store ${storeId} followers count incremented to: ${store.analytics.followersCount}`);
  } catch (error) {
    logger.error(`[StoreFollowService] Error incrementing followers for store ${storeId}:`, error);
    throw error;
  }
};

/**
 * Decrement the followers count for a store
 * Called when a user removes a store from their wishlist
 * Ensures count doesn't go below 0
 */
export const decrementFollowers = async (storeId: string): Promise<void> => {
  try {
    logger.info(`[StoreFollowService] Decrementing followers count for store: ${storeId}`);

    const store = await Store.findById(storeId);

    if (!store) {
      logger.error(`[StoreFollowService] Store not found: ${storeId}`);
      throw new Error('Store not found');
    }

    // Only decrement if count is greater than 0
    if (store.analytics.followersCount > 0) {
      store.analytics.followersCount -= 1;
      await store.save();
      logger.info(`[StoreFollowService] Store ${storeId} followers count decremented to: ${store.analytics.followersCount}`);
    } else {
      logger.warn(`[StoreFollowService] Store ${storeId} followers count already at 0, skipping decrement`);
    }
  } catch (error) {
    logger.error(`[StoreFollowService] Error decrementing followers for store ${storeId}:`, error);
    throw error;
  }
};

/**
 * Recalculate the followers count for a store
 * Counts all wishlists that contain this store
 * Useful for fixing any discrepancies
 */
export const recalculateFollowers = async (storeId: string): Promise<number> => {
  try {
    logger.info(`[StoreFollowService] Recalculating followers count for store: ${storeId}`);

    // Count all wishlists that have this store
    const count = await Wishlist.countDocuments({
      'items.itemType': 'Store',
      'items.itemId': storeId
    });

    logger.info(`[StoreFollowService] Found ${count} followers for store ${storeId}`);

    // Update the store with the accurate count
    const store = await Store.findByIdAndUpdate(
      storeId,
      { $set: { 'analytics.followersCount': count } },
      { new: true }
    );

    if (!store) {
      logger.error(`[StoreFollowService] Store not found: ${storeId}`);
      throw new Error('Store not found');
    }

    logger.info(`[StoreFollowService] Store ${storeId} followers count updated to: ${store.analytics.followersCount}`);

    return count;
  } catch (error) {
    logger.error(`[StoreFollowService] Error recalculating followers for store ${storeId}:`, error);
    throw error;
  }
};

/**
 * Get the current followers count for a store
 */
export const getFollowersCount = async (storeId: string): Promise<number> => {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      logger.error(`[StoreFollowService] Store not found: ${storeId}`);
      throw new Error('Store not found');
    }

    return store.analytics.followersCount;
  } catch (error) {
    logger.error(`[StoreFollowService] Error getting followers count for store ${storeId}:`, error);
    throw error;
  }
};
