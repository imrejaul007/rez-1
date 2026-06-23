/**
 * Store-related Constants
 * Central location for all MainStorePage and related component constants
 */

// ============================================================================
// FILTER & SORT OPTIONS
// ============================================================================

export const FILTER_OPTIONS = {
  /**
   * Product sorting options
   */
  SORT_BY: [
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest First' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'discount', label: 'Discount' },
  ] as const,

  /**
   * Product categories
   */
  CATEGORIES: [
    'All',
    'Electronics',
    'Fashion',
    'Food & Dining',
    'Beauty & Wellness',
    'Home & Living',
    'Sports & Fitness',
    'Books & Media',
    'Toys & Games',
    'Automotive',
  ] as const,

  /**
   * Price range filters
   */
  PRICE_RANGES: [
    { label: 'Under ₹500', min: 0, max: 500 },
    { label: '₹500 - ₹1,000', min: 500, max: 1000 },
    { label: '₹1,000 - ₹2,500', min: 1000, max: 2500 },
    { label: '₹2,500 - ₹5,000', min: 2500, max: 5000 },
    { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
    { label: 'Above ₹10,000', min: 10000, max: Infinity },
  ] as const,

  /**
   * Rating filter options
   */
  RATINGS: [
    { label: '4★ & above', value: 4 },
    { label: '3★ & above', value: 3 },
    { label: '2★ & above', value: 2 },
    { label: '1★ & above', value: 1 },
  ] as const,

  /**
   * Discount filter options
   */
  DISCOUNTS: [
    { label: '10% or more', value: 10 },
    { label: '20% or more', value: 20 },
    { label: '30% or more', value: 30 },
    { label: '40% or more', value: 40 },
    { label: '50% or more', value: 50 },
  ] as const,
} as const;

// ============================================================================
// TAB NAVIGATION
// ============================================================================

export const STORE_TABS = {
  PRODUCTS: 'products',
  DEALS: 'deals',
  REVIEWS: 'reviews',
  ABOUT: 'about',
  PHOTOS: 'photos',
} as const;

export type StoreTabKey = typeof STORE_TABS[keyof typeof STORE_TABS];

export const TAB_LABELS: Record<StoreTabKey, string> = {
  products: 'Products',
  deals: 'Deals',
  reviews: 'Reviews',
  about: 'About',
  photos: 'Photos',
};

// ============================================================================
// LAYOUT & GRID CONFIG
// ============================================================================

export const PRODUCT_GRID_CONFIG = {
  /**
   * Number of columns in product grid
   */
  NUM_COLUMNS: 2,

  /**
   * Product card height in pixels
   */
  CARD_HEIGHT: 280,

  /**
   * Horizontal padding for grid container
   */
  HORIZONTAL_PADDING: 16,

  /**
   * Spacing between cards
   */
  CARD_SPACING: 12,

  /**
   * Image aspect ratio (width / height)
   */
  IMAGE_ASPECT_RATIO: 1.2,

  /**
   * Maximum image width for optimization
   */
  MAX_IMAGE_WIDTH: 600,
} as const;

export const LAYOUT_BREAKPOINTS = {
  /**
   * Small devices (phones)
   */
  SMALL: 375,

  /**
   * Medium devices (tablets)
   */
  MEDIUM: 768,

  /**
   * Large devices (desktops)
   */
  LARGE: 1024,
} as const;

// ============================================================================
// PAGINATION & LOADING
// ============================================================================

export const PAGINATION_CONFIG = {
  /**
   * Initial number of products to load
   */
  INITIAL_PRODUCTS: 20,

  /**
   * Number of products to load on "Load More"
   */
  LOAD_MORE_COUNT: 10,

  /**
   * Infinite scroll threshold (distance from bottom)
   */
  SCROLL_THRESHOLD: 0.8,

  /**
   * Maximum products to load before requiring search refinement
   */
  MAX_PRODUCTS: 100,
} as const;

export const LOADING_CONFIG = {
  /**
   * Skeleton loader animation duration (ms)
   */
  SKELETON_DURATION: 1200,

  /**
   * Image loading timeout (ms)
   */
  IMAGE_TIMEOUT: 5000,

  /**
   * API request timeout (ms)
   */
  API_TIMEOUT: 10000,

  /**
   * Debounce delay for search input (ms)
   */
  SEARCH_DEBOUNCE: 300,
} as const;

// ============================================================================
// RATING & REVIEW
// ============================================================================

export const RATING_CONFIG = {
  /**
   * Minimum rating value
   */
  MIN_RATING: 0,

  /**
   * Maximum rating value
   */
  MAX_RATING: 5,

  /**
   * Rating step increment
   */
  STEP: 0.5,

  /**
   * Star colors
   */
  COLORS: {
    FILLED: '#FFD700',
    HALF: '#FFD700',
    EMPTY: '#E0E0E0',
  },
} as const;

export const REVIEW_CONFIG = {
  /**
   * Minimum review text length
   */
  MIN_REVIEW_LENGTH: 10,

  /**
   * Maximum review text length
   */
  MAX_REVIEW_LENGTH: 500,

  /**
   * Number of reviews to show initially
   */
  INITIAL_REVIEWS: 5,

  /**
   * Reviews per page
   */
  REVIEWS_PER_PAGE: 10,
} as const;

// ============================================================================
// CASHBACK & DISCOUNTS
// ============================================================================

export const CASHBACK_CONFIG = {
  /**
   * Default cashback percentage
   */
  DEFAULT_PERCENTAGE: 10,

  /**
   * Minimum cashback to display
   */
  MIN_DISPLAY: 1,

  /**
   * Maximum cashback percentage
   */
  MAX_PERCENTAGE: 100,

  /**
   * Cashback colors by tier
   */
  TIER_COLORS: {
    LOW: '#10B981', // Green - Below 10%
    MEDIUM: '#F59E0B', // Orange - 10-20%
    HIGH: '#EF4444', // Red - Above 20%
  },
} as const;

export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  BOGO: 'bogo', // Buy One Get One
  BUNDLE: 'bundle',
} as const;

