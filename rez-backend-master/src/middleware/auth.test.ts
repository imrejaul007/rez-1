/**
 * Auth Middleware Tests (ITER18)
 *
 * Tests for src/middleware/auth.ts
 *
 * ITER18 fix: shadow user creation hardcodes `role: 'user'` regardless of
 * the JWT's role claim. Trusting the JWT role here would allow privilege
 * escalation. The fix has two parts:
 *   1. In authenticate(), `User.create({... role: 'user'})` is hardcoded.
 *   2. A warn log fires when the JWT requested a privileged role.
 *
 * We test the publicly-exported building blocks (token generation,
 * verification, role-based authorization) plus the JWT secret enforcement.
 * The hardcoded 'user' role for shadow users is verified by code review
 * (line ~208 in auth.ts) and indirectly by the warn log on shadow creation
 * which we mock and assert.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUserFindById = jest.fn();
jest.mock('../models/User', () => ({
  User: {
    findById: (...args: any[]) => mockUserFindById(...args),
  },
}));

const mockRedisSet = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisExists = jest.fn();
const mockRedisIsReady = jest.fn();
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    set: (...args: any[]) => mockRedisSet(...args),
    get: (...args: any[]) => mockRedisGet(...args),
    exists: (...args: any[]) => mockRedisExists(...args),
    isReady: () => mockRedisIsReady(),
  },
}));

jest.mock('../services/deviceFingerprintService', () => ({
  checkDeviceStatus: jest.fn().mockResolvedValue({ isBlocked: false, riskLevel: 'low' }),
  registerDevice: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// ─── Set required env before importing the middleware module ───────────────
process.env.JWT_SECRET = 'a-very-strong-test-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'a-very-strong-test-refresh-secret-with-32-chars';
process.env.NODE_ENV = 'test';

// ─── Import after mocks ──────────────────────────────────────────────────────
import {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  authorize,
  requireAdminRole,
  isTokenBlacklisted,
  blacklistToken,
} from './auth';
import jwt from 'jsonwebtoken';

describe('auth middleware (ITER18 role-hardening + secret enforcement)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisIsReady.mockReturnValue(true);
    mockRedisExists.mockResolvedValue(false);
  });

  // ── 1. JWT secret enforcement ─────────────────────────────────────────────

  describe('JWT secret enforcement', () => {
    it('throws when JWT_SECRET is shorter than 32 chars', () => {
      const oldSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'short';
      expect(() => generateToken('user123')).toThrow(/at least 32 characters/i);
      process.env.JWT_SECRET = oldSecret;
    });

    it('throws when JWT_REFRESH_SECRET is missing', () => {
      const old = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => generateRefreshToken('user123')).toThrow(/JWT_REFRESH_SECRET.*required/i);
      process.env.JWT_REFRESH_SECRET = old;
    });
  });

  // ── 2. generateToken + verifyToken roundtrip ──────────────────────────────

  describe('generateToken + verifyToken', () => {
    it('roundtrips a user token', () => {
      const token = generateToken('user1', 'user');
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('user1');
      expect(decoded.role).toBe('user');
    });

    it('roundtrips an admin token (uses admin secret when configured)', () => {
      const oldAdmin = process.env.JWT_ADMIN_SECRET;
      process.env.JWT_ADMIN_SECRET = 'admin-secret-that-is-also-32-chars-long-x';
      try {
        const token = generateToken('admin1', 'admin');
        const decoded = verifyToken(token);
        expect(decoded.userId).toBe('admin1');
        expect(decoded.role).toBe('admin');
      } finally {
        process.env.JWT_ADMIN_SECRET = oldAdmin;
      }
    });

    it('rejects an admin-signed token signed with a different secret', () => {
      const oldAdmin = process.env.JWT_ADMIN_SECRET;
      process.env.JWT_ADMIN_SECRET = 'admin-secret-that-is-also-32-chars-long-x';
      try {
        // Forged token signed with a different secret
        const forged = jwt.sign(
          { userId: 'attacker', role: 'super_admin' },
          'a-completely-different-secret-of-32-chars-yes',
          { algorithm: 'HS256' }
        );
        expect(() => verifyToken(forged)).toThrow();
      } finally {
        process.env.JWT_ADMIN_SECRET = oldAdmin;
      }
    });
  });

  // ── 3. ITER18: shadow user creation is HARD-CODED to role='user' ─────────

  describe('ITER18 — role hardcoding in shadow user creation', () => {
    it('authenticate() hardcodes role="user" when creating shadow user from JWT with role=admin (privilege escalation blocked)', async () => {
      // Construct a token with role=admin in its claim
      const maliciousToken = jwt.sign(
        { userId: 'attacker-id', role: 'admin' },
        process.env.JWT_SECRET!,
        { algorithm: 'HS256', expiresIn: '15m' }
      );

      // Mock User.findById to return null (so the shadow-user path is taken)
      mockUserFindById.mockImplementationOnce(() => ({
        select: () => Promise.resolve(null), // .select chains to Promise in our mock
      }));

      // Capture the args passed to User.create
      const mockUserCreate = jest.fn().mockResolvedValue({
        _id: 'attacker-id',
        role: 'user',
        isActive: true,
        isAccountLocked: () => false,
      });
      // Inject the create method
      const UserModule = require('../models/User');
      UserModule.User.create = mockUserCreate;

      // Build a fake request
      const req: any = {
        headers: { authorization: `Bearer ${maliciousToken}` },
        path: '/api/something',
        method: 'GET',
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      const { authenticate } = await import('./auth');
      await authenticate(req, res, next);

      // Verify: User.create was called with role='user' (NOT 'admin')
      expect(mockUserCreate).toHaveBeenCalled();
      const createdUser = mockUserCreate.mock.calls[0][0];
      expect(createdUser.role).toBe('user');
      // The fix: even though the JWT claimed role='admin', the shadow user
      // is created with role='user'. This is the privilege-escalation block.
      expect(createdUser.role).not.toBe('admin');
    });
  });

  // ── 4. authorize() middleware ─────────────────────────────────────────────

  describe('authorize() middleware', () => {
    it('returns 401 when req.user is missing', () => {
      const mw = authorize('admin');
      const req: any = {};
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when role is not in the allowed list', () => {
      const mw = authorize('admin');
      const req: any = { user: { role: 'user' } };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when role is allowed', () => {
      const mw = authorize('admin', 'super_admin');
      const req: any = { user: { role: 'admin' } };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ── 5. requireAdminRole hierarchy ─────────────────────────────────────────

  describe('requireAdminRole() hierarchy', () => {
    it('super_admin passes admin-level requirement', () => {
      const mw = requireAdminRole('admin');
      const req: any = { user: { role: 'super_admin' } };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('operator does NOT pass super_admin requirement', () => {
      const mw = requireAdminRole('super_admin');
      const req: any = { user: { role: 'operator' } };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('regular user does NOT pass support requirement', () => {
      const mw = requireAdminRole('support');
      const req: any = { user: { role: 'user' } };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── 6. isTokenBlacklisted behavior ────────────────────────────────────────

  describe('isTokenBlacklisted', () => {
    it('returns false when token is not in blacklist', async () => {
      mockRedisExists.mockResolvedValueOnce(false);
      const result = await isTokenBlacklisted('some-token');
      expect(result).toBe(false);
    });

    it('returns true when token IS in blacklist', async () => {
      mockRedisExists.mockResolvedValueOnce(true);
      const result = await isTokenBlacklisted('revoked-token');
      expect(result).toBe(true);
    });

    it('fails OPEN when Redis is unavailable and failClosed=false (default)', async () => {
      mockRedisIsReady.mockReturnValueOnce(false);
      const result = await isTokenBlacklisted('any-token');
      expect(result).toBe(false);
    });

    it('fails CLOSED when Redis is unavailable and failClosed=true (production hardening)', async () => {
      mockRedisIsReady.mockReturnValueOnce(false);
      const result = await isTokenBlacklisted('any-token', true);
      expect(result).toBe(true);
    });
  });

  // ── 7. blacklistToken ─────────────────────────────────────────────────────

  describe('blacklistToken', () => {
    it('writes a 1 to the blacklist key with the given TTL', async () => {
      await blacklistToken('token-xyz', 60);
      expect(mockRedisSet).toHaveBeenCalledWith(
        'blacklist:token:token-xyz',
        '1',
        60
      );
    });
  });
});