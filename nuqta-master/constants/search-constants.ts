// Search and filter constants for Store List Page
import { BRAND } from '@/constants/brand';

// Search configuration
export const SEARCH_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_SEARCH_LENGTH: 100,
  MIN_SEARCH_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_RECENT_SEARCHES: 10,
  SEARCH_TIMEOUT: 10000, // 10 seconds
} as const;

// Sort options
export const SORT_OPTIONS = {
  RELEVANCE: { id: 'relevance', label: 'Most Relevant', icon: 'star-outline' },
  DISTANCE: { id: 'distance', label: 'Nearest First', icon: 'location-outline' },
  PRICE_ASC: { id: 'price_asc', label: 'Price: Low to High', icon: 'trending-up-outline' },
  PRICE_DESC: { id: 'price_desc', label: 'Price: High to Low', icon: 'trending-down-outline' },
  RATING: { id: 'rating', label: 'Highest Rated', icon: 'star' },
  DISCOUNT: { id: 'discount', label: 'Best Offers', icon: 'pricetag-outline' },
} as const;

// Filter categories matching the design - ReZ Green
export const FILTER_CATEGORIES = {
  FASHION: {
    id: 'fashion',
    label: 'Fashion',
    icon: 'shirt-outline',
    color: '#00C06A',
    activeColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
    activeBackgroundColor: '#00C06A',
  },
  GENDER: {
    id: 'gender',
    label: 'Gender',
    icon: 'people-outline',
    color: '#00C06A',
    activeColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
    activeBackgroundColor: '#00C06A',
  },
  REZ_PAY: {
    id: 'rez_pay',
    label: BRAND.PAY_NAME,
    icon: 'wallet-outline',
    color: '#FFB800',
    activeColor: '#FFFFFF',
    backgroundColor: '#FEF3C7',
    activeBackgroundColor: '#FFB800',
  },
  OFFERS: {
    id: 'offers',
    label: 'Offers',
    icon: 'pricetag-outline',
    color: '#EF4444',
    activeColor: '#FFFFFF',
    backgroundColor: '#FEE2E2',
    activeBackgroundColor: '#EF4444',
  },
} as const;

// Gender filter options
export const GENDER_OPTIONS = {
  MEN: { id: 'men', label: 'Men', icon: 'male-outline', color: '#3B82F6' },
  WOMEN: { id: 'women', label: 'Women', icon: 'female-outline', color: '#EC4899' },
  UNISEX: { id: 'unisex', label: 'Unisex', icon: 'people-outline', color: '#00C06A' },
  KIDS: { id: 'kids', label: 'Kids', icon: 'child-outline', color: '#10B981' },
} as const;

// Store status indicators
export const STORE_STATUS = {
  OPEN: {
    id: 'open',
    label: 'Open',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    icon: 'checkmark-circle-outline',
  },
  CLOSED: {
    id: 'closed',
    label: 'Closed',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    icon: 'close-circle-outline',
  },
  ONLINE_AVAILABLE: {
    id: 'online_available',
    label: 'Online available',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    icon: 'globe-outline',
  },
} as const;

// Payment method indicators
export const PAYMENT_METHODS = {
  REZ_PAY: {
    id: 'rez_pay',
    label: `${BRAND.PAY_NAME} Available`,
    shortLabel: BRAND.PAY_NAME,
    color: '#FFB800',
    backgroundColor: '#FEF3C7',
    icon: 'wallet-outline',
  },
  COD: {
    id: 'cod',
    label: 'Cash on Delivery',
    shortLabel: 'COD',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    icon: 'cash-outline',
  },
  EMI: {
    id: 'emi',
    label: 'EMI Available',
    shortLabel: 'EMI',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    icon: 'card-outline',
  },
} as const;

// Discount badge styles
export const DISCOUNT_STYLES = {
  SMALL: {
    fontSize: 10,
    padding: 4,
    borderRadius: 4,
  },
  MEDIUM: {
    fontSize: 12,
    padding: 6,
    borderRadius: 6,
  },
  LARGE: {
    fontSize: 14,
    padding: 8,
    borderRadius: 8,
  },
} as const;

