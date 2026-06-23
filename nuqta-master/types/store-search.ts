// Store search related types
export interface SearchQuery {
  query: string;
  filters: SearchFilters;
  sortBy: SortOption;
  pagination: PaginationInfo;
}

export interface SearchFilters {
  categories: string[];
  gender: GenderFilter[];
  hasRezPay: boolean;
  priceRange?: PriceRange;
  distance?: number;
  storeStatus?: StoreStatus[];
}

export interface SearchResults {
  query: string;
  totalResults: number;
  totalStores: number;
  stores: StoreResult[];
  filters: AvailableFilters;
  pagination: PaginationInfo;
  suggestions?: string[];
}

export interface StoreResult {
  storeId: string;
  storeName: string;
  rating: number;
  reviewCount: number;
  distance: number | null;
  location: string;
  isOpen: boolean;
  hasOnlineDelivery: boolean;
  hasFreeShipping: boolean;
  estimatedDelivery?: string | null;
  storeImage?: string | null;
  logo?: string | null;
  description?: string;
  deliveryCategories?: {
    fastDelivery?: boolean;
    budgetFriendly?: boolean;
    ninetyNineStore?: boolean;
    premium?: boolean;
    organic?: boolean;
    alliance?: boolean;
    lowestPrice?: boolean;
    mall?: boolean;
    cashStore?: boolean;
  };
  hasNuqtaPay?: boolean;
  cashbackPercent?: number;
  maxCoinRedemptionPercent?: number;
  products: ProductItem[];
  totalProductsFound: number;
}

export interface ProductItem {
  productId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  imageUrl: string;
  imageAlt?: string;
  hasRezPay: boolean;
  inStock: boolean;
  category: string;
  subcategory?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
}

export interface AvailableFilters {
  categories: FilterOption[];
  genders: FilterOption[];
  priceRanges: PriceRange[];
  paymentMethods: FilterOption[];
}

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
  icon?: string;
}

export interface PriceRange {
  id: string;
  label: string;
  min: number;
  max: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Enums and types
export type GenderFilter = 'men' | 'women' | 'unisex' | 'kids';
export type SortOption = 'relevance' | 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'discount';
export type StoreStatus = 'open' | 'closed' | 'online_only';

// Component Props Types
export interface StoreListPageProps {
  initialQuery?: string;
  initialFilters?: Partial<SearchFilters>;
  onProductSelect?: (product: ProductItem, store: StoreResult) => void;
  onStoreSelect?: (store: StoreResult) => void;
}

export interface SearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onBack: () => void;
  placeholder?: string;
  isLoading?: boolean;
}

export interface FilterChipsProps {
  filters: SearchFilters;
  availableFilters: AvailableFilters;
  onFilterChange: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

export interface StoreCardProps {
  store: StoreResult;
  onStoreSelect?: (store: StoreResult) => void;
  onProductSelect?: (product: ProductItem, store: StoreResult) => void;
  showDistance?: boolean;
  maxProducts?: number;
}

export interface StoreInfoProps {
  store: StoreResult;
  onStorePress?: () => void;
  showFullInfo?: boolean;
}

export interface ProductGridProps {
  products: ProductItem[];
  store: StoreResult;
  onProductSelect?: (product: ProductItem, store: StoreResult) => void;
  maxItems?: number;
  columns?: number;
}

export interface ProductCardProps {
  product: ProductItem;
  store: StoreResult;
  onPress?: (product: ProductItem, store: StoreResult) => void;
  showStore?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// State management types
export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResults | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: SearchError | null;
  lastSearchTime: Date | null;
}

export interface SearchError {
  code: 'NETWORK_ERROR' | 'SERVER_ERROR' | 'NO_RESULTS' | 'INVALID_QUERY' | 'TIMEOUT';
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
}

// API types
export interface SearchApiRequest {
  query: string;
  filters: SearchFilters;
  sort: SortOption;
  page: number;
  pageSize: number;
}

export interface SearchApiResponse {
  success: boolean;
  data: SearchResults;
  message?: string;
  error?: string;
  timestamp: Date;
}

// Constants
export const SEARCH_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_SEARCH_LENGTH: 100,
  DEBOUNCE_DELAY: 300,
  MAX_RECENT_SEARCHES: 10,
  DEFAULT_SORT: 'relevance' as SortOption,
} as const;

export const FILTER_CATEGORIES = {
  FASHION: { id: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
  ELECTRONICS: { id: 'electronics', label: 'Electronics', icon: 'phone-portrait-outline' },
  HOME: { id: 'home', label: 'Home', icon: 'home-outline' },
  BEAUTY: { id: 'beauty', label: 'Beauty', icon: 'flower-outline' },
  SPORTS: { id: 'sports', label: 'Sports', icon: 'fitness-outline' },
} as const;

export const GENDER_FILTERS = {
  MEN: { id: 'men', label: 'Men', icon: 'male-outline' },
  WOMEN: { id: 'women', label: 'Women', icon: 'female-outline' },
  UNISEX: { id: 'unisex', label: 'Unisex', icon: 'people-outline' },
  KIDS: { id: 'kids', label: 'Kids', icon: 'child-outline' },
} as const;