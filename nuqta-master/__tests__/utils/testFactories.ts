/**
 * Test Factories and Mock Data Generators
 * Centralized factory functions for creating test data
 */

import { Href } from 'expo-router';

// ==============================================
// User Factories
// ==============================================

export const createMockUser = (overrides = {}) => ({
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+919876543210',
  referralCode: 'TEST123',
  ...overrides,
});

export const createMockAuthToken = (overrides = {}) => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  ...overrides,
});

// ==============================================
// Product Factories
// ==============================================

export const createMockProduct = (overrides = {}) => ({
  id: 'prod-123',
  name: 'Test Product',
  description: 'Test product description',
  price: 999,
  image: 'https://example.com/product.jpg',
  category: 'electronics',
  stock: 10,
  rating: 4.5,
  ...overrides,
});

export const createMockProductList = (count: number = 3) => {
  return Array.from({ length: count }, (_, i) =>
    createMockProduct({
      id: `prod-${i + 1}`,
      name: `Test Product ${i + 1}`,
      price: 999 + i * 100,
    })
  );
};

// ==============================================
// Store Factories
// ==============================================

export const createMockStore = (overrides = {}) => ({
  id: 'store-123',
  name: 'Test Store',
  description: 'Test store description',
  logo: 'https://example.com/logo.jpg',
  category: 'fashion',
  cashbackPercentage: 5,
  rating: 4.5,
  ...overrides,
});

export const createMockStoreList = (count: number = 3) => {
  return Array.from({ length: count }, (_, i) =>
    createMockStore({
      id: `store-${i + 1}`,
      name: `Test Store ${i + 1}`,
      cashbackPercentage: 5 + i,
    })
  );
};

// ==============================================
// Cart Factories
// ==============================================

export const createMockCartItem = (overrides = {}) => ({
  id: 'cart-item-123',
  productId: 'prod-123',
  name: 'Test Product',
  price: 999,
  quantity: 1,
  image: 'https://example.com/product.jpg',
  ...overrides,
});

export const createMockCart = (overrides = {}) => ({
  items: [createMockCartItem()],
  subtotal: 999,
  tax: 99,
  total: 1098,
  itemCount: 1,
  ...overrides,
});

// ==============================================
// Order Factories
// ==============================================

export const createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  userId: 'user-123',
  items: [createMockCartItem()],
  total: 1098,
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ==============================================
// Offer/Deal Factories
// ==============================================

export const createMockOffer = (overrides = {}) => ({
  id: 'offer-123',
  title: 'Test Offer',
  description: 'Amazing discount',
  discount: 20,
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  storeId: 'store-123',
  ...overrides,
});

// ==============================================
// Navigation Factories
// ==============================================

export const createMockNavigationResult = (overrides = {}) => ({
  status: 'success' as const,
  route: '/(tabs)' as Href,
  fallbackUsed: false,
  ...overrides,
});

export const createMockNavigationError = (overrides = {}) => ({
  type: 'NAVIGATION_FAILED' as const,
  message: 'Navigation failed',
  route: '/' as Href,
  ...overrides,
});

// ==============================================
// Error Factories
// ==============================================

export const createMockApiError = (overrides = {}) => ({
  code: 'API_ERROR',
  message: 'API request failed',
  status: 500,
  details: {},
  ...overrides,
});

export const createMockNetworkError = () => ({
  code: 'NETWORK_ERROR',
  message: 'Network connection failed',
  status: 0,
});

export const createMockValidationError = (field: string = 'email') => ({
  code: 'VALIDATION_ERROR',
  message: `Invalid ${field}`,
  field,
});

// ==============================================
// Video Factories
// ==============================================

export const createMockVideo = (overrides = {}) => ({
  id: 'video-123',
  title: 'Test Video',
  thumbnail: 'https://example.com/thumbnail.jpg',
  url: 'https://example.com/video.mp4',
  duration: 120,
  views: 1000,
  likes: 50,
  ...overrides,
});

