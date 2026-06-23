/**
 * Integration Test Helpers
 *
 * Utility functions and helpers for integration tests
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock API Response Builder
export const mockApiResponse = <T>(data: T, options?: {
  success?: boolean;
  error?: string;
  status?: number;
}) => ({
  success: options?.success ?? true,
  data: options?.success !== false ? data : undefined,
  error: options?.error,
  status: options?.status ?? 200,
});

// Mock User Data
export const mockUser = {
  id: 'user_test_123',
  email: 'test@example.com',
  phoneNumber: '+1234567890',
  profile: {
    firstName: 'Test',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
  },
  isOnboarded: true,
  createdAt: new Date().toISOString(),
};

// Mock Tokens
export const mockTokens = {
  accessToken: 'mock_access_token_123',
  refreshToken: 'mock_refresh_token_123',
  expiresIn: 3600,
};

// Setup authenticated user
export const setupAuthenticatedUser = async () => {
  await AsyncStorage.multiSet([
    ['access_token', mockTokens.accessToken],
    ['refresh_token', mockTokens.refreshToken],
    ['auth_user', JSON.stringify(mockUser)],
  ]);
};

// Clear authentication
export const clearAuthentication = async () => {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'auth_user']);
};

// Wait for condition
export const waitFor = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
};

// Mock API Client
export const createMockApiClient = () => {
  const requests: Array<{ method: string; url: string; data?: any }> = [];

  return {
    get: jest.fn(async (url: string) => {
      requests.push({ method: 'GET', url });
      return mockApiResponse({});
    }),
    post: jest.fn(async (url: string, data?: any) => {
      requests.push({ method: 'POST', url, data });
      return mockApiResponse({});
    }),
    put: jest.fn(async (url: string, data?: any) => {
      requests.push({ method: 'PUT', url, data });
      return mockApiResponse({});
    }),
    patch: jest.fn(async (url: string, data?: any) => {
      requests.push({ method: 'PATCH', url, data });
      return mockApiResponse({});
    }),
    delete: jest.fn(async (url: string) => {
      requests.push({ method: 'DELETE', url });
      return mockApiResponse({});
    }),
    getRequests: () => requests,
    clearRequests: () => { requests.length = 0; },
  };
};

// Delay utility
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate mock data
export const generateMockProducts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `product_${i + 1}`,
    name: `Test Product ${i + 1}`,
    description: `Description for product ${i + 1}`,
    price: Math.floor(Math.random() * 10000) + 100,
    images: [`https://example.com/product${i + 1}.jpg`],
    category: 'test',
    inStock: true,
    stockQuantity: Math.floor(Math.random() * 100) + 10,
    rating: Math.random() * 5,
    reviewCount: Math.floor(Math.random() * 100),
  }));
};

export const generateMockStores = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `store_${i + 1}`,
    name: `Test Store ${i + 1}`,
    description: `Description for store ${i + 1}`,
    logo: `https://example.com/store${i + 1}.jpg`,
    category: 'test',
    rating: Math.random() * 5,
    reviewCount: Math.floor(Math.random() * 1000),
    cashbackPercentage: Math.floor(Math.random() * 20) + 5,
  }));
};

export const generateMockOrders = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `order_${i + 1}`,
    orderNumber: `ORD-2024-${String(i + 1).padStart(4, '0')}`,
    status: ['pending', 'confirmed', 'shipped', 'delivered'][i % 4],
    total: Math.floor(Math.random() * 50000) + 1000,
    items: generateMockProducts(Math.floor(Math.random() * 3) + 1),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
};

// Mock WebSocket
export class MockWebSocket {
  private listeners: Map<string, Function[]> = new Map();
  public connected = false;

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(...args));
  }

  connect() {
    this.connected = true;
    this.emit('connect');
  }

  disconnect() {
    this.connected = false;
    this.emit('disconnect');
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event) || [];
      this.listeners.set(
        event,
        callbacks.filter(cb => cb !== callback)
      );
    }
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

// Performance measurement
export const measurePerformance = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
};

// Test data factory
export const testDataFactory = {
  cart: () => ({
    id: 'cart_123',
    items: [
      {
        id: 'cart_item_1',
        productId: 'product_1',
        product: generateMockProducts(1)[0],
        quantity: 2,
        price: 999,
        subtotal: 1998,
      },
    ],
    subtotal: 1998,
    tax: 199.8,
    shipping: 50,
    total: 2247.8,
  }),

  address: () => ({
    id: 'addr_123',
    firstName: 'Test',
    lastName: 'User',
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    postalCode: '12345',
    country: 'US',
    phoneNumber: '+1234567890',
    isDefault: true,
  }),

  payment: () => ({
    id: 'payment_123',
    paymentIntentId: 'pi_123',
    clientSecret: 'pi_123_secret',
    amount: 2247.8,
    currency: 'usd',
    status: 'succeeded',
  }),

  project: () => ({
    id: 'project_123',
    title: 'Test Project',
    description: 'Test project description',
    reward: 500,
    difficulty: 'medium',
    estimatedTime: 30,
    category: 'social',
    status: 'active',
  }),

  ugcContent: () => ({
    id: 'ugc_123',
    userId: mockUser.id,
    type: 'video',
    url: 'https://example.com/video.mp4',
    thumbnail: 'https://example.com/thumb.jpg',
    caption: 'Test UGC content',
    likes: 10,
    comments: 5,
    views: 100,
    products: generateMockProducts(2),
    createdAt: new Date().toISOString(),
  }),

  notification: () => ({
    id: 'notif_123',
    userId: mockUser.id,
    title: 'Test Notification',
    body: 'Test notification body',
    type: 'info',
    read: false,
    createdAt: new Date().toISOString(),
  }),
};

// Network simulation
export const simulateNetworkConditions = {
  offline: () => {
    return {
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    };
  },
  slow: () => {
    return {
      isConnected: true,
      isInternetReachable: true,
      type: '2g',
      effectiveType: '2g',
    };
  },
  fast: () => {
    return {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      effectiveType: '4g',
    };
  },
};

// Assertion helpers
export const assertApiCalled = (
  mockFn: jest.Mock,
  url: string,
  options?: {
    method?: string;
    data?: any;
    times?: number;
  }
) => {
  const calls = mockFn.mock.calls;
  const matchingCalls = calls.filter(call => {
    const [callUrl, callData] = call;
    return callUrl.includes(url) && (!options?.data || JSON.stringify(callData) === JSON.stringify(options.data));
  });

  if (options?.times !== undefined) {
    expect(matchingCalls).toHaveLength(options.times);
  } else {
    expect(matchingCalls.length).toBeGreaterThan(0);
  }
};

// Cleanup utility
export const cleanupAfterTest = async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
};
