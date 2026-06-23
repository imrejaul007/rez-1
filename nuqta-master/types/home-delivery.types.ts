// Home Delivery Types and Interfaces
// This file contains all TypeScript interfaces for the Home Delivery system

export interface HomeDeliveryProduct {
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
  shipping: {
    type: 'free' | 'paid' | 'premium';
    cost: number;
    estimatedDays: string;
    freeShippingEligible: boolean;
  };
  rating?: {
    value: number;
    count: number;
  };
  deliveryTime: string; // "Under 30min", "1-2 days", etc.
  isNew?: boolean;
  isFeatured?: boolean;
  isUnderDollarShipping?: boolean;
  availabilityStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  tags: string[];
  description: string;
  store: {
    id: string;
    name: string;
    logo?: string;
  };
}

export interface HomeDeliveryCategory {
  id: string;
  name: string;
  icon: string;
  productCount: number;
  isActive: boolean;
  backendId?: string; // MongoDB ObjectID for API calls
}

export interface HomeDeliverySection {
  id: string;
  title: string;
  subtitle?: string;
  products: HomeDeliveryProduct[];
  showViewAll: boolean;
  maxProducts?: number;
}

export interface HomeDeliveryFilters {
  shipping: ('free' | 'paid' | 'premium')[];
  ratings: number[];
  deliveryTime: string[];
  priceRange: {
    min: number;
    max: number;
  };
  brands: string[];
  availability: ('in_stock' | 'low_stock' | 'out_of_stock')[];
}

export interface HomeDeliveryPageState {
  categories: HomeDeliveryCategory[];
  products: HomeDeliveryProduct[];
  filteredProducts: HomeDeliveryProduct[];
  sections: HomeDeliverySection[];
  activeCategory: string;
  searchQuery: string;
  showSearchBar: boolean;
  filters: HomeDeliveryFilters;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  sortBy: 'default' | 'price_low' | 'price_high' | 'cashback_high' | 'rating' | 'delivery_time';
}

export interface HomeDeliverySearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'brand';
  category?: string;
  productCount?: number;
}

// Component Props Interfaces
export interface HomeDeliveryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onBack: () => void;
  onHideSearch?: () => void;
  onShowSearch?: () => void;
  showSearchBar?: boolean;
  suggestions?: HomeDeliverySearchSuggestion[];
  showSuggestions?: boolean;
}

export interface CategoryTabsProps {
  categories: HomeDeliveryCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export interface FilterChipsProps {
  filters: HomeDeliveryFilters;
  onFilterChange: (filters: HomeDeliveryFilters) => void;
  activeFilters: string[];
}

export interface ProductSectionProps {
  section: HomeDeliverySection;
  onProductPress: (product: HomeDeliveryProduct) => void;
  onViewAll: () => void;
}

export interface HomeDeliveryProductCardProps {
  product: HomeDeliveryProduct;
  onPress: () => void;
  showCashback?: boolean;
  showDeliveryTime?: boolean;
  compact?: boolean;
}

export interface ProductGridProps {
  products: HomeDeliveryProduct[];
  loading: boolean;
  onProductPress: (product: HomeDeliveryProduct) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  numColumns?: number;
  showHeader?: boolean; // Whether to show product count header
}

// Hook Return Types
export interface UseHomeDeliveryPageReturn {
  state: HomeDeliveryPageState;
  actions: {
    setActiveCategory: (categoryId: string) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (sortBy: HomeDeliveryPageState['sortBy']) => void;
    setFilters: (filters: HomeDeliveryFilters) => void;
    loadProducts: () => Promise<void>;
    loadMoreProducts: () => Promise<void>;
    searchProducts: (query: string) => Promise<void>;
    refreshProducts: () => Promise<void>;
    applyFilters: (filters: HomeDeliveryFilters) => Promise<void>;
    resetFilters: () => Promise<void>;
  };
  handlers: {
    handleCategoryChange: (categoryId: string) => void;
    handleSearchChange: (query: string) => void;
    handleSearchSubmit: (query: string) => void;
    handleProductPress: (product: HomeDeliveryProduct) => void;
    handleSortChange: (sortBy: HomeDeliveryPageState['sortBy']) => void;
    handleFilterChange: (filters: HomeDeliveryFilters) => void;
    handleLoadMore: () => void;
    handleRefresh: () => void;
    handleHideSearch: () => void;
    handleShowSearch: () => void;
  };
}

export interface UseHomeDeliverySearchReturn {
  searchQuery: string;
  suggestions: HomeDeliverySearchSuggestion[];
  showSuggestions: boolean;
  loading: boolean;
  handleSearchChange: (query: string) => void;
  handleSearchSubmit: (query: string) => void;
  handleSuggestionPress: (suggestion: HomeDeliverySearchSuggestion) => void;
  clearSearch: () => void;
}

// API Response Types
export interface HomeDeliveryProductsResponse {
  products: HomeDeliveryProduct[];
  categories: HomeDeliveryCategory[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

export interface HomeDeliverySectionsResponse {
  sections: HomeDeliverySection[];
}

// Filter Option Types
export interface FilterOption {
  id: string;
  label: string;
  value: string | number;
  count?: number;
}

export interface FilterGroup {
  id: string;
  title: string;
  type: 'single' | 'multiple' | 'range';
  options: FilterOption[];
}