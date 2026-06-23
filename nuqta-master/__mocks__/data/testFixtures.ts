/**
 * Test Fixtures
 * Reusable test data for unit tests
 */

import { User, AuthResponse } from '@/services/authApi';
import { Cart, CartItem } from '@/services/cartApi';

// ============================================
// User Fixtures
// ============================================

export const mockUser: User = {
  id: 'user-123',
  phoneNumber: '+911234567890',
  email: 'test@example.com',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test user bio',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'male',
    location: {
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      coordinates: [19.0760, 72.8777],
    },
  },
  preferences: {
    language: 'en',
    notifications: {
      push: true,
      email: true,
      sms: false,
    },
    categories: ['electronics', 'fashion'],
    theme: 'light',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  },
  wallet: {
    balance: 1000,
    totalEarned: 5000,
    totalSpent: 4000,
    pendingAmount: 500,
  },
  role: 'user',
  isVerified: true,
  isOnboarded: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

export const mockAuthResponse: AuthResponse = {
  user: mockUser,
  tokens: {
    accessToken: 'mock-access-token-abc123xyz',
    refreshToken: 'mock-refresh-token-def456uvw',
    expiresIn: 3600,
  },
};

// ============================================
// Cart Fixtures
// ============================================

export const mockCartItem: CartItem = {
  _id: 'cart-item-1',
  product: {
    _id: 'product-123',
    name: 'Test Product',
    images: [
      {
        id: 'img-1',
        url: 'https://example.com/product.jpg',
        alt: 'Test Product Image',
        isMain: true,
      },
    ],
    pricing: {
      currency: 'INR',
    },
    inventory: {
      stock: 100,
      isAvailable: true,
    },
    isActive: true,
  },
  store: {
    _id: 'store-123',
    name: 'Test Store',
    location: {
      address: '456 Store Street',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
  },
  variant: {
    type: 'size',
    value: 'M',
  },
  quantity: 2,
  price: 500,
  originalPrice: 600,
  discount: 100,
  addedAt: '2024-01-15T10:00:00.000Z',
};

export const mockCart: Cart = {
  _id: 'cart-123',
  user: 'user-123',
  items: [mockCartItem],
  lockedItems: [],
  totals: {
    subtotal: 1000,
    tax: 180,
    delivery: 50,
    discount: 100,
    cashback: 50,
    total: 1080,
    savings: 150,
  },
  coupon: {
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
    appliedAmount: 100,
    appliedAt: '2024-01-15T10:05:00.000Z',
  },
  itemCount: 2,
  storeCount: 1,
  isActive: true,
  expiresAt: '2024-01-15T22:00:00.000Z',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:05:00.000Z',
};

// ============================================
// API Response Fixtures
// ============================================

export const mockSuccessResponse = <T>(data: T) => ({
  success: true,
  data,
  message: 'Success',
});

export const mockErrorResponse = (errorMessage: string) => ({
  success: false,
  error: errorMessage,
});

export const mockValidationErrorResponse = (errors: Record<string, string[]>) => ({
  success: false,
  error: 'Validation failed',
  errors,
});

// ============================================
// Homepage Data Fixtures
// ============================================

export const mockHomepageStore = {
  _id: 'store-123',
  name: 'Test Store',
  logo: 'https://example.com/logo.jpg',
  description: 'A test store',
  rating: 4.5,
  ratingCount: 100,
  category: 'electronics',
  location: {
    address: '123 Store St',
    city: 'Mumbai',
    state: 'Maharashtra',
    coordinates: [19.0760, 72.8777],
  },
};

export const mockHomepageProduct = {
  _id: 'product-123',
  name: 'Test Product',
  description: 'A test product',
  images: ['https://example.com/product.jpg'],
  price: 999,
  originalPrice: 1499,
  discount: 33,
  rating: 4.2,
  ratingCount: 50,
  category: 'electronics',
  store: mockHomepageStore,
};

// ============================================
// Validation Test Data
// ============================================

export const validEmails = [
  'test@example.com',
  'user.name@domain.co.in',
  'email+tag@test.org',
  'firstname-lastname@example.com',
];

export const invalidEmails = [
  'invalid',
  'test@',
  '@example.com',
  'test @example.com',
  'test@example',
  '',
  null,
  undefined,
];

export const validPhoneNumbers = [
  '+911234567890',
  '+919876543210',
  '+1234567890',
];

export const invalidPhoneNumbers = [
  '1234',
  'abcd',
  '+91123',
  '+91abcdefghij',
  '',
  null,
  undefined,
];

export const validReferralCodes = [
  'ABC123',
  'TEST01',
  'REFER2024',
  'CODE123456',
];

export const invalidReferralCodes = [
  'AB1',       // Too short
  'TOOLONGCODE123',  // Too long
  'ABC@123',   // Invalid character
  'CODE 123',  // Space
  '',
  null,
  undefined,
];

// ============================================
// Image Optimization Test Data
// ============================================

export const mockImageUrls = {
  valid: 'https://example.com/image.jpg',
  withParams: 'https://example.com/image.jpg?w=800&h=600',
  local: 'file:///local/image.jpg',
  data: 'data:image/png;base64,iVBORw0KGg...',
};

export const mockImageDimensions = {
  square: { width: 500, height: 500 },
  landscape: { width: 800, height: 600 },
  portrait: { width: 600, height: 800 },
};

// ============================================
// Deal Validation Test Data
// ============================================

export const mockDeal = {
  id: 'deal-123',
  title: 'Test Deal',
  description: 'A test deal',
  discount: 20,
  validFrom: new Date('2024-01-01'),
  validUntil: new Date('2024-12-31'),
  conditions: ['Minimum purchase of ₹500'],
  maxRedemptions: 100,
  currentRedemptions: 50,
};

export const mockConflictingDeal = {
  id: 'deal-456',
  title: 'Conflicting Deal',
  description: 'Cannot be used with other deals',
  discount: 30,
  validFrom: new Date('2024-01-01'),
  validUntil: new Date('2024-12-31'),
  conditions: ['Cannot combine with other offers'],
  maxRedemptions: 50,
  currentRedemptions: 25,
};

// ============================================
// Payment Calculation Test Data
// ============================================

export const mockOrderItems = [
  { name: 'Product 1', price: 500, quantity: 2, taxRate: 0.18 },
  { name: 'Product 2', price: 300, quantity: 1, taxRate: 0.18 },
];

export const mockDiscounts = [
  { type: 'percentage', value: 10, label: '10% off' },
  { type: 'fixed', value: 100, label: '₹100 off' },
];

export const mockShippingRates = [
  { method: 'standard', cost: 50, estimatedDays: 5 },
  { method: 'express', cost: 150, estimatedDays: 2 },
  { method: 'overnight', cost: 300, estimatedDays: 1 },
];

// ============================================
// Helper Functions
// ============================================

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides,
});

export const createMockCart = (overrides: Partial<Cart> = {}): Cart => ({
  ...mockCart,
  ...overrides,
});

export const createMockCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...mockCartItem,
  ...overrides,
});

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateRandomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateRandomNumber = (min: number = 0, max: number = 100): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
