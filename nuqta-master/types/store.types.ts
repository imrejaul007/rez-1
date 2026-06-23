/**
 * Store-related Type Definitions
 * Comprehensive types for store pages, products, and related data
 */

import { Discount } from '@/services/discountsApi';

// ============================================================================
// LOCATION TYPES
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
}

export interface Location {
  street?: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
  coordinates?: Coordinates;
  distance?: string;
  address?: string;
}

// ============================================================================
// BUSINESS HOURS TYPES
// ============================================================================

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessHours {
  [day: number]: DayHours;
}

export interface FormattedBusinessHours {
  day: string;
  time: string;
  isToday?: boolean;
  isOpen?: boolean;
}

// ============================================================================
// STORE TYPES
// ============================================================================

export interface StoreData {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  hours: BusinessHours;
  location: Location;
  images: string[];
  coverImage?: string;
  logo?: string;
  verified: boolean;
  featured: boolean;
  cashbackPercentage?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface StoreHeader {
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isOpen: boolean;
  distance?: string;
}

export interface StoreStatus {
  isOpen: boolean;
  status: 'open' | 'closed' | 'closing_soon' | 'opening_soon';
  nextChange?: string;
  message?: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ProductImage {
  id: string;
  uri: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ProductInventory {
  isAvailable: boolean;
  quantity: number;
  lowStockThreshold: number;
  reserved?: number;
}

export interface ProductRatings {
  average: number;
  count: number;
  distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ProductVariant {
  id: string;
  name: string;
  type: 'size' | 'color' | 'material' | 'custom';
  options: string[];
  prices?: Record<string, number>;
}

export interface Product {
  id: string;
  name: string;
  title?: string; // Alias for name
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  discountPercentage?: number;
  images: ProductImage[];
  category: Category;
  brand?: string;
  inventory: ProductInventory;
  ratings: ProductRatings;
  specifications?: Record<string, string>;
  tags: string[];
  variants?: ProductVariant[];
  storeId: string;
  storeName?: string;
  cashbackPercentage?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  level: number;
  order?: number;
}

export interface CategoryWithCount extends Category {
  productCount: number;
}

// ============================================================================
// PROMOTION TYPES
// ============================================================================

export type DiscountType = 'percentage' | 'fixed' | 'bogo' | 'bundle';

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  termsAndConditions: string;
  image?: string;
  active: boolean;
  featured?: boolean;
  storeId?: string;
  productIds?: string[];
  categoryIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  notHelpful?: number;
  verified: boolean;
  createdAt: Date;
  updatedAt?: Date;
  productId?: string;
  storeId?: string;
  replies?: ReviewReply[];
}

export interface ReviewReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt: Date;
  isStoreOwner?: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchases: number;
  withPhotos: number;
}

export interface RatingBreakdown {
  star: number;
  count: number;
  percentage: number;
}

// ============================================================================
// CART TYPES
// ============================================================================

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: {
    [key: string]: string;
  };
  cashback?: number;
  discount?: Discount;
  storeId: string;
  storeName: string;
  maxQuantity?: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  cashback: number;
  tax: number;
  total: number;
  appliedCoupons: Discount[];
  itemCount: number;
}

// ============================================================================
// UGC (USER GENERATED CONTENT) TYPES
// ============================================================================

export interface UGCContent {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  imageUri: string;
  videoUri?: string;
  caption?: string;
  viewCount: string | number;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  productId?: string;
  storeId?: string;
  tags?: string[];
  createdAt: Date;
}

export interface UGCStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

export type SortOption =
  | 'price_low'
  | 'price_high'
  | 'rating'
  | 'newest'
  | 'popular'
  | 'discount';

export interface PriceRange {
  label: string;
  min: number;
  max: number;
}

export interface FilterOptions {
  categories?: string[];
  priceRange?: PriceRange;
  minRating?: number;
  minDiscount?: number;
  inStock?: boolean;
  brands?: string[];
  tags?: string[];
}

export interface SortOptions {
  sortBy: SortOption;
  order: 'asc' | 'desc';
}

export interface ProductFilters {
  filter: FilterOptions;
  sort: SortOptions;
  search?: string;
  page: number;
  limit: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StoreApiResponse extends ApiResponse<StoreData> {
  data?: StoreData;
}

export interface ProductsApiResponse extends ApiResponse<PaginatedResponse<Product>> {
  data?: PaginatedResponse<Product>;
}

export interface ReviewsApiResponse extends ApiResponse<{
  reviews: Review[];
  stats: ReviewStats;
}> {
  data?: {
    reviews: Review[];
    stats: ReviewStats;
  };
}

export interface PromotionsApiResponse extends ApiResponse<Promotion[]> {
  data?: Promotion[];
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface StoreHeaderProps {
  store: StoreData | StoreHeader;
  onFollowPress?: () => void;
  onSharePress?: () => void;
  onBackPress?: () => void;
  isFollowing?: boolean;
  showBackButton?: boolean;
}

export interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  showWishlistButton?: boolean;
  showAddToCart?: boolean;
  compact?: boolean;
  horizontal?: boolean;
  style?: any;
}

export interface ProductGridProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  onEndReached?: () => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  numColumns?: number;
  emptyText?: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement;
}

export interface PromotionCardProps {
  promotion: Promotion;
  onPress?: () => void;
  compact?: boolean;
  style?: any;
}

export interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  onNotHelpful?: (reviewId: string) => void;
  onReply?: (reviewId: string) => void;
  showReplies?: boolean;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
}

// ============================================================================
// STATE TYPES
// ============================================================================

export interface StorePageState {
  storeData: StoreData | null;
  products: Product[];
  reviews: Review[];
  promotions: Promotion[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  filters: FilterOptions;
  sort: SortOptions;
  page: number;
  hasMore: boolean;
}

export interface ProductDetailState {
  product: Product | null;
  relatedProducts: Product[];
  reviews: Review[];
  loading: boolean;
  error: string | null;
  selectedVariant?: Record<string, string>;
  quantity: number;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface StoreNavigationParams {
  storeId: string;
  storeData?: string; // Serialized JSON
  storeType?: string;
  initialTab?: string;
}

export interface ProductNavigationParams {
  productId: string;
  productData?: string; // Serialized JSON
  fromStore?: boolean;
  storeId?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  state: LoadingState;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  // Re-export from services
  Discount,
};

export default {
  // Type guards could be added here if needed
};
