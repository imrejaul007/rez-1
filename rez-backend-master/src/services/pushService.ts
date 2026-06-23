/**
 * Push Notification Service
 *
 * Handles push delivery via multiple providers:
 * - Firebase Cloud Messaging (FCM)
 * - OneSignal
 * - Custom HTTP API
 *
 * Usage in job processor:
 * ```typescript
 * await pushService.send({
 *   userId: 'user-123',
 *   title: 'Order Confirmed',
 *   body: 'Your order #123 has been confirmed'
 * });
 * ```
 */

import axios from 'axios';
import { User } from '../models/User';
import { logger } from '../config/logger';

export interface PushOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  deepLink?: string;
}

export interface PushResult {
  success: boolean;
  pushId?: string;
  sentCount?: number;
  error?: string;
}

/**
 * Retrieve FCM/Expo device tokens for a user from the database.
 * Returns an empty array if the user has no stored push tokens.
 */
async function getUserDeviceTokens(userId: string): Promise<string[]> {
  try {
    const user = await User.findById(userId).select('pushTokens fcmToken deviceToken').lean();
    if (!user) return [];

    // Collect tokens from all known fields
    const tokens: string[] = [];

    // pushTokens is the canonical array used by pushNotificationService
    if (Array.isArray((user as any).pushTokens)) {
      for (const entry of (user as any).pushTokens) {
        const t = typeof entry === 'string' ? entry : entry?.token;
        if (t) tokens.push(t);
      }
    }

    // Legacy scalar fields some older user documents may have
    if ((user as any).fcmToken) tokens.push((user as any).fcmToken);
    if ((user as any).deviceToken) tokens.push((user as any).deviceToken);

    // Deduplicate
    return [...new Set(tokens)];
  } catch (err: any) {
    logger.warn('[PushService] Failed to fetch device tokens for user', { userId, error: err.message });
    return [];
  }
}

/**
 * Send a push notification via Expo's push API.
 * Used when the token starts with "ExponentPushToken".
 */
async function sendViaExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; pushId?: string }> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, data: data || {}, sound: 'default', priority: 'high' }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error('[PushService] Expo push API error', { token: token.slice(0, 30), err });
    return { success: false };
  }

  const result: any = await response.json();
  const ticket = result?.data;
  if (ticket?.status === 'error') {
    logger.error('[PushService] Expo push ticket error', { details: ticket.details });
    return { success: false };
  }

  return { success: true, pushId: ticket?.id };
}

/**
 * Send a push notification via FCM legacy HTTP API (no firebase-admin required).
 * Supports ExponentPushToken tokens by delegating to Expo's push API.
 */
async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; pushId?: string }> {
  // Expo tokens must go through the Expo push service, not FCM directly
  if (token.startsWith('ExponentPushToken')) {
    return sendViaExpoPush(token, title, body, data);
  }

  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) {
    logger.warn('[PushService] FCM_SERVER_KEY not configured — cannot send FCM push');
    return { success: false };
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data: data || {},
      priority: 'high',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error('[PushService] FCM send failed', { token: token.slice(0, 20), err });
    return { success: false };
  }

  const result: any = await response.json();
  if (result.failure > 0) {
    const failureResult = result.results?.[0];
    logger.error('[PushService] FCM: invalid or unregistered device token', {
      token: token.slice(0, 20),
      error: failureResult?.error,
    });
    return { success: false };
  }

  return { success: true, pushId: result.results?.[0]?.message_id };
}

class PushService {
  private provider: 'firebase' | 'onesignal' | 'http' | 'mock';

  constructor() {
    this.provider = this.detectProvider();
  }

  private detectProvider(): 'firebase' | 'onesignal' | 'http' | 'mock' {
    if (process.env.FCM_SERVER_KEY || process.env.FIREBASE_CREDENTIALS_JSON) {
      logger.info('[PushService] Using Firebase/FCM provider');
      return 'firebase';
    }
    if (process.env.ONESIGNAL_API_KEY) {
      logger.info('[PushService] Using OneSignal provider');
      return 'onesignal';
    }
    if (process.env.PUSH_API_URL) {
      logger.info('[PushService] Using HTTP API provider');
      return 'http';
    }
    logger.warn(
      '[PushService] No push provider configured (set FCM_SERVER_KEY, ONESIGNAL_API_KEY, or PUSH_API_URL), using mock',
    );
    return 'mock';
  }

