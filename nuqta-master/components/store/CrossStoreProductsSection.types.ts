/**
 * Type definitions for CrossStoreProductsSection component
 */

import { ProductItem } from '@/types/homepage.types';

/**
 * Props for the CrossStoreProductsSection component
 */
export interface CrossStoreProductsSectionProps {
  /**
   * Current store ID to exclude products from this store
   * @example "store-123"
   */
  currentStoreId?: string;

  /**
   * Custom handler for product press events
   * @param productId - The ID of the pressed product
   * @param product - The full product object
   */
  onProductPress?: (productId: string, product: ProductItem) => void;

  /**
   * Number of products to fetch from the API
   * @default 10
   */
  limit?: number;
}

/**
 * Extended ProductItem with recommendation metadata
 */
export interface RecommendedProduct extends ProductItem {
  /**
   * Recommendation confidence score (0-1)
   */
  recommendationScore?: number;

  /**
   * Reasons why this product is recommended
   */
  recommendationReasons?: string[];

  /**
   * Name of the store selling this product
   */
  storeName?: string;

  /**
   * ID of the store selling this product
   */
  storeId?: string;
}

/**
 * Component states
 */
export type CrossStoreProductsState =
  | 'loading'
  | 'error'
  | 'empty'
  | 'success';

/**
 * Error types
 */
export type CrossStoreProductsError =
  | 'network'
  | 'api'
  | 'unknown';

/**
 * Analytics events for tracking
 */
export interface CrossStoreAnalyticsEvent {
  /**
   * Event name
   */
  event:
    | 'cross_store_section_viewed'
    | 'cross_store_product_clicked'
    | 'cross_store_view_all_clicked'
    | 'cross_store_add_to_cart'
    | 'cross_store_retry_clicked';

  /**
   * Event metadata
   */
  metadata?: {
    productId?: string;
    productName?: string;
    storeId?: string;
    storeName?: string;
    price?: number;
    position?: number;
    currentStoreId?: string;
  };

  /**
   * Timestamp of the event
   */
  timestamp: string;
}

/**
 * Skeleton loader configuration
 */
export interface SkeletonConfig {
  /**
   * Number of skeleton cards to show
   */
  count?: number;

  /**
   * Width of each skeleton card
   */
  width?: number;

  /**
   * Height of each skeleton card
   */
  height?: number;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  /**
   * Icon to show
   */
  icon?: string;

  /**
   * Title text
   */
  title?: string;

  /**
   * Message text
   */
  message?: string;
}

/**
 * Error state configuration
 */
export interface ErrorStateConfig {
  /**
   * Icon to show
   */
  icon?: string;

  /**
   * Title text
   */
  title?: string;

  /**
   * Error message
   */
  message?: string;

  /**
   * Show retry button
   */
  showRetry?: boolean;
}

/**
 * Card dimensions for different screen sizes
 */
export interface CardDimensions {
  /**
   * Desktop width (>= 1024px)
   */
  desktop: number;

  /**
   * Tablet width (>= 768px)
   */
  tablet: number;

  /**
   * Mobile width (< 768px)
   */
  mobile: number;
}

/**
 * Component theme configuration
 */
export interface CrossStoreTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    cardBackground: string;
    text: string;
    subtext: string;
    error: string;
    success: string;
    border: string;
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
}
