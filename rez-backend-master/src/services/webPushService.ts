/**
 * Web Push Service
 *
 * Stores Web Push API subscriptions and sends push notifications to browsers.
 * Requires the `web-push` npm package: npm install web-push @types/web-push
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY  — from `web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY — from `web-push generate-vapid-keys`
 *   VAPID_EMAIL       — mailto: address used in VAPID subject
 */

import { createServiceLogger } from '../config/logger';
import { WebPushSubscription } from '../models/WebPushSubscription';
import type { Types } from 'mongoose';

const logger = createServiceLogger('web-push');

// Lazy-load web-push so the service still boots when the package is absent
// (e.g., during early development). Sending will fail gracefully with a warning.
type WebPushModule = typeof import('web-push');
let _webPush: WebPushModule | null = null;

async function getWebPush(): Promise<WebPushModule | null> {
  if (_webPush) return _webPush;
  try {
    _webPush = (await import('web-push')) as WebPushModule;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:no-reply@rez.money';
    if (publicKey && privateKey) {
      _webPush.setVapidDetails(email, publicKey, privateKey);
      logger.info('[WEB-PUSH] VAPID keys configured');
    } else {
      logger.warn('[WEB-PUSH] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing — push sending disabled');
    }
    return _webPush;
  } catch {
    logger.warn('[WEB-PUSH] web-push package not installed. Run: npm install web-push @types/web-push');
    return null;
  }
}

export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Upserts a Web Push subscription for the given user.
 * Safe to call on every subscribe event — will not create duplicates.
 */
export async function saveWebPushSubscription(
  userId: string | Types.ObjectId,
  subscription: WebPushSubscriptionInput,
): Promise<void> {
  await WebPushSubscription.findOneAndUpdate(
    { userId, endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    },
    { upsert: true, new: true },
  );
  logger.info(`[WEB-PUSH] Subscription saved for user ${userId}`);
}

export interface WebPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Sends a web push notification to all subscriptions belonging to a user.
 * Invalid / expired subscriptions (410 Gone) are removed automatically.
 */
export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<void> {
  const webPush = await getWebPush();
  if (!webPush) return;

  const subscriptions = await WebPushSubscription.find({ userId }).lean();
  if (!subscriptions.length) return;

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush!.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, notification);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired or unsubscribed — clean up
          await WebPushSubscription.deleteOne({ _id: sub._id });
          logger.info(`[WEB-PUSH] Removed expired subscription ${sub._id} for user ${userId}`);
        } else {
          logger.warn(`[WEB-PUSH] Failed to send to subscription ${sub._id}:`, err);
        }
      }
    }),
  );
}