  async send(options: PushOptions): Promise<PushResult> {
    try {
      switch (this.provider) {
        case 'firebase':
          return await this.sendViaFirebase(options);
        case 'onesignal':
          return await this.sendViaOneSignal(options);
        case 'http':
          return await this.sendViaHTTP(options);
        case 'mock':
        default:
          return this.sendViaMock(options);
      }
    } catch (error) {
      logger.error('[PushService] Failed to send push', {
        userId: options.userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send via Firebase/FCM HTTP API (legacy v1, no firebase-admin dependency).
   * Fetches device tokens from the User model, then calls the FCM send endpoint.
   * ExponentPushToken tokens are transparently routed to Expo's push API.
   */
  private async sendViaFirebase(options: PushOptions): Promise<PushResult> {
    const tokens = await getUserDeviceTokens(options.userId);
    if (tokens.length === 0) {
      logger.debug('[PushService] Firebase: no device tokens for user', { userId: options.userId });
      return { success: false, error: 'NO_DEVICE_TOKENS', sentCount: 0 };
    }

    let successCount = 0;
    let lastPushId: string | undefined;

    for (const token of tokens) {
      const result = await sendFcmPush(token, options.title, options.body, options.data);
      if (result.success) {
        successCount++;
        lastPushId = result.pushId;
      }
    }

    logger.info('[PushService] Firebase push sent', {
      userId: options.userId,
      total: tokens.length,
      delivered: successCount,
    });

    return {
      success: successCount > 0,
      pushId: lastPushId,
      sentCount: successCount,
      error: successCount === 0 ? 'ALL_TOKENS_FAILED' : undefined,
    };
  }

  /**
   * Send via OneSignal REST API.
   * Targets by external user ID (which must match the userId stored in OneSignal).
   */
  private async sendViaOneSignal(options: PushOptions): Promise<PushResult> {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_API_KEY;

    if (!appId || !apiKey) {
      logger.warn('[PushService] OneSignal: ONESIGNAL_APP_ID or ONESIGNAL_API_KEY not configured');
      return { success: false, error: 'ONESIGNAL_NOT_CONFIGURED' };
    }

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: appId,
        include_external_user_ids: [options.userId],
        headings: { en: options.title },
        contents: { en: options.body },
        data: options.data || {},
        ...(options.badge !== undefined ? { ios_badgeType: 'SetTo', ios_badgeCount: options.badge } : {}),
        ...(options.sound ? { ios_sound: options.sound, android_sound: options.sound } : {}),
      },
      { headers: { Authorization: `Basic ${apiKey}`, 'Content-Type': 'application/json' } },
    );

    const pushId = response.data?.id;
    const recipients: number = response.data?.recipients ?? 0;

    logger.info('[PushService] OneSignal push sent', { userId: options.userId, pushId, recipients });

    return { success: recipients > 0, pushId, sentCount: recipients };
  }

  /**
   * Send via a custom HTTP push API endpoint (PUSH_API_URL env var).
   */
  private async sendViaHTTP(options: PushOptions): Promise<PushResult> {
    const apiUrl = process.env.PUSH_API_URL;
    if (!apiUrl) {
      logger.warn('[PushService] PUSH_API_URL not configured');
      return { success: false, error: 'PUSH_API_URL_NOT_CONFIGURED' };
    }

    const response = await axios.post(apiUrl, {
      userId: options.userId,
      title: options.title,
      body: options.body,
      data: options.data || {},
      badge: options.badge,
      sound: options.sound,
      deepLink: options.deepLink,
      apiKey: process.env.PUSH_API_KEY,
    });

    const success: boolean = response.data?.success ?? response.status < 300;
    const pushId: string | undefined = response.data?.messageId || response.data?.pushId;

    logger.info('[PushService] HTTP push sent', { userId: options.userId, success, pushId });

    return { success, pushId, sentCount: success ? 1 : 0 };
  }

  private sendViaMock(options: PushOptions): PushResult {
    logger.info('[PushService] MOCK: Push not delivered — no provider configured', {
      userId: options.userId,
      title: options.title,
      body: options.body.substring(0, 50),
    });

    return { success: false, sentCount: 0, error: 'NO_PROVIDER_CONFIGURED' };
  }
}

export const pushService = new PushService();
