// @ts-nocheck
/**
 * Wallet entity — canonical shape for the `wallets` collection.
 *
 * Mirrors rezbackend/src/models/Wallet.ts.
 *
 * A user has exactly one Wallet document. Coin balances live in two places:
 *   - `coins[]` — ReZ, prive, promo, cashback, referral (universal coin types)
 *   - `brandedCoins[]` — merchant-scoped coins (expire in 6 months)
 *
 * Priority order for debits ("which bucket empties first") is the canonical
 * COIN_PRIORITY exported from `enums/coinType.ts`. Do NOT re-implement debit
 * ordering locally; use `COIN_PRIORITY_ORDER` and
 * `getValidNextWalletDebitCoin()` helpers.
 */
import { CoinType, CoinTransactionType, TransactionStatus } from '../enums/index';
import type { MerchantId, UserId, WalletId } from '../branded/ids';
/** Merchant metadata stamped on branded coins at earn time. */
export interface IBrandedCoinDetails {
  merchantId: string | MerchantId;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
}
/** Additional metadata for promo (limited-time) coins. */
export interface IPromoCoinDetails {
  campaignId?: string;
  campaignName?: string;
  /** Default 20% per bill cap. */
  maxRedemptionPercentage: number;
  expiryDate: Date | string;
}
/** A row in `wallet.coins[]` — universal coin types. */
export interface ICoin {
  type: CoinType;
  amount: number;
  isActive: boolean;
  earnedDate?: Date | string;
  lastUsed?: Date | string;
  lastEarned?: Date | string;
  /** 30-day expiry for ReZ; campaign-based for promo; undefined = never. */
  expiryDate?: Date | string;
  /** Visual color (#hex). Default #00C06A for ReZ. */
  color: string;
  brandedDetails?: IBrandedCoinDetails;
  promoDetails?: IPromoCoinDetails;
}
/** A row in `wallet.brandedCoins[]` — merchant-scoped coins. */
export interface IBrandedCoin {
  merchantId: string | MerchantId;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
  amount: number;
  earnedDate: Date | string;
  lastUsed?: Date | string;
  /** Canonical 6-month expiry set at earn time. */
  expiresAt?: Date | string;
  /** False once expiresAt has passed. */
  isActive: boolean;
}
export interface ICategoryBalance {
  available: number;
  earned: number;
  spent: number;
}
export interface IWalletBalance {
  /** Sum of every bucket (display-only total). */
  total: number;
  /** ReZ coins currently spendable. */
  available: number;
  /** Balance locked by pending transactions. */
  pending: number;
  /** Cashback bucket balance. */
  cashback: number;
}
export interface IWalletStatistics {
  /** Lifetime coins earned. */
  totalEarned: number;
  /** Lifetime coins spent. */
  totalSpent: number;
  /** Lifetime cashback received. */
  totalCashback: number;
  /** Lifetime refunds received. */
  totalRefunds: number;
  /** Lifetime topup ₹ amount (fiat in). */
  totalTopups: number;
  /** Lifetime withdrawal ₹ amount (fiat out). */
  totalWithdrawals: number;
}
export interface IWalletLimits {
  maxBalance: number;
  minWithdrawal: number;
  dailySpendLimit: number;
  /** Daily spend consumed since lastResetDate. */
  dailySpent: number;
  lastResetDate: Date | string;
}
export interface IWalletSavingsInsights {
  totalSaved: number;
  thisMonth: number;
  avgPerVisit: number;
  lastCalculated: Date | string;
  topCategory: string;
  topMerchant: {
    id: string;
    name: string;
  };
  /** 12-month rolling savings amounts. */
  monthlyTrend: number[];
  weeklySpend: number;
  /** Percentile vs platform mean, 0–100. */
  savedVsAvgUser: number;
  potentialMissedSavings: number;
  favoriteStores: Array<{
    id: string;
    name: string;
    visits: number;
  }>;
}
export interface IWalletSettings {
  autoTopup: boolean;
  autoTopupThreshold: number;
  autoTopupAmount: number;
  lowBalanceAlert: boolean;
  lowBalanceThreshold: number;
  smartAlertsEnabled: boolean;
  expiringCoinsAlertDays: number;
}
export interface IWallet {
  _id?: string | WalletId;
  user: string | UserId;
  balance: IWalletBalance;
  coins: ICoin[];
  brandedCoins: IBrandedCoin[];
  /** Per-main-category coin balances keyed by category slug. */
  categoryBalances: Record<string, ICategoryBalance>;
  /** Usually 'REZ_COIN' or 'RC'. */
  currency: string;
  statistics: IWalletStatistics;
  savingsInsights: IWalletSavingsInsights;
  limits: IWalletLimits;
  settings: IWalletSettings;
  isActive: boolean;
  /** Temporary freeze (e.g. during fraud review). */
  isFrozen: boolean;
  frozenReason?: string;
  frozenAt?: Date | string;
  lastTransactionAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
/** A ledger row in CoinTransaction. */
export interface ICoinTransaction {
  _id?: string;
  /** User ObjectId hex. */
  user: string;
  type: CoinTransactionType;
  coinType: CoinType;
  amount: number;
  /** Balance BEFORE this transaction — for reconciliation. */
  balanceBefore: number;
  /** Balance AFTER this transaction. */
  balanceAfter: number;
  /** Source system/tag, e.g. 'order:<orderId>', 'cashback', 'referral'. */
  source: string;
  sourceId?: string;
  description: string;
  merchantId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  /** Unique key for idempotent writes. */
  idempotencyKey?: string;
  status: TransactionStatus;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
/**
 * Canonical debit priority — consume cheaper/more-constrained coins first.
 * Keep aligned with enums/index.ts COIN_PRIORITY.
 */
export declare const COIN_PRIORITY_ORDER: readonly CoinType[];
/**
 * Return the next coin type to debit from, given which ones still have balance.
 * Returns `null` if every bucket is empty in the provided set.
 */
export declare function getValidNextWalletDebitCoin(availableCoins: ReadonlySet<CoinType>): CoinType | null;
//# sourceMappingURL=wallet.d.ts.map
