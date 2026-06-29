/**
 * TypeScript type for user documents accessed by rez-auth-service.
 *
 * Canonical types: @rez/shared-types/entities/user
 * TODO: Migrate to import from @rez/shared-types when package is published
 *
 * The canonical user schema lives in rezbackend/src/models/User.ts on the
 * shared 'users' MongoDB collection. This interface documents the subset of
 * fields that auth routes read so TypeScript can catch property typos and
 * improve IDE autocompletion without requiring a full schema import.
 */
export interface AuthServiceUser {
  _id: string;  // MongoDB ObjectId as string
  phoneNumber: string;
  /** Legacy alias for phoneNumber — some older documents use this field. */
  phone?: string;
  email?: string;
  name?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  auth?: {
    isVerified: boolean;
    isOnboarded?: boolean;
    otpCode?: string;
    otpExpiry?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    pinHash?: string;
    pinAttempts: number;
    pinLockedUntil?: Date;
    refreshToken?: string;
    lastLogin?: Date;
  };
  wallet?: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    pendingAmount: number;
  };
  role: string;
  isActive: boolean;
  isSuspended?: boolean;
  referralCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}
