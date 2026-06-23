/**
 * Payment Store Search Types
 *
 * Type definitions for the premium store search flow within Pay-In-Store.
 * Includes types for search, filters, sections, and animations.
 */

import { StorePaymentInfo, StorePaymentSettings, StoreRewardRules } from './storePayment.types';

// ==================== STORE INFO FOR PAYMENT SEARCH ====================

export interface PaymentStoreInfo {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  category: {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
  };
  location: {
    address: string;
    city: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];
  };
  distance?: number; // Distance in km
  paymentSettings: StorePaymentSettings;
  rewardRules: StoreRewardRules;
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
  hasRezPay: boolean;
  maxCashback?: number; // Max cashback percentage
  lastPaidAt?: string; // For recent stores
  totalPayments?: number; // Payment count from this user
  popularityScore?: number; // For popular stores ranking

  // Store tags/flags
  isFeatured?: boolean;
  isBrand?: boolean;
  isHot?: boolean;
  isLocal?: boolean;
  isOnline?: boolean;
  isVerified?: boolean;
  isOpen?: boolean; // Computed from hours
  isService?: boolean; // Service-based stores (salons, repairs, etc.)

  // Offers & Partner Info
  offers?: {
    discount?: number; // Discount percentage
    cashback?: number; // Cashback percentage
    maxCashback?: number; // Max cashback amount
    minOrderAmount?: number;
    description?: string;
    isPartner?: boolean;
    partnerLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };

  // Operational Info
  operationalInfo?: {
    deliveryTime?: string; // "30-45 mins"
    minimumOrder?: number;
    deliveryFee?: number;
    freeDeliveryAbove?: number;
    paymentMethods?: string[];
    isOpenNow?: boolean;
    openingTime?: string;
    closingTime?: string;
  };

  // Delivery Categories (Store Features)
  deliveryCategories?: {
    fastDelivery?: boolean;
    budgetFriendly?: boolean;
    premium?: boolean;
    organic?: boolean;
    lowestPrice?: boolean;
  };

  // Analytics (for displaying popularity)
  analytics?: {
    totalOrders?: number;
    followersCount?: number;
  };

  // Contact Info
  contact?: {
    phone?: string;
    whatsapp?: string;
  };

  // Tags
  tags?: string[];

  // Branded coins message
  brandedCoinsMessage?: string;
}

// ==================== SEARCH CATEGORY ====================

export interface PaymentSearchCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  emoji: string;
  color: string;
  storeCount?: number;
}

export const PAYMENT_CATEGORIES: PaymentSearchCategory[] = [
  { id: 'all', name: 'All', slug: 'all', icon: 'apps-outline', emoji: '✨', color: '#00C06A' },
  { id: 'food', name: 'Food', slug: 'food', icon: 'fast-food-outline', emoji: '🍔', color: '#FF6B6B' },
  { id: 'grocery', name: 'Grocery', slug: 'grocery', icon: 'cart-outline', emoji: '🛒', color: '#4ECDC4' },
  { id: 'fashion', name: 'Fashion', slug: 'fashion', icon: 'shirt-outline', emoji: '👗', color: '#A855F7' },
  { id: 'electronics', name: 'Electronics', slug: 'electronics', icon: 'phone-portrait-outline', emoji: '📱', color: '#3B82F6' },
  { id: 'health', name: 'Health', slug: 'health', icon: 'medical-outline', emoji: '💊', color: '#10B981' },
  { id: 'beauty', name: 'Beauty', slug: 'beauty', icon: 'flower-outline', emoji: '💄', color: '#EC4899' },
  { id: 'services', name: 'Services', slug: 'services', icon: 'construct-outline', emoji: '🔧', color: '#F59E0B' },
];

// ==================== SEARCH STATE ====================

export interface PaymentSearchState {
  query: string;
  isSearching: boolean;
  results: PaymentStoreInfo[];
  selectedCategory: string | null;
  error: PaymentSearchError | null;
  hasMore: boolean;
  currentPage: number;
}

export interface PaymentSearchError {
  code: 'NETWORK_ERROR' | 'SERVER_ERROR' | 'NO_RESULTS' | 'LOCATION_ERROR' | 'TIMEOUT';
  message: string;
  recoverable: boolean;
}

// ==================== SECTION DATA ====================

export interface NearbyStoresSection {
  title: string;
  stores: PaymentStoreInfo[];
  isLoading: boolean;
  error: string | null;
  showSeeAll: boolean;
}

export interface RecentStoresSection {
  title: string;
  stores: PaymentStoreInfo[];
  isLoading: boolean;
  error: string | null;
  showSeeAll: boolean;
}

export interface PopularStoresSection {
  title: string;
  stores: PaymentStoreInfo[];
  isLoading: boolean;
  error: string | null;
  showSeeAll: boolean;
}

// ==================== HOOK RETURN TYPE ====================

export interface UsePaymentStoreSearchReturn {
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: PaymentStoreInfo[];
  isSearching: boolean;
  searchError: PaymentSearchError | null;

  // Data sections
  nearbyStores: PaymentStoreInfo[];
  recentStores: PaymentStoreInfo[];
  popularStores: PaymentStoreInfo[];

  // Loading states
  isLoadingNearby: boolean;
  isLoadingRecent: boolean;
  isLoadingPopular: boolean;
  isInitialLoading: boolean;

