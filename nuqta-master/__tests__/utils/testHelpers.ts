/**
 * Test Helpers and Utilities
 *
 * Common utilities for testing including:
 * - Mock data generators
 * - Test helpers
 * - Custom matchers
 * - Async utilities
 */

import { User } from '@/services/authApi';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Generate mock user
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user_' + Math.random().toString(36).substring(7),
  phoneNumber: '+1234567890',
  email: 'test@example.com',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    avatar: 'https://example.com/avatar.jpg',
  },
  preferences: {
    notifications: { push: true, email: true, sms: true },
  },
  wallet: {
    balance: 1000,
    totalEarned: 2000,
    totalSpent: 1000,
    pendingAmount: 0,
  },
  role: 'user',
  isOnboarded: true,
  isVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Generate mock product
 */
export const createMockProduct = (overrides: any = {}) => ({
  id: 'prod_' + Math.random().toString(36).substring(7),
  name: 'Test Product',
  description: 'This is a test product description',
  price: 999,
  originalPrice: 1299,
  discount: 23,
  rating: 4.5,
  reviewCount: 120,
  images: [
    'https://example.com/product1.jpg',
    'https://example.com/product2.jpg',
  ],
  category: 'Electronics',
  brand: 'Test Brand',
  inStock: true,
  stockQuantity: 50,
  ...overrides,
});

/**
 * Generate mock order
 */
export const createMockOrder = (overrides: any = {}) => ({
  id: 'order_' + Math.random().toString(36).substring(7),
  orderNumber: 'ORD-2024-' + Math.floor(Math.random() * 10000),
  userId: 'user_123',
  status: 'pending',
  paymentStatus: 'paid',
  items: [createMockProduct()],
  subtotal: 999,
  tax: 99.9,
  shipping: 50,
  discount: 0,
  total: 1148.9,
  shippingAddress: createMockAddress(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Generate mock address
 */
export const createMockAddress = (overrides: any = {}) => ({
  id: 'addr_' + Math.random().toString(36).substring(7),
  firstName: 'John',
  lastName: 'Doe',
  street: '123 Main St',
  apartment: 'Apt 4B',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  phoneNumber: '+1234567890',
  isDefault: false,
  ...overrides,
});

/**
 * Generate mock cart
 */
export const createMockCart = (itemCount: number = 2) => ({
  id: 'cart_' + Math.random().toString(36).substring(7),
  userId: 'user_123',
  items: Array.from({ length: itemCount }, (_, i) =>
    createMockCartItem({ quantity: i + 1 })
  ),
  subtotal: 0, // Will be calculated
  total: 0, // Will be calculated
  itemCount,
});

/**
 * Generate mock cart item
 */
export const createMockCartItem = (overrides: any = {}) => {
  const product = createMockProduct();
  const quantity = overrides.quantity || 1;
  const subtotal = product.price * quantity;

  return {
    id: 'cart_item_' + Math.random().toString(36).substring(7),
    cartId: 'cart_123',
    productId: product.id,
    product,
    quantity,
    price: product.price,
    subtotal,
    ...overrides,
  };
};

/**
 * Generate mock review
 */
export const createMockReview = (overrides: any = {}) => ({
  id: 'review_' + Math.random().toString(36).substring(7),
  productId: 'prod_123',
  userId: 'user_123',
  rating: 4.5,
  title: 'Great product!',
  comment: 'This is a great product. Highly recommended!',
  images: [],
  helpful: 15,
  verified: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate random string
 */
export const randomString = (length: number = 10): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length);

/**
 * Generate random number in range
 */
export const randomNumber = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate random email
 */
export const randomEmail = (): string =>
  `test_${randomString()}@example.com`;

/**
 * Generate random phone number
 */
export const randomPhoneNumber = (): string =>
  `+1${randomNumber(2000000000, 9999999999)}`;

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T =>
  JSON.parse(JSON.stringify(obj));

/**
 * Suppress console logs during test
 */
export const suppressConsoleLogs = () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });
};

/**
 * Mock AsyncStorage
 */
export const mockAsyncStorage = () => {
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
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key) => [key, storage.get(key) || null]))
    ),
    multiSet: jest.fn((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => storage.set(key, value));
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
    _storage: storage, // For inspection in tests
  };
};

