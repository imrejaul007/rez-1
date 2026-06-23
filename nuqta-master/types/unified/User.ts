/**
 * Unified User Type Definition
 *
 * This is the CANONICAL user interface used throughout the application.
 * All user data should be normalized to this structure.
 *
 * KEY DECISIONS:
 * - Standard ID field: 'id' (string)
 * - Profile nested under user object
 * - Preferences as structured object
 * - Separate address and payment method arrays
 */

// ============================================================================
// CORE USER INTERFACE
// ============================================================================

export interface User {
  // ========== IDENTIFIERS ==========
  /** Primary identifier */
  id: string;

  /** Email address (unique) */
  email: string;

  /** Username (unique) */
  username?: string;

  // ========== BASIC INFORMATION ==========
  /** User profile */
  profile: UserProfile;

  // ========== AUTHENTICATION ==========
  /** Is email verified? */
  emailVerified: boolean;

  /** Is phone verified? */
  phoneVerified?: boolean;

  /** Two-factor authentication enabled? */
  twoFactorEnabled?: boolean;

  // ========== PREFERENCES ==========
  /** User preferences */
  preferences: UserPreferences;

  // ========== ADDRESSES ==========
  /** Saved addresses */
  addresses: UserAddress[];

  /** Default address ID */
  defaultAddressId?: string;

  // ========== PAYMENT METHODS ==========
  /** Saved payment methods */
  paymentMethods: UserPaymentMethod[];

  /** Default payment method ID */
  defaultPaymentMethodId?: string;

  // ========== WALLET ==========
  /** Wallet balance */
  walletBalance?: number;

  /** Cashback balance */
  cashbackBalance?: number;

  /** Coins/points balance */
  coinsBalance?: number;

  // ========== LOYALTY & REWARDS ==========
  /** Loyalty tier */
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';

  /** Loyalty points */
  loyaltyPoints?: number;

  /** Referral code */
  referralCode?: string;

  /** Referred by */
  referredBy?: string;

  // ========== STATISTICS ==========
  /** Total orders */
  totalOrders?: number;

  /** Total spent */
  totalSpent?: number;

  /** Total cashback earned */
  totalCashbackEarned?: number;

  /** Total reviews written */
  totalReviews?: number;

  // ========== SOCIAL ==========
  /** Followers count */
  followersCount?: number;

  /** Following count */
  followingCount?: number;

  /** Followed stores */
  followedStores?: string[];

  // ========== PERMISSIONS ==========
  /** User role */
  role: 'user' | 'merchant' | 'admin' | 'moderator';

  /** Permissions */
  permissions?: string[];

  // ========== STATUS ==========
  /** Is account active? */
  isActive: boolean;

  /** Is account banned? */
  isBanned?: boolean;

  /** Ban reason */
  banReason?: string;

  // ========== METADATA ==========
  /** Account creation date */
  createdAt: string | Date;

  /** Last update date */
  updatedAt: string | Date;

  /** Last login date */
  lastLoginAt?: string | Date;

  /** Last activity date */
  lastActivityAt?: string | Date;

  /** Custom metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  /** Full name */
  name: string;

  /** First name */
  firstName?: string;

  /** Last name */
  lastName?: string;

  /** Display name */
  displayName?: string;

  /** Avatar URL */
  avatar?: string;

  /** Cover photo URL */
  coverPhoto?: string;

  /** Bio/About */
  bio?: string;

  /** Phone number */
  phone?: string;

  /** Date of birth */
  dateOfBirth?: string | Date;

  /** Gender */
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  /** Location */
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  /** Occupation */
  occupation?: string;

