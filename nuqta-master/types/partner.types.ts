// Partner Profile Types
// TypeScript interfaces for the partner rewards system

export interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  level: PartnerLevel;
  joinDate: string;
  validUntil: string;
  totalOrders: number;
  ordersThisLevel: number;
  daysRemaining: number;
  currentBenefits: string[];
}

export interface PartnerLevel {
  id: string;
  name: 'Partner' | 'Influencer' | 'Ambassador';
  level: 1 | 2 | 3;
  requirements: {
    orders: number;
    timeframe: number; // days
  };
  benefits: PartnerBenefit[];
  color: string;
  icon: string;
}

export interface PartnerBenefit {
  id: string;
  name: string;
  description: string;
  type: 'cashback' | 'discount' | 'freebie' | 'special';
  value: number | string;
  icon: string;
  isActive: boolean;
}

export interface OrderMilestone {
  id: string;
  orderNumber?: number; // 5, 10, 15, 20 (optional for backward compatibility)
  orderCount?: number; // Backend sends this
  isCompleted: boolean;
  isLocked: boolean;
  reward?: RewardItem;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  type: 'cashback' | 'product' | 'discount' | 'points';
  value: number | string;
  image?: string;
  validUntil?: string;
  isClaimed: boolean;
}

export interface RewardTask {
  id: string;
  title: string;
  description: string;
  type: 'review' | 'purchase' | 'referral' | 'social' | 'profile';
  reward: RewardItem;
  isCompleted: boolean;
  progress?: {
    current: number;
    target: number;
  };
}

export interface JackpotMilestone {
  id: string;
  amount: number; // ₹25K, ₹50K
  spendAmount?: number; // Backend sends this
  title: string;
  description: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  achieved?: boolean; // Backend sends this instead of isCompleted
  reward: RewardItem;
  claimedAt?: string; // When the reward was claimed
}

export interface ClaimableOffer {
  id: string;
  title: string;
  description: string;
  discount: string;
  image?: string;
  validUntil: string;
  termsAndConditions: string[];
  isClaimed: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'transactions' | 'rewards' | 'levels';
}

export interface PartnerPageState {
  profile: PartnerProfile | null;
  milestones: OrderMilestone[];
  tasks: RewardTask[];
  jackpotProgress: JackpotMilestone[];
  claimableOffers: ClaimableOffer[];
  faqs: FAQItem[];
  levels?: any[]; // Partner levels with benefits from backend
  loading: boolean;
  error: string | null;
}

// API Response types
export interface PartnerApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PartnerDashboardData {
  profile: PartnerProfile;
  milestones: OrderMilestone[];
  tasks: RewardTask[];
  jackpotProgress: JackpotMilestone[];
  claimableOffers: ClaimableOffer[];
  faqs: FAQItem[];
}