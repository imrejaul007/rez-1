/**
 * smartDemandPushJob — Intelligent demand-gap push engine.
 *
 * Triggers targeted promotions automatically when a merchant has:
 *   1. Near-expiry products (perishables approaching waste)
 *   2. Low-demand hours (current hour below 60% of 4-week same-hour avg)
 *   3. Low-demand days (today's orders below 60% of 4-week same-weekday avg)
 *
 * For each trigger the job:
 *   a) Notifies the MERCHANT — "It's slow, try offering X% off"
 *   b) Pushes a CONSUMER deal alert to users within 3km
 *
 * Deduplication: Redis keys prevent the same store/trigger from spamming.
 *
 * Runs: every 30 minutes (demand-gap + near-expiry scan)
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { NotificationService } from '../services/notificationService';
import merchantNotificationService from '../services/merchantNotificationService';

const logger = createServiceLogger('smart-demand-push');

// ── Config ─────────────────────────────────────────────────────────────────────

const NEARBY_RADIUS_METERS = 3000; // 3km consumer radius
const DEMAND_THRESHOLD = 0.6; // below 60% of avg = "low demand"
const EXPIRY_WINDOW_HOURS = 4; // warn when expiry < 4 hours away
const LOCK_KEY = 'smart_demand_push';
const LOCK_TTL_SECONDS = 1500; // 25 min (job runs every 30)

// Dedup TTLs
const MERCHANT_DEDUP_TTL = 60 * 60; // notify merchant at most once/hour/trigger
const CONSUMER_DEDUP_TTL = 60 * 60 * 2; // notify consumer at most once/2h/store

// ── Types ──────────────────────────────────────────────────────────────────────

interface DemandTrigger {
  type: 'near_expiry' | 'low_hour' | 'low_day';
  storeId: string;
  storeName: string;
  merchantId: string;
  storeCoords: [number, number]; // [lng, lat]
  headline: string; // Consumer push headline
  body: string; // Consumer push body
  merchantMessage: string;
  suggestedDiscount?: number; // % to suggest to merchant
  productName?: string; // near_expiry only
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getHourOfWeek(): number {
  const d = new Date();
  return d.getDay() * 24 + d.getHours(); // 0-167
}

function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

// ── Near-expiry scan ───────────────────────────────────────────────────────────

async function findNearExpiryTriggers(): Promise<DemandTrigger[]> {
  const triggers: DemandTrigger[] = [];

  try {
    const Product = mongoose.models['Product'];
    const Store = mongoose.models['Store'];
    if (!Product || !Store) return triggers;

    const windowEnd = new Date(Date.now() + EXPIRY_WINDOW_HOURS * 60 * 60 * 1000);

    const expiringProducts = await Product.find({
      isActive: true,
      'inventory.stock': { $gt: 0 },
      expiresAt: { $lte: windowEnd, $gte: new Date() },
    })
      .populate('store', 'merchantId name location')
      .select('name expiresAt inventory store price')
      .lean();

    for (const product of expiringProducts as any[]) {
      const store = product.store;
      if (!store?.location?.coordinates || store.location.coordinates.length !== 2) continue;

      const minsLeft = Math.round((new Date(product.expiresAt).getTime() - Date.now()) / 60000);
      const suggestedDiscount = minsLeft < 60 ? 40 : 25;

      triggers.push({
        type: 'near_expiry',
        storeId: store._id.toString(),
        storeName: store.name,
        merchantId: store.merchantId?.toString() ?? '',
        storeCoords: store.location.coordinates as [number, number],
        headline: `Flash deal at ${store.name}!`,
        body: `${product.name} — ${suggestedDiscount}% off, selling fast before it expires.`,
        merchantMessage: `${product.name} expires in ${minsLeft} min. Consider a ${suggestedDiscount}% flash discount to avoid waste.`,
        suggestedDiscount,
        productName: product.name,
      });
    }
  } catch (err: any) {
    logger.warn('[SmartDemand] Near-expiry scan failed', { error: err.message });
  }

  return triggers;
}

// ── Low-demand scan ────────────────────────────────────────────────────────────

async function findLowDemandTriggers(): Promise<DemandTrigger[]> {
  const triggers: DemandTrigger[] = [];

  try {
    const Order = mongoose.models['Order'] || mongoose.models['MerchantOrder'];
    const Store = mongoose.models['Store'];
    if (!Order || !Store) return triggers;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday

    // --- Per-store hourly demand check ---
    // Count orders in current hour window across last 4 weeks (same weekday, same hour)
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 3600 * 1000);
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    // Aggregate current hour orders grouped by store
    const currentHourOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: hourStart },
          status: { $nin: ['cancelled', 'rejected'] },
          storeId: { $exists: true },
        },
      },
      { $group: { _id: '$storeId', count: { $sum: 1 } } },
    ]).allowDiskUse(true);

    const currentCounts: Record<string, number> = {};
    for (const row of currentHourOrders) {
      currentCounts[row._id.toString()] = row.count;
    }

    // Aggregate historical same-hour/weekday orders for normalization
    const historicalOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: fourWeeksAgo, $lt: hourStart },
          status: { $nin: ['cancelled', 'rejected'] },
          $expr: {
            $and: [
              { $eq: [{ $hour: '$createdAt' }, currentHour] },
              { $eq: [{ $dayOfWeek: '$createdAt' }, currentDay + 1] }, // Mongo dayOfWeek: 1=Sun
            ],
          },
          storeId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$storeId',
          totalOrders: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true);

    // 4 weeks = 4 data points for same weekday+hour
    const avgByStore: Record<string, number> = {};
    for (const row of historicalOrders) {
      avgByStore[row._id.toString()] = row.totalOrders / 4;
    }

    // Stores with significant historical data and current low traffic
    const lowDemandStoreIds: string[] = [];
    for (const [storeId, avg] of Object.entries(avgByStore)) {
      if (avg < 1) continue; // not enough history
      const current = currentCounts[storeId] ?? 0;
      if (current < avg * DEMAND_THRESHOLD) {
        lowDemandStoreIds.push(storeId);
      }
    }

    if (lowDemandStoreIds.length === 0) return triggers;

    // Fetch store details for affected stores (max 20 at once to avoid overload)
    const stores = await Store.find(
      {
        _id: { $in: lowDemandStoreIds.slice(0, 20) },
        'location.coordinates': { $exists: true },
        isActive: { $ne: false },
      },
      'merchantId name location',
    ).lean();

    for (const store of stores as any[]) {
      const storeId = store._id.toString();
      const avg = avgByStore[storeId] ?? 1;
      const current = currentCounts[storeId] ?? 0;
      const dropPct = Math.round((1 - current / avg) * 100);
      const suggestedDiscount = dropPct > 70 ? 20 : 10;

      triggers.push({
        type: 'low_hour',
        storeId,
        storeName: store.name,
        merchantId: store.merchantId?.toString() ?? '',
        storeCoords: store.location.coordinates as [number, number],
        headline: `${store.name} deal this hour`,
        body: `Save ${suggestedDiscount}% right now — limited-time offer from ${store.name}.`,
        merchantMessage: `Orders are ${formatPercent(dropPct)} below your usual ${currentHour}:00 traffic. Try a ${suggestedDiscount}% flash offer to drive footfall.`,
        suggestedDiscount,
      });
    }
  } catch (err: any) {
    logger.warn('[SmartDemand] Low-demand scan failed', { error: err.message });
  }

  return triggers;
}

// ── Push helpers ───────────────────────────────────────────────────────────────

async function notifyNearbyConsumers(trigger: DemandTrigger): Promise<number> {
  const User = mongoose.models['User'];
  const UserSettings = mongoose.models['UserSettings'];
  if (!User) return 0;

  const [lng, lat] = trigger.storeCoords;
  let notified = 0;

  const nearbyUsers = await User.find(
    {
      'profile.location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: NEARBY_RADIUS_METERS,
        },
      },
      isActive: { $ne: false },
    },
    '_id',
  ).lean();

  if (!nearbyUsers.length) return 0;

  const disabledSet = new Set<string>();
  if (UserSettings) {
    const disabled = await UserSettings.find({ 'notifications.push.promotions': false }, 'user').lean();
    for (const s of disabled as any[]) disabledSet.add(s.user.toString());
  }

  for (const user of nearbyUsers as any[]) {
    const userId = user._id.toString();
    if (disabledSet.has(userId)) continue;

    const dedupKey = `smartdeal:consumer:${trigger.storeId}:${trigger.type}:${userId}`;
    if (await redisService.get(dedupKey)) continue;

    try {
      await NotificationService.createNotification({
        userId: new mongoose.Types.ObjectId(userId),
        title: trigger.headline,
        message: trigger.body,
        type: 'promotional',
        category: 'promotional',
        priority: 'high',
        deliveryChannels: ['push', 'in_app'],
        data: {
          storeId: trigger.storeId,
          deepLink: `/store/${trigger.storeId}`,
          metadata: { triggerType: trigger.type, suggestedDiscount: trigger.suggestedDiscount },
        },
        source: 'automated',
      });
      await redisService.set(dedupKey, '1', CONSUMER_DEDUP_TTL);
      notified++;
    } catch (err: any) {
      logger.warn('[SmartDemand] Consumer notify failed', { userId, error: err.message });
    }
  }

  return notified;
}

async function notifyMerchant(trigger: DemandTrigger): Promise<void> {
  if (!trigger.merchantId) return;

  const dedupKey = `smartdeal:merchant:${trigger.storeId}:${trigger.type}`;
  if (await redisService.get(dedupKey)) return;

  try {
    await merchantNotificationService.createNotification({
      merchantId: trigger.merchantId,
      title: trigger.type === 'near_expiry' ? 'Product Expiry Alert' : 'Low Traffic Alert',
      message: trigger.merchantMessage,
      type: 'info',
      category: 'general',
      priority: 'medium',
      data: {
        storeId: trigger.storeId,
        deepLink: `/dashboard/offers/create?storeId=${trigger.storeId}`,
        actionButton: { text: 'Create Offer', action: 'navigate' as const, target: `/dashboard/offers/create` },
      },
    });
    await redisService.set(dedupKey, '1', MERCHANT_DEDUP_TTL);
  } catch (err: any) {
    logger.warn('[SmartDemand] Merchant notify failed', {
      merchantId: trigger.merchantId,
      error: err.message,
    });
  }
}

// ── Main runner ────────────────────────────────────────────────────────────────

async function runSmartDemandPush(): Promise<void> {
  const [expiryTriggers, demandTriggers] = await Promise.all([findNearExpiryTriggers(), findLowDemandTriggers()]);

  const triggers = [...expiryTriggers, ...demandTriggers];

  if (!triggers.length) {
    logger.debug('[SmartDemand] No triggers this cycle');
    return;
  }

  logger.info(
    `[SmartDemand] Processing ${triggers.length} triggers (expiry=${expiryTriggers.length}, demand=${demandTriggers.length})`,
  );

  let totalConsumerNotifications = 0;

  for (const trigger of triggers) {
    const [consumerCount] = await Promise.all([notifyNearbyConsumers(trigger), notifyMerchant(trigger)]);
    totalConsumerNotifications += consumerCount;
  }

  logger.info('[SmartDemand] Cycle complete', {
    triggers: triggers.length,
    consumerNotifications: totalConsumerNotifications,
  });
}

// ── Init ───────────────────────────────────────────────────────────────────────

export function initializeSmartDemandPushJob(): void {
  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!lock) return;
    try {
      await runSmartDemandPush();
    } catch (err: any) {
      logger.error('[SmartDemand] Job failed', { error: err.message });
    } finally {
      await redisService.releaseLock(LOCK_KEY, lock);
    }
  });

  logger.info('[SmartDemand] Smart demand push job initialized (every 30 min)');
}

export { runSmartDemandPush };
