/**
 * Environment Configuration
 * Central place to manage all environment variables
 */

// Application Settings
export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'REZ App',
  version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
} as const;

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api',
  timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),
  devUrl: process.env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:5001/api',
  prodUrl: process.env.EXPO_PUBLIC_PROD_API_URL || 'https://api.rezapp.com/api',
} as const;

// API Endpoints
export const ENDPOINTS = {
  auth: process.env.EXPO_PUBLIC_AUTH_ENDPOINT || '/auth',
  products: process.env.EXPO_PUBLIC_PRODUCTS_ENDPOINT || '/products',
  cart: process.env.EXPO_PUBLIC_CART_ENDPOINT || '/cart',
  categories: process.env.EXPO_PUBLIC_CATEGORIES_ENDPOINT || '/categories',
  stores: process.env.EXPO_PUBLIC_STORES_ENDPOINT || '/stores',
  orders: process.env.EXPO_PUBLIC_ORDERS_ENDPOINT || '/orders',
  videos: process.env.EXPO_PUBLIC_VIDEOS_ENDPOINT || '/videos',
  projects: process.env.EXPO_PUBLIC_PROJECTS_ENDPOINT || '/projects',
  notifications: process.env.EXPO_PUBLIC_NOTIFICATIONS_ENDPOINT || '/notifications',
  reviews: process.env.EXPO_PUBLIC_REVIEWS_ENDPOINT || '/reviews',
  wishlist: process.env.EXPO_PUBLIC_WISHLIST_ENDPOINT || '/wishlist',
  // Direct session-manager URL for health checks only; API calls use gateway /sessions via apiClient.
  sessionManager: process.env.EXPO_PUBLIC_SESSION_MANAGER_URL || 'http://localhost:4312',
} as const;

// Authentication Settings
export const AUTH_CONFIG = {
  // Storage keys are intentionally hardcoded (not env-tunable) for security.
  // See utils/authStorage.ts:24-28 for the canonical source of truth.
  jwtStorageKey: 'rez_app_token',
  refreshTokenKey: 'rez_app_refresh_token',
  userDataKey: 'rez_app_user',
  sessionTimeout: parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT || '1440'), // minutes
} as const;

// External Services
export const EXTERNAL_SERVICES = {
  googleMaps: {
    // DEPRECATED for geocoding: geocoding now routes through the backend proxy
    // (/location/geocode, /location/search) so the key is never exposed in the APK.
    // This key is still needed for native MapView rendering on the client side.
    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  },
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  },
  payment: {
    stripe: {
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    },
    razorpay: {
      keyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
    },
  },
  analytics: {
    googleAnalytics: process.env.EXPO_PUBLIC_GA_TRACKING_ID || '',
    sentry: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    mixpanel: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '',
  },
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  enablePushNotifications: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true',
  enableLocationServices: process.env.EXPO_PUBLIC_ENABLE_LOCATION_SERVICES === 'true',
  enableCameraFeatures: process.env.EXPO_PUBLIC_ENABLE_CAMERA_FEATURES === 'true',
  enableVideoUpload: process.env.EXPO_PUBLIC_ENABLE_VIDEO_UPLOAD === 'true',
  enableSocialSharing: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_SHARING === 'true',
  enableOfflineMode: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
  enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
  enableCrashReporting: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
} as const;

