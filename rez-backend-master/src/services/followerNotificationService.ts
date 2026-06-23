import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { Wishlist } from '../models/Wishlist';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { NotificationService } from './notificationService';

/**
 * Follower Notification Service
 * Manages notifications for store followers
 */

interface NotificationPayload {
  title: string;
  message: string;
  type: 'new_offer' | 'new_product' | 'price_drop' | 'back_in_stock' | 'store_update' | 'new_menu_item';
  data?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
}

interface NotificationResult {
  sent: number;
  failed: number;
  totalFollowers: number;
}

/**
 * Get all followers of a store
 * @param storeId - Store ID
 * @returns Array of user IDs who follow the store
 */
export async function getStoreFollowers(storeId: string | Types.ObjectId): Promise<string[]> {
  try {
    const wishlists = await Wishlist.find({
      'items': {
        $elemMatch: {
          itemType: 'Store',
          itemId: storeId
        }
      }
    }).select('user').lean();

    // Get unique user IDs
    const userIdSet = new Set<string>();
    wishlists.forEach(w => userIdSet.add(w.user.toString()));
    const followerIds = Array.from(userIdSet);

    logger.info(`📢 [FOLLOWER SERVICE] Store ${storeId} has ${followerIds.length} followers`);

    return followerIds;
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error getting followers for store ${storeId}:`, error);
    return [];
  }
}

/**
 * Get follower count for a store
 * @param storeId - Store ID
 * @returns Number of followers
 */
export async function getStoreFollowerCount(storeId: string | Types.ObjectId): Promise<number> {
  try {
    const count = await Wishlist.countDocuments({
      'items': {
        $elemMatch: {
          itemType: 'Store',
          itemId: storeId
        }
      }
    });

    return count;
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error getting follower count:`, error);
    return 0;
  }
}

/**
 * Send notification to all followers of a store
 * @param storeId - Store ID
 * @param notification - Notification payload
 * @returns Result with sent/failed counts
 */
export async function notifyFollowers(
  storeId: string | Types.ObjectId,
  notification: NotificationPayload
): Promise<NotificationResult> {
  const followerIds = await getStoreFollowers(storeId);

  if (followerIds.length === 0) {
    logger.info(`📢 [FOLLOWER SERVICE] No followers to notify for store ${storeId}`);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }

  let sent = 0;
  let failed = 0;

  logger.info(`📢 [FOLLOWER SERVICE] Sending notifications to ${followerIds.length} followers`);

  // Send notifications to all followers
  for (const userId of followerIds) {
    try {
      await NotificationService.createNotification({
        userId,
        title: notification.title,
        message: notification.message,
        type: 'promotional',
        category: 'promotional',
        priority: 'medium',
        data: {
          storeId: storeId.toString(),
          imageUrl: notification.imageUrl,
          deepLink: notification.deepLink,
          ...notification.data,
          actionButton: notification.deepLink ? {
            text: 'View Details',
            action: 'navigate',
            target: notification.deepLink
          } : undefined
        },
        deliveryChannels: ['push', 'in_app'],
        source: 'automated'
      });

      sent++;
    } catch (error) {
      logger.error(`❌ [FOLLOWER SERVICE] Failed to notify user ${userId}:`, error);
      failed++;
    }
  }

  logger.info(`✅ [FOLLOWER SERVICE] Notification sent: ${sent}/${followerIds.length} (${failed} failed)`);

  return { sent, failed, totalFollowers: followerIds.length };
}

/**
 * Notify followers about a new offer
 * @param storeId - Store ID
 * @param offer - Offer details
 * @returns Result with sent/failed counts
 */
export async function notifyNewOffer(
  storeId: string | Types.ObjectId,
  offer: {
    _id: string | Types.ObjectId;
    title: string;
    description?: string;
    discount?: number;
    imageUrl?: string;
  }
): Promise<NotificationResult> {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      throw new Error('Store not found');
    }

    const discountText = offer.discount ? `${offer.discount}% off` : 'Special offer';

    return notifyFollowers(storeId, {
      title: `🎉 New offer from ${store.name}!`,
      message: offer.title || `${discountText} - Don't miss out!`,
      type: 'new_offer',
      imageUrl: offer.imageUrl,
      deepLink: `/stores/${store.slug}/offers/${offer._id}`,
      data: {
        offerId: offer._id.toString(),
        storeSlug: store.slug,
        offerTitle: offer.title
      }
    });
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error notifying new offer:`, error);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }
}

/**
 * Notify followers about a new product
 * @param storeId - Store ID
 * @param product - Product details
 * @returns Result with sent/failed counts
 */
export async function notifyNewProduct(
  storeId: string | Types.ObjectId,
  product: {
    _id: string | Types.ObjectId;
    name: string;
    description?: string;
    pricing?: { selling?: number };
    images?: { url: string }[];
    slug?: string;
  }
): Promise<NotificationResult> {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      throw new Error('Store not found');
    }

    const priceText = product.pricing?.selling ? ` - ₹${product.pricing.selling}` : '';
    const imageUrl = product.images?.[0]?.url;

    return notifyFollowers(storeId, {
      title: `✨ New arrival at ${store.name}`,
      message: `${product.name}${priceText}`,
      type: 'new_product',
      imageUrl,
      deepLink: `/product/${product.slug || product._id}`,
      data: {
        productId: product._id.toString(),
        productName: product.name,
        storeSlug: store.slug
      }
    });
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error notifying new product:`, error);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }
}

