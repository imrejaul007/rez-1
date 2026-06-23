// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// API Request Types
export interface GetOffersRequest {
  page?: number;
  pageSize?: number;
  category?: string;
  sortBy?: 'distance' | 'cashback' | 'price' | 'newest' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    minCashBack?: number;
    maxDistance?: number;
    priceRange?: {
      min: number;
      max: number;
    };
    tags?: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SearchOffersRequest {
  query: string;
  page?: number;
  pageSize?: number;
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface GetOfferDetailsRequest {
  offerId: string;
  userId?: string;
}

export interface AddToFavoritesRequest {
  offerId: string;
  userId: string;
}

export interface RemoveFromFavoritesRequest {
  offerId: string;
  userId: string;
}

export interface GetUserFavoritesRequest {
  userId: string;
  page?: number;
  pageSize?: number;
}

export interface TrackOfferViewRequest {
  offerId: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
}

export interface RedeemOfferRequest {
  offerId: string;
  userId: string;
  storeId: string;
  amount?: number;
}

// API Endpoint Types
export interface OffersApiEndpoints {
  // Core offer endpoints
  getOffers: (params: GetOffersRequest) => Promise<ApiResponse<PaginatedResponse<Offer>>>;
  getOfferDetails: (params: GetOfferDetailsRequest) => Promise<ApiResponse<Offer>>;
  searchOffers: (params: SearchOffersRequest) => Promise<ApiResponse<PaginatedResponse<Offer>>>;
  
  // Category endpoints
  getCategories: () => Promise<ApiResponse<OfferCategory[]>>;
  getOffersByCategory: (categoryId: string, params?: GetOffersRequest) => Promise<ApiResponse<PaginatedResponse<Offer>>>;
  
  // User favorites
  getUserFavorites: (params: GetUserFavoritesRequest) => Promise<ApiResponse<PaginatedResponse<Offer>>>;
  addToFavorites: (params: AddToFavoritesRequest) => Promise<ApiResponse<{ success: boolean }>>;
  removeFromFavorites: (params: RemoveFromFavoritesRequest) => Promise<ApiResponse<{ success: boolean }>>;
  
  // Analytics
  trackOfferView: (params: TrackOfferViewRequest) => Promise<ApiResponse<{ success: boolean }>>;
  redeemOffer: (params: RedeemOfferRequest) => Promise<ApiResponse<{ success: boolean; redemptionId: string }>>;
  
  // Personalization
  getRecommendedOffers: (userId: string, location?: { latitude: number; longitude: number }) => Promise<ApiResponse<Offer[]>>;
  getTrendingOffers: (location?: { latitude: number; longitude: number }) => Promise<ApiResponse<Offer[]>>;
}

// Cache Configuration
export interface CacheConfig {
  offersCache: {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum cache size
  };
  categoriesCache: {
    ttl: number;
    maxSize: number;
  };
  userCache: {
    ttl: number;
    maxSize: number;
  };
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cache: CacheConfig;
  endpoints: {
    offers: string;
    categories: string;
    favorites: string;
    search: string;
    analytics: string;
    recommendations: string;
  };
}

// Backend Integration Types
import { Offer, OfferCategory } from './offers.types';

export interface BackendOffer extends Omit<Offer, 'id'> {
  _id: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  analytics: {
    views: number;
    clicks: number;
    redemptions: number;
    conversionRate: number;
  };
  targeting: {
    userSegments: string[];
    locationRadiusKm: number;
    ageRange?: {
      min: number;
      max: number;
    };
    interests?: string[];
  };
}

export interface BackendOfferCategory extends Omit<OfferCategory, 'id'> {
  _id: string;
  displayOrder: number;
  isActive: boolean;
  metadata: {
    description?: string;
    seoKeywords?: string[];
    iconUrl?: string;
  };
}

// Sync Types
export interface SyncRequest {
  lastSyncTimestamp?: string;
  deviceId: string;
  userId?: string;
}

export interface SyncResponse {
  offers: {
    added: BackendOffer[];
    updated: BackendOffer[];
    removed: string[];
  };
  categories: {
    added: BackendOfferCategory[];
    updated: BackendOfferCategory[];
    removed: string[];
  };
  userFavorites?: string[];
  timestamp: string;
}

// Error Types
export type ApiErrorCode = 
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'OFFLINE';

export interface DetailedApiError extends ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: {
      field?: string;
      validationErrors?: string[];
      retryAfter?: number;
    };
  };
}