// Media Configuration
// NOTE: For file upload limits and validation, use utils/fileUploadConstants.ts
// These values are kept for backward compatibility and can be overridden via env vars
export const MEDIA_CONFIG = {
  maxImageSize: parseInt(process.env.EXPO_PUBLIC_MAX_IMAGE_SIZE || '5242880'), // 5MB (matches fileUploadConstants)
  maxVideoSize: parseInt(process.env.EXPO_PUBLIC_MAX_VIDEO_SIZE || '52428800'), // 50MB (matches fileUploadConstants)
  allowedImageTypes: (process.env.EXPO_PUBLIC_ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,heic,heif').split(','), // Updated to match fileUploadConstants
  allowedVideoTypes: (process.env.EXPO_PUBLIC_ALLOWED_VIDEO_TYPES || 'mp4,mov,webm').split(','), // Updated to match fileUploadConstants
} as const;

// Development Settings
export const DEV_CONFIG = {
  debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
  mockApi: process.env.EXPO_PUBLIC_MOCK_API === 'true',
  logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'info',
  showDevTools: process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true',
} as const;

// Business Configuration
export const BUSINESS_CONFIG = {
  support: {
    email: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@rezapp.com',
    phone: process.env.EXPO_PUBLIC_SUPPORT_PHONE || '+91-1234567890',
  },
  legal: {
    privacyPolicy: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://www.rezapp.com/privacy',
    termsOfService: process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL || 'https://www.rezapp.com/terms',
    helpCenter: process.env.EXPO_PUBLIC_HELP_CENTER_URL || 'https://help.rezapp.com',
  },
  social: {
    facebook: process.env.EXPO_PUBLIC_FACEBOOK_URL || 'https://facebook.com/rezapp',
    instagram: process.env.EXPO_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/rezapp',
    twitter: process.env.EXPO_PUBLIC_TWITTER_URL || 'https://twitter.com/rezapp',
  },
  app: {
    website: process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://www.rezapp.com',
    appStore: process.env.EXPO_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/rez-app/id123456789',
    playStore: process.env.EXPO_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.rezapp',
    deepLinkScheme: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME || 'rezapp',
  },
} as const;

// Location & Maps
export const LOCATION_CONFIG = {
  defaultLatitude: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LATITUDE || '28.6139'),
  defaultLongitude: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LONGITUDE || '77.2090'),
  defaultCity: process.env.EXPO_PUBLIC_DEFAULT_CITY || 'Delhi',
  defaultCountry: process.env.EXPO_PUBLIC_DEFAULT_COUNTRY || 'India',
  mapZoomLevel: parseInt(process.env.EXPO_PUBLIC_MAP_ZOOM_LEVEL || '15'),
} as const;

// UI/UX Settings
export const UI_CONFIG = {
  defaultTheme: process.env.EXPO_PUBLIC_DEFAULT_THEME || 'light',
  enableDarkMode: process.env.EXPO_PUBLIC_ENABLE_DARK_MODE === 'true',
  animationDuration: parseInt(process.env.EXPO_PUBLIC_ANIMATION_DURATION || '300'),
  hapticFeedback: process.env.EXPO_PUBLIC_HAPTIC_FEEDBACK === 'true',
} as const;

// Caching Configuration
export const CACHE_CONFIG = {
  duration: parseInt(process.env.EXPO_PUBLIC_CACHE_DURATION || '300000'), // 5 minutes
  imageCacheDuration: parseInt(process.env.EXPO_PUBLIC_IMAGE_CACHE_DURATION || '86400000'), // 24 hours
  apiCacheDuration: parseInt(process.env.EXPO_PUBLIC_API_CACHE_DURATION || '60000'), // 1 minute
} as const;

// Helper function to check if we're in development
export const isDevelopment = () => APP_CONFIG.environment === 'development';
export const isProduction = () => APP_CONFIG.environment === 'production';

// Helper function to get the correct API URL based on environment
export const getApiUrl = () => {
  if (isDevelopment()) {
    return API_CONFIG.devUrl;
  }
  return API_CONFIG.prodUrl;
};

// Export all configs as a single object for easy access
export const ENV = {
  APP: APP_CONFIG,
  API: API_CONFIG,
  ENDPOINTS,
  AUTH: AUTH_CONFIG,
  EXTERNAL: EXTERNAL_SERVICES,
  FEATURES: FEATURE_FLAGS,
  MEDIA: MEDIA_CONFIG,
  DEV: DEV_CONFIG,
  BUSINESS: BUSINESS_CONFIG,
  LOCATION: LOCATION_CONFIG,
  UI: UI_CONFIG,
  CACHE: CACHE_CONFIG,
  isDevelopment,
  isProduction,
  getApiUrl,
} as const;

export default ENV;