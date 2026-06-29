/**
 * Shared types index for rez-auth-service
 *
 * This file re-exports types from @rez/shared-types package.
 * If @rez/shared-types is not available, local types are used as fallback.
 */

// Local types - shared-types can be used when package is published
export interface AuthServiceUser {
  _id: string;  // MongoDB ObjectId as string
  phoneNumber: string;
  phone?: string;
  email?: string;
  name?: string;
}

// Type aliases for compatibility
export type User = AuthServiceUser;

// Session type - represents authenticated user session
export interface Session {
  id: string;
  userId: string;
  refreshToken?: string;
  deviceId?: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// Device type - represents user device information
export interface Device {
  id: string;
  userId: string;
  deviceType: 'android' | 'ios' | 'web' | 'other';
  deviceToken?: string;
  pushNotificationsEnabled: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
}

// Common auth-related types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthServiceUser;
  token?: AuthToken;
  error?: string;
}

export interface TokenPayload {
  sub: string;
  phone?: string;
  email?: string;
  role: string;
  iat: number;
}