  /** Interests */
  interests?: string[];
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreferences {
  /** Language preference */
  language?: string;

  /** Currency preference */
  currency?: string;

  /** Notification preferences */
  notifications: NotificationPreferences;

  /** Privacy preferences */
  privacy: PrivacyPreferences;

  /** Shopping preferences */
  shopping?: ShoppingPreferences;

  /** Theme preference */
  theme?: 'light' | 'dark' | 'auto';
}

export interface NotificationPreferences {
  /** Email notifications */
  email: {
    enabled: boolean;
    orderUpdates?: boolean;
    promotions?: boolean;
    newsletter?: boolean;
    recommendations?: boolean;
  };

  /** Push notifications */
  push: {
    enabled: boolean;
    orderUpdates?: boolean;
    promotions?: boolean;
    offers?: boolean;
    reminders?: boolean;
  };

  /** SMS notifications */
  sms: {
    enabled: boolean;
    orderUpdates?: boolean;
    promotions?: boolean;
  };
}

export interface PrivacyPreferences {
  /** Profile visibility */
  profileVisibility: 'public' | 'friends' | 'private';

  /** Show activity status */
  showActivityStatus?: boolean;

  /** Allow personalized ads */
  personalizedAds?: boolean;

  /** Data sharing */
  dataSharing?: boolean;
}

export interface ShoppingPreferences {
  /** Preferred categories */
  preferredCategories?: string[];

  /** Preferred stores */
  preferredStores?: string[];

  /** Budget range */
  budgetRange?: {
    min: number;
    max: number;
  };

  /** Default delivery method */
  defaultDeliveryMethod?: 'standard' | 'express' | 'pickup';
}

// ============================================================================
// USER ADDRESS
// ============================================================================

export interface UserAddress {
  /** Address ID */
  id: string;

  /** Address type */
  type: 'home' | 'work' | 'other';

  /** Label */
  label?: string;

  /** Full name */
  name: string;

  /** Phone number */
  phone: string;

  /** Address line 1 */
  addressLine1: string;

  /** Address line 2 */
  addressLine2?: string;

  /** City */
  city: string;

  /** State */
  state: string;

  /** Country */
  country: string;

  /** Postal code */
  postalCode: string;

  /** Landmark */
  landmark?: string;

  /** Coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  /** Is default address? */
  isDefault: boolean;

  /** Created at */
  createdAt?: string | Date;

  /** Updated at */
  updatedAt?: string | Date;
}

// ============================================================================
// USER PAYMENT METHOD
// ============================================================================

export interface UserPaymentMethod {
  /** Payment method ID */
  id: string;

  /** Payment type */
  type: 'card' | 'upi' | 'wallet' | 'net_banking';

  /** Label */
  label?: string;

  /** Is default? */
  isDefault: boolean;

  /** Card details (for card type) */
  card?: {
    brand: string;
    lastFour: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
  };

  /** UPI details (for UPI type) */
  upi?: {
    vpa: string;
  };

  /** Wallet details (for wallet type) */
  wallet?: {
    provider: string;
    accountId: string;
  };

  /** Created at */
  createdAt?: string | Date;

  /** Updated at */
  updatedAt?: string | Date;
}

// ============================================================================
// USER SESSION
// ============================================================================

export interface UserSession {
  /** Session ID */
  sessionId: string;

  /** User ID */
  userId: string;

  /** Device information */
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser?: string;
    model?: string;
  };

  /** IP address */
  ipAddress: string;

  /** Location */
  location?: {
    city: string;
    country: string;
  };

  /** Session start time */
  startedAt: string | Date;

  /** Last activity time */
  lastActivityAt: string | Date;

  /** Is current session? */
  isCurrent: boolean;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Public user profile (for display to other users) */
export type PublicUserProfile = Pick<
  User,
  | 'id'
  | 'profile'
  | 'followersCount'
  | 'followingCount'
  | 'totalReviews'
  | 'loyaltyTier'
  | 'createdAt'
>;

/** User summary (for cards/previews) */
export type UserSummary = Pick<
  User,
  'id' | 'profile' | 'loyaltyTier'
>;

/** Minimal user info (for references) */
export type UserRef = {
  id: string;
  name: string;
  avatar?: string;
};
