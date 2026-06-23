// Going Out Page TypeScript Interfaces

export interface GoingOutCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  isActive?: boolean;
  productCount?: number;
}

export interface GoingOutProduct {
  id: string;
  name: string;
  brand?: string;
  image: string;
  price: {
    current: number;
    original?: number;
    currency: string;
    discount?: number;
  };
  cashback: {
    percentage: number;
    maxAmount?: number;
  };
  category: string;
  categoryId: string;
  rating?: {
    value: number;
    count: number;
  };
  isNew?: boolean;
  isFeatured?: boolean;
  availabilityStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  tags?: string[];
  description?: string;
  store?: {
    id: string;
    name: string;
    logo?: string;
  };
}

export interface CashbackHubSection {
  id: string;
  title: string;
  subtitle?: string;
  products: GoingOutProduct[];
  showViewAll: boolean;
}

export interface GoingOutPageState {
  categories: GoingOutCategory[];
  products: GoingOutProduct[];
  filteredProducts: GoingOutProduct[];
  cashbackHubSections: CashbackHubSection[];
  activeCategory: string;
  searchQuery: string;
  showSearchBar: boolean;
  filters: GoingOutFilters;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  sortBy: 'default' | 'price_low' | 'price_high' | 'cashback_high' | 'rating' | 'newest';
  wishlist: string[]; // Array of product IDs in wishlist
}

export interface GoingOutFilters {
  priceRange: {
    min: number;
    max: number;
  };
  cashbackRange: {
    min: number;
    max: number;
  };
  brands: string[];
  ratings: number[];
  availability: string[];
}

export interface GoingOutSearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'brand';
  category?: string;
  productCount?: number;
}

// Component Props Interfaces
export interface GoingOutHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onBack: () => void;
  onHideSearch?: () => void;
  onShowSearch?: () => void;
  showSearchBar?: boolean;
  suggestions?: GoingOutSearchSuggestion[];
  showSuggestions?: boolean;
}

export interface CategoryTabsProps {
  categories: GoingOutCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export interface GoingOutProductCardProps {
  product: GoingOutProduct;
  onPress: (product: GoingOutProduct) => void;
  onAddToCart?: (product: GoingOutProduct) => void;
  onToggleWishlist?: (product: GoingOutProduct) => void;
  showAddToCart?: boolean;
  width?: number;
  isInWishlist?: boolean;
}

export interface ProductGridProps {
  products: GoingOutProduct[];
  loading: boolean;
  onProductPress: (product: GoingOutProduct) => void;
  onToggleWishlist?: (product: GoingOutProduct) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  numColumns?: number;
  wishlist?: string[];
  showHeader?: boolean;
}

export interface CashbackHubSectionProps {
  section: CashbackHubSection;
  onProductPress: (product: GoingOutProduct) => void;
  onToggleWishlist?: (product: GoingOutProduct) => void;
  onViewAll: (section: CashbackHubSection) => void;
  wishlist?: string[];
}

export interface GoingOutSortModalProps {
  visible: boolean;
  onClose: () => void;
  sortBy: GoingOutPageState['sortBy'];
  onSortChange: (sortBy: GoingOutPageState['sortBy']) => void;
}

export interface GoingOutFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: GoingOutFilters;
  onFiltersChange: (filters: GoingOutFilters) => void;
  onResetFilters: () => void;
}

// API Response Interfaces
export interface GetGoingOutProductsResponse {
  products: GoingOutProduct[];
  categories: GoingOutCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    priceRange: { min: number; max: number };
    availableBrands: string[];
  };
}

export interface SearchGoingOutProductsResponse {
  products: GoingOutProduct[];
  suggestions: GoingOutSearchSuggestion[];
  total: number;
  searchTime: number;
}

export interface GetCashbackHubResponse {
  sections: CashbackHubSection[];
  totalProducts: number;
}

// API Request Interfaces
export interface GetGoingOutProductsRequest {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: GoingOutPageState['sortBy'];
  filters?: Partial<GoingOutFilters>;
}

export interface SearchGoingOutProductsRequest {
  query: string;
  category?: string;
  limit?: number;
}

// Hook Interfaces
export interface UseGoingOutPageReturn {
  state: GoingOutPageState;
  actions: {
    setActiveCategory: (categoryId: string) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (sortBy: GoingOutPageState['sortBy']) => void;
    loadProducts: () => Promise<void>;
    loadMoreProducts: () => Promise<void>;
    searchProducts: (query: string) => Promise<void>;
    refreshProducts: () => Promise<void>;
    applyFilters: (filters: GoingOutFilters) => Promise<void>;
    resetFilters: () => Promise<void>;
    clearWishlist: () => Promise<void>;
  };
  handlers: {
    handleCategoryChange: (categoryId: string) => void;
    handleSearchChange: (query: string) => void;
    handleSearchSubmit: (query: string) => void;
    handleProductPress: (product: GoingOutProduct) => void;
    handleSortChange: (sortBy: GoingOutPageState['sortBy']) => void;
    handleFilterChange: (filters: GoingOutFilters) => void;
    handleLoadMore: () => void;
    handleRefresh: () => void;
    handleHideSearch: () => void;
    handleShowSearch: () => void;
    handleToggleWishlist: (product: GoingOutProduct) => void;
  };
}

export interface UseGoingOutSearchReturn {
  searchQuery: string;
  suggestions: GoingOutSearchSuggestion[];
  showSuggestions: boolean;
  loading: boolean;
  actions: {
    setSearchQuery: (query: string) => void;
    submitSearch: (query: string) => void;
    clearSearch: () => void;
    hideSuggestions: () => void;
    showSuggestions: () => void;
  };
}

// Navigation Interfaces
export interface GoingOutNavigationParams {
  category?: string;
  search?: string;
  productId?: string;
}

export interface GoingOutRouteParams {
  'going-out': GoingOutNavigationParams;
  'going-out/product/[id]': { id: string };
  'going-out/category/[slug]': { slug: string };
}