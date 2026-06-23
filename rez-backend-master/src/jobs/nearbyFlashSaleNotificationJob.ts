import cron from 'node-cron';
import mongoose from 'mongoose';
import FlashSale from '../models/FlashSale';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { UserSettings } from '../models/UserSettings';
import { NotificationService } from '../services/notificationService';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('nearby-flash-sale-notification');

const NEARBY_RADIUS_METERS = 2000; // 2km
const LOCK_KEY = 'nearby_flash_sale_notification';
const LOCK_TTL = 1500; // 25 minutes (job runs every 30)

/**
 * Sends push notifications for active flash sales to nearby users (within 2km).
 * Deduplicates via Redis keys so each user is notified at most once per flash sale.
 */
async function runNearbyFlashSaleNotifications(): Promise<void> {
  const now = new Date();

  // Find active flash sales with notifyOnStart enabled
  const activeSales = await FlashSale.find({
    enabled: true,
    status: { $in: ['active', 'ending_soon'] },
    startTime: { $lte: now },
    endTime: { $gte: now },
    notifyOnStart: true,
  })
    .populate('stores', 'location name')
    .lean();

  if (!activeSales.length) {
    logger.debug('No active flash sales to notify about');
    return;
  }

  logger.info(`Processing ${activeSales.length} active flash sales for nearby notifications`);

  let totalNotified = 0;

  for (const sale of activeSales) {
    // Collect store locations for this flash sale
    const storeIds = sale.stores?.length
      ? sale.stores.map((s: any) => s._id || s)
      : sale.products?.length
        ? await getStoreIdsFromProducts(sale.products)
        : [];

    if (!storeIds.length) continue;

    // Fetch stores with coordinates
    const stores = sale.stores?.length
      ? (sale.stores as any[]).filter((s: any) => s.location?.coordinates?.length === 2)
      : await Store.find(
          { _id: { $in: storeIds }, 'location.coordinates': { $exists: true, $ne: [] } },
          'location name'
        ).lean();

    if (!stores.length) continue;

    // Get users who have push.promotions enabled
    const usersWithPromosDisabled = await UserSettings.find(
      { 'notifications.push.promotions': false },
      'user'
    ).lean();
    const disabledUserIds = new Set(usersWithPromosDisabled.map((s: any) => s.user.toString()));

    // For each store location, find nearby users
    for (const store of stores) {
      const coords = (store as any).location?.coordinates;
      if (!coords || coords.length !== 2) continue;

      const storeName = (store as any).name || 'a store near you';
      const saleId = sale._id.toString();
      const storeId = ((store as any)._id || store).toString();

      // Find users with stored location within radius
      const nearbyUsers = await User.find(
        {
          'profile.location.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: coords },
              $maxDistance: NEARBY_RADIUS_METERS,
            },
          },
          isActive: { $ne: false },
        },
        '_id'
      ).lean();

      if (!nearbyUsers.length) continue;

      // Calculate TTL for Redis dedup key — remaining sale duration in seconds
      const saleTtl = Math.max(
        60,
        Math.ceil((new Date(sale.endTime).getTime() - now.getTime()) / 1000)
      );

      for (const user of nearbyUsers) {
        const userId = user._id.toString();

        // Skip users who disabled push promotions
        if (disabledUserIds.has(userId)) continue;

        // Deduplicate: check if already notified for this sale
        const dedupKey = `flashsale:notified:${saleId}:${userId}`;
        const alreadySent = await redisService.get(dedupKey);
        if (alreadySent) continue;

        // Send notification
        try {
          await NotificationService.createNotification({
            userId: new mongoose.Types.ObjectId(userId),
            title: `Flash Sale near you!`,
            message: `${sale.title} — ${sale.discountPercentage}% off at ${storeName}. Hurry, limited stock!`,
            type: 'promotional',
            category: 'promotional',
            priority: 'high',
            deliveryChannels: ['push', 'in_app'],
            data: {
              storeId,
              deepLink: `/flash-sale/${saleId}`,
              metadata: { flashSaleId: saleId },
            },
            source: 'automated',
          });

          // Mark as notified
          await redisService.set(dedupKey, '1', saleTtl);
          totalNotified++;
        } catch (err: any) {
          logger.error(`Failed to notify user ${userId} for sale ${saleId}`, {
            error: err.message,
          });
        }
      }
    }
  }

  logger.info(`Nearby flash sale notifications sent: ${totalNotified}`);
}

/**
 * If flash sale has products but no stores, look up stores from products.
 */
async function getStoreIdsFromProducts(
  productIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  try {
    const Product = mongoose.model('Product');
    const products = await Product.find(
      { _id: { $in: productIds } },
      'store'
    ).lean();
    const storeIds = [...new Set(products.map((p: any) => p.store).filter(Boolean))];
    return storeIds;
  } catch {
    return [];
  }
}

/**
 * Initialize the nearby flash sale notification cron job.
 * Runs every 30 minutes with Redis distributed lock.
 */
export function initializeNearbyFlashSaleNotificationJob(): void {
  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lock) return;
    try {
      await runNearbyFlashSaleNotifications();
    } catch (err: any) {
      logger.error('Nearby flash sale notification job failed', { error: err.message });
    } finally {
      await redisService.releaseLock(LOCK_KEY, lock);
    }
  });

  logger.info('Nearby flash sale notification job initialized (runs every 30 minutes)');
}

export { runNearbyFlashSaleNotifications };
