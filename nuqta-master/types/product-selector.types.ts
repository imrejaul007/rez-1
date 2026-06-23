// Product Selector Types
// Types for UGC video product tagging feature

export interface ProductSelectorProduct {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  images: string[];
  store: {
    _id: string;
    name: string;
    logo?: string;
  };
  category?: string;
  rating?: {
    average: number;
    count: number;
  };
  inStock?: boolean;
  tags?: string[];
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface ProductSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  category?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price_low' | 'price_high' | 'rating' | 'newest';
  inStockOnly?: boolean;
}

export interface ProductSearchResponse {
  products: ProductSelectorProduct[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
    hasMore: boolean;
  };
  filters?: {
    categories?: Array<{ id: string; name: string; count: number }>;
    priceRange?: { min: number; max: number };
    stores?: Array<{ id: string; name: string; count: number }>;
  };
}

export interface ProductSearchState {
  products: ProductSelectorProduct[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  query: string;
  total: number;
}

export interface SelectedProductsState {
  products: ProductSelectorProduct[];
  count: number;
  maxReached: boolean;
  minReached: boolean;
}

export interface ProductSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedProducts: ProductSelectorProduct[];
  onProductsChange: (products: ProductSelectorProduct[]) => void;
  maxProducts?: number;
  minProducts?: number;
  title?: string;
  confirmButtonText?: string;
  allowMultiple?: boolean;
  requireSelection?: boolean;
  showStoreFilter?: boolean;
  showCategoryFilter?: boolean;
  initialSearchQuery?: string;
}

export interface ProductCardProps {
  product: ProductSelectorProduct;
  isSelected: boolean;
  onToggleSelect: (product: ProductSelectorProduct) => void;
  disabled?: boolean;
  showStore?: boolean;
  showPrice?: boolean;
  showRating?: boolean;
  compactMode?: boolean;
}

export interface ProductSearchHookResult {
  // State
  products: ProductSelectorProduct[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  query: string;
  total: number;

  // Actions
  searchProducts: (searchQuery: string) => void;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
  refresh: () => Promise<void>;

  // Selection management
  selectedProducts: ProductSelectorProduct[];
  selectProduct: (product: ProductSelectorProduct) => boolean;
  deselectProduct: (productId: string) => void;
  toggleProduct: (product: ProductSelectorProduct) => void;
  clearSelection: () => void;
  isSelected: (productId: string) => boolean;
  canSelectMore: boolean;

  // Config
  maxProducts: number;
  minProducts: number;
}

export interface ProductSearchFilters {
  category?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price_low' | 'price_high' | 'rating' | 'newest';
  inStockOnly?: boolean;
}

export interface ProductSelectorEmptyStateProps {
  type: 'no_results' | 'no_products' | 'error';
  message?: string;
  onRetry?: () => void;
}

export interface ProductSelectorLoadingStateProps {
  count?: number;
}