/**
 * Notify followers about a price drop
 * @param storeId - Store ID
 * @param product - Product details
 * @param oldPrice - Previous price
 * @param newPrice - New price
 * @returns Result with sent/failed counts
 */
export async function notifyPriceDrop(
  storeId: string | Types.ObjectId,
  product: {
    _id: string | Types.ObjectId;
    name: string;
    slug?: string;
    images?: { url: string }[];
  },
  oldPrice: number,
  newPrice: number
): Promise<NotificationResult> {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      throw new Error('Store not found');
    }

    const discount = Math.round((1 - newPrice / oldPrice) * 100);
    const imageUrl = product.images?.[0]?.url;

    return notifyFollowers(storeId, {
      title: `💰 Price drop at ${store.name}!`,
      message: `${product.name} is now ${discount}% off - ₹${oldPrice} → ₹${newPrice}`,
      type: 'price_drop',
      imageUrl,
      deepLink: `/product/${product.slug || product._id}`,
      data: {
        productId: product._id.toString(),
        productName: product.name,
        oldPrice,
        newPrice,
        discount,
        storeSlug: store.slug
      }
    });
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error notifying price drop:`, error);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }
}

/**
 * Notify followers about back in stock product
 * @param storeId - Store ID
 * @param product - Product details
 * @returns Result with sent/failed counts
 */
export async function notifyBackInStock(
  storeId: string | Types.ObjectId,
  product: {
    _id: string | Types.ObjectId;
    name: string;
    slug?: string;
    images?: { url: string }[];
  }
): Promise<NotificationResult> {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      throw new Error('Store not found');
    }

    const imageUrl = product.images?.[0]?.url;

    return notifyFollowers(storeId, {
      title: `📦 Back in stock at ${store.name}!`,
      message: `${product.name} is now available again`,
      type: 'back_in_stock',
      imageUrl,
      deepLink: `/product/${product.slug || product._id}`,
      data: {
        productId: product._id.toString(),
        productName: product.name,
        storeSlug: store.slug
      }
    });
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error notifying back in stock:`, error);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }
}

/**
 * Notify followers about a new menu item (for restaurants)
 * @param storeId - Store ID
 * @param menuItem - Menu item details
 * @returns Result with sent/failed counts
 */
export async function notifyNewMenuItem(
  storeId: string | Types.ObjectId,
  menuItem: {
    _id: string | Types.ObjectId;
    name: string;
    description?: string;
    price?: number;
    image?: string;
  }
): Promise<NotificationResult> {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      throw new Error('Store not found');
    }

    const priceText = menuItem.price ? ` - ₹${menuItem.price}` : '';

    return notifyFollowers(storeId, {
      title: `🍽️ New on the menu at ${store.name}`,
      message: `Try our new ${menuItem.name}${priceText}`,
      type: 'new_menu_item',
      imageUrl: menuItem.image,
      deepLink: `/stores/${store.slug}/menu`,
      data: {
        menuItemId: menuItem._id.toString(),
        menuItemName: menuItem.name,
        storeSlug: store.slug
      }
    });
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error notifying new menu item:`, error);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }
}

/**
 * Notify followers about a store update/announcement
 * @param storeId - Store ID
 * @param announcement - Announcement details
 * @returns Result with sent/failed counts
 */
export async function notifyStoreUpdate(
  storeId: string | Types.ObjectId,
  announcement: {
    title: string;
    message: string;
    imageUrl?: string;
  }
): Promise<NotificationResult> {
  try {
    const store = await Store.findById(storeId).lean();

    if (!store) {
      throw new Error('Store not found');
    }

    return notifyFollowers(storeId, {
      title: announcement.title,
      message: announcement.message,
      type: 'store_update',
      imageUrl: announcement.imageUrl,
      deepLink: `/stores/${store.slug}`,
      data: {
        storeSlug: store.slug,
        storeName: store.name
      }
    });
  } catch (error) {
    logger.error(`❌ [FOLLOWER SERVICE] Error notifying store update:`, error);
    return { sent: 0, failed: 0, totalFollowers: 0 };
  }
}

/**
 * Send bulk notifications to multiple stores' followers
 * @param notifications - Array of store IDs with their notifications
 * @returns Array of results
 */
export async function notifyMultipleStoreFollowers(
  notifications: Array<{
    storeId: string | Types.ObjectId;
    notification: NotificationPayload;
  }>
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const { storeId, notification } of notifications) {
    const result = await notifyFollowers(storeId, notification);
    results.push(result);
  }

  return results;
}

export default {
  getStoreFollowers,
  getStoreFollowerCount,
  notifyFollowers,
  notifyNewOffer,
  notifyNewProduct,
  notifyPriceDrop,
  notifyBackInStock,
  notifyNewMenuItem,
  notifyStoreUpdate,
  notifyMultipleStoreFollowers
};
