// Navigation Types
// Comprehensive type definitions for the navigation system

import { Href } from 'expo-router';

/**
 * Platform types supported by the app
 */
export type Platform = 'web' | 'ios' | 'android';

/**
 * Navigation method types
 */
export type NavigationMethod = 'push' | 'replace' | 'back' | 'dismiss';

/**
 * Navigation result status
 */
export type NavigationStatus = 'success' | 'failed' | 'fallback';

/**
 * Navigation history entry
 */
export interface NavigationHistoryEntry {
  route: string;
  timestamp: number;
  method: NavigationMethod;
  params?: Record<string, any>;
}

/**
 * Navigation options
 */
export interface NavigationOptions {
  fallbackRoute?: Href;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  animate?: boolean;
  replace?: boolean;
  params?: Record<string, any>;
}

/**
 * Safe navigation result
 */
export interface NavigationResult {
  status: NavigationStatus;
  route?: string;
  error?: Error;
  fallbackUsed?: boolean;
}

/**
 * Navigation guard function type
 */
export type NavigationGuard = (
  to: string,
  from?: string
) => boolean | Promise<boolean>;

/**
 * Navigation middleware function type
 */
export type NavigationMiddleware = (
  to: string,
  next: () => void,
  from?: string
) => void | Promise<void>;

/**
 * Navigation event types
 */
export enum NavigationEvent {
  BEFORE_NAVIGATE = 'beforeNavigate',
  AFTER_NAVIGATE = 'afterNavigate',
  NAVIGATION_ERROR = 'navigationError',
  NAVIGATION_BLOCKED = 'navigationBlocked',
}

/**
 * Navigation event listener
 */
export interface NavigationEventListener {
  event: NavigationEvent;
  handler: (data: any) => void;
}

/**
 * Route configuration
 */
export interface RouteConfig {
  path: string;
  requiresAuth?: boolean;
  fallback?: Href;
  guards?: NavigationGuard[];
  metadata?: Record<string, any>;
}

/**
 * Navigation state
 */
export interface NavigationState {
  currentRoute: string;
  history: NavigationHistoryEntry[];
  canGoBack: boolean;
  isNavigating: boolean;
  platform: Platform;
}

/**
 * Back button configuration
 */
export interface BackButtonConfig {
  fallbackRoute?: Href;
  onPress?: () => void;
  showConfirmation?: boolean;
  confirmationMessage?: string;
  style?: any;
  iconColor?: string;
  iconSize?: number;
}

/**
 * Deep link configuration
 */
export interface DeepLinkConfig {
  scheme: string;
  host?: string;
  path: string;
  params?: Record<string, any>;
}

/**
 * Navigation analytics event
 */
export interface NavigationAnalyticsEvent {
  route: string;
  method: NavigationMethod;
  timestamp: number;
  duration?: number;
  success: boolean;
  error?: string;
  platform: Platform;
}

/**
 * Navigation queue item
 */
export interface NavigationQueueItem {
  id: string;
  route: Href;
  options: NavigationOptions;
  priority: number;
  timestamp: number;
  attempts: number;
}

/**
 * Navigation error types
 */
export enum NavigationErrorType {
  INVALID_ROUTE = 'INVALID_ROUTE',
  NAVIGATION_BLOCKED = 'NAVIGATION_BLOCKED',
  NO_HISTORY = 'NO_HISTORY',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Navigation error
 */
export class NavigationError extends Error {
  type: NavigationErrorType;
  route?: string;
  originalError?: Error;

