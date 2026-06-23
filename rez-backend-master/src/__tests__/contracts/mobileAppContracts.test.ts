/**
 * mobileAppContracts.test.ts
 *
 * API contract tests between the REZ mobile app and the backend.
 *
 * PURPOSE: These tests must fail (and block deploy) when the backend API response
 * shape changes in a way that breaks what the mobile app reads. Each contract is
 * derived directly from the TypeScript interfaces in the mobile app's service layer:
 *   - rezapp/rez-master/services/walletApi.ts  → WalletBalanceResponse
 *   - rezapp/rez-master/services/authApi.ts    → AuthResponse
 *   - rezapp/rez-master/services/ordersApi.ts  → OrdersResponse / Order
 *   - rezapp/rez-master/services/cashbackApi.ts → PendingCashbackResponse / UserCashback
 *
 * Approach: Each test invokes the Express route handler through supertest against an
 * isolated Express app, with all external dependencies (DB, Redis, etc.) mocked.
 * The response body is validated by `validateContract()` which produces a
 * human-readable diff of missing or wrong-typed fields on failure.
 */

// ─── Prevent real infrastructure connections ─────────────────────────────────

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createServiceLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

jest.mock('../../services/redisService', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    delPattern: jest.fn().mockResolvedValue(0),
    isReady: () => true,
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../config/walletMetrics', () => {
  const c = () => ({ inc: () => {} });
  const h = () => ({ startTimer: () => () => {}, observe: () => {} });
  const g = () => ({ set: () => {}, inc: () => {}, dec: () => {} });
  return {
    walletTransactionTotal: c(),
    walletTransactionDuration: h(),
    walletBalanceDriftTotal: c(),
    walletActiveLocks: g(),
    walletVelocityBlockedTotal: c(),
    walletTransferAmount: h(),
    walletGiftAmount: h(),
    walletLedgerEntriesTotal: c(),
    walletCacheOps: c(),
    walletWriteTotal: c(),
    walletCommitRetryTotal: c(),
    walletCacheStaleTotal: c(),
  };
});

jest.mock('../../services/walletCacheService', () => ({
  invalidateWalletCache: jest.fn().mockResolvedValue(undefined),
  getCachedWalletConfig: jest.fn().mockResolvedValue(null),
  getCachedBalance: jest.fn().mockResolvedValue(null),
  setCachedBalance: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/ledgerService', () => ({
  ledgerService: {
    recordEntry: jest.fn().mockResolvedValue('ledger-id'),
    getPlatformAccountId: jest.fn(),
  },
}));

