/**
 * Wallet API Error Handler
 * Parses backend error responses for re-auth, feature flags, velocity limits, frozen wallet.
 */
import { platformAlertSimple } from '@/utils/platformAlert';

import type { WalletErrorCode } from '@/types/wallet';
export type { WalletErrorCode };

export interface WalletApiError {
  code: WalletErrorCode;
  message: string;
  requiresReAuth?: boolean;
  threshold?: number;
  limitType?: string;
  remaining?: number;
  resetInSeconds?: number;
  frozenReason?: string;
}

/**
 * Parse an API error response into a structured WalletApiError.
 */
export function parseWalletError(error: any): WalletApiError {
  const response = error?.response;
  const status = response?.status || error?.status;
  const data = response?.data || error?.data || {};

  // Re-auth required (403 with requiresReAuth flag)
  if (status === 403 && data.requiresReAuth) {
    return {
      code: 'REAUTH_REQUIRED',
      message: data.message || 'Re-authentication required for this operation',
      requiresReAuth: true,
      threshold: data.threshold,
    };
  }

  // Frozen wallet (403 with frozen indicator)
  if (status === 403 && (data.frozenReason || data.message?.toLowerCase().includes('frozen'))) {
    return {
      code: 'WALLET_FROZEN',
      message: data.message || 'Your wallet is temporarily locked',
      frozenReason: data.frozenReason,
    };
  }

  // Feature disabled (503)
  if (status === 503) {
    return {
      code: 'FEATURE_DISABLED',
      message: data.message || 'This feature is temporarily unavailable',
    };
  }

  // Velocity limit (429 or body has limitType)
  if (status === 429 || data.limitType) {
    return {
      code: 'VELOCITY_LIMIT',
      message: data.message || 'Rate limit exceeded. Please try again later.',
      limitType: data.limitType,
      remaining: data.remaining,
      resetInSeconds: data.resetInSeconds,
    };
  }

  // Insufficient balance
  if (data.message?.toLowerCase().includes('insufficient') || data.code === 'INSUFFICIENT_BALANCE') {
    return {
      code: 'INSUFFICIENT_BALANCE',
      message: data.message || 'Insufficient balance for this operation',
    };
  }

  // Network error
  if (!response && (error?.message?.includes('network') || error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection and try again.',
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN',
    message: data.message || error?.message || 'Something went wrong. Please try again.',
  };
}

/**
 * Show appropriate UI feedback for a wallet API error.
 * Returns the parsed error for further handling by the caller.
 */
export function handleWalletError(error: any, context?: string): WalletApiError {
  const parsed = parseWalletError(error);

  switch (parsed.code) {
    case 'REAUTH_REQUIRED':
      // Don't show alert — caller should navigate to OTP screen
      break;
    case 'WALLET_FROZEN':
      platformAlertSimple('Wallet Locked', parsed.frozenReason || parsed.message);
      break;
    case 'FEATURE_DISABLED':
      platformAlertSimple('Feature Unavailable', parsed.message);
      break;
    case 'VELOCITY_LIMIT': {
      const minutes = parsed.resetInSeconds ? Math.ceil(parsed.resetInSeconds / 60) : undefined;
      const retryMsg = minutes ? ` Try again in ${minutes} minutes.` : '';
      platformAlertSimple('Limit Reached', `${parsed.message}${retryMsg}`);
      break;
    }
    case 'INSUFFICIENT_BALANCE':
      platformAlertSimple('Insufficient Balance', parsed.message);
      break;
    case 'NETWORK_ERROR':
      platformAlertSimple('Connection Error', parsed.message);
      break;
    default:
      platformAlertSimple(context || 'Error', parsed.message);
  }

  return parsed;
}
