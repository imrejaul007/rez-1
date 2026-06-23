// Subscription Type Definitions
// Types for premium membership tiers and benefits

export type SubscriptionTier = 'free' | 'premium' | 'vip';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'trial'
  | 'grace_period'
  | 'payment_failed';

export type BillingCycle = 'monthly' | 'yearly';

export interface TierBenefits {
  cashbackMultiplier: number; // 1x for free, 2x for premium, 3x for VIP
  freeDelivery: boolean;
  prioritySupport: boolean;
  exclusiveDeals: boolean;
  unlimitedWishlists: boolean;
  earlyFlashSaleAccess: boolean;
  personalShopper: boolean;
  premiumEvents: boolean;
  conciergeService: boolean;
  birthdayOffer: boolean;
  anniversaryOffer: boolean;
}

export interface TierPricing {
  monthly: number;
  yearly: number;
  yearlyDiscount: number; // percentage discount for yearly plan
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  pricing: TierPricing;
  benefits: TierBenefits;
  features: string[];
  color: string;
  icon: string;
  popular?: boolean;
}

export interface CurrentSubscription {
  _id: string;
  user: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  price: number;
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  benefits: TierBenefits;
  usage: SubscriptionUsage;
  daysRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  totalSavings: number;
  ordersThisMonth: number;
  ordersAllTime: number;
  cashbackEarned: number;
  deliveryFeesSaved: number;
  exclusiveDealsUsed: number;
  lastUsedAt?: string;
}

export interface SubscriptionStats {
  currentTier: SubscriptionTier;
  isActive: boolean;
  daysRemaining: number;
  usage: SubscriptionUsage;
  roi: {
    subscriptionCost: number;
    totalSavings: number;
    netSavings: number;
    roiPercentage: number;
  };
}

export interface ValueProposition {
  estimatedMonthlySavings: number;
  estimatedYearlySavings: number;
  paybackPeriod: number; // months to break even
  benefits: string[];
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  billingCycle: BillingCycle;
  tier: SubscriptionTier;
  invoiceUrl?: string;
  paymentMethod: string;
}

// API Request/Response interfaces
export interface SubscribeRequest {
  tier: 'premium' | 'vip';
  billingCycle: BillingCycle;
  paymentMethod?: string;
  promoCode?: string;
  source?: string;
}

export interface SubscribeResponse {
  subscription: CurrentSubscription;
  paymentUrl: string;
}

export interface UpgradeRequest {
  newTier: 'premium' | 'vip';
}

export interface UpgradeResponse {
  subscription: CurrentSubscription;
  proratedAmount: number;
}

export interface DowngradeRequest {
  newTier: 'free' | 'premium';
}

export interface DowngradeResponse {
  subscription: CurrentSubscription;
  effectiveDate: string;
  creditAmount: number;
}

export interface CancelRequest {
  reason?: string;
  feedback?: string;
  cancelImmediately?: boolean;
}

export interface CancelResponse {
  subscription: CurrentSubscription;
  accessUntil: string;
  reactivationEligibleUntil: string;
}

// Constants
export const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: '#6B7280', // Gray
  premium: '#8B5CF6', // Purple
  vip: '#F59E0B', // Amber/Gold
};

export const TIER_GRADIENTS: Record<SubscriptionTier, string[]> = {
  free: ['#E8EDF2', '#C8D6E0', '#A8BCC8'],
  premium: ['#7C3AED', '#8B5CF6', '#A78BFA'],
  vip: ['#D97706', '#F59E0B', '#FBBF24'],
};

export const TIER_ICONS: Record<SubscriptionTier, string> = {
  free: 'person-outline',
  premium: 'star',
  vip: 'diamond',
};

export const TIER_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  vip: 'VIP',
};