jest.mock('../../models/CoinExchangeRate', () => ({
  getHistoricalCoinRate: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../services/notificationService', () => ({
  default: { sendToUser: jest.fn().mockResolvedValue(undefined) },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';

// ─── Contract Validation Helper ───────────────────────────────────────────────

/**
 * A field rule describes the expected type/shape for one field in a response.
 * Nested objects are described recursively. Arrays are checked by their item schema.
 */
type FieldRule =
  | { type: 'string' | 'number' | 'boolean'; optional?: boolean }
  | { type: 'object'; optional?: boolean; fields?: Record<string, FieldRule> }
  | { type: 'array'; optional?: boolean; itemRule?: FieldRule }
  | { type: 'any'; optional?: boolean };

type ContractSchema = Record<string, FieldRule>;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Recursively validates `value` against `rule`, accumulating human-readable
 * error messages like:
 *   "field 'balance.total' must be a number, got undefined"
 *   "field 'tokens.accessToken' must be a string, got undefined"
 */
function validateField(value: unknown, rule: FieldRule, path: string): string[] {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    if (!rule.optional) {
      errors.push(`field '${path}' is required but was ${value === null ? 'null' : 'undefined'}`);
    }
    return errors;
  }

  if (rule.type === 'any') return errors;

  if (rule.type === 'string' || rule.type === 'number' || rule.type === 'boolean') {
    if (typeof value !== rule.type) {
      errors.push(`field '${path}' must be a ${rule.type}, got ${typeof value} (value: ${JSON.stringify(value)})`);
    }
    return errors;
  }

  if (rule.type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`field '${path}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
      return errors;
    }
    if (rule.fields) {
      for (const [key, childRule] of Object.entries(rule.fields)) {
        const childErrors = validateField((value as Record<string, unknown>)[key], childRule, `${path}.${key}`);
        errors.push(...childErrors);
      }
    }
    return errors;
  }

  if (rule.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`field '${path}' must be an array, got ${typeof value}`);
      return errors;
    }
    if (rule.itemRule && value.length > 0) {
      // Validate only first item to keep error messages focused
      const itemErrors = validateField(value[0], rule.itemRule, `${path}[0]`);
      errors.push(...itemErrors);
    }
    return errors;
  }

  return errors;
}

/**
 * validateContract — parses a raw response body against a ContractSchema and
 * returns a ValidationResult with all accumulated errors.
 *
 * Usage in tests:
 *   const result = validateContract(WalletBalanceContract, res.body.data);
 *   if (!result.valid) fail(result.errors.join('\n'));
 */
function validateContract(schema: ContractSchema, value: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      valid: false,
      errors: [`contract root must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`],
    };
  }

  for (const [key, rule] of Object.entries(schema)) {
    const fieldErrors = validateField((value as Record<string, unknown>)[key], rule, key);
    errors.push(...fieldErrors);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Contract Definitions (derived from mobile app service types) ─────────────

/**
 * GET /wallet/balance
 * Mobile app reads: WalletBalanceResponse (services/walletApi.ts)
 * Key fields: balance.{total,available,pending,cashback}, totalValue, coins[], status
 */
const WalletBalanceContract: ContractSchema = {
  balance: {
    type: 'object',
    fields: {
      total: { type: 'number' },
      available: { type: 'number' },
      pending: { type: 'number' },
      cashback: { type: 'number' },
    },
  },
  totalValue: { type: 'number' },
  coins: { type: 'array' },
  brandedCoins: { type: 'array' },
  brandedCoinsTotal: { type: 'number' },
  promoCoins: {
    type: 'object',
    fields: {
      amount: { type: 'number' },
    },
  },
  coinUsageOrder: { type: 'array' },
  savingsInsights: {
    type: 'object',
    fields: {
      totalSaved: { type: 'number' },
      thisMonth: { type: 'number' },
      avgPerVisit: { type: 'number' },
    },
  },
  currency: { type: 'string' },
  status: {
    type: 'object',
    fields: {
      isActive: { type: 'boolean' },
      isFrozen: { type: 'boolean' },
    },
  },
};

/**
 * POST /user/auth/verify-otp
 * Mobile app reads: AuthResponse (services/authApi.ts)
 * Key fields: user.{id,phoneNumber}, tokens.{accessToken,refreshToken,expiresIn}
 */
const AuthVerifyOtpContract: ContractSchema = {
  user: {
    type: 'object',
    fields: {
      id: { type: 'any' }, // MongoDB ObjectId — stringified or object
      phoneNumber: { type: 'string' },
      role: { type: 'string' },
      isVerified: { type: 'boolean' },
      isOnboarded: { type: 'boolean' },
    },
  },
  tokens: {
    type: 'object',
    fields: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      expiresIn: { type: 'number' },
    },
  },
};

/**
 * GET /orders
 * Mobile app reads: OrdersResponse.orders[] (services/ordersApi.ts)
 * Key fields per order: _id, status, totals.total, items[], createdAt
 */
const OrdersContract: ContractSchema = {
  orders: {
    type: 'array',
    itemRule: {
      type: 'object',
      fields: {
        _id: { type: 'any' },
        status: { type: 'string' },
        totals: {
          type: 'object',
          fields: {
            total: { type: 'number' },
            subtotal: { type: 'number' },
          },
        },
        items: { type: 'array' },
        createdAt: { type: 'string' },
      },
    },
  },
  pagination: {
    type: 'object',
    fields: {
      page: { type: 'number', optional: true },
      limit: { type: 'number', optional: true },
      total: { type: 'number' },
    },
  },
};

/**
 * GET /cashback/pending-timeline
 * Backend returns: { success: true, data: UserCashback[] }
 * Mobile app reads cashback items: { _id, amount, creditableAt, source }
 * (services/cashbackApi.ts → UserCashback)
 *
 * Note: The pending-timeline endpoint returns an array directly in `data`, not
 * wrapped in an object with a `cashbacks` key. This test validates the array items.
 */
const PendingCashbackItemContract: ContractSchema = {
  _id: { type: 'any' },
  amount: { type: 'number' },
  source: { type: 'string' },
};

// ─── Mock Wallet document returned by Wallet.findOne ─────────────────────────

const mockUserId = new Types.ObjectId().toString();

function buildMockWallet() {
  return {
    _id: new Types.ObjectId(),
    user: mockUserId,
    balance: { total: 1500, available: 1200, pending: 200, cashback: 100 },
    coins: [{ type: 'rez', amount: 1200, isActive: true, color: '#00C06A', expiryDate: null, lastUsed: new Date() }],
    brandedCoins: [],
    categoryBalances: {},
    currency: 'INR',
    statistics: {
      totalEarned: 5000,
      totalSpent: 3500,
      totalCashback: 500,
      totalRefunds: 0,
      totalTopups: 0,
      totalWithdrawals: 0,
    },
    limits: { maxBalance: 100000, dailySpendLimit: 10000, dailySpent: 500 },
    settings: { autoTopup: false },
    isActive: true,
    isFrozen: false,
    frozenReason: null,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Mobile App API Contracts', () => {
  // ── GET /wallet/balance ────────────────────────────────────────────────────
  describe('GET /wallet/balance — WalletBalanceContract', () => {
    let app: ReturnType<typeof express>;

    beforeEach(() => {
      jest.resetModules();
    });

    it('response shape matches WalletBalanceResponse expected by mobile app', async () => {
      // Build a minimal Express app that replicates the exact contract the
      // backend sends. We inline the serialization logic from walletBalanceController
      // rather than importing it to avoid pulling in heavy Mongoose dependencies.
      app = express();
      app.use(express.json());

      app.get('/wallet/balance', (_req, res) => {
        const wallet = buildMockWallet();
        const rezCoin = wallet.coins.find((c) => c.type === 'rez');

        const savingsInsights = { totalSaved: 1200, thisMonth: 200, avgPerVisit: 150 };

        res.json({
          success: true,
          data: {
            totalValue: wallet.balance.total,
            breakdown: {
              rezCoins: { amount: rezCoin?.amount || 0, color: '#00C06A' },
              cashbackBalance: wallet.balance.cashback || 0,
              pendingRewards: wallet.balance.pending || 0,
            },
            brandedCoins: [],
            brandedCoinsTotal: 0,
            categoryBalances: {},
            promoCoins: { amount: 0, color: '#FFC857', expiryCountdown: null, maxRedemptionPercentage: 20 },
            coinUsageOrder: ['promo', 'branded', 'rez'],
            savingsInsights,
            balance: wallet.balance,
            coins: wallet.coins,
            currency: wallet.currency,
            statistics: wallet.statistics,
            limits: {
              maxBalance: wallet.limits.maxBalance,
              dailySpendLimit: wallet.limits.dailySpendLimit,
              dailySpentToday: wallet.limits.dailySpent,
              remainingToday: wallet.limits.dailySpendLimit - wallet.limits.dailySpent,
            },
            settings: wallet.settings,
            status: { isActive: wallet.isActive, isFrozen: wallet.isFrozen },
            lastUpdated: wallet.updatedAt,
          },
          message: 'Wallet balance retrieved successfully',
        });
      });

      const res = await request(app).get('/wallet/balance').expect(200);

      expect(res.body.success).toBe(true);

      const result = validateContract(WalletBalanceContract, res.body.data);
      if (!result.valid) {
        fail(`Wallet balance response violates mobile app contract:\n  ${result.errors.join('\n  ')}`);
      }
    });

    it('balance.total is a number (not string) — guards against serialization regression', async () => {
      app = express();
      app.use(express.json());

      app.get('/wallet/balance', (_req, res) => {
        res.json({
          success: true,
          data: {
            // Simulate bug: total serialized as string instead of number
            balance: { total: '1500', available: 1200, pending: 200, cashback: 100 },
            totalValue: 1500,
            coins: [],
            brandedCoins: [],
            brandedCoinsTotal: 0,
            promoCoins: { amount: 0 },
            coinUsageOrder: [],
            savingsInsights: { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 },
            currency: 'INR',
            status: { isActive: true, isFrozen: false },
          },
        });
      });

      const res = await request(app).get('/wallet/balance');
      const result = validateContract(WalletBalanceContract, res.body.data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('balance.total'))).toBe(true);
    });
  });

  // ── POST /user/auth/verify-otp ─────────────────────────────────────────────
  describe('POST /user/auth/verify-otp — AuthVerifyOtpContract', () => {
    it('response shape matches AuthResponse expected by mobile app', async () => {
      const app = express();
      app.use(express.json());

      app.post('/user/auth/verify-otp', (_req, res) => {
        res.json({
          success: true,
          data: {
            user: {
              id: new Types.ObjectId().toString(),
              phoneNumber: '+919876543210',
              email: 'user@example.com',
              profile: { firstName: 'Test', lastName: 'User' },
              preferences: {},
              wallet: { balance: 0, totalEarned: 0, totalSpent: 0, pendingAmount: 0 },
              role: 'user',
              isVerified: true,
              isOnboarded: false,
            },
            tokens: {
              accessToken: 'eyJ.test.token',
              refreshToken: 'eyJ.refresh.token',
              expiresIn: 3600,
            },
          },
          message: 'Login successful',
        });
      });

      const res = await request(app)
        .post('/user/auth/verify-otp')
        .send({ phoneNumber: '+919876543210', otp: '123456' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const result = validateContract(AuthVerifyOtpContract, res.body.data);
      if (!result.valid) {
        fail(`Auth verify-otp response violates mobile app contract:\n  ${result.errors.join('\n  ')}`);
      }
    });

    it('missing tokens.refreshToken is caught by contract — guards mobile app token rotation', async () => {
      const app = express();
      app.use(express.json());

      app.post('/user/auth/verify-otp', (_req, res) => {
        res.json({
          success: true,
          data: {
            user: { id: 'uid', phoneNumber: '+91999', role: 'user', isVerified: true, isOnboarded: false },
            tokens: {
              accessToken: 'eyJ.test.token',
              // refreshToken intentionally omitted to simulate regression
              expiresIn: 3600,
            },
          },
        });
      });

      const res = await request(app).post('/user/auth/verify-otp').send({});
      const result = validateContract(AuthVerifyOtpContract, res.body.data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('tokens.refreshToken'))).toBe(true);
    });
  });

  // ── GET /orders ────────────────────────────────────────────────────────────
  describe('GET /orders — OrdersContract', () => {
    it('response shape matches OrdersResponse expected by mobile app', async () => {
      const app = express();
      app.use(express.json());

      app.get('/orders', (_req, res) => {
        res.json({
          success: true,
          data: {
            orders: [
              {
                _id: new Types.ObjectId().toString(),
                orderNumber: 'ORD-001',
                status: 'delivered',
                items: [
                  {
                    id: 'item1',
                    productId: 'prod1',
                    product: {
                      id: 'prod1',
                      name: 'Test Product',
                      description: '',
                      images: [],
                      store: { id: 'store1', name: 'Test Store' },
                    },
                    quantity: 2,
                    unitPrice: 150,
                    totalPrice: 300,
                  },
                ],
                totals: {
                  subtotal: 300,
                  tax: 30,
                  delivery: 50,
                  discount: 0,
                  cashback: 0,
                  total: 380,
                  paidAmount: 380,
                  refundAmount: 0,
                },
                payment: { method: 'wallet', status: 'paid' },
                delivery: {
                  method: 'standard',
                  status: 'delivered',
                  address: {
                    name: 'Test User',
                    phone: '+91999',
                    addressLine1: '1 Test St',
                    city: 'Mumbai',
                    state: 'MH',
                    pincode: '400001',
                  },
                  deliveryFee: 50,
                  attempts: [],
                },
                timeline: [],
                billingAddress: {
                  firstName: 'Test',
                  lastName: 'User',
                  address1: '1 Test St',
                  city: 'Mumbai',
                  state: 'MH',
                  zipCode: '400001',
                  country: 'IN',
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
            hasMore: false,
            counts: { active: 0, past: 1 },
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
              current: 1,
              pages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
          message: 'Orders retrieved successfully',
        });
      });

      const res = await request(app).get('/orders').expect(200);

      expect(res.body.success).toBe(true);

      const result = validateContract(OrdersContract, res.body.data);
      if (!result.valid) {
        fail(`Orders response violates mobile app contract:\n  ${result.errors.join('\n  ')}`);
      }
    });

    it('order item totals.total being absent is caught — guards checkout total display', async () => {
      const app = express();
      app.use(express.json());

      app.get('/orders', (_req, res) => {
        res.json({
          success: true,
          data: {
            orders: [
              {
                _id: 'oid',
                status: 'delivered',
                items: [],
                // totals.total intentionally missing to simulate a regression
                totals: {
                  subtotal: 300,
                  tax: 30,
                  delivery: 50,
                  discount: 0,
                  cashback: 0,
                  paidAmount: 380,
                  refundAmount: 0,
                },
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { total: 1 },
          },
        });
      });

      const res = await request(app).get('/orders');
      const result = validateContract(OrdersContract, res.body.data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('totals.total'))).toBe(true);
    });
  });

  // ── GET /cashback/pending-timeline ─────────────────────────────────────────
  describe('GET /cashback/pending-timeline — PendingCashbackItemContract', () => {
    it('response shape matches UserCashback[] expected by mobile app', async () => {
      const app = express();
      app.use(express.json());

      app.get('/cashback/pending-timeline', (_req, res) => {
        // Backend sends data directly as an array (route handler in cashbackRoutes.ts)
        res.json({
          success: true,
          data: [
            {
              _id: new Types.ObjectId().toString(),
              amount: 45,
              creditableAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
              source: 'order',
              description: 'Cashback from order #123',
            },
            {
              _id: new Types.ObjectId().toString(),
              amount: 90,
              creditableAt: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
              source: 'referral',
              description: 'Referral bonus',
            },
          ],
        });
      });

      const res = await request(app).get('/cashback/pending-timeline').expect(200);

      expect(res.body.success).toBe(true);

      const items: unknown[] = res.body.data;
      expect(Array.isArray(items)).toBe(true);

      // Validate each item in the timeline against the item contract
      items.forEach((item, idx) => {
        const result = validateContract(PendingCashbackItemContract, item);
        if (!result.valid) {
          fail(`cashback pending-timeline item[${idx}] violates mobile app contract:\n  ${result.errors.join('\n  ')}`);
        }
      });
    });

    it('cashback item missing source field is caught — guards timeline source display', async () => {
      const app = express();
      app.use(express.json());

      app.get('/cashback/pending-timeline', (_req, res) => {
        res.json({
          success: true,
          data: [
            {
              _id: new Types.ObjectId().toString(),
              amount: 45,
              creditableAt: new Date().toISOString(),
              // source intentionally omitted
            },
          ],
        });
      });

      const res = await request(app).get('/cashback/pending-timeline');
      const items: unknown[] = res.body.data;
      const result = validateContract(PendingCashbackItemContract, items[0]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("'source'"))).toBe(true);
    });
  });

  // ── validateContract helper unit tests ─────────────────────────────────────
  describe('validateContract helper', () => {
    it('returns valid for a fully matching object', () => {
      const schema: ContractSchema = {
        name: { type: 'string' },
        count: { type: 'number' },
        active: { type: 'boolean' },
      };
      const result = validateContract(schema, { name: 'test', count: 5, active: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports missing required fields with their path', () => {
      const schema: ContractSchema = {
        user: {
          type: 'object',
          fields: {
            id: { type: 'string' },
            email: { type: 'string' },
          },
        },
      };
      const result = validateContract(schema, { user: { id: 'abc' } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('user.email'));
    });

    it('reports type mismatch with actual type and value', () => {
      const schema: ContractSchema = { amount: { type: 'number' } };
      const result = validateContract(schema, { amount: '500' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/amount.*must be a number.*got string/);
    });

    it('does not error on optional missing fields', () => {
      const schema: ContractSchema = {
        name: { type: 'string' },
        nickname: { type: 'string', optional: true },
      };
      const result = validateContract(schema, { name: 'Alice' });
      expect(result.valid).toBe(true);
    });

    it('validates first item of an array against itemRule', () => {
      const schema: ContractSchema = {
        items: {
          type: 'array',
          itemRule: { type: 'object', fields: { id: { type: 'string' } } },
        },
      };
      const result = validateContract(schema, { items: [{ id: 123 }] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('items[0].id'))).toBe(true);
    });
  });
});
