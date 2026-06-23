/**
 * Type Definitions for Homepage Data Service
 * Strict TypeScript types with zero 'any' usage
 */

import {
  HomepageSection,
  ProductItem,
  StoreItem,
  EventItem,
  RecommendationItem,
} from './homepage.types';

// ============================================================================
// SECTION CONFIGURATION TYPES
// ============================================================================

/**
 * Priority levels for section loading
 */
export type SectionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Section loading status
 */
export type SectionLoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale';

/**
 * Data transformation function type
 */
export type DataTransformer<TInput, TOutput> = (data: TInput) => TOutput;

/**
 * Generic section configuration
 */
export interface SectionConfig<TData = unknown> {
  /** Unique section identifier */
  id: string;

  /** API endpoint path */
  endpoint: string;

  /** Optional data transformation function */
  transform?: DataTransformer<TData, unknown>;

  /** Cache key for this section */
  cacheKey: string;

  /** Cache TTL in milliseconds */
  cacheTTL: number;

  /** Loading priority */
  priority: SectionPriority;

  /** Maximum retry attempts on failure */
  maxRetries: number;

  /** Enable request deduplication */
  deduplicate: boolean;

  /** Fallback data when offline/error */
  fallbackData?: TData;
}

// ============================================================================
// FETCH OPTIONS & PARAMETERS
// ============================================================================

/**
 * Options for fetching sections
 */
export interface FetchOptions {
  /** User ID for personalization */
  userId?: string;

  /** Force bypass cache */
  forceRefresh?: boolean;

  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /** Additional query parameters */
  params?: Record<string, string | number | boolean>;

  /** Use stale data while revalidating */
  staleWhileRevalidate?: boolean;
}

/**
 * Batch fetch options
 */
export interface BatchFetchOptions extends FetchOptions {
  /** Section IDs to fetch */
  sectionIds: string[];

  /** Parallel vs sequential loading */
  strategy?: 'parallel' | 'priority-based';

  /** Continue on individual section errors */
  gracefulDegradation?: boolean;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result of a single section fetch
 */
export interface SectionResult<TData = unknown> {
  /** Section data */
  data: TData;

  /** Whether data came from cache */
  fromCache: boolean;

  /** Whether device is offline */
  isOffline: boolean;

  /** Data age in milliseconds */
  age: number;

  /** Loading status */
  status: SectionLoadStatus;

  /** Error if fetch failed */
  error: SectionError | null;

  /** Timestamp of fetch */
  timestamp: Date;
}

/**
 * Results from batch section fetch
 */
export interface BatchSectionResults {
  /** Successfully loaded sections */
  sections: Record<string, HomepageSection>;

  /** Errors by section ID */
  errors: Record<string, SectionError>;