  // Category filter
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  categories: PaymentSearchCategory[];

  // Pagination
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;

  // Actions
  refresh: () => Promise<void>;
  clearSearch: () => void;
  retry: () => void;

  // Location
  userLocation: UserLocation | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  requestLocation: () => Promise<void>;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// ==================== API TYPES ====================

export interface PaymentStoreSearchRequest {
  search?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number; // km
  page?: number;
  limit?: number;
  sortBy?: 'distance' | 'rating' | 'popularity' | 'cashback';
}

export interface PaymentStoreSearchResponse {
  success: boolean;
  data: {
    stores: PaymentStoreInfo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  message?: string;
  error?: string;
}

export interface NearbyStoresRequest {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}

export interface NearbyStoresResponse {
  success: boolean;
  data: PaymentStoreInfo[];
  message?: string;
  error?: string;
}

export interface RecentPaymentsResponse {
  success: boolean;
  data: PaymentStoreInfo[];
  message?: string;
  error?: string;
}

export interface PopularStoresResponse {
  success: boolean;
  data: PaymentStoreInfo[];
  message?: string;
  error?: string;
}

// ==================== COMPONENT PROPS ====================

export interface PaymentStoreCardProps {
  store: PaymentStoreInfo;
  onPress: (store: PaymentStoreInfo) => void;
  onView?: (store: PaymentStoreInfo) => void;
  index?: number; // For staggered animation
  variant?: 'compact' | 'full';
  showCTA?: boolean;
}

export interface PaymentStoreCardSkeletonProps {
  variant?: 'compact' | 'full';
  count?: number;
}

export interface PremiumSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
  onVoiceSearch?: () => void;
  isSearching: boolean;
  scrollY?: any; // SharedValue for parallax
}

export interface CategoryChipsProps {
  categories: PaymentSearchCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  isLoading?: boolean;
}

export interface StoreSectionProps {
  title: string;
  icon?: string;
  stores: PaymentStoreInfo[];
  isLoading: boolean;
  onSeeAll?: () => void;
  onStorePress: (store: PaymentStoreInfo) => void;
  horizontal?: boolean;
  cardVariant?: 'compact' | 'full';
}

export interface EmptySearchStateProps {
  query: string;
  onClearSearch: () => void;
  onRetry?: () => void;
}

export interface RezPayBadgeProps {
  size?: 'small' | 'medium' | 'large';
}

export interface RewardsBadgeProps {
  cashbackPercent: number;
  size?: 'small' | 'medium' | 'large';
}

// ==================== NAVIGATION PARAMS ====================

export interface StoreSearchParams {
  initialQuery?: string;
  initialCategory?: string;
}

export interface StoreSearchNavigationParams {
  storeId: string;
  storeName: string;
  storeLogo?: string;
}

// ==================== ANIMATION CONFIGS ====================

export interface AnimationConfig {
  duration: number;
  damping: number;
  stiffness: number;
}

export const SEARCH_ANIMATIONS = {
  cardEntrance: {
    duration: 300,
    damping: 15,
    stiffness: 100,
  },
  searchFocus: {
    duration: 200,
    damping: 20,
    stiffness: 150,
  },
  pressScale: {
    duration: 100,
    damping: 15,
    stiffness: 200,
  },
  shimmer: {
    duration: 1500,
  },
  parallax: {
    inputRange: [0, 100],
    headerOutputRange: [180, 120],
    searchScaleOutputRange: [1, 0.95],
  },
  floatingButton: {
    duration: 2000,
    minScale: 1,
    maxScale: 1.05,
  },
} as const;

// ==================== CONSTANTS ====================

export const PAYMENT_SEARCH_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  DEFAULT_RADIUS: 5, // km
  DEFAULT_PAGE_SIZE: 20,
  NEARBY_LIMIT: 10,
  RECENT_LIMIT: 5,
  POPULAR_LIMIT: 10,
  MAX_SEARCH_LENGTH: 100,
  SHIMMER_COUNT: 3,
} as const;

// ==================== DESIGN TOKENS (LOCAL) ====================

export const PAYMENT_SEARCH_COLORS = {
  // Primary - ReZ Green
  primary: '#00C06A',
  primaryDark: '#00A05A',
  primaryLight: '#E8F5EE',
  primaryGlow: 'rgba(0, 192, 106, 0.2)',

  // Secondary - Gold (Rewards)
  gold: '#FFC857',
  goldLight: '#FFF8E1',
  goldGlow: 'rgba(255, 200, 87, 0.3)',

  // Brand
  navy: '#0B2240',
  slate: '#1F2D3D',

  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFB',

  // Glass
  glassWhite: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  glassOverlay: 'rgba(255, 255, 255, 0.1)',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
} as const;

export const PAYMENT_SEARCH_GRADIENTS = {
  header: ['#E8FFF3', '#F0FFF7', '#FFFFFF'],
  primaryButton: ['#00C06A', '#00A05A'],
  goldBadge: ['#FFC857', '#FFB300'],
  cardShimmer: ['#F3F4F6', '#E5E7EB', '#F3F4F6'],
} as const;

export const PAYMENT_SEARCH_SHADOWS = {
  card: {
    shadowColor: '#0B2240',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardPressed: {
    shadowColor: '#00C06A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    shadowColor: '#0B2240',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  floatingButton: {
    shadowColor: '#00C06A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;
