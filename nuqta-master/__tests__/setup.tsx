/**
 * Test Setup and Configuration
 *
 * This file provides enhanced test configuration including:
 * - Custom test utilities
 * - Mock providers
 * - Helper functions for testing
 */

import { render, RenderOptions } from '@testing-library/react-native';
import React, { ReactElement } from 'react';

// ============================================
// Mock Context Providers
// ============================================

/**
 * Mock AuthContext Provider
 */
export const MockAuthProvider: React.FC<{ children: React.ReactNode; value?: any }> = ({
  children,
  value = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
    },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  }
}) => {
  const AuthContext = React.createContext(value);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Mock CartContext Provider
 */
export const MockCartProvider: React.FC<{ children: React.ReactNode; value?: any }> = ({
  children,
  value = {
    items: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    total: 0,
    itemCount: 0,
  }
}) => {
  const CartContext = React.createContext(value);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * Mock WishlistContext Provider
 */
export const MockWishlistProvider: React.FC<{ children: React.ReactNode; value?: any }> = ({
  children,
  value = {
    items: [],
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    isInWishlist: jest.fn(() => false),
  }
}) => {
  const WishlistContext = React.createContext(value);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

/**
 * Mock ToastContext Provider
 */
export const MockToastProvider: React.FC<{ children: React.ReactNode; value?: any }> = ({
  children,
  value = {
    showToast: jest.fn(),
    hideToast: jest.fn(),
  }
}) => {
  const ToastContext = React.createContext(value);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

/**
 * All Providers Wrapper
 * Combines all mock providers for easier testing
 */
export const AllTheProviders: React.FC<{
  children: React.ReactNode;
  authValue?: any;
  cartValue?: any;
  wishlistValue?: any;
  toastValue?: any;
}> = ({ children, authValue, cartValue, wishlistValue, toastValue }) => {
  return (
    <MockAuthProvider value={authValue}>
      <MockCartProvider value={cartValue}>
        <MockWishlistProvider value={wishlistValue}>
          <MockToastProvider value={toastValue}>
            {children}
          </MockToastProvider>
        </MockWishlistProvider>
      </MockCartProvider>
    </MockAuthProvider>
  );
};

// ============================================
// Custom Render Function
// ============================================

/**
 * Custom render function that includes all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    authValue?: any;
    cartValue?: any;
    wishlistValue?: any;
    toastValue?: any;
  }
) => {
  const { authValue, cartValue, wishlistValue, toastValue, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      authValue={authValue}
      cartValue={cartValue}
      wishlistValue={wishlistValue}
      toastValue={toastValue}
    >
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// ============================================
// Mock Data Factories
// ============================================

/**
 * Create mock product data
 */
export const createMockProduct = (overrides?: any) => ({
  _id: 'product-123',
  name: 'Test Product',
  description: 'Test product description',
  price: 99.99,
  originalPrice: 149.99,
  discount: 33,
  images: ['https://example.com/image1.jpg'],
  category: 'Electronics',
  brand: 'Test Brand',
  inStock: true,
  stockCount: 10,
  rating: 4.5,
  reviewCount: 100,
  variants: [],
  ...overrides,
});

/**
 * Create mock store data
 */
export const createMockStore = (overrides?: any) => ({
  _id: 'store-123',
  name: 'Test Store',
  description: 'Test store description',
  logo: 'https://example.com/logo.jpg',
  banner: 'https://example.com/banner.jpg',
  category: 'Fashion',
  rating: 4.5,
  reviewCount: 500,
  location: {
    address: '123 Test St',
    city: 'Test City',
    coordinates: { lat: 28.7041, lng: 77.1025 },
  },
  features: ['delivery', 'pickup', 'dine-in'],
  ...overrides,
});

/**
 * Create mock variant data
 */
export const createMockVariant = (overrides?: any) => ({
  _id: 'variant-123',
  productId: 'product-123',
  name: 'Small / Red',
  attributes: { size: 'Small', color: 'Red' },
  price: 99.99,
  stockCount: 5,
  sku: 'TEST-SM-RED',
  ...overrides,
});

/**
 * Create mock UGC data
 */
export const createMockUGC = (overrides?: any) => ({
  _id: 'ugc-123',
  userId: 'user-123',
  userName: 'Test User',
  userAvatar: 'https://example.com/avatar.jpg',
  type: 'image',
  mediaUrl: 'https://example.com/ugc.jpg',
  caption: 'Test UGC caption',
  likes: 10,
  comments: 5,
  isLiked: false,
  createdAt: new Date().toISOString(),
  productId: 'product-123',
  storeId: 'store-123',
  ...overrides,
});

/**
 * Create mock cart item
 */
export const createMockCartItem = (overrides?: any) => ({
  _id: 'cart-item-123',
  productId: 'product-123',
  productName: 'Test Product',
  productImage: 'https://example.com/image.jpg',
  price: 99.99,
  quantity: 1,
  variantId: null,
  variantName: null,
  ...overrides,
});

/**
 * Create mock deal/offer data
 */
export const createMockDeal = (overrides?: any) => ({
  _id: 'deal-123',
  title: 'Test Deal',
  description: 'Test deal description',
  discount: 20,
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  productId: 'product-123',
  storeId: 'store-123',
  type: 'percentage',
  minPurchase: 50,
  ...overrides,
});

// ============================================
// Test Utilities
// ============================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (ms: number = 100) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock API response
 */
export const createMockApiResponse = <T,>(data: T, delay: number = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

/**
 * Mock API error
 */
export const createMockApiError = (message: string, statusCode: number = 500, delay: number = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject({
        message,
        statusCode,
        response: {
          data: { message },
          status: statusCode,
        },
      });
    }, delay);
  });
};

/**
 * Create mock navigation
 */
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

/**
 * Create mock route
 */
export const createMockRoute = (params: any = {}) => ({
  key: 'test-route',
  name: 'TestScreen',
  params,
});

// ============================================
// Assertion Helpers
// ============================================

/**
 * Check if element is visible
 */
export const expectVisible = (element: any) => {
  expect(element).toBeTruthy();
  expect(element).not.toHaveStyle({ display: 'none' });
};

/**
 * Check if element is not visible
 */
export const expectNotVisible = (element: any) => {
  if (element) {
    expect(element).toHaveStyle({ display: 'none' });
  }
};

// ============================================
// Performance Testing Utilities
// ============================================

/**
 * Measure render time
 */
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  renderFn();
  await waitForAsync(0);
  const end = performance.now();
  return end - start;
};

/**
 * Measure async operation time
 */
export const measureAsyncTime = async (asyncFn: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await asyncFn();
  const end = performance.now();
  return end - start;
};

// ============================================
// Export all testing utilities
// ============================================

export * from '@testing-library/react-native';
export { renderWithProviders as render };