// ============================================================================
// STORE STATUS
// ============================================================================

export const STORE_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  CLOSING_SOON: 'closing_soon', // Within 1 hour of closing
  OPENING_SOON: 'opening_soon', // Within 1 hour of opening
} as const;

export const STATUS_COLORS = {
  [STORE_STATUS.OPEN]: '#10B981',
  [STORE_STATUS.CLOSED]: '#EF4444',
  [STORE_STATUS.CLOSING_SOON]: '#F59E0B',
  [STORE_STATUS.OPENING_SOON]: '#3B82F6',
} as const;

// ============================================================================
// IMAGE PLACEHOLDERS
// ============================================================================

export const PLACEHOLDER_IMAGES = {
  PRODUCT: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&h=1100&fit=crop',
  STORE: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=800&fit=crop',
  USER: '',
  NO_IMAGE: 'https://via.placeholder.com/400x400?text=No+Image',
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  /**
   * Product title length
   */
  PRODUCT_TITLE: {
    MIN: 3,
    MAX: 100,
  },

  /**
   * Product description length
   */
  PRODUCT_DESCRIPTION: {
    MIN: 10,
    MAX: 1000,
  },

  /**
   * Price validation
   */
  PRICE: {
    MIN: 0,
    MAX: 10000000, // 1 Crore
  },

  /**
   * Distance validation (in km)
   */
  DISTANCE: {
    MIN: 0,
    MAX: 100,
  },
} as const;

// ============================================================================
// ANIMATION DURATIONS
// ============================================================================

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  SKELETON: 1200,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  LOAD_PRODUCTS: 'Failed to load products. Please try again.',
  LOAD_STORE: 'Failed to load store details. Please try again.',
  ADD_TO_CART: 'Failed to add item to cart. Please try again.',
  APPLY_DISCOUNT: 'Failed to apply discount. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_DATA: 'Invalid data received from server.',
  NOT_FOUND: 'Store or product not found.',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  ADDED_TO_CART: 'Item added to cart successfully!',
  ADDED_TO_WISHLIST: 'Added to wishlist!',
  REMOVED_FROM_WISHLIST: 'Removed from wishlist!',
  DISCOUNT_APPLIED: 'Discount applied successfully!',
  REVIEW_SUBMITTED: 'Thank you for your review!',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_WISHLIST: true,
  ENABLE_REVIEWS: true,
  ENABLE_SHARE: true,
  ENABLE_INFINITE_SCROLL: true,
  ENABLE_IMAGE_ZOOM: true,
  ENABLE_SKELETON_LOADING: true,
  ENABLE_ANALYTICS: true,
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  FILTER_OPTIONS,
  STORE_TABS,
  TAB_LABELS,
  PRODUCT_GRID_CONFIG,
  LAYOUT_BREAKPOINTS,
  PAGINATION_CONFIG,
  LOADING_CONFIG,
  RATING_CONFIG,
  REVIEW_CONFIG,
  CASHBACK_CONFIG,
  DISCOUNT_TYPES,
  STORE_STATUS,
  STATUS_COLORS,
  PLACEHOLDER_IMAGES,
  VALIDATION_RULES,
  ANIMATION_DURATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURE_FLAGS,
};
