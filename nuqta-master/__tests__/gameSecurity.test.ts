/**
 * Game Security Test Suite
 *
 * Tests all security measures:
 * - Input validation
 * - Rate limiting
 * - Authentication guards
 * - Security middleware
 */

import { GameValidation, ValidationError } from '@/utils/gameValidation';
import { GameRateLimiter, GAME_RATE_LIMITS } from '@/utils/gameRateLimiter';
import { GameAuthGuard } from '@/utils/gameAuthGuard';
import { GameSecurityMiddleware } from '@/utils/gameSecurityMiddleware';

// Mock AsyncStorage with real storage so cross-method data persists
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(storage.get(key) || null)),
      setItem: jest.fn((key, value) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      multiGet: jest.fn((keys) =>
        Promise.resolve(keys.map(key => [key, storage.get(key) || null]))
      ),
      multiSet: jest.fn((pairs) => {
        pairs.forEach(([key, value]) => storage.set(key, value));
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach(key => storage.delete(key));
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
    },
    getItem: jest.fn((key) => Promise.resolve(storage.get(key) || null)),
    setItem: jest.fn((key, value) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys) =>
      Promise.resolve(keys.map(key => [key, storage.get(key) || null]))
    ),
    multiSet: jest.fn((pairs) => {
      pairs.forEach(([key, value]) => storage.set(key, value));
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach(key => storage.delete(key));
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
  };
});