// ==============================================
// UGC Factories
// ==============================================

export const createMockUGC = (overrides = {}) => ({
  id: 'ugc-123',
  userId: 'user-123',
  content: 'Test UGC content',
  mediaUrl: 'https://example.com/media.jpg',
  type: 'image' as const,
  likes: 10,
  comments: 5,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ==============================================
// Wallet Factories
// ==============================================

export const createMockWalletTransaction = (overrides = {}) => ({
  id: 'txn-123',
  amount: 100,
  type: 'credit' as const,
  description: 'Test transaction',
  timestamp: new Date().toISOString(),
  status: 'completed' as const,
  ...overrides,
});

export const createMockWallet = (overrides = {}) => ({
  balance: 1000,
  currency: 'INR',
  transactions: [createMockWalletTransaction()],
  ...overrides,
});

// ==============================================
// Gamification Factories
// ==============================================

export const createMockAchievement = (overrides = {}) => ({
  id: 'achievement-123',
  title: 'First Purchase',
  description: 'Made your first purchase',
  icon: 'trophy',
  points: 100,
  unlockedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockLeaderboardEntry = (overrides = {}) => ({
  rank: 1,
  userId: 'user-123',
  username: 'TestUser',
  points: 1000,
  avatar: 'https://example.com/avatar.jpg',
  ...overrides,
});

// ==============================================
// Location Factories
// ==============================================

export const createMockLocation = (overrides = {}) => ({
  latitude: 28.7041,
  longitude: 77.1025,
  accuracy: 10,
  timestamp: Date.now(),
  ...overrides,
});

export const createMockAddress = (overrides = {}) => ({
  id: 'address-123',
  line1: '123 Test Street',
  line2: 'Apartment 4B',
  city: 'Delhi',
  state: 'Delhi',
  postalCode: '110001',
  country: 'India',
  ...overrides,
});

// ==============================================
// Review Factories
// ==============================================

export const createMockReview = (overrides = {}) => ({
  id: 'review-123',
  userId: 'user-123',
  productId: 'prod-123',
  rating: 4,
  comment: 'Great product!',
  createdAt: new Date().toISOString(),
  helpful: 5,
  ...overrides,
});

// ==============================================
// Referral Factories
// ==============================================

export const createMockReferral = (overrides = {}) => ({
  id: 'referral-123',
  referrerId: 'user-123',
  refereeId: 'user-456',
  code: 'TEST123',
  status: 'completed' as const,
  reward: 100,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ==============================================
// Search Factories
// ==============================================

export const createMockSearchResult = (overrides = {}) => ({
  products: createMockProductList(3),
  stores: createMockStoreList(2),
  totalResults: 5,
  page: 1,
  hasMore: false,
  ...overrides,
});

// ==============================================
// Notification Factories
// ==============================================

export const createMockNotification = (overrides = {}) => ({
  id: 'notif-123',
  title: 'Test Notification',
  body: 'This is a test notification',
  type: 'info' as const,
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ==============================================
// Helper Functions
// ==============================================

/**
 * Create a delayed promise for testing async operations
 */
export const createDelayedPromise = <T>(
  value: T,
  delay: number = 100
): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
};

/**
 * Create a rejected promise for testing error handling
 */
export const createRejectedPromise = (
  error: Error | string,
  delay: number = 100
): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(typeof error === 'string' ? new Error(error) : error);
    }, delay);
  });
};

/**
 * Create a mock async storage
 */
export const createMockAsyncStorage = () => {
  const storage = new Map<string, string>();

  return {
    getItem: jest.fn((key: string) =>
      Promise.resolve(storage.get(key) || null)
    ),
    setItem: jest.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys.map((key) => [key, storage.get(key) || null])
      )
    ),
    multiSet: jest.fn((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => storage.set(key, value));
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
      return Promise.resolve();
    }),
  };
};

/**
 * Wait for async updates (useful in tests)
 */
export const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

/**
 * Flush all promises
 */
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));
