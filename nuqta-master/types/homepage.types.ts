// Homepage Section Types
export interface HomepageSectionItem {
  id: string;
  title: string;
  image: string;
  description?: string;
}

// Events Section
export interface EventItem extends HomepageSectionItem {
  type: 'event';
  subtitle: string;
  price: {
    amount: number;
    currency: string;
    isFree?: boolean;
  };
  location?: string;
  date: string;
  time?: string;
  category: string;
  organizer: string;
  isOnline: boolean;
  registrationRequired: boolean;
  bookingUrl?: string; // For online events
  availableSlots?: Array<{
    id: string;
    time: string;
    available: boolean;
    maxCapacity: number;
    bookedCount: number;
  }>; // For offline events
  // Rating and reviews
  rating?: number; // Average rating (0-5)
  reviewCount?: number; // Total number of reviews
  // Cashback configuration
  cashback?: number; // Cashback percentage (0-100)
}

// Store Section (for Trending Stores, New Stores, Top Stores)
export interface StoreItem extends HomepageSectionItem {
  type: 'store';
  name: string;
  logo?: string;
  rating: {
    value: number;
    count: number;
    maxValue: number;
  };
  cashback: {
    percentage: number;
    maxAmount?: number;
  };
  category: string;
  location?: {
    address: string;
    city: string;
    distance?: string;
  };
  isNew?: boolean;
  isTrending?: boolean;
  isTopRated?: boolean;
  openingHours?: string;
  deliveryTime?: string;
  minimumOrder?: number;
}

// Product Section (for New Arrivals, Just for You)
export interface ProductItem extends HomepageSectionItem {
  type: 'product';
  name: string;
  brand: string;
  price: {
    current: number;
    original?: number;
    currency: string;
    discount?: number;
  };
  category: string;
  subcategory?: string;
  rating?: {
    value: number | string; // API can return string (e.g., "5.0") or number
    count: number;
  };
  cashback?: {
    percentage: number;
    maxAmount?: number;
  };
  isNewArrival?: boolean;
  isRecommended?: boolean;
  availabilityStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  inventory?: {
    stock: number;
    lowStockThreshold?: number;
  };
  tags: string[];
  arrivalDate?: string;
}

// Branded Store Section (for Today's Top Stores)
export interface BrandedStoreItem extends HomepageSectionItem {
  type: 'branded_store';
  brandName: string;
  brandLogo: string;
  backgroundColor?: string;
  discount: {
    percentage: number;
    description: string;
  };
  cashback: {
    percentage: number;
    description: string;
  };
  category: string;
  isPartner: boolean;
  partnerLevel?: 'gold' | 'silver' | 'bronze';
  validUntil?: string;
}

// Recommendation Item (for Just for You)
export interface RecommendationItem extends ProductItem {
  recommendationReason: string;
  recommendationScore: number;
  personalizedFor: string; // user preference category
}

// Homepage Section Configuration
export interface HomepageSection {
  id: string;
  title: string;
  type: 'events' | 'stores' | 'products' | 'branded_stores' | 'recommendations';
  showViewAll: boolean;
  isHorizontalScroll: boolean;
  items: (EventItem | StoreItem | ProductItem | BrandedStoreItem | RecommendationItem)[];
  loading?: boolean;
  error?: string | null;
  lastUpdated?: string;
  refreshable?: boolean;
  priority: number; // for ordering sections
}

// Homepage State
export interface HomepageState {
  sections: HomepageSection[];
  user: {
    id: string;
    preferences: string[];
    location?: {
      city: string;
      state: string;
    };
  };
  loading: boolean;
  error: string | null;
  lastRefresh: string | null;
}

// Homepage Actions
export type HomepageAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SECTIONS'; payload: HomepageSection[] }
  | { type: 'UPDATE_SECTION'; payload: { sectionId: string; section: Partial<HomepageSection> } }
  | { type: 'SET_USER_PREFERENCES'; payload: string[] }
  | { type: 'REFRESH_SECTION'; payload: string }
  | { type: 'SET_LAST_REFRESH'; payload: string };

