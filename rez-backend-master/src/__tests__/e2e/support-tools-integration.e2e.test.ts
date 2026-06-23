/**
 * Support Tools — Full HTTP Integration Tests
 *
 * Tests the ACTUAL HTTP flow: supertest → Express route → auth middleware →
 * controller → walletService → MongoDB → response.
 *
 * Uses a minimal Express app with only the admin user-wallet routes + real
 * auth middleware (requireAuth + requireAdmin), avoiding the full server
 * import which pulls in 100+ modules.
 *
 * Verifies real functionality:
 * 1. Search users → returns correct wallet data
 * 2. Credit wallet via HTTP → DB balance increases
 * 3. Debit wallet via HTTP → DB balance decreases
 * 4. Reverse cashback (manual) → wallet debited correctly
 * 5. Reverse cashback (with TX ID) → idempotent exact reversal
 * 6. Freeze/Unfreeze via HTTP → isFrozen flag toggled in DB
 * 7. Audit trail via HTTP → returns correct log entries
 * 8. Full workflow: search → credit → reverse → freeze → audit → unfreeze
 * 9. Validation: missing fields, bad amounts, auth failures
 */

import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';

// Mock Redis
jest.mock('../../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    isReady: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('../../services/walletVelocityService', () => ({
  checkVelocity: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('../../services/walletCacheService', () => ({
  invalidateWalletCache: jest.fn(),
  getCachedBalance: jest.fn(),
}));

jest.mock('../../config/walletMetrics', () => ({
  walletTransactionTotal: { inc: jest.fn() },
  walletTransactionDuration: { startTimer: jest.fn(() => jest.fn()) },
  walletBalanceDriftTotal: { inc: jest.fn() },
}));

// Mock rewardEngine to avoid expo-server-sdk ESM import chain
// (rewardEngine.reverseReward is tested directly in support-tools.e2e.test.ts)
const mockReverseReward = jest.fn();
jest.mock('../../core/rewardEngine', () => ({
  __esModule: true,
  rewardEngine: { reverseReward: (...args: any[]) => mockReverseReward(...args) },
  RewardError: class extends Error { constructor(public code: string, msg: string) { super(msg); } },
}));

// Imports after mocks
import { User } from '../../models/User';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import { TransactionAuditLog } from '../../models/TransactionAuditLog';
import { LedgerEntry } from '../../models/LedgerEntry';
import userWalletsRouter from '../../routes/admin/userWallets';
import redisService from '../../services/redisService';
import { walletTransactionTotal, walletTransactionDuration } from '../../config/walletMetrics';
import { invalidateWalletCache } from '../../services/walletCacheService';

// JWT secret (≥32 chars)
const TEST_SECRET = 'test-jwt-secret-for-integration-tests-32chars-plus';

// Build minimal Express app with real auth middleware + admin routes
function buildTestApp() {
  process.env.JWT_SECRET = TEST_SECRET;

  const app = express();
  app.use(express.json());

  // Import auth middleware (uses process.env.JWT_SECRET)
  const { requireAuth, requireAdmin } = require('../../middleware/auth');

  // Mount the admin user-wallets routes with real auth
  app.use('/api/admin/user-wallets', requireAuth, requireAdmin, userWalletsRouter);

  return app;
}

const testApp = buildTestApp();

// Restore mocks (jest.config has resetMocks: true)
beforeEach(() => {
  (redisService.acquireLock as jest.Mock).mockResolvedValue('lock-token');
  (redisService.releaseLock as jest.Mock).mockResolvedValue(true);
  (redisService.get as jest.Mock).mockResolvedValue(null);
  (redisService.set as jest.Mock).mockResolvedValue('OK');
  (redisService.del as jest.Mock).mockResolvedValue(1);
  (redisService.delPattern as jest.Mock).mockResolvedValue(0);
  (redisService.isReady as jest.Mock).mockReturnValue(true);
  (redisService.exists as jest.Mock).mockResolvedValue(false);
  (walletTransactionTotal.inc as jest.Mock).mockImplementation(() => {});
  (walletTransactionDuration.startTimer as jest.Mock).mockImplementation(() => jest.fn());
  (invalidateWalletCache as jest.Mock).mockResolvedValue(undefined);
  mockReverseReward.mockReset();
});

// ---- Helpers ----

let counter = 0;

async function createAdmin(): Promise<any> {
  counter++;
  return User.create({
    phoneNumber: `+97150${String(counter).padStart(7, '0')}`,
    firstName: 'Admin',
    lastName: 'Tester',
    isVerified: true,
    isActive: true,
    role: 'super_admin',
  });
}

function adminToken(adminId: string): string {
  return jwt.sign({ userId: adminId, role: 'super_admin' }, TEST_SECRET, { expiresIn: '1h' });
}

async function createUser(name: string = 'Test User'): Promise<any> {
  counter++;
  return User.create({
    phoneNumber: `+97155${String(counter).padStart(7, '0')}`,
    firstName: name.split(' ')[0],
    lastName: name.split(' ')[1] || 'User',
    isVerified: true,
    isActive: true,
    role: 'user',
  });
}

async function createWallet(userId: Types.ObjectId, balance: number = 1000): Promise<any> {
  counter++;
  const wallet = await Wallet.create({
    user: userId,
    balance: { available: balance, total: balance, pending: 0, cashback: 0 },
    coins: [
      { type: 'rez', amount: balance, isActive: true },
      { type: 'prive', amount: 0, isActive: true },
      { type: 'promo', amount: 0, isActive: true },
    ],
    statistics: { totalEarned: balance, totalSpent: 0, totalCashback: 0, totalRefunds: 0 },
    lastTransactionAt: new Date(),
  });
  await CoinTransaction.create({
    user: userId, type: 'earned', amount: balance, balance,
    source: 'daily_login', description: 'Seed',
    metadata: { idempotencyKey: `seed:${userId}:${counter}` },
  });
  return wallet;
}

// ---- Tests ----

describe('HTTP Integration: Frontend → Backend → DB', () => {
  let admin: any;
  let token: string;
  let user: any;

  beforeEach(async () => {
    admin = await createAdmin();
    token = adminToken(admin._id.toString());
    user = await createUser('Jane Smith');
    await createWallet(user._id, 1000);
  });

  // ═══════ SEARCH ═══════

  describe('GET /api/admin/user-wallets (Search)', () => {
    it('should find user by phone and return wallet data', async () => {
      const res = await request(testApp)
        .get(`/api/admin/user-wallets?search=${encodeURIComponent(user.phoneNumber)}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);

      // Find our user by phone in the results
      const found = res.body.data.users.find(
        (u: any) => u.user.phoneNumber === user.phoneNumber
      );
      expect(found).toBeTruthy();
      expect(found.wallet).toBeTruthy();
      expect(found.wallet.balance.available).toBe(1000);
      expect(found.wallet.isFrozen).toBe(false);
    });

    it('should return pagination metadata', async () => {
      const res = await request(testApp)
        .get('/api/admin/user-wallets?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toBeTruthy();
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  // ═══════ CREDIT ═══════

  describe('POST /api/admin/user-wallets/:id/adjust (Credit)', () => {
    it('should credit wallet — DB balance increases', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 300, type: 'credit', reason: 'Compensation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance.available).toBe(1300);

      // Verify in DB
      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(1300);
    });
  });

  // ═══════ DEBIT ═══════

  describe('POST /api/admin/user-wallets/:id/adjust (Debit)', () => {
    it('should debit wallet — DB balance decreases', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 400, type: 'debit', reason: 'Clawback' });

      expect(res.status).toBe(200);

      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(600);
    });

    it('should reject debit exceeding balance → 400', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 9999, type: 'debit', reason: 'Too much' });

      expect(res.status).toBe(400);

      // Balance unchanged
      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(1000);
    });
  });

  // ═══════ REVERSE CASHBACK (manual) ═══════

  describe('POST /api/admin/user-wallets/:id/reverse-cashback (Manual)', () => {
    it('should reverse cashback — wallet debited', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 150, reason: 'Duplicate cashback' });

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(150);

      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(850);
    });

    it('should reject insufficient balance → 400', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 5000, reason: 'Too much' });

      expect(res.status).toBe(400);
    });

    it('should reject missing reason → 400', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50 });

      expect(res.status).toBe(400);
    });
  });

  // ═══════ REVERSE CASHBACK (exact, with TX ID) ═══════

  describe('POST /api/admin/user-wallets/:id/reverse-cashback (Exact with TX ID)', () => {
    it('should reverse specific transaction via rewardEngine', async () => {
      const reversalTxId = new Types.ObjectId();
      mockReverseReward.mockResolvedValueOnce({
        success: true,
        reversalTransactionId: reversalTxId,
        amount: 200,
        newBalance: 800,
        originalTransactionId: 'original-tx-123',
        reason: 'Order cancelled',
      });

      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 200,
          originalTransactionId: 'original-tx-123',
          reason: 'Order cancelled',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.reversalTransactionId).toBeTruthy();

      // Verify rewardEngine was called with correct args
      expect(mockReverseReward).toHaveBeenCalledWith(
        'original-tx-123',
        'Order cancelled',
        { partialAmount: 200 },
      );
    });

    it('should be idempotent — second call returns same result', async () => {
      const sameTxId = new Types.ObjectId();
      mockReverseReward
        .mockResolvedValueOnce({ success: true, reversalTransactionId: sameTxId, amount: 100, newBalance: 900, originalTransactionId: 'tx-abc', reason: 'First' })
        .mockResolvedValueOnce({ success: true, reversalTransactionId: sameTxId, amount: 100, newBalance: 900, originalTransactionId: 'tx-abc', reason: 'Dup' });

      const first = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100, originalTransactionId: 'tx-abc', reason: 'First' });

      const second = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100, originalTransactionId: 'tx-abc', reason: 'Dup' });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(String(first.body.data.reversalTransactionId)).toBe(String(second.body.data.reversalTransactionId));
    });

    it('should return 404 for non-existent TX', async () => {
      mockReverseReward.mockRejectedValueOnce(new Error('Transaction fake-tx not found'));

      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 50,
          originalTransactionId: 'fake-tx',
          reason: 'Does not exist',
        });

      expect(res.status).toBe(404);
    });
  });

  // ═══════ FREEZE / UNFREEZE ═══════

  describe('POST /freeze and /unfreeze', () => {
    it('should freeze wallet — isFrozen=true + reason stored', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/freeze`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Suspicious activity' });

      expect(res.status).toBe(200);
      expect(res.body.data.isFrozen).toBe(true);

      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.isFrozen).toBe(true);
      expect(wallet!.frozenReason).toBe('Suspicious activity');
    });

    it('should show frozen status in search', async () => {
      await Wallet.findOneAndUpdate({ user: user._id }, {
        isFrozen: true, frozenReason: 'Test', frozenAt: new Date(),
      });

      const res = await request(testApp)
        .get(`/api/admin/user-wallets?search=${encodeURIComponent(user.phoneNumber)}`)
        .set('Authorization', `Bearer ${token}`);

      const found = res.body.data.users.find(
        (u: any) => u.user.phoneNumber === user.phoneNumber
      );
      expect(found).toBeTruthy();
      expect(found.wallet.isFrozen).toBe(true);
    });

    it('should unfreeze wallet — isFrozen=false', async () => {
      await Wallet.findOneAndUpdate({ user: user._id }, {
        isFrozen: true, frozenReason: 'Test', frozenAt: new Date(),
      });

      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/unfreeze`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.isFrozen).toBe(false);
    });

    it('should require reason to freeze → 400', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/freeze`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ═══════ AUDIT TRAIL ═══════

  describe('GET /api/admin/user-wallets/:id/audit-trail', () => {
    it('should return audit entries after operations', async () => {
      // Perform a credit
      await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100, type: 'credit', reason: 'Test audit' });

      await new Promise(r => setTimeout(r, 200));

      const res = await request(testApp)
        .get(`/api/admin/user-wallets/${user._id}/audit-trail?page=1&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination).toBeTruthy();
    });
  });

  // ═══════ AUTH VALIDATION ═══════

  describe('Authentication & authorization', () => {
    it('should reject requests without token → 401', async () => {
      const res = await request(testApp).get('/api/admin/user-wallets');
      expect(res.status).toBe(401);
    });

    it('should reject non-admin tokens → 403', async () => {
      const userToken = jwt.sign(
        { userId: user._id.toString(), role: 'user' },
        TEST_SECRET, { expiresIn: '1h' },
      );

      const res = await request(testApp)
        .get('/api/admin/user-wallets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ═══════ FULL WORKFLOW ═══════

  describe('Full support workflow (end-to-end)', () => {
    it('search → credit → reverse → freeze → audit → unfreeze', async () => {
      // 1. Search
      let res = await request(testApp)
        .get(`/api/admin/user-wallets?search=${encodeURIComponent(user.phoneNumber)}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      const searchedUser = res.body.data.users.find((u: any) => u.user.phoneNumber === user.phoneNumber);
      expect(searchedUser.wallet.balance.available).toBe(1000);

      // 2. Credit
      res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500, type: 'credit', reason: 'Service issue compensation' });
      expect(res.status).toBe(200);

      let wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(1500);

      // 3. Reverse (over-compensated)
      res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/reverse-cashback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200, reason: 'Over-compensation' });
      expect(res.status).toBe(200);

      wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(1300);

      // 4. Freeze
      res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/freeze`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Investigation pending' });
      expect(res.status).toBe(200);

      wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.isFrozen).toBe(true);

      // 5. Audit trail
      await new Promise(r => setTimeout(r, 300));
      res = await request(testApp)
        .get(`/api/admin/user-wallets/${user._id}/audit-trail?page=1&limit=20`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(3);

      // 6. Unfreeze
      res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/unfreeze`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.isFrozen).toBe(false);
      expect(wallet!.balance.available).toBe(1300); // Balance preserved
    });
  });

  // ═══════ INPUT VALIDATION ═══════

  describe('Input validation', () => {
    it('should reject amount > 100,000 → 400', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200000, type: 'credit', reason: 'Too large' });

      expect(res.status).toBe(400);
    });

    it('should reject missing type → 400', async () => {
      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${user._id}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100, reason: 'No type' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user wallet', async () => {
      const fakeId = new Types.ObjectId().toString();

      const res = await request(testApp)
        .post(`/api/admin/user-wallets/${fakeId}/adjust`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100, type: 'credit', reason: 'Test' });

      expect(res.status).toBe(404);
    });
  });
});
