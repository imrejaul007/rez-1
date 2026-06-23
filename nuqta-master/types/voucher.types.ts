// types/voucher.types.ts - TypeScript interfaces for Online Voucher system

export interface VoucherState {
  currentView: 'main' | 'category' | 'brand' | 'search';
  searchQuery: string;
  selectedCategory: string | null;
  selectedBrand: Brand | null;
  brands: Brand[];
  allBrands: Brand[]; // Store all brands for local filtering
  categories: Category[];
  featuredOffers: Offer[];
  loading: boolean;
  error: string | null;
  userCoins: number;
  filters: FilterOptions;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  logoColor?: string;
  rating: number;
  reviewCount: string; // e.g., "7.8k+ users"
  rewardCount?: string; // e.g., "55 lakh+ Rewards given in last month"
  cashbackRate: number; // percentage
  maxCashback?: number;
  description: string;
  categories: string[];
  featured: boolean;
  newlyAdded: boolean;
  location?: string;
  address?: string;
  offers: Offer[];
  bigSavingDays?: {
    title: string;
    description: string;
    discount: string;
  };
  extraOffers?: string[];
  rezRewards?: {
    percentage: number;
    description: string;
  };
  illustration?: string;
  backgroundColor?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  backgroundColor: string;
  brandCount: number;
  featuredBrands: Brand[];
  slug: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  cashbackRate: number;
  maxCashback?: number;
  validUntil?: Date;
  terms?: string[];
  brandId: string;
  categoryId: string;
  featured: boolean;
  image?: string;
}

export interface FilterOptions {
  cashbackRange: [number, number];
  minRating: number;
  sortBy: 'cashback' | 'rating' | 'popularity' | 'newest';
  categories: string[];
}

export interface UseVoucherReturn {
  state: VoucherState;
  heroCarousel: HeroCarouselItem[];
  actions: {
    searchBrands: (query: string) => void;
    selectCategory: (categoryId: string | null) => void;
    selectBrand: (brand: Brand) => void;
    clearSearch: () => void;
    refreshData: () => Promise<void>;
    updateFilters: (filters: Partial<FilterOptions>) => void;
  };
  handlers: {
    handleSearch: (query: string) => void;
    handleCategorySelect: (category: Category) => void;
    handleBrandSelect: (brand: Brand) => void;
    handleBackNavigation: () => void;
    handleShare: (brand?: Brand) => void;
    handleFavorite: (brand: Brand) => void;
  };
}

export interface VoucherApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BrandSearchRequest {
  query?: string;
  categoryId?: string;
  filters?: Partial<FilterOptions>;
  limit?: number;
  offset?: number;
}

export interface HeroCarouselItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  backgroundColor: string;
  textColor: string;
  cashbackRate?: number;
  brandId?: string;
  action?: {
    type: 'brand' | 'category' | 'external';
    target: string;
  };
}

export interface VoucherPageProps {
  initialCategory?: string;
  initialSearch?: string;
}

export interface BrandDetailProps {
  brandId: string;
  brand?: Brand;
}

// Navigation types
export interface VoucherNavigationParams {
  'online-voucher': undefined;
  'voucher/[brandId]': { brandId: string };
  'voucher/category/[slug]': { slug: string; categoryName: string };
}

// Stats and analytics
export interface VoucherStats {
  totalBrands: number;
  totalCategories: number;
  totalRewardsGiven: string;
  averageRating: number;
  topCategories: Category[];
  recentlyAdded: Brand[];
}