// Product grid configuration
export const PRODUCT_GRID = {
  COLUMNS: 2,
  SPACING: 12,
  ASPECT_RATIO: 0.75, // width / height
  IMAGE_ASPECT_RATIO: 0.85, // width / height — reduced for compact cards
} as const;

// Animation durations
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 400,
  SEARCH_DEBOUNCE: 300,
  FILTER_TRANSITION: 200,
} as const;

// Colors matching the design - ReZ Brand Colors
export const COLORS = {
  // Primary colors - ReZ Green
  PRIMARY: '#00C06A',
  PRIMARY_LIGHT: '#00D977',
  PRIMARY_DARK: '#00996B',

  // Secondary colors - ReZ Gold
  SECONDARY: '#FFC857',
  SECONDARY_LIGHT: '#FFD77A',
  SECONDARY_DARK: '#FF9F1C',
  
  // Status colors
  SUCCESS: '#10B981',
  ERROR: '#EF4444',
  WARNING: '#F59E0B',
  INFO: '#3B82F6',
  
  // Neutral colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F3F4F6',
  GRAY_200: '#E5E7EB',
  GRAY_300: '#D1D5DB',
  GRAY_400: '#9CA3AF',
  GRAY_500: '#6B7280',
  GRAY_600: '#4B5563',
  GRAY_700: '#374151',
  GRAY_800: '#1F2937',
  GRAY_900: '#111827',
  
  // Background colors
  BACKGROUND: '#F8F9FA',
  CARD_BACKGROUND: '#FFFFFF',
  OVERLAY: 'rgba(0, 0, 0, 0.5)',
  
  // Text colors
  TEXT_PRIMARY: '#111827',
  TEXT_SECONDARY: '#6B7280',
  TEXT_MUTED: '#9CA3AF',
  TEXT_INVERSE: '#FFFFFF',
  
  // Border colors
  BORDER_LIGHT: '#F3F4F6',
  BORDER_DEFAULT: '#E5E7EB',
  BORDER_DARK: '#D1D5DB',
} as const;

// Typography
export const TYPOGRAPHY = {
  // Font sizes
  FONT_SIZE_XS: 10,
  FONT_SIZE_SM: 12,
  FONT_SIZE_BASE: 14,
  FONT_SIZE_LG: 16,
  FONT_SIZE_XL: 18,
  FONT_SIZE_2XL: 20,
  FONT_SIZE_3XL: 24,
  FONT_SIZE_4XL: 32,
  
  // Font weights
  FONT_WEIGHT_NORMAL: '400',
  FONT_WEIGHT_MEDIUM: '500',
  FONT_WEIGHT_SEMIBOLD: '600',
  FONT_WEIGHT_BOLD: '700',
  FONT_WEIGHT_EXTRABOLD: '800',
  
  // Line heights
  LINE_HEIGHT_TIGHT: 1.2,
  LINE_HEIGHT_NORMAL: 1.4,
  LINE_HEIGHT_RELAXED: 1.6,
} as const;

// Spacing values
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
  XXXXL: 40,
  XXXXXL: 48,
} as const;

// Border radius values
export const BORDER_RADIUS = {
  SM: 4,
  MD: 6,
  LG: 8,
  XL: 12,
  XXL: 16,
  FULL: 9999,
} as const;

// Shadow configurations
export const SHADOWS = {
  SM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  MD: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  LG: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  XL: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;

// Default values
export const DEFAULTS = {
  SEARCH_PLACEHOLDER: 'Search for the service',
  EMPTY_SEARCH_MESSAGE: 'Start typing to search for products',
  NO_RESULTS_MESSAGE: 'No products found. Try adjusting your search or filters.',
  ERROR_MESSAGE: 'Something went wrong. Please try again.',
  LOADING_MESSAGE: 'Searching...',
} as const;