/**
 * Session Service
 *
 * Extracted from authController.ts — helpers for cookie management and
 * device fingerprint tracking. Centralizing these eliminates duplication
 * between verifyOTP and refreshToken handlers.
 */

import { Response } from 'express';
import { User } from '../../models/User';
import { logger } from '../../config/logger';
import { getAccessTokenExpirySeconds } from './tokenHelper';

/**
 * Set httpOnly auth cookies on the response.
 * Browser surfaces use these; native clients ignore them and use the JSON body.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // ROUTE-SEC-030/034 FIX: 'strict' breaks legitimate cross-site navigation flows
  // (e.g., redirecting from payment gateway back to merchant). Use 'lax' instead.
  res.cookie('rez_access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: getAccessTokenExpirySeconds() * 1000,
    path: '/',
  });

  res.cookie('rez_refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/user/auth/refresh-token', // restrict to refresh endpoint only
  });
}

/**
 * Clear auth cookies (used on logout).
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('rez_access_token', { path: '/' });
  res.clearCookie('rez_refresh_token', { path: '/api/user/auth/refresh-token' });
}

/**
 * Track device fingerprint for anti-farming detection.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function trackDeviceFingerprint(
  userId: string,
  fingerprint: string | undefined,
  ip: string | undefined,
): Promise<void> {
  if (!fingerprint) return;

  try {
    // Warn if this fingerprint is associated with too many accounts
    const accountsOnDevice = await User.countDocuments({
      'devices.fingerprint': fingerprint,
      _id: { $ne: userId },
    });

    if (accountsOnDevice >= 3) {
      logger.warn('[AUTH] Device linked to multiple accounts — potential farming', {
        userId,
        deviceFingerprint: fingerprint.substring(0, 16) + '...',
        accountCount: accountsOnDevice + 1,
      });
      await User.findByIdAndUpdate(userId, {
        $set: {
          'flags.multiDeviceWarning': true,
          'flags.linkedDeviceCount': accountsOnDevice + 1,
        },
      }).catch(() => {});
    }

    // Store device association (limit to 10 devices per user via $addToSet + application logic)
    await User.findByIdAndUpdate(userId, {
      $addToSet: { devices: { fingerprint, lastSeen: new Date(), ip } },
    }).catch(() => {});
  } catch (deviceErr) {
    logger.debug('[AUTH] Device tracking failed (non-fatal)', deviceErr);
  }
}