// Component Props
export interface HorizontalScrollSectionProps {
  section: HomepageSection;
  onItemPress: (item: HomepageSectionItem) => void;
  onRefresh?: () => void;
  renderCard: (item: HomepageSectionItem) => React.ReactNode;
  cardWidth?: number;
  spacing?: number;
  showIndicator?: boolean;
}

export interface EventCardProps {
  event: EventItem;
  onPress: (event: EventItem) => void;
  width?: number;
}

export interface StoreCardProps {
  store: StoreItem;
  onPress: (store: StoreItem) => void;
  width?: number;
  variant?: 'default' | 'compact' | 'featured';
}

export interface ProductCardProps {
  product: ProductItem;
  onPress: (product: ProductItem) => void;
  onAddToCart?: (product: ProductItem) => void;
  width?: number;
  showAddToCart?: boolean;
}

export interface BrandedStoreCardProps {
  store: BrandedStoreItem;
  onPress: (store: BrandedStoreItem) => void;
  width?: number;
}

export interface RecommendationCardProps {
  recommendation: RecommendationItem;
  onPress: (recommendation: RecommendationItem) => void;
  onAddToCart?: (recommendation: RecommendationItem) => void;
  width?: number;
  showReason?: boolean;
}

// Analytics & Tracking
export interface HomepageAnalytics {
  sectionViews: Record<string, number>;
  itemClicks: Record<string, number>;
  scrollDepth: Record<string, number>;
  timeSpent: Record<string, number>;
  conversions: Record<string, number>;
}

// API Response Types
export interface HomepageApiResponse {
  sections: HomepageSection[];
  user: HomepageState['user'];
  analytics?: HomepageAnalytics;
  timestamp: string;
}

export interface SectionApiResponse {
  section: HomepageSection;
  timestamp: string;
}

// NEW: Batch API Response Types
export interface HomepageBatchResponse {
  success: boolean;
  data: {
    sections: {
      events: EventItem[];
      justForYou: ProductItem[];
      newArrivals: ProductItem[];
      trendingStores: StoreItem[];
      offers: ProductItem[];
      flashSales: ProductItem[];
    };
    metadata: {
      cached: boolean;
      timestamp: string;
    };
    userContext?: {
      walletBalance: number;
      totalSaved: number;
      voucherCount: number;
      offersCount: number;
      cartItemCount: number;
      subscription: { tier: string; status: string };
    } | null;
  };
  error?: string;
}

// Hook Return Types
export interface UseHomepageDataResult {
  state: HomepageState;
  actions: {
    refreshAllSections: (force?: boolean) => Promise<void>;
    refreshSection: (sectionId: string) => Promise<void>;
    updateUserPreferences: (preferences: string[]) => void;
    trackSectionView: (sectionId: string) => void;
    trackItemClick: (sectionId: string, itemId: string) => void;
  };
  getUserContext: () => {
    walletBalance: number;
    totalSaved: number;
    voucherCount: number;
    offersCount: number;
    cartItemCount: number;
    subscription: { tier: string; status: string };
  } | null;
}

export interface UseSectionDataResult {
  section: HomepageSection | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Navigation Types
export interface HomepageNavigationProps {
  navigateToEvents: () => void;
  navigateToStores: () => void;
  navigateToProducts: () => void;
  navigateToItemDetail: (item: HomepageSectionItem) => void;
  navigateToCategory: (category: string) => void;
}

// Theme & Styling
export interface HomepageTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    cardBackground: string;
    text: string;
    subtext: string;
    accent: string;
    error: string;
    success: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  shadows: {
    card: object;
    elevated: object;
  };
}

// Filter and Sort Options
export interface SectionFilters {
  category?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  location?: string;
  availability?: 'all' | 'available' | 'in_stock';
}

export interface SectionSortOptions {
  field: 'rating' | 'price' | 'distance' | 'popularity' | 'newest';
  direction: 'asc' | 'desc';
}