describe('Game Security Tests', () => {
  // ==================== INPUT VALIDATION TESTS ====================

  describe('Input Validation', () => {
    describe('validateCoinAmount', () => {
      it('should accept valid coin amounts', () => {
        expect(() => GameValidation.validateCoinAmount(100)).not.toThrow();
        expect(() => GameValidation.validateCoinAmount(0)).not.toThrow();
        expect(() => GameValidation.validateCoinAmount(999999)).not.toThrow();
      });

      it('should reject negative amounts', () => {
        expect(() => GameValidation.validateCoinAmount(-1)).toThrow(ValidationError);
        expect(() => GameValidation.validateCoinAmount(-100)).toThrow(ValidationError);
      });

      it('should reject non-integer amounts', () => {
        expect(() => GameValidation.validateCoinAmount(10.5)).toThrow(ValidationError);
        expect(() => GameValidation.validateCoinAmount(99.99)).toThrow(ValidationError);
      });

      it('should reject amounts exceeding limit', () => {
        expect(() => GameValidation.validateCoinAmount(1000001)).toThrow(ValidationError);
      });

      it('should reject non-numeric values', () => {
        expect(() => GameValidation.validateCoinAmount('100' as any)).toThrow(ValidationError);
        expect(() => GameValidation.validateCoinAmount(null as any)).toThrow(ValidationError);
      });
    });

    describe('validateQuizAnswer', () => {
      it('should accept valid answers', () => {
        expect(() => GameValidation.validateQuizAnswer(0, 4)).not.toThrow();
        expect(() => GameValidation.validateQuizAnswer(3, 4)).not.toThrow();
      });

      it('should reject out-of-range answers', () => {
        expect(() => GameValidation.validateQuizAnswer(-1, 4)).toThrow(ValidationError);
        expect(() => GameValidation.validateQuizAnswer(4, 4)).toThrow(ValidationError);
        expect(() => GameValidation.validateQuizAnswer(10, 4)).toThrow(ValidationError);
      });

      it('should reject non-integer answers', () => {
        expect(() => GameValidation.validateQuizAnswer(1.5, 4)).toThrow(ValidationError);
      });
    });

    describe('validateUserId', () => {
      it('should accept valid MongoDB ObjectIds', () => {
        expect(() => GameValidation.validateUserId('507f1f77bcf86cd799439011')).not.toThrow();
        expect(() => GameValidation.validateUserId('123456789012345678901234')).not.toThrow();
      });

      it('should reject invalid ObjectIds', () => {
        expect(() => GameValidation.validateUserId('invalid')).toThrow(ValidationError);
        expect(() => GameValidation.validateUserId('12345')).toThrow(ValidationError);
        expect(() => GameValidation.validateUserId('')).toThrow(ValidationError);
      });

      it('should reject non-string values', () => {
        expect(() => GameValidation.validateUserId(123 as any)).toThrow(ValidationError);
        expect(() => GameValidation.validateUserId(null as any)).toThrow(ValidationError);
      });
    });

    describe('sanitizeString', () => {
      it('should remove script tags', () => {
        const dirty = '<script>alert("xss")</script>Hello';
        const clean = GameValidation.sanitizeString(dirty);
        expect(clean).not.toContain('<script>');
        expect(clean).toBe('Hello');
      });

      it('should remove HTML tags', () => {
        const dirty = '<div>Hello <b>World</b></div>';
        const clean = GameValidation.sanitizeString(dirty);
        expect(clean).toBe('Hello World');
      });

      it('should remove SQL injection attempts', () => {
        const dirty = "'; DROP TABLE users; --";
        const clean = GameValidation.sanitizeString(dirty);
        expect(clean).not.toContain('DROP TABLE');
      });

      it('should trim whitespace', () => {
        const dirty = '   Hello World   ';
        const clean = GameValidation.sanitizeString(dirty);
        expect(clean).toBe('Hello World');
      });
    });

    describe('sanitizeObject', () => {
      it('should sanitize string values', () => {
        const dirty = {
          name: '<script>alert("xss")</script>John',
          age: 25,
        };
        const clean = GameValidation.sanitizeObject(dirty);
        expect(clean.name).toBe('John');
        expect(clean.age).toBe(25);
      });

      it('should sanitize nested objects', () => {
        const dirty = {
          user: {
            name: '<b>John</b>',
            email: 'john@example.com',
          },
        };
        const clean = GameValidation.sanitizeObject(dirty);
        expect(clean.user.name).toBe('John');
      });

      it('should sanitize arrays', () => {
        const dirty = {
          tags: ['<script>tag1</script>', 'tag2'],
        };
        const clean = GameValidation.sanitizeObject(dirty);
        expect(clean.tags[0]).toBe('tag1');
        expect(clean.tags[1]).toBe('tag2');
      });
    });

    describe('validateCooldown', () => {
      it('should allow action when no previous action', () => {
        const result = GameValidation.validateCooldown(null, 5000);
        expect(result.isValid).toBe(true);
        expect(result.remainingMs).toBe(0);
      });

      it('should block action during cooldown', () => {
        const lastAction = Date.now() - 2000; // 2 seconds ago
        const result = GameValidation.validateCooldown(lastAction, 5000); // 5 second cooldown
        expect(result.isValid).toBe(false);
        expect(result.remainingMs).toBeGreaterThan(0);
      });

      it('should allow action after cooldown', () => {
        const lastAction = Date.now() - 6000; // 6 seconds ago
        const result = GameValidation.validateCooldown(lastAction, 5000); // 5 second cooldown
        expect(result.isValid).toBe(true);
        expect(result.remainingMs).toBe(0);
      });
    });
  });

  // ==================== RATE LIMITING TESTS ====================

  describe('Rate Limiting', () => {
    let rateLimiter: GameRateLimiter;
    const testUserId = '507f1f77bcf86cd799439011';
    const testAction = 'TEST_ACTION';

    beforeEach(() => {
      rateLimiter = new GameRateLimiter();
    });

    afterEach(async () => {
      await rateLimiter.clearAll();
    });

    it('should allow first attempt', async () => {
      const result = await rateLimiter.checkRateLimit(testUserId, testAction);
      expect(result.allowed).toBe(true);
    });

    it('should enforce cooldown between attempts', async () => {
      // First attempt
      await rateLimiter.recordAttempt(testUserId, testAction);

      // Immediate second attempt
      const result = await rateLimiter.checkRateLimit(testUserId, testAction);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('COOLDOWN');
    });

    it('should track remaining attempts', async () => {
      const config = {
        maxAttempts: 3,
        windowMs: 60000,
        cooldownMs: 100,
      };

      let result = await rateLimiter.checkRateLimit(testUserId, testAction, config);
      expect(result.remainingAttempts).toBe(2); // 3 - 1

      await rateLimiter.recordAttempt(testUserId, testAction);

      // Wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, 150));

      result = await rateLimiter.checkRateLimit(testUserId, testAction, config);
      expect(result.remainingAttempts).toBe(1); // 3 - 2
    });

    it('should block after max attempts exceeded', async () => {
      const config = {
        maxAttempts: 2,
        windowMs: 60000,
        cooldownMs: 100,
      };

      // First attempt
      await rateLimiter.recordAttempt(testUserId, testAction);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second attempt
      await rateLimiter.recordAttempt(testUserId, testAction);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third attempt should be blocked
      const result = await rateLimiter.checkRateLimit(testUserId, testAction, config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('MAX_ATTEMPTS_EXCEEDED');
    });

    it('should format remaining time correctly', () => {
      expect(rateLimiter.formatRemainingTime(0)).toBe('Now');
      expect(rateLimiter.formatRemainingTime(30000)).toBe('30s');
      expect(rateLimiter.formatRemainingTime(90000)).toBe('1m 30s');
      expect(rateLimiter.formatRemainingTime(3700000)).toBe('1h 1m');
      expect(rateLimiter.formatRemainingTime(90000000)).toBe('1d 1h');
    });

    it('should reset rate limit', async () => {
      await rateLimiter.recordAttempt(testUserId, testAction);
      await rateLimiter.resetRateLimit(testUserId, testAction);

      const result = await rateLimiter.checkRateLimit(testUserId, testAction);
      expect(result.allowed).toBe(true);
    });
  });

  // ==================== AUTHENTICATION TESTS ====================

  describe('Authentication Guard', () => {
    let authGuard: GameAuthGuard;

    beforeEach(() => {
      authGuard = new GameAuthGuard();
    });

    afterEach(async () => {
      await authGuard.clearAuth();
    });

    it('should detect missing token', async () => {
      const result = await authGuard.isAuthenticated();
      expect(result.isAuthenticated).toBe(false);
      expect(result.reason).toBe('NO_TOKEN');
    });

    it('should validate JWT structure', async () => {
      expect(await authGuard.validateToken('invalid')).toBe(false);
      expect(await authGuard.validateToken('not.a.jwt')).toBe(false);
    });

    it('should validate JWT with 3 parts', async () => {
      const validJWT = 'header.payload.signature';
      // This should fail because payload is not valid base64 JSON
      expect(await authGuard.validateToken(validJWT)).toBe(false);
    });
  });

  // ==================== SECURITY MIDDLEWARE TESTS ====================

  describe('Security Middleware', () => {
    let securityMiddleware: GameSecurityMiddleware;
    const testUserId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
      securityMiddleware = new GameSecurityMiddleware();
    });

    afterEach(async () => {
      await securityMiddleware.clearSuspiciousActivities(testUserId);
    });

    it('should log suspicious activity', async () => {
      await securityMiddleware.logSuspiciousActivity(
        testUserId,
        'TEST_ACTIVITY',
        { test: true },
        'medium'
      );

      const isSuspicious = await securityMiddleware.checkSuspiciousActivity(testUserId);
      expect(isSuspicious).toBe(false); // Not enough activities yet
    });

    it('should flag user after multiple suspicious activities', async () => {
      // Log 5 suspicious activities (threshold)
      for (let i = 0; i < 5; i++) {
        await securityMiddleware.logSuspiciousActivity(
          testUserId,
          'SUSPICIOUS_ACTION',
          { count: i },
          'medium'
        );
      }

      const isSuspicious = await securityMiddleware.checkSuspiciousActivity(testUserId);
      expect(isSuspicious).toBe(true);
    });

    it('should sanitize API requests', () => {
      const dirty = {
        name: '<script>alert("xss")</script>',
        amount: 100,
      };
      const clean = securityMiddleware.sanitizeRequest(dirty);
      expect(clean.name).not.toContain('<script>');
    });

    it('should create game session', async () => {
      const session = await securityMiddleware.createGameSession(testUserId, 'spin-wheel');

      expect(session.userId).toBe(testUserId);
      expect(session.gameId).toBe('spin-wheel');
      expect(session.sessionId).toBeTruthy();
      expect(session.serverSeed).toBeTruthy();
      expect(session.startTime).toBeTruthy();
    });

    it('should verify game results', async () => {
      const session = await securityMiddleware.createGameSession(testUserId, 'test-game');

      // Valid result
      const validResult = { coinsEarned: 100 };
      const validVerification = await securityMiddleware.verifyGameResult(
        session.sessionId,
        validResult
      );
      expect(validVerification.isValid).toBe(true);

      // Wait a moment for timing
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Suspicious result (too many coins)
      const suspiciousResult = { coinsEarned: 50000 };
      const suspiciousVerification = await securityMiddleware.verifyGameResult(
        session.sessionId,
        suspiciousResult
      );
      expect(suspiciousVerification.isValid).toBe(false);
      expect(suspiciousVerification.reason).toBe('SUSPICIOUS_REWARD_AMOUNT');
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    it('should perform complete security check', async () => {
      const securityMiddleware = new GameSecurityMiddleware();
      const testUserId = '507f1f77bcf86cd799439011';

      const result = await securityMiddleware.performSecurityCheck(
        testUserId,
        'TEST_ACTION',
        { amount: 100 }
      );

      // Should fail due to no authentication in test environment
      expect(result.allowed).toBe(false);
    });
  });
});
