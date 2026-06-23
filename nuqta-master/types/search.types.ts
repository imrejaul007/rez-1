// Search Page Types
// TypeScript interfaces for the search functionality system

export interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  cashbackPercentage: number;
  isPopular?: boolean;
  subcategories?: SearchSubcategory[];
}

export interface SearchSubcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  image?: string;
  cashbackPercentage: number;
  itemCount?: number;
}

export interface SearchSection {
  id: string;
  title: string;
  subtitle?: string;
  categories: SearchCategory[];
  viewAllLink?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  image?: string;
  category: string;
  subcategory?: string;
  cashbackPercentage: number;
  rating?: number;
  price?: {
    current: number;
    original?: number;
    currency: string;
  };
  location?: string;
  isPopular?: boolean;
  tags?: string[];
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'category' | 'product' | 'service' | 'location';
  categoryId?: string;
  resultCount?: number;
  isRecent?: boolean;
}

export interface SearchFilter {
  id: string;
  name: string;
  type: 'category' | 'cashback' | 'rating' | 'price' | 'location';
  values: FilterValue[];
}

export interface FilterValue {
  id: string;
  label: string;
  value: string | number;
  count?: number;
  isSelected?: boolean;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  selectedCategory?: string;
}

export interface SearchPageState {
  // Search query and input
  query: string;
  isSearching: boolean;
  
  // Sections and categories
  sections: SearchSection[];
  
  // Search results
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  
  // Filters and sorting
  activeFilters: Record<string, FilterValue[]>;
  availableFilters: SearchFilter[];
  sortBy: 'relevance' | 'popularity' | 'cashback' | 'rating' | 'price';
  
  // History and state
  searchHistory: SearchHistory[];
  recentSearches: string[];
  
  // UI state
  showSuggestions: boolean;
  showFilters: boolean;
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// API Response types
export interface SearchApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchCategoriesResponse {
  sections: SearchSection[];
}

export interface SearchResultsResponse {
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  filters: SearchFilter[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  recentSearches: string[];
}

// Search request types
export interface SearchRequest {
  query?: string;
  category?: string;
  subcategory?: string;
  filters?: Record<string, string[]>;
  sortBy?: string;
  page?: number;
  limit?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CategorySearchRequest {
  categoryId: string;
  subcategoryId?: string;
  filters?: Record<string, string[]>;
  sortBy?: string;
  page?: number;
  limit?: number;
}

// Component prop types
export interface SearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onBack: () => void;
  showSuggestions: boolean;
  suggestions: SearchSuggestion[];
  onSuggestionPress: (suggestion: SearchSuggestion) => void;
}

export interface SearchSectionProps {
  section: SearchSection;
  onCategoryPress: (category: SearchCategory) => void;
  onViewAllPress?: (section: SearchSection) => void;
}

export interface CategoryCardProps {
  category: SearchCategory;
  onPress: (category: SearchCategory) => void;
  size?: 'small' | 'medium' | 'large';
  showCashback?: boolean;
}

export interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  onResultPress: (result: SearchResult) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface SearchFiltersProps {
  filters: SearchFilter[];
  activeFilters: Record<string, FilterValue[]>;
  onFilterChange: (filterId: string, values: FilterValue[]) => void;
  onClearFilters: () => void;
  visible: boolean;
  onClose: () => void;
}

// Utility types
export type SearchSortOption = {
  id: string;
  label: string;
  value: SearchPageState['sortBy'];
};

export type SearchViewMode = 'categories' | 'results' | 'suggestions';

// Seller comparison types for redesigned search page
export interface SellerOption {
  storeId: string;
  storeName: string;
  storeLogo?: string;
  location: string;
  distance?: number;
  rating: number;
  reviewCount: number;
  price: {
    current: number;
    original?: number;
    currency: string;
  };
  savings: number;
  cashback: {
    percentage: number;
    amount: number;
    coins: number;
  };
  delivery: {
    time: string;
    type: 'express' | 'standard' | 'pickup';
    available: boolean;
  };
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  isVerified: boolean;
  badges?: string[]; // e.g., ["Hot Deal", "Lock Available"]
  productId?: string; // Reference to the product being sold
}

export interface GroupedProductResult {
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  sellers: SellerOption[];
  sellerCount: number;
}

export interface SearchResultsSummary {
  sellerCount: number;
  minPrice: number;
  maxCashback: number;
  priceRange: {
    min: number;
    max: number;
  };
}

// Constants and enums
export enum SearchActionType {
  SET_QUERY = 'SET_QUERY',
  SET_SEARCHING = 'SET_SEARCHING',
  SET_RESULTS = 'SET_RESULTS',
  SET_SUGGESTIONS = 'SET_SUGGESTIONS',
  SET_SECTIONS = 'SET_SECTIONS',
  ADD_FILTER = 'ADD_FILTER',
  REMOVE_FILTER = 'REMOVE_FILTER',
  CLEAR_FILTERS = 'CLEAR_FILTERS',
  SET_SORT_BY = 'SET_SORT_BY',
  ADD_TO_HISTORY = 'ADD_TO_HISTORY',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  TOGGLE_SUGGESTIONS = 'TOGGLE_SUGGESTIONS',
  TOGGLE_FILTERS = 'TOGGLE_FILTERS',
  LOAD_MORE_RESULTS = 'LOAD_MORE_RESULTS',
}

export interface SearchAction {
  type: SearchActionType;
  payload?: any;
}

// Search configuration
export interface SearchConfig {
  debounceMs: number;
  suggestionsLimit: number;
  resultsPerPage: number;
  maxRecentSearches: number;
  enableAutoComplete: boolean;
  enableSearchHistory: boolean;
  enableLocationSearch: boolean;
}

