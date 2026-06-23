/**
 * Cash Store Types
 *
 * TypeScript interfaces for Nuqta Cash Store feature.
 *
 * Cash Store = Affiliate Cashback System
 * - External brand websites (Amazon, Myntra, Flipkart, etc.)
 * - Users click through and shop on external sites
 * - Brand sends webhook when purchase is made
 * - Users earn real cashback (rupees)
 *
 * NOTE: This is different from Nuqta Mall (in-app delivery marketplace with Nuqta Coins)
 */

// Re-export from existing services for convenience
export type { CashbackSummary, UserCashback, CashbackCampaign } from '../services/cashbackApi';
export type { Coupon, UserCoupon } from '../services/couponApi';
export type { Offer, HeroBanner } from '../services/realOffersApi';

// ============================================================================
// CASH STORE SPECIFIC TYPES
// ============================================================================

// Brand type for external affiliates vs in-app stores
export type CashStoreBrandType = 'affiliate' | 'in-app' | 'hybrid';

// Brand category — dynamic from DB (MallCategory slugs)
export type CashStoreBrandCategory = string;

// ============================================================================
// CATEGORY FILTER TYPES
// ============================================================================

// Special filter keys that are not direct category matches
export type CashStoreSpecialFilter = 'all' | 'most-popular' | 'high-cashback';

// Combined filter key type — string to support dynamic DB slugs
export type CashStoreCategoryFilterKey = string;

// Filter configuration interface (matches backend cashStoreController response)
export interface CashStoreCategoryFilter {
  _id: string;
  slug: string;
  name: string;
  icon: string;
  image?: string;
  color: string;
  backgroundColor: string;
  maxCashback: number;
  sortOrder: number;
  brandCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isSpecialFilter: boolean;
}

// Deal badge type
export type DealBadge = 'trending' | 'hot' | 'limited-time' | 'exclusive' | 'new' | 'best-deal';

// ============================================================================
// CASH STORE BRAND
// ============================================================================

export interface CashStoreBrand {
  _id: string;
  id: string;
  name: string;
  slug: string;
  logo: string;
  description?: string;
  category: CashStoreBrandCategory;
  brandType: CashStoreBrandType;
  cashbackRate: number;
  maxCashback?: number;
  minPurchase?: number;
  bonusCoins?: number;
  externalUrl?: string;
  storeId?: string; // For in-app stores
  isActive: boolean;
  isFeatured: boolean;
  isTopBrand: boolean;
  rating?: number;
  ratingCount?: number;
  successRate?: number;
  analytics?: {
    views: number;
    clicks: number;
    purchases: number;
  };
  createdAt: string;
  updatedAt: string;
  // REZ Coin reward — how many coins per ₹100 spent at this brand
  rezCoinReward?: {
    coinsPerHundred: number;
    isActive: boolean;
    minimumOrderAmount: number;
    maximumCoinsPerOrder: number;
  };
}

// ============================================================================
// TRENDING DEAL
// ============================================================================

export interface TrendingDeal {
  _id: string;
  id: string;
  brand: {
    id: string;
    name: string;
    logo: string;
  };
  category: string;
  cashbackRate: number;
  bonusCoins?: number;
  originalCashbackRate?: number;
  validUntil: string;
  timeRemaining?: number; // in milliseconds
  badge?: DealBadge;
  isFlashSale: boolean;
  priority: number;
  externalUrl?: string; // External affiliate URL
  storeId?: string; // For in-app stores
}

// ============================================================================
// GIFT CARD / VOUCHER BRAND
// ============================================================================

export interface GiftCardBrand {
  _id: string;
  id: string;
  name: string;
  logo: string;
  backgroundColor?: string;
  cashbackRate: number;
  bonusCoins?: number;
  denominations: number[];
  discountPercentage?: number; // e.g., Buy 1000 for 950
  category: string;
  rating?: number;
  ratingCount?: number;
  isFeatured: boolean;
  isNewlyAdded: boolean;
  termsAndConditions?: string[];
  purchaseCount?: number;
}

// ============================================================================
// COUPON CODE
// ============================================================================

export interface CashStoreCoupon {
  _id: string;
  id: string;
  code: string;
  brand: {
    id: string;
    name: string;
    logo?: string;
  };
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountCap?: number;
  validUntil: string;
  isVerified: boolean;
  isExclusive: boolean; // ReZ exclusive
  usageCount: number;
  successRate?: number;
  tags?: string[];
}

// ============================================================================
// HIGH CASHBACK DEAL
// ============================================================================

export interface HighCashbackDeal {
  _id: string;
  id: string;
  brand: {
    id: string;
    name: string;
    logo: string;
  };
  title: string;
  subtitle?: string;
  cashbackRate: number;
  bonusCoins?: number;
  validUntil: string;
  badge?: DealBadge;
  backgroundColor?: string;
  externalUrl?: string;
  storeId?: string;
}

// ============================================================================
// TRAVEL DEAL
// ============================================================================

export type TravelDealCategory = 'flights' | 'hotels' | 'cabs' | 'experiences' | 'buses' | 'trains';

export interface TravelDeal {
  _id: string;
  id: string;
  category: TravelDealCategory;
  title: string;
  cashbackRate: number;
  bonusCoins?: number;
  icon: string;
  backgroundColor: string;
  gradientColors?: string[];
  brand?: {
    id: string;
    name: string;
    logo?: string;
  };
  externalUrl?: string;
}

// ============================================================================
// CASHBACK ACTIVITY
// ============================================================================

export type CashbackActivityStatus = 'pending' | 'confirmed' | 'available' | 'expired' | 'cancelled';

export interface CashbackActivity {
  _id: string;
  id: string;
  brand: {
    id: string;
    name: string;
    logo: string;
  };
  orderNumber?: string;
  purchaseAmount: number;
  cashbackAmount: number;
  bonusCoins?: number;
  status: CashbackActivityStatus;
  date: string;
  estimatedCreditDate?: string;
  source: 'order' | 'referral' | 'promotion' | 'special_offer' | 'bonus' | 'gift_card';
}

// ============================================================================
// CASH STORE HERO BANNER
// ============================================================================

export interface CashStoreHeroBanner {
  _id: string;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  icon?: string;
  backgroundColor: string;
  gradientColors?: string[];
  textColor: string;
  ctaText: string;
  ctaAction: 'navigate' | 'external' | 'shop';
  ctaUrl?: string;
  badge?: string;
  priority: number;
  isActive: boolean;
}

// ============================================================================
// CASH STORE QUICK ACTION
// ============================================================================

export interface CashStoreQuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  backgroundColor: string;
  gradientColors?: string[];
  action: 'buy-coupons' | 'extra-coins' | 'trending' | 'track-cashback';
  navigateTo?: string;
  badge?: string;
}

// ============================================================================
// HOW IT WORKS STEP
// ============================================================================

export interface HowItWorksStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  iconBackgroundColor: string;
}

// ============================================================================
// AGGREGATED HOMEPAGE DATA (frontend combined view)
// ============================================================================

export interface CashStoreHomepageData {
  cashbackSummary: {
    total: number;
    pending: number;
    confirmed: number;
    available: number;
  };
  heroBanners: CashStoreHeroBanner[];
  quickActions: CashStoreQuickAction[];
  topBrands: CashStoreBrand[];
  trendingDeals: TrendingDeal[];
  giftCardBrands: GiftCardBrand[];
  couponCodes: CashStoreCoupon[];
  highCashbackDeals: HighCashbackDeal[];
  travelDeals: TravelDeal[];
  recentActivity: CashbackActivity[];
  howItWorksSteps: HowItWorksStep[];
}

// ============================================================================
// CASH STORE HOMEPAGE API RESPONSE (from /api/cashstore/homepage)
// ============================================================================

export interface CashStoreHomepageApiData {
  categories: CashStoreCategoryFilter[];
  topBrands: any[]; // MallBrand from backend
  trendingBrands: any[]; // featured MallBrands
  highCashbackBrands: any[]; // high cashback MallBrands
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CashStoreApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    timestamp?: string;
  };
}

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseCashStoreSectionReturn {
  // Data
  cashbackSummary: {
    total: number;
    pending: number;
    confirmed: number;
    available: number;
  };
  heroBanners: CashStoreHeroBanner[];
  quickActions: CashStoreQuickAction[];
  topBrands: CashStoreBrand[];
  trendingDeals: TrendingDeal[];
  giftCardBrands: GiftCardBrand[];
  couponCodes: CashStoreCoupon[];
  highCashbackDeals: HighCashbackDeal[];
  travelDeals: TravelDeal[];
  recentActivity: CashbackActivity[];

  // Dynamic categories from API
  categories: CashStoreCategoryFilter[];

  // Category filter
  selectedCategory: CashStoreCategoryFilterKey;
  setSelectedCategory: (category: CashStoreCategoryFilterKey) => void;
  filteredTopBrands: CashStoreBrand[];
  filteredTrendingDeals: TrendingDeal[];
  filteredHighCashbackDeals: HighCashbackDeal[];
  isCategoryLoading: boolean;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isInitialLoad: boolean;

  // Error state
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  copyCouponCode: (code: string) => Promise<boolean>;
  navigateToBrand: (brand: CashStoreBrand) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCashbackRate(rate: number): string {
  return `Up to ${rate}%`;
}

export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  }
  if (hours > 0) {
    return `${hours}h left`;
  }
  return `${minutes}m left`;
}

export function getTimeRemainingMs(validUntil: string): number {
  const now = new Date().getTime();
  const end = new Date(validUntil).getTime();
  return Math.max(0, end - now);
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function getBadgeColor(badge: DealBadge): string {
  // Nuqta palette badge colors
  const colors: Record<DealBadge, string> = {
    'trending': '#ffd7b5',    // Light Peach
    'hot': '#E8B896',         // Peach Dark
    'limited-time': '#ffcd57', // Light Mustard
    'exclusive': '#1a3a52',   // Nile Blue
    'new': '#ffcd57',         // Light Mustard
    'best-deal': '#1a3a52',   // Nile Blue
  };
  return colors[badge] || '#ffcd57';
}

export function getTravelDealGradient(category: TravelDealCategory): string[] {
  // Nuqta palette travel gradients
  const gradients: Record<TravelDealCategory, string[]> = {
    'flights': ['#1a3a52', '#243f55'],           // Nile Blue shades
    'hotels': ['#ffd7b5', '#E8B896'],            // Light Peach shades
    'cabs': ['#ffcd57', '#e5b84d'],              // Light Mustard shades
    'experiences': ['#dfebf7', '#b8d4ed'],       // Lavender Mist shades
    'buses': ['#1a3a52', '#2d4a5f'],             // Nile Blue shades
    'trains': ['#faf1e0', '#E8B896'],            // Linen to Peach
  };
  return gradients[category] || ['#ffcd57', '#1a3a52'];
}
