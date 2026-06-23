/**
 * JWT token utility functions.
 * Extracted from authController.ts.
 */

import * as crypto from 'crypto';

/**
 * Hash a refresh token for secure storage.
 * Never store raw tokens in DB — store the hash only.
 */
export const hashRefreshToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Parse JWT_EXPIRES_IN env var into seconds.
 * Supports values like "15m", "1h", "7d", or plain numbers (treated as seconds).
 *
 * @returns Token expiry duration in seconds (default: 900 = 15 minutes)
 */
export function getAccessTokenExpirySeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN || '15m';
  const match = raw.match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) return 15 * 60; // default 15m
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return value;
  }
}
