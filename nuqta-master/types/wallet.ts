import { ImageSourcePropType } from 'react-native';
import { BRAND } from '@/constants/brand';

// Core Coin Types - Updated for new wallet design
// Note: Backend uses 'rez', frontend displays as 'nuqta' for branding consistency
export type CoinType = 'rez' | 'nuqta' | 'branded' | 'promo';

// Branded Coin Details (merchant-specific)
export interface BrandedCoinDetails {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
}

// Promo Coin Details (limited-time)
export interface PromoCoinDetails {
  campaignId?: string;
  campaignName?: string;
  maxRedemptionPercentage: number; // Max 20% per bill
  expiryDate: Date;
  expiryCountdown?: string;
}

// Core Wallet Types
export interface CoinBalance {
  id: string;
  type: CoinType;
  name: string;
  amount: number;
  currency: string;
  formattedAmount: string;
  description: string;
  iconPath: ImageSourcePropType;
  backgroundColor: string;
  color: string; // Primary color (#ffcd57 for Rez, merchant color for Branded, #FFC857 for Promo)
  isActive: boolean;
  expiryDate?: Date;
  expiryCountdown?: string; // For promo coins
  restrictions?: string[];
  earnedDate?: Date;
  lastUsed?: Date;
  // Branded coin specific
  brandedDetails?: BrandedCoinDetails;
  // Promo coin specific
  promoDetails?: PromoCoinDetails;
}

// Branded Coin (for merchant-specific coins array)
export interface BrandedCoin {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
  amount: number;
  formattedAmount: string;
}

// Savings Insights
export interface SavingsInsights {
  totalSaved: number;
  thisMonth: number;
  avgPerVisit: number;
}

// Smart Alert
export interface SmartAlert {
  id: string;
  type: 'expiring' | 'low_balance' | 'offer' | 'promo';
  message: string;
  amount?: number;
  expiryDate?: Date;
  actionLabel?: string;
  actionRoute?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'earned' | 'spent' | 'expired' | 'bonus' | 'transfer' | 'gift';
  coinType: CoinType;
  amount: number;
  currency: string;
  formattedAmount: string;
  description: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
  merchantName?: string;
  merchantLogo?: string;
  orderId?: string;
  balanceAfter: number;
}

export interface WalletData {
  userId: string;
  totalBalance: number; // Total value of all coins
  availableBalance: number; // Available for spending
  cashbackBalance: number; // Cashback balance
  pendingRewards: number; // Pending rewards
  currency: string;
  formattedTotalBalance: string;
  coins: CoinBalance[]; // ReZ and Promo coins
  brandedCoins: BrandedCoin[]; // Merchant-specific coins
  brandedCoinsTotal: number; // Sum of all branded coin amounts
  savingsInsights: SavingsInsights; // Savings tracking
  smartAlerts?: SmartAlert[]; // Smart wallet alerts
  recentTransactions: WalletTransaction[];
  lastUpdated: Date;
  isActive: boolean;
  isFrozen?: boolean;
  frozenReason?: string;
}

// Component Props Types
export interface WalletBalanceCardProps {
  coin: CoinBalance;
  onPress?: (coin: CoinBalance) => void;
  isLoading?: boolean;
  showChevron?: boolean;
  testID?: string;
}

export interface WalletScreenProps {
  userId?: string;
  onNavigateBack?: () => void;
  onCoinPress?: (coin: CoinBalance) => void;
  onTransactionPress?: (transaction: WalletTransaction) => void;
}

// State Management Types
export interface WalletState {
  data: WalletData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: WalletError | null;
  lastFetched: Date | null;
}

export interface WalletError {
  code: 'NETWORK_ERROR' | 'SERVER_ERROR' | 'PARSING_ERROR' | 'UNAUTHORIZED' | 'TIMEOUT' | 'REAUTH_REQUIRED' | 'FEATURE_DISABLED' | 'VELOCITY_LIMIT' | 'WALLET_FROZEN';
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
}

// API Types
export interface WalletApiResponse {
  success: boolean;
  data: WalletData;
  message?: string;
  error?: string;
}

export interface RefreshWalletRequest {
  userId: string;
  forceRefresh?: boolean;
}

// Utility Types
export type TransactionType = 'earned' | 'spent' | 'expired' | 'bonus' | 'transfer' | 'gift';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type WalletErrorCode = 'NETWORK_ERROR' | 'SERVER_ERROR' | 'PARSING_ERROR' | 'UNAUTHORIZED' | 'TIMEOUT' | 'REAUTH_REQUIRED' | 'FEATURE_DISABLED' | 'VELOCITY_LIMIT' | 'WALLET_FROZEN' | 'INSUFFICIENT_BALANCE' | 'UNKNOWN';

// Coin Usage Order - Promo > Branded > Rez (automatic)
export const COIN_USAGE_ORDER: CoinType[] = ['promo', 'branded', 'nuqta'];

// Constants - Updated for new wallet design
// Note: 'rez' and 'nuqta' are aliases - backend uses 'rez', frontend displays 'nuqta'
export const COIN_TYPES: Record<CoinType, { name: string; color: string; amountColor: string; backgroundColor: string; icon: string; description: string }> = {
  rez: {
    name: BRAND.COIN_NAME,  // Display name for backend 'rez' type
    color: '#ffcd57', // Mustard (icon/badge use only)
    amountColor: '#B45309', // Dark amber for text (WCAG AA compliant)
    backgroundColor: '#FFF9E6',
    icon: 'nuqta-coin.png',
    description: `Universal rewards usable anywhere on ${BRAND.APP_NAME}`
  },
  nuqta: {
    name: BRAND.COIN_NAME,
    color: '#ffcd57', // Mustard (icon/badge use only)
    amountColor: '#B45309', // Dark amber for text (WCAG AA compliant)
    backgroundColor: '#FFF9E6',
    icon: 'nuqta-coin.png',
    description: `Universal rewards usable anywhere on ${BRAND.APP_NAME}`
  },
  branded: {
    name: 'Branded Coins',
    color: '#6366F1', // Default, actual color from merchant
    amountColor: '#4F46E5', // Deep indigo for text
    backgroundColor: '#EEF2FF',
    icon: 'branded-coin.png',
    description: 'Earned from specific stores. Use at the same store.'
  },
  promo: {
    name: 'Promo Coins',
    color: '#F59E0B', // Amber (icon/badge use only)
    amountColor: '#D97706', // Dark amber for text (WCAG AA compliant)
    backgroundColor: '#FEF3C7',
    icon: 'promo-coin.png',
    description: 'Special coins from campaigns & events'
  }
};

export const DEFAULT_CURRENCY = BRAND.CURRENCY_CODE;
export const DEFAULT_LOCALE = 'en-IN';