  /** Metadata about the batch operation */
  metadata: {
    totalRequested: number;
    successful: number;
    failed: number;
    fromCache: number;
    fetchTime: number;
    timestamp: Date;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error categories
 */
export type ErrorCategory =
  | 'network'
  | 'cache'
  | 'transform'
  | 'validation'
  | 'timeout'
  | 'abort'
  | 'unknown';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Section fetch error
 */
export interface SectionError {
  /** Error category */
  category: ErrorCategory;

  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Technical details */
  details?: string;

  /** Error severity */
  severity: ErrorSeverity;

  /** Whether operation is retryable */
  retryable: boolean;

  /** Recovery strategy */
  recovery: RecoveryStrategy;

  /** Original error object */
  originalError?: Error;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Recovery strategies for errors
 */
export type RecoveryStrategy =
  | 'retry'
  | 'use-cache'
  | 'use-fallback'
  | 'show-error'
  | 'skip-section';

/**
 * Error context for logging
 */
export interface ErrorContext {
  /** Section ID */
  sectionId: string;

  /** Retry attempt number */
  attempt: number;

  /** Timestamp */
  timestamp: Date;

  /** User ID if available */
  userId?: string;

  /** Error type */
  errorType: ErrorCategory;

  /** Stack trace */
  stack?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  /** Cache key */
  key: string;

  /** Cached at timestamp */
  cachedAt: Date;

  /** TTL in milliseconds */
  ttl: number;

  /** Data size in bytes */
  size: number;

  /** Access count */
  hits: number;

  /** Last accessed */
  lastAccessed: Date;

  /** Is stale but still usable */
  isStale: boolean;

  /** Version for migration */
  version: string;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl?: number;

  /** Cache priority */
  priority?: 'low' | 'medium' | 'high' | 'critical';

  /** Enable compression */
  compress?: boolean;

  /** Cache version */
  version?: string;
}

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

/**
 * Section performance metrics
 */
export interface SectionMetrics {
  /** Section ID */
  sectionId: string;

  /** Total fetch time in ms */
  fetchTime: number;

  /** Was it a cache hit */
  cacheHit: boolean;

  /** Data size in bytes */
  dataSize: number;

  /** Transform time in ms */
  transformTime: number;

  /** Network time in ms */
  networkTime: number;

  /** Number of retries */
  retries: number;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Overall service metrics
 */
export interface ServiceMetrics {
  /** Total sections loaded */
  totalSections: number;

  /** Cache hit rate (0-100) */
  cacheHitRate: number;

  /** Average fetch time in ms */
  avgFetchTime: number;

  /** Error rate (0-100) */
  errorRate: number;

  /** Total errors */
  totalErrors: number;

  /** Sections by status */
  statusDistribution: Record<SectionLoadStatus, number>;

  /** Performance by section */
  sectionMetrics: Record<string, SectionMetrics>;
}

// ============================================================================
// RETRY LOGIC TYPES
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Base delay in ms */
  baseDelay: number;

  /** Maximum delay in ms */
  maxDelay: number;

  /** Exponential backoff factor */
  backoffFactor: number;

  /** Which errors to retry */
  retryableErrors: ErrorCategory[];
}

/**
 * Retry state
 */
export interface RetryState {
  /** Current attempt */
  attempt: number;

  /** Next retry delay in ms */
  nextDelay: number;

  /** Can retry */
  canRetry: boolean;

  /** Last error */
  lastError: SectionError | null;
}

// ============================================================================
// BACKEND AVAILABILITY TYPES
// ============================================================================

/**
 * Backend availability status
 */
export interface BackendStatus {
  /** Is backend available */
  available: boolean;

  /** Last checked timestamp */
  lastChecked: Date | null;

  /** Next check timestamp */
  nextCheck: Date | null;

  /** Response time in ms */
  responseTime: number | null;

  /** Service health */
  health: 'healthy' | 'degraded' | 'down';
}

// ============================================================================
// TRANSFORMATION TYPES
// ============================================================================

/**
 * Product data from API (raw format)
 */
export interface RawProductData {
  _id: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images?: string[];
  category: string;
  subcategory?: string;
  rating?: number | string;
  reviewCount?: number;
  stock?: number;
  tags?: string[];
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Store data from API (raw format)
 */
export interface RawStoreData {
  _id: string;
  name: string;
  logo?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  cashbackPercentage?: number;
  category: string;
  address?: string;
  city?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  [key: string]: unknown;
}

/**
 * Event data from API (raw format)
 */
export interface RawEventData {
  _id: string;
  title: string;
  image: string;
  description?: string;
  price?: number;
  location?: string;
  date: string;
  time?: string;
  category: string;
  organizer?: string;
  isOnline?: boolean;
  [key: string]: unknown;
}

/**
 * Offer data from API (raw format)
 */
export interface RawOfferData {
  _id: string;
  title: string;
  image: string;
  description?: string;
  originalPrice?: number;
  discountedPrice?: number;
  cashbackPercentage?: number;
  validity?: {
    start: string;
    end: string;
  };
  store?: {
    _id: string;
    name: string;
  };
  category?: string;
  metadata?: {
    flashSale?: {
      isActive: boolean;
      salePrice: number;
      originalPrice: number;
    };
  };
  [key: string]: unknown;
}

// ============================================================================
// SERVICE STATE TYPES
// ============================================================================

/**
 * Service initialization state
 */
export interface ServiceState {
  /** Is service initialized */
  initialized: boolean;

  /** Is currently initializing */
  initializing: boolean;

  /** Backend availability */
  backendStatus: BackendStatus;

  /** Active abort controllers */
  activeRequests: Map<string, AbortController>;

  /** Performance metrics */
  metrics: ServiceMetrics;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type-safe section data union
 */
export type SectionData = ProductItem[] | StoreItem[] | EventItem[] | RecommendationItem[];

/**
 * Section type to data mapping
 */
export interface SectionTypeMap {
  'just_for_you': ProductItem[];
  'new_arrivals': ProductItem[];
  'trending_stores': StoreItem[];
  'events': EventItem[];
  'offers': ProductItem[];
  'flash_sales': ProductItem[];
}

/**
 * Extract section data type from config
 */
export type ExtractSectionData<T extends keyof SectionTypeMap> = SectionTypeMap[T];

/**
 * Async function type
 */
export type AsyncFunction<TArgs extends unknown[], TReturn> = (...args: TArgs) => Promise<TReturn>;

/**
 * Type guard for checking if data is array
 */
export function isDataArray<T>(data: T | T[]): data is T[] {
  return Array.isArray(data);
}

/**
 * Type guard for ProductItem array
 */
export function isProductArray(data: unknown): data is ProductItem[] {
  return Array.isArray(data) && data.every(item => 'type' in item && item.type === 'product');
}

/**
 * Type guard for StoreItem array
 */
export function isStoreArray(data: unknown): data is StoreItem[] {
  return Array.isArray(data) && data.every(item => 'type' in item && item.type === 'store');
}

/**
 * Type guard for EventItem array
 */
export function isEventArray(data: unknown): data is EventItem[] {
  return Array.isArray(data) && data.every(item => 'type' in item && item.type === 'event');
}
