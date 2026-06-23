/**
 * Loyalty Redemption Types
 * Complete type definitions for the loyalty rewards redemption system
 */

// Tier Types
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface TierConfig {
  name: LoyaltyTier;
  minPoints: number;
  maxPoints: number;
  benefits: TierBenefit[];
  color: string;
  icon: string;
  discountPercentage: number;
  earningMultiplier: number;
}

export interface TierBenefit {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'discount' | 'freeDelivery' | 'earlyAccess' | 'exclusive' | 'priority' | 'bonus';
  value?: string;
}

// Reward Types
export type RewardType =
  | 'discountVoucher'
  | 'percentageDiscount'
  | 'freeProduct'
  | 'freeDelivery'
  | 'earlyAccess'
  | 'exclusiveProduct'
  | 'partnerReward'
  | 'cashCredit'
  | 'charityDonation';

export type RewardCategory = 'voucher' | 'discount' | 'cashback' | 'freebie' | 'exclusive' | 'partner' | 'charity';

export interface RewardItem {
  _id: string;
  title: string;
  description: string;
  type: RewardType;
  category: RewardCategory;
  points: number;
  value: number;
  icon: string;
  image?: string;
  available: boolean;
  stockLimit?: number;
  stockRemaining?: number;
  expiryDate?: string;
  termsAndConditions?: string[];
  minTier?: LoyaltyTier;
  validUntil?: string;
  validFrom?: string;
  tags?: string[];
  featured?: boolean;
  popularity?: number;
}

// Redemption Types
export interface RedemptionRequest {
  rewardId: string;
  points: number;
  quantity?: number;
}

export interface RedemptionResponse {
  success: boolean;
  message: string;
  newBalance: number;
  redemption: RedemptionRecord;
  voucher?: VoucherDetails;
}

export interface RedemptionRecord {
  _id: string;
  userId: string;
  reward: RewardItem;
  pointsSpent: number;
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
  redeemedAt: string;
  expiresAt?: string;
  usedAt?: string;
  cancelledAt?: string;
  code?: string;
}

export interface VoucherDetails {
  code: string;
  value: number;
  type: 'fixed' | 'percentage';
  expiryDate: string;
  minPurchase?: number;
  maxDiscount?: number;
  applicableCategories?: string[];
  applicableStores?: string[];
  usageLimit?: number;
  usageCount: number;
}

// Point Types
export interface PointBalance {
  currentPoints: number;
  lifetimePoints: number;
  pendingPoints: number;
  expiringPoints: number;
  expiryDate?: string;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNextTier: number;
}

export interface PointTransaction {
  _id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus' | 'refund';
  points: number;
  balance: number;
  description: string;
  source: PointSource;
  relatedEntity?: {
    type: 'order' | 'review' | 'referral' | 'reward' | 'achievement' | 'event';
    id: string;
    name?: string;
  };
  createdAt: string;
  expiresAt?: string;
}

export type PointSource =
  | 'purchase'
  | 'review'
  | 'referral'
  | 'socialShare'
  | 'achievement'
  | 'dailyCheckIn'
  | 'birthday'
  | 'milestone'
  | 'event'
  | 'bonus'
  | 'redemption'
  | 'expiry'
  | 'adjustment';

// Reservation Types
export interface RewardReservation {
  _id: string;
  rewardId: string;
  userId: string;
  points: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  createdAt: string;
}

// History Types
export interface RedemptionHistory {
  redemptions: RedemptionRecord[];
  total: number;
  totalPointsRedeemed: number;
  totalValueReceived: number;
  hasMore: boolean;
}

// Catalog Types
export interface RewardCatalog {
  featured: RewardItem[];
  categories: RewardCategory[];
  rewards: RewardItem[];
  total: number;
  filters: CatalogFilters;
}

export interface CatalogFilters {
  category?: RewardCategory;
  minPoints?: number;
  maxPoints?: number;
  type?: RewardType;
  available?: boolean;
  tier?: LoyaltyTier;
  sortBy?: 'points' | 'value' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

// Smart Features Types
export interface PointOptimization {
  recommendedRewards: RewardItem[];
  maxValue: number;
  savings: number;
  explanation: string;
}

export interface PointForecast {
  nextMonth: number;
  nextQuarter: number;
  sources: Array<{
    source: PointSource;
    estimatedPoints: number;
  }>;
}

export interface PointGoal {
  _id: string;
  targetPoints: number;
  currentPoints: number;
  targetReward?: RewardItem;
  deadline?: string;
  progress: number;
  estimatedCompletion?: string;
}

export interface PointChallenge {
  _id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  requirement: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  expiresAt?: string;
  reward?: RewardItem;
}

// Gamification Types
export interface SpinWheelReward {
  type: 'points' | 'voucher' | 'discount' | 'freeProduct';
  value: number;
  label: string;
  probability: number;
  color: string;
}

export interface ScratchCardReward {
  revealed: boolean;
  type: 'points' | 'voucher' | 'discount';
  value: number;
  message: string;
}

export interface DailyCheckIn {
  day: number;
  points: number;
  claimed: boolean;
  bonus?: {
    points: number;
    message: string;
  };
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn?: string;
  nextBonus?: {
    days: number;
    points: number;
  };
}

// Transfer & Pooling Types
export interface PointTransfer {
  _id: string;
  fromUserId: string;
  toUserId: string;
  points: number;
  message?: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
}

export interface FamilyPool {
  _id: string;
  name: string;
  members: Array<{
    userId: string;
    name: string;
    role: 'admin' | 'member';
    contribution: number;
  }>;
  totalPoints: number;
  canUse: string[]; // User IDs who can use points
  createdAt: string;
}

// Notification Types
export interface PointExpiryNotification {
  points: number;
  expiryDate: string;
  daysRemaining: number;
  urgency: 'low' | 'medium' | 'high';
  suggestedRewards: RewardItem[];
}

export interface MilestoneReward {
  milestone: number;
  points: number;
  bonus: {
    type: 'points' | 'voucher' | 'tier';
    value: number;
  };
  achieved: boolean;
}

// Auto-apply Types
export interface AutoApplyRecommendation {
  rewards: RewardItem[];
  totalDiscount: number;
  totalValue: number;
  pointsUsed: number;
  savings: number;
}

// Animation Types
export interface PointAnimation {
  type: 'earn' | 'redeem' | 'levelUp' | 'milestone';
  points: number;
  fromTier?: LoyaltyTier;
  toTier?: LoyaltyTier;
  duration?: number;
}

// API Response Types
export interface LoyaltyRedemptionState {
  balance: PointBalance | null;
  rewards: RewardItem[];
  redemptions: RedemptionRecord[];
  tierConfig: TierConfig | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

export interface RedemptionError {
  code: 'INSUFFICIENT_POINTS' | 'REWARD_UNAVAILABLE' | 'TIER_REQUIRED' | 'EXPIRED' | 'LIMIT_REACHED' | 'NETWORK_ERROR';
  message: string;
  details?: any;
}