/**
 * Mock API response
 */
export const mockApiResponse = <T>(
  data: T,
  success: boolean = true,
  delay: number = 0
): Promise<{ success: boolean; data: T }> =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ success, data }), delay)
  );

/**
 * Mock API error
 */
export const mockApiError = (
  message: string,
  status: number = 400,
  delay: number = 0
): Promise<never> =>
  new Promise((_, reject) =>
    setTimeout(
      () =>
        reject({
          response: {
            status,
            data: { error: message },
          },
        }),
      delay
    )
  );

// ============================================================================
// CUSTOM MATCHERS
// ============================================================================

/**
 * Extend Jest matchers
 */
export const extendMatchers = () => {
  expect.extend({
    /**
     * Check if value is within range
     */
    toBeWithinRange(received: number, min: number, max: number) {
      const pass = received >= min && received <= max;
      return {
        pass,
        message: () =>
          pass
            ? `expected ${received} not to be within range ${min}-${max}`
            : `expected ${received} to be within range ${min}-${max}`,
      };
    },

    /**
     * Check if date is recent (within last N seconds)
     */
    toBeRecent(received: string | Date, seconds: number = 60) {
      const date = new Date(received);
      const now = new Date();
      const diff = (now.getTime() - date.getTime()) / 1000;
      const pass = diff >= 0 && diff <= seconds;

      return {
        pass,
        message: () =>
          pass
            ? `expected ${received} not to be within last ${seconds} seconds`
            : `expected ${received} to be within last ${seconds} seconds`,
      };
    },

    /**
     * Check if array contains object with properties
     */
    toContainObjectMatching(received: any[], expected: any) {
      const pass = received.some((item) =>
        Object.keys(expected).every((key) => item[key] === expected[key])
      );

      return {
        pass,
        message: () =>
          pass
            ? `expected array not to contain object matching ${JSON.stringify(
                expected
              )}`
            : `expected array to contain object matching ${JSON.stringify(
                expected
              )}`,
      };
    },
  });
};

// ============================================================================
// MOCK GENERATORS FOR BULK DATA
// ============================================================================

/**
 * Generate multiple mock items
 */
export const generateMockArray = <T>(
  factory: (index: number) => T,
  count: number
): T[] => Array.from({ length: count }, (_, i) => factory(i));

/**
 * Generate mock product catalog
 */
export const generateMockCatalog = (count: number = 50) =>
  generateMockArray((i) =>
    createMockProduct({
      name: `Product ${i + 1}`,
      price: randomNumber(100, 5000),
      rating: randomNumber(3, 5) + Math.random(),
    }),
    count
  );

/**
 * Generate mock order history
 */
export const generateMockOrderHistory = (count: number = 20) =>
  generateMockArray((i) =>
    createMockOrder({
      orderNumber: `ORD-2024-${String(i + 1).padStart(4, '0')}`,
      createdAt: new Date(
        Date.now() - i * 24 * 60 * 60 * 1000
      ).toISOString(),
    }),
    count
  );

// ============================================================================
// PERFORMANCE TESTING HELPERS
// ============================================================================

/**
 * Measure execution time
 */
export const measureExecutionTime = async <T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

/**
 * Run performance benchmark
 */
export const benchmark = async (
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 100
): Promise<{ name: string; avgTime: number; minTime: number; maxTime: number }> => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    times.push(duration);
  }

  return {
    name,
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  // Mock factories
  createMockUser,
  createMockProduct,
  createMockOrder,
  createMockAddress,
  createMockCart,
  createMockCartItem,
  createMockReview,

  // Test helpers
  waitFor,
  delay,
  randomString,
  randomNumber,
  randomEmail,
  randomPhoneNumber,
  deepClone,
  suppressConsoleLogs,
  mockAsyncStorage,
  mockApiResponse,
  mockApiError,

  // Bulk generators
  generateMockArray,
  generateMockCatalog,
  generateMockOrderHistory,

  // Performance
  measureExecutionTime,
  benchmark,

  // Matchers
  extendMatchers,
};
