// Type definitions for future StoreActionButtons API integration

import { StoreType, ButtonActionResult } from './store-actions';

// ==========================================
// Core API Response Types
// ==========================================

/**
 * Store data received from backend API
 */
export interface StoreApiResponse {
  id: string;
  name: string;
  type: StoreType;
  category: string;
  isOpen: boolean;
  location: string;
  description?: string;
  imageUrl?: string;
  
  // Action permissions from backend
  actions: StoreActionPermissions;
  
  // Additional metadata
  metadata: {
    lastUpdated: string;
    version: number;
  };
}

/**
 * Action permissions determined by backend business logic
 */
export interface StoreActionPermissions {
  canBuy: boolean;
  canLock: boolean;
  canBook: boolean;
  
  // Additional context for UI decisions
  buyReasons?: string[]; // Reasons why buy might be disabled
  lockReasons?: string[]; // Reasons why lock might be disabled
  bookReasons?: string[]; // Reasons why booking might be disabled
  
  // Timing constraints
  maxLockDuration?: number; // Minutes
  bookingAdvanceNotice?: number; // Hours
}

/**
 * Product/Service specific data
 */
export interface ItemApiResponse {
  id: string;
  title: string;
  price: number;
  currency: string;
  availability: ItemAvailability;
  storeId: string;
  
  // Item-specific action overrides
  itemActions?: Partial<StoreActionPermissions>;
}

export interface ItemAvailability {
  inStock: boolean;
  quantity: number;
  isLockable: boolean;
  isBookable: boolean;
  nextAvailable?: string; // ISO date string
}

// ==========================================
// API Request/Response Types
// ==========================================

/**
 * Buy action API request
 */
export interface BuyActionRequest {
  storeId: string;
  itemId: string;
  quantity?: number;
  userId: string;
  paymentMethod?: string;
}

export interface BuyActionResponse extends ButtonActionResult {
  orderId?: string;
  estimatedDelivery?: string;
  totalAmount?: number;
  currency?: string;
}

/**
 * Lock action API request
 */
export interface LockActionRequest {
  storeId: string;
  itemId: string;
  userId: string;
  lockDurationMinutes?: number;
}

export interface LockActionResponse extends ButtonActionResult {
  lockId?: string;
  expiresAt?: string; // ISO date string
  lockDurationMinutes?: number;
}

/**
 * Booking action API request
 */
export interface BookingActionRequest {
  storeId: string;
  serviceId: string;
  userId: string;
  preferredDateTime?: string;
  duration?: number; // Minutes
  notes?: string;
}

export interface BookingActionResponse extends ButtonActionResult {
  bookingId?: string;
  confirmedDateTime?: string;
  duration?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

// ==========================================
// API Service Interfaces
// ==========================================

/**
 * Store API service interface
 */
export interface StoreApiService {
  getStoreData(storeId: string): Promise<StoreApiResponse>;
  getItemData(itemId: string): Promise<ItemApiResponse>;
  executeAction(action: StoreAction): Promise<ButtonActionResult>;
}

/**
 * Store action union type for API calls
 */
export type StoreAction = 
  | { type: 'buy'; payload: BuyActionRequest }
  | { type: 'lock'; payload: LockActionRequest }
  | { type: 'booking'; payload: BookingActionRequest };

// ==========================================
// React Hook Types
// ==========================================

/**
 * Hook for fetching store data
 */
export interface UseStoreDataResult {
  data: StoreApiResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseStoreDataOptions {
  storeId: string;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for store actions
 */
export interface UseStoreActionsResult {
  executeAction: (action: StoreAction) => Promise<ButtonActionResult>;
  isExecuting: boolean;
  lastResult: ButtonActionResult | null;
}

// ==========================================
// Configuration Types
// ==========================================

/**
 * API configuration
 */
export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * API endpoints configuration
 */
export interface ApiEndpoints {
  getStore: (storeId: string) => string;
  getItem: (itemId: string) => string;
  buyAction: (storeId: string) => string;
  lockAction: (storeId: string) => string;
  bookingAction: (storeId: string) => string;
}

// ==========================================
// Error Types
// ==========================================

/**
 * API error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

/**
 * Specific error types
 */
export type ApiErrorType = 
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'BUSINESS_RULE_VIOLATION'
  | 'INTERNAL_SERVER_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVICE_UNAVAILABLE';

// ==========================================
// Integration Helper Types
// ==========================================

/**
 * Props for StoreActionButtons with API integration
 */
export interface StoreActionButtonsApiProps {
  storeId: string;
  itemId?: string;
  userId: string;
  
  // Override default API behavior
  customApiService?: StoreApiService;
  customEndpoints?: Partial<ApiEndpoints>;
  
  // Fallback props if API fails
  fallbackStoreType?: StoreType;
  fallbackPermissions?: StoreActionPermissions;
}

/**
 * Context for API integration
 */
export interface StoreApiContext {
  config: ApiConfig;
  endpoints: ApiEndpoints;
  service: StoreApiService;
}

// ==========================================
// Migration Helper Types
// ==========================================

/**
 * Props transformation for migrating from mock to API
 */
export interface ApiMigrationHelper {
  // Current mock props
  mockStoreType: StoreType;
  mockHandlers: {
    onBuyPress: () => Promise<void>;
    onLockPress: () => Promise<void>;
    onBookingPress: () => Promise<void>;
  };
  
  // Future API props
  apiProps: StoreActionButtonsApiProps;
}

/**
 * Environment-based configuration
 */
export interface EnvironmentConfig {
  isDevelopment: boolean;
  useMockData: boolean;
  apiConfig: ApiConfig;
  enableDebugLogs: boolean;
}