  constructor(
    type: NavigationErrorType,
    message: string,
    route?: string,
    originalError?: Error
  ) {
    super(message);
    this.type = type;
    this.route = route;
    this.originalError = originalError;
    this.name = 'NavigationError';
  }
}

/**
 * Navigation service interface
 */
export interface INavigationService {
  navigate(route: Href, options?: NavigationOptions): Promise<NavigationResult>;
  goBack(fallbackRoute?: Href): Promise<NavigationResult>;
  replace(route: Href, options?: NavigationOptions): Promise<NavigationResult>;
  canGoBack(): boolean;
  getCurrentRoute(): string;
  getHistory(): NavigationHistoryEntry[];
  clearHistory(): void;
  addGuard(guard: NavigationGuard): void;
  removeGuard(guard: NavigationGuard): void;
  addEventListener(
    event: NavigationEvent,
    handler: (data: any) => void
  ): void;
  removeEventListener(
    event: NavigationEvent,
    handler: (data: any) => void
  ): void;
}

/**
 * Stack configuration
 */
export interface StackConfig {
  maxSize?: number;
  persistToStorage?: boolean;
  storageKey?: string;
}

/**
 * Tab navigation configuration
 */
export interface TabConfig {
  resetOnTabChange?: boolean;
  preserveState?: boolean;
}

/**
 * Modal navigation configuration
 */
export interface ModalConfig {
  dismissOnBackdropPress?: boolean;
  fullScreen?: boolean;
  presentationStyle?: 'modal' | 'fullScreen' | 'formSheet';
}

// ==========================================
// PAGE-SPECIFIC ROUTE PARAMETERS
// ==========================================

/**
 * Product page route parameters
 * Used when navigating to /product/[id]
 *
 * @example
 * router.push(`/product/${productId}` as Href<ProductPageParams>);
 *
 * @example With params
 * router.push({
 *   pathname: '/product/[id]',
 *   params: { id: productId, source: 'homepage' }
 * });
 */
export interface ProductPageParams {
  /** Product ID (MongoDB ObjectId or frontend ID) */
  id: string;

  /** Optional: Source of navigation for analytics */
  source?: 'homepage' | 'search' | 'category' | 'store' | 'related' | 'ugc' | 'cart' | 'wishlist';

  /** Optional: Variant ID to pre-select */
  variantId?: string;

  /** Optional: Referral code */
  referral?: string;
}

/**
 * Checkout page route parameters
 * Used when navigating to /checkout
 *
 * @example
 * router.push(`/checkout?productId=${productId}&quantity=${quantity}` as Href<CheckoutParams>);
 *
 * @example Direct purchase
 * router.push({
 *   pathname: '/checkout',
 *   params: {
 *     productId: product.id,
 *     quantity: 2,
 *     variantId: selectedVariant.id,
 *     buyNow: 'true'
 *   }
 * });
 */
export interface CheckoutParams {
  /** Optional: Product ID for direct purchase (bypasses cart) */
  productId?: string;

  /** Optional: Quantity for direct purchase */
  quantity?: string | number;

  /** Optional: Variant ID for direct purchase */
  variantId?: string;

  /** Optional: Buy now mode (skips cart) */
  buyNow?: string | boolean;

  /** Optional: Applied promo code */
  promoCode?: string;

  /** Optional: Delivery address ID */
  addressId?: string;
}

/**
 * Store page route parameters
 * Used when navigating to /store/[id] or /MainStorePage
 *
 * @example
 * router.push(`/store/${storeId}` as Href<StorePageParams>);
 */
export interface StorePageParams {
  /** Store ID */
  id: string;

  /** Optional: Store name for display */
  storeName?: string;

  /** Optional: Category filter */
  category?: string;

  /** Optional: Tab to show */
  tab?: 'products' | 'about' | 'reviews';
}

/**
 * Category page route parameters
 * Used when navigating to /category/[slug]
 */
export interface CategoryPageParams {
  /** Category slug */
  slug: string;

  /** Optional: Subcategory */
  subcategory?: string;

  /** Optional: Sort order */
  sort?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';

  /** Optional: Price filters */
  minPrice?: string | number;
  maxPrice?: string | number;
}

/**
 * Search page route parameters
 */
export interface SearchPageParams {
  /** Search query */
  q?: string;

  /** Optional: Category filter */
  category?: string;

  /** Optional: Store filter */
  store?: string;

  /** Optional: Sort order */
  sort?: string;
}

/**
 * Helper type for route params with dynamic segments
 * Combines route name with its params
 */
export type RouteWithParams<T = Record<string, any>> = {
  pathname: string;
  params?: T;
};

/**
 * Type-safe navigation helper
 * Usage: navigateToProduct(router, { id: '123', source: 'homepage' })
 */
export type NavigateToProduct = (params: ProductPageParams) => void;
export type NavigateToCheckout = (params?: CheckoutParams) => void;
export type NavigateToStore = (params: StorePageParams) => void;
export type NavigateToCategory = (params: CategoryPageParams) => void;
