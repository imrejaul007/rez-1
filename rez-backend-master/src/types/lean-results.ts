/**
 * Type definitions for Mongoose .lean() query results.
 *
 * These interfaces represent the shape of MongoDB documents after .lean()
 * which returns plain JavaScript objects (not Mongoose Document instances).
 * Use these instead of `as any` casts when working with .lean() results.
 */

import { Types } from 'mongoose';

// ─── Wallet lean result ───────────────────────────────────────────────────────

/** ICoinBalance as returned by .lean() queries (plain object, not Document) */
export interface LeanCoinBalance {
  type: 'rez' | 'prive' | 'branded' | 'promo';
  amount: number;
  isActive: boolean;
  earnedDate?: Date;
  lastUsed?: Date;
  lastEarned?: Date;
  expiryDate?: Date;
  color: string;
  brandedDetails?: {
    merchantId: Types.ObjectId | string;
    merchantName: string;
    merchantLogo?: string;
    merchantColor?: string;
  };
  promoDetails?: {
    campaignId?: string;
    campaignName?: string;
    maxRedemptionPercentage: number;
    expiryDate: Date;
  };
}

/** IBrandedCoin as returned by .lean() queries */
export interface LeanBrandedCoin {
  merchantId: Types.ObjectId | string;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
  amount: number;
  earnedDate: Date;
  lastUsed?: Date;
}

/** Wallet balance structure */
export interface LeanWalletBalance {
  total: number;
  available: number;
  pending: number;
  cashback: number;
}

/** Wallet statistics structure */
export interface LeanWalletStatistics {
  totalEarned: number;
  totalSpent: number;
  totalCashback: number;
  totalRefunds: number;
  totalTopups: number;
  totalWithdrawals: number;
}

/** Wallet as returned by .lean() queries */
export interface LeanWallet {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  balance: LeanWalletBalance;
  coins: LeanCoinBalance[];
  brandedCoins: LeanBrandedCoin[];
  categoryBalances: Record<string, { available: number; earned: number; spent: number }>;
  currency: string;
  statistics: LeanWalletStatistics;
  savingsInsights: {
    totalSaved: number;
    thisMonth: number;
    avgPerVisit: number;
    lastCalculated: Date;
  };
  limits: {
    maxBalance: number;
    minWithdrawal: number;
    dailySpendLimit: number;
    dailySpent: number;
    lastResetDate: Date;
  };
  settings: {
    autoTopup: boolean;
    autoTopupThreshold: number;
    autoTopupAmount: number;
    lowBalanceAlert: boolean;
    lowBalanceThreshold: number;
    smartAlertsEnabled: boolean;
    expiringCoinsAlertDays: number;
  };
  isActive: boolean;
  isFrozen: boolean;
  frozenReason?: string;
  frozenAt?: Date;
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Convenience alias for balance.available
  walletBalance?: number;
}

// ─── CoinTransaction lean result ──────────────────────────────────────────────

export type MainCategorySlug =
  | 'food-dining'
  | 'beauty-wellness'
  | 'grocery-essentials'
  | 'fitness-sports'
  | 'healthcare'
  | 'fashion'
  | 'education-learning'
  | 'home-services'
  | 'travel-experiences'
  | 'entertainment'
  | 'financial-lifestyle'
  | 'electronics';

/** CoinTransaction as returned by .lean() queries */
export interface LeanCoinTransaction {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
  amount: number;
  balance: number;
  source: string;
  description: string;
  category?: MainCategorySlug | null;
  metadata?: {
    gameId?: Types.ObjectId | string;
    achievementId?: Types.ObjectId | string;
    challengeId?: Types.ObjectId | string;
    orderId?: Types.ObjectId | string;
    referralId?: Types.ObjectId | string;
    productId?: Types.ObjectId | string;
    voucherId?: Types.ObjectId | string;
    idempotencyKey?: string;
    reversedTransactionId?: string;
    originalTransactionId?: Types.ObjectId | string;
    programSlug?: string;
    originalSource?: string;
    originalAmount?: number;
    reversalReason?: string;
    [key: string]: unknown;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── UserLoyalty lean result ──────────────────────────────────────────────────

export interface LeanCategoryCoins {
  available: number;
  expiring: number;
  expiryDate?: Date;
}

/** UserLoyalty as returned by .lean() queries */
export interface LeanUserLoyalty {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  streak: {
    current: number;
    target: number;
    lastCheckin?: Date;
    history: Date[];
  };
  brandLoyalty: Array<{
    brandId: Types.ObjectId | string;
    brandName: string;
    purchaseCount: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    progress: number;
    nextTierAt: number;
  }>;
  missions: Array<{
    missionId: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: number;
    icon: string;
    completedAt?: Date;
  }>;
  coins: {
    available: number;
    expiring: number;
    expiryDate?: Date;
    history: Array<{
      amount: number;
      type: 'earned' | 'spent' | 'expired';
      description: string;
      date: Date;
    }>;
  };
  categoryCoins: Map<string, LeanCategoryCoins> | Record<string, LeanCategoryCoins>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── UserStreak lean result ─────────────────────────────────────────────────

/** UserStreak as returned by .lean() queries (savings streak) */
export interface LeanUserStreak {
  _id: Types.ObjectId;
  user: Types.ObjectId | string;
  type: 'savings' | 'visit' | 'purchase';
  currentStreak: number;
  longestStreak: number;
  lastActivity?: Date;
  streakStartedAt?: Date;
  streakEndedAt?: Date;
  multiplier: number;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Coin usage order type ───────────────────────────────────────────────────

/** Type for the return value of Wallet.getCoinUsageOrder() */
export interface CoinUsageOrderItem {
  type: 'promo' | 'branded' | 'prive' | 'rez';
  amount: number;
  merchantId?: string;
}

// ─── WalletConfig lean result ────────────────────────────────────────────────

/** WalletConfig as returned by .lean() queries */
export interface LeanWalletConfig {
  _id?: Types.ObjectId;
  rewardIssuanceEnabled?: boolean;
  coinManagement?: {
    globalKillSwitch?: {
      active: boolean;
      pausedTypes?: string[];
      reason?: string;
    };
  };
  coinExpiryConfig?: {
    rez?: { expiryDays: number };
    prive?: { expiryDays: number };
    promo?: { expiryDays: number };
    branded?: { expiryDays: number };
  };
  earningCaps?: {
    daily?: number;
    monthly?: number;
    lifetime?: number;
  };
  [key: string]: unknown;
}

// ─── Program bonus type ───────────────────────────────────────────────────────

/** Program bonus from specialProgramService.calculateMultiplierBonus */
export interface ProgramBonus {
  slug: string;
  bonus: number;
  programName: string;
}
