// Token Utilities
// Helper functions for JWT token management

interface DecodedToken {
  exp: number;
  iat: number;
  userId?: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (client-side only)
 * Note: This is for display purposes only, not for security validation
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}

/**
 * Get time until token expires (in seconds)
 */
export function getTimeUntilExpiration(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - currentTime);
}

/**
 * Check if token will expire soon (within specified minutes)
 */
export function isTokenExpiringSoon(token: string, minutesThreshold: number = 5): boolean {
  const timeUntilExpiration = getTimeUntilExpiration(token);
  const thresholdSeconds = minutesThreshold * 60;
  return timeUntilExpiration > 0 && timeUntilExpiration <= thresholdSeconds;
}

/**
 * Format token expiration time for display
 */
export function formatTokenExpiration(token: string): string {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return 'Invalid token';
  }

  const now = new Date();
  const diffMs = expiration.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Expired';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else if (diffMinutes > 0) {
    return `Expires in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else {
    return 'Expires soon';
  }
}

/**
 * Get user ID from token
 */
export function getUserIdFromToken(token: string): string | null {
  const decoded = decodeJWT(token);
  return decoded?.userId || decoded?.id || null;
}

/**
 * Get token issued time
 */
export function getTokenIssuedTime(token: string): Date | null {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.iat) {
    return null;
  }

  return new Date(decoded.iat * 1000);
}
