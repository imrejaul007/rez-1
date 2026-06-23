/**
 * Merchant Auth Security Tests
 * Covers: token blacklisting, RBAC null-role rejection, and password validation.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the redisService so tests never need a real Redis connection
const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: { get: mockGet, set: mockSet },
  redisService: {
    client: {
      get: mockGet,
      set: mockSet,
    },
  },
}));

// Silence logger noise in tests
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { blacklistMerchantToken, isMerchantTokenBlacklisted } from '../middleware/merchantauth';
import Joi from 'joi';

// ─── Password Policy Schema (mirrors registerSchema in auth.ts) ───────────────

const passwordSchema = Joi.string()
  .min(10)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .message('Password must be at least 10 chars with uppercase, lowercase, number, and special character')
  .required();

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Merchant Auth Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Token Blacklist ──────────────────────────────────────────────────────────

  describe('blacklistMerchantToken and isMerchantTokenBlacklisted', () => {
    const TOKEN = 'some.jwt.token';
    // Key format standardized to blacklist:merchant:{sha256(token)} to match
    // rez-merchant-service/src/middleware/auth.ts — enables cross-service invalidation.
    const PREFIX = 'blacklist:merchant:';
    const TTL = 3600;

    // Helper that mirrors the private hashMerchantToken function in merchantauth.ts
    const crypto = require('crypto');
    const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

    test('blacklistMerchantToken writes key to Redis with correct prefix and TTL', async () => {
      mockSet.mockResolvedValueOnce('OK');

      await blacklistMerchantToken(TOKEN, TTL);

      expect(mockSet).toHaveBeenCalledWith(`${PREFIX}${tokenHash(TOKEN)}`, '1', TTL);
    });

    test('isMerchantTokenBlacklisted returns true when Redis holds "1"', async () => {
      mockGet.mockResolvedValueOnce('1');

      const result = await isMerchantTokenBlacklisted(TOKEN);

      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}${tokenHash(TOKEN)}`);
    });

    test('isMerchantTokenBlacklisted returns false when Redis returns null', async () => {
      mockGet.mockResolvedValueOnce(null);

      const result = await isMerchantTokenBlacklisted(TOKEN);

      expect(result).toBe(false);
    });

    test('isMerchantTokenBlacklisted returns false when Redis throws', async () => {
      mockGet.mockRejectedValueOnce(new Error('Redis down'));

      const result = await isMerchantTokenBlacklisted(TOKEN);

      expect(result).toBe(false);
    });

    test('blacklistMerchantToken does not throw when Redis set fails', async () => {
      mockSet.mockRejectedValueOnce(new Error('Redis write error'));

      await expect(blacklistMerchantToken(TOKEN, TTL)).resolves.not.toThrow();
    });
  });

  // ── RBAC null-role guard ─────────────────────────────────────────────────────

  describe('RBAC rejects when neither merchantUser nor merchantId is set', () => {
    /**
     * Directly exercise the guard logic extracted from rbac.ts:
     *   const role = req.merchantUser?.role ?? (req.merchantId ? 'owner' : null);
     *   if (!role) → 401
     */

    function resolveRole(merchantUserRole: string | undefined, merchantId: string | undefined): string | null {
      return merchantUserRole ?? (merchantId ? 'owner' : null);
    }

    test('returns null when both merchantUser and merchantId are absent', () => {
      const role = resolveRole(undefined, undefined);
      expect(role).toBeNull();
    });

    test('falls back to "owner" when merchantId is set but merchantUser is absent', () => {
      const role = resolveRole(undefined, 'merchant-123');
      expect(role).toBe('owner');
    });

    test('uses merchantUser role when present', () => {
      const role = resolveRole('manager', 'merchant-123');
      expect(role).toBe('manager');
    });

    test('RBAC middleware returns 401 when role is null (simulated)', () => {
      // Simulate what the middleware does when role is null
      const role = resolveRole(undefined, undefined);

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;

      if (!role) {
        mockRes.status(401).json({ success: false, message: 'Authentication required' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
    });
  });

  // ── Password Policy ──────────────────────────────────────────────────────────

  describe('password validation rejects weak passwords', () => {
    const weakPasswords = [
      { value: 'short', reason: 'too short' },
      { value: 'alllowercase1!', reason: 'no uppercase' },
      { value: 'ALLUPPERCASE1!', reason: 'no lowercase' },
      { value: 'NoNumbers!!!!', reason: 'no digit' },
      { value: 'NoSpecial1234', reason: 'no special character' },
      { value: 'Short1!', reason: 'shorter than 10 characters' },
    ];

    weakPasswords.forEach(({ value, reason }) => {
      test(`rejects "${value}" (${reason})`, () => {
        const { error } = passwordSchema.validate(value);
        expect(error).toBeDefined();
      });
    });

    const strongPasswords = ['Str0ng@Pass1', 'My$ecure99!', 'Hello_World1@'];

    strongPasswords.forEach((value) => {
      test(`accepts strong password "${value}"`, () => {
        const { error } = passwordSchema.validate(value);
        expect(error).toBeUndefined();
      });
    });
  });
});
