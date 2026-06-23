import jwt from 'jsonwebtoken';
import { Merchant } from '../../models/Merchant';
import bcrypt from 'bcryptjs';

/**
 * Creates a test USER (consumer) with default or custom values.
 * Required: phoneNumber, email, password, name.
 * The merged User model requires `phoneNumber` — tests that previously only set `phone`
 * need to use this helper (or pass `phoneNumber` explicitly).
 */
export const createTestUser = async (overrides: any = {}): Promise<any> => {
  const { User } = require('../../models/User');
  const hashedPassword = await bcrypt.hash(overrides.password || 'Password123', 10);
  const phone = overrides.phoneNumber || overrides.phone || '+15555550100';

  const defaultUser = {
    name: 'Test User',
    email: `testuser${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`,
    phoneNumber: phone,
    phone: phone, // Some legacy fields also expect this
    password: hashedPassword,
    isActive: true,
    isOnboarded: true,
    role: 'user',
  };

  return await User.create({
    ...defaultUser,
    ...overrides,
    password: hashedPassword,
  });
};

/**
 * Creates a test merchant with default or custom values
 */
export const createTestMerchant = async (overrides: any = {}): Promise<any> => {
  const hashedPassword = await bcrypt.hash(overrides.password || 'Password123', 10);

  const defaultMerchant = {
    businessName: 'Test Store',
    ownerName: 'Test Owner',
    email: `test${Date.now()}@example.com`,
    password: hashedPassword,
    phone: '+1234567890',
    businessAddress: {
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
    },
    verificationStatus: 'verified' as const,
    isActive: true,
  };

  const merchant = await Merchant.create({
    ...defaultMerchant,
    ...overrides,
    password: hashedPassword, // Always use hashed password
  });

  return merchant;
};

/**
 * Generates a JWT token for a merchant
 */
export const generateMerchantToken = (merchantId: string) => {
  const secret = process.env.JWT_MERCHANT_SECRET || process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    { id: merchantId, type: 'merchant' },
    secret,
    { expiresIn: '7d' }
  );
};

/**
 * Creates authentication headers with Bearer token
 */
export const createAuthHeaders = (token: string) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Creates a plain password for testing (before hashing)
 */
export const TEST_PASSWORD = 'Password123';

/**
 * Helper to create merchant with known password
 */
export const createTestMerchantWithPassword = async (password: string = TEST_PASSWORD, overrides: any = {}) => {
  return createTestMerchant({ ...overrides, password });
};

/**
 * Create test merchant user (team member)
 */
export const createTestMerchantUser = async (merchantId: string, overrides: any = {}): Promise<any> => {
  const { MerchantUser } = require('../../models/MerchantUser');
  const hashedPassword = await bcrypt.hash(overrides.password || TEST_PASSWORD, 10);

  const defaultUser = {
    merchantId,
    name: 'Test User',
    email: `user${Date.now()}@example.com`,
    password: hashedPassword,
    role: 'staff',
    isActive: true,
  };

  return await MerchantUser.create({
    ...defaultUser,
    ...overrides,
    password: hashedPassword,
  });
};

/**
 * Create test product
 */
export const createTestProduct = async (merchantId: string, overrides: any = {}): Promise<any> => {
  const { MerchantProduct } = require('../../models/MerchantProduct');

  const defaultProduct = {
    merchantId,
    name: 'Test Product',
    description: 'Test product description',
    category: 'Test Category',
    price: 99.99,
    inventory: {
      quantity: 100,
      trackInventory: true,
      lowStockThreshold: 10,
    },
    isActive: true,
  };

  return await MerchantProduct.create({
    ...defaultProduct,
    ...overrides,
  });
};

/**
 * Create test order
 */
export const createTestOrder = async (merchantId: string, overrides: any = {}): Promise<any> => {
  const { MerchantOrder } = require('../../models/MerchantOrder');

  const defaultOrder = {
    merchantId,
    customerId: 'test-customer-id',
    customerName: 'Test Customer',
    customerEmail: 'customer@example.com',
    items: [{
      productId: 'test-product-id',
      name: 'Test Product',
      quantity: 1,
      price: 99.99,
      total: 99.99,
    }],
    subtotal: 99.99,
    total: 99.99,
    status: 'pending',
    paymentStatus: 'pending',
  };

  return await MerchantOrder.create({
    ...defaultOrder,
    ...overrides,
  });
};

/**
 * Generate auth token for merchant user
 */
export const generateMerchantUserToken = (userId: string, merchantId: string, role: string = 'staff') => {
  const secret = process.env.JWT_MERCHANT_SECRET || process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    { id: userId, merchantId, role, type: 'merchant_user' },
    secret,
    { expiresIn: '7d' }
  );
};

/**
 * Clean up test data
 */
export const cleanupTestData = async () => {
  try {
    const { MerchantUser } = require('../../models/MerchantUser');
    const { MerchantProduct } = require('../../models/MerchantProduct');
    const { MerchantOrder } = require('../../models/MerchantOrder');
    const { AuditLog } = require('../../models/AuditLog');
    const { TeamInvitation } = require('../../models/TeamInvitation');
    const { User } = require('../../models/User');

    await Promise.all([
      Merchant.deleteMany({}),
      MerchantUser.deleteMany({}),
      MerchantProduct.deleteMany({}),
      MerchantOrder.deleteMany({}),
      AuditLog.deleteMany({}),
      TeamInvitation.deleteMany({}),
      User.deleteMany({}), // added during Phase 3A test fixture cleanup
    ]);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

/**
 * Sleep utility
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
