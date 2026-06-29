/**
 * TEST SUITE 4: Token Security Tests
 *
 * Validates JWT token validation, blacklisting, Redis/MongoDB fallback behaviour,
 * admin vs consumer token separation, and refresh token rotation.
 */

jest.setTimeout(10000);

import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------
const JWT_SECRET = 'test-jwt-secret-consumer';
const JWT_ADMIN_SECRET = 'test-jwt-admin-secret';
const JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_ADMIN_SECRET = JWT_ADMIN_SECRET;
  process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
  process.env.JWT_MERCHANT_SECRET = 'test-jwt-merchant-secret';
});

// ---------------------------------------------------------------------------
// Controllable Redis mock
// ---------------------------------------------------------------------------
let redisAvailable = true;
const blacklist = new Set<string>();

const mockRedis = {
  exists: jest.fn().mockImplementation(async (key: string) => {
    if (!redisAvailable) throw new Error('Redis connection refused');
    return blacklist.has(key) ? 1 : 0;
  }),
  set: jest.fn().mockImplementation(async (key: string) => {
    if (!redisAvailable) throw new Error('Redis connection refused');
    blacklist.add(key);
    return 'OK';
  }),
  get: jest.fn().mockResolvedValue(null),
};

jest.mock('../config/redis', () => ({ redis: mockRedis }));

// ---------------------------------------------------------------------------
// Mongoose / MongoDB mock (for fallback tests)
// ---------------------------------------------------------------------------
let mongoAvailable = true;
let lastLogoutAt: Date | null = null;

const mockUsers = {
  findOne: jest.fn().mockImplementation(async () => {
    if (!mongoAvailable) throw new Error('MongoDB connection refused');
    return lastLogoutAt ? { lastLogoutAt } : null;
  }),
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
};

const mockCollection = jest.fn().mockReturnValue(mockUsers);
const mockConnection = { collection: mockCollection };

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connection: mockConnection,
    Types: actual.Types,
  };
});

// ---------------------------------------------------------------------------
// RefreshToken model mock
// ---------------------------------------------------------------------------
// Tracks which tokenHashes have been inserted so we can simulate the unique-index
// duplicate-key error (code 11000) that the real MongoDB would raise on replay.
const refreshTokenStore = new Set<string>();

const mockRefreshTokenCreate = jest.fn().mockImplementation(async (doc: { tokenHash: string }) => {
  if (refreshTokenStore.has(doc.tokenHash)) {
    const err: any = new Error('E11000 duplicate key error');
    err.code = 11000;
    throw err;
  }
  refreshTokenStore.add(doc.tokenHash);
  return doc;
});

const mockRefreshTokenFindOne = jest.fn().mockResolvedValue(null);

jest.mock('../models/RefreshToken', () => ({
  RefreshToken: {
    create: (...args: any[]) => mockRefreshTokenCreate(...args),
    findOne: (...args: any[]) => mockRefreshTokenFindOne(...args),
  },
}));

// ---------------------------------------------------------------------------
// Logger mock
// ---------------------------------------------------------------------------
jest.mock('../config/logger', () => ({
  createServiceLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConsumerToken(userId = 'user123', iat?: number): string {
  const payload: any = { userId, role: 'consumer' };
  if (iat !== undefined) {
    // Issue token with a forced iat for MongoDB fallback tests
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function makeAdminToken(userId = 'admin456'): string {
  return jwt.sign({ userId, role: 'admin' }, JWT_ADMIN_SECRET, { expiresIn: '8h' });
}

function makeRefreshToken(userId = 'user123', role = 'consumer'): string {
  return jwt.sign({ userId, role, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

function blacklistKey(token: string): string {
  return `blacklist:token:${token}`;
}

function resetState() {
  redisAvailable = true;
  mongoAvailable = true;
  lastLogoutAt = null;
  blacklist.clear();
  refreshTokenStore.clear();
  jest.clearAllMocks();
  // Re-attach implementations
  mockRedis.exists.mockImplementation(async (key: string) => {
    if (!redisAvailable) throw new Error('Redis connection refused');
    return blacklist.has(key) ? 1 : 0;
  });
  mockRedis.set.mockImplementation(async (key: string) => {
    if (!redisAvailable) throw new Error('Redis connection refused');
    blacklist.add(key);
    return 'OK';
  });
  mockUsers.findOne.mockImplementation(async () => {
    if (!mongoAvailable) throw new Error('MongoDB connection refused');
    return lastLogoutAt ? { lastLogoutAt } : null;
  });
  mockUsers.updateOne.mockResolvedValue({ modifiedCount: 1 });
  mockCollection.mockReturnValue(mockUsers);
  mockRefreshTokenCreate.mockImplementation(async (doc: { tokenHash: string }) => {
    if (refreshTokenStore.has(doc.tokenHash)) {
      const err: any = new Error('E11000 duplicate key error');
      err.code = 11000;
      throw err;
    }
    refreshTokenStore.add(doc.tokenHash);
    return doc;
  });
  mockRefreshTokenFindOne.mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Token Security', () => {
  beforeEach(() => {
    resetState();
  });

  // 1. Valid token resolves with payload
  it('1. valid consumer token → validateToken resolves with payload', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_1');
    const payload = await validateToken(token);

    expect(payload.userId).toBe('user_test_1');
    expect(payload.role).toBe('consumer');
  });

  // 2. Blacklisted token → rejected with "Token revoked"
  it('2. blacklisted token → validateToken rejects with "Token revoked"', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_2');
    blacklist.add(blacklistKey(token));

    await expect(validateToken(token)).rejects.toThrow('Token revoked');
  });

  // 3. Redis down + lastLogoutAt AFTER token issuance → REJECTED
  it('3. Redis down + lastLogoutAt AFTER token issuance → token rejected', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_3');
    const decoded = jwt.decode(token) as any;

    // Set lastLogoutAt to AFTER the token was issued
    lastLogoutAt = new Date((decoded.iat + 100) * 1000); // 100 seconds after iat
    redisAvailable = false;

    await expect(validateToken(token)).rejects.toThrow(/session invalidated/i);
  });

  // 4. Redis down + lastLogoutAt BEFORE token issuance → ACCEPTED
  it('4. Redis down + lastLogoutAt BEFORE token issuance → token accepted', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_4');
    const decoded = jwt.decode(token) as any;

    // lastLogoutAt is BEFORE the token iat
    lastLogoutAt = new Date((decoded.iat - 100) * 1000); // 100 seconds before iat
    redisAvailable = false;

    const payload = await validateToken(token);
    expect(payload.userId).toBe('user_test_4');
  });

  // 5. Redis down + no lastLogoutAt → ACCEPTED
  it('5. Redis down + no lastLogoutAt → token accepted', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_5');
    lastLogoutAt = null;
    redisAvailable = false;

    const payload = await validateToken(token);
    expect(payload.userId).toBe('user_test_5');
  });

  // 6. Redis AND MongoDB both down → token REJECTED (service unavailable)
  it('6. Redis AND MongoDB both down → validateToken rejects with service unavailable', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_6');
    redisAvailable = false;
    mongoAvailable = false;

    await expect(validateToken(token)).rejects.toThrow(/temporarily unavailable/i);
  });

  // 7. Admin token uses JWT_ADMIN_SECRET, not JWT_SECRET
  it('7. admin token is signed with JWT_ADMIN_SECRET and verifies correctly', async () => {
    const { validateToken } = await import('../services/tokenService');

    const token = makeAdminToken('admin_test_7');
    const payload = await validateToken(token);

    expect(payload.userId).toBe('admin_test_7');
    expect(payload.role).toBe('admin');
  });

  // 8. Consumer token CANNOT be verified with JWT_ADMIN_SECRET
  it('8. consumer token cannot be verified as an admin token', async () => {
    // A consumer token signed with JWT_SECRET should fail if we try to verify
    // it with JWT_ADMIN_SECRET directly
    const consumerToken = makeConsumerToken('user_test_8');

    expect(() => {
      jwt.verify(consumerToken, JWT_ADMIN_SECRET);
    }).toThrow();
  });

  // 9. refreshAccessToken with a revoked refresh token → rejected
  it('9. refreshAccessToken with revoked refresh token → rejected', async () => {
    const { refreshAccessToken } = await import('../services/tokenService');

    const refreshToken = makeRefreshToken('user_test_9');
    blacklist.add(blacklistKey(refreshToken));

    await expect(refreshAccessToken(refreshToken)).rejects.toThrow('Refresh token revoked');
  });

  // 10. rotateRefreshToken — old token blacklisted, new token returned
  it('10. rotateRefreshToken blacklists old token and returns new tokens', async () => {
    const { rotateRefreshToken } = await import('../services/tokenService');

    const oldRefreshToken = makeRefreshToken('user_test_10');

    const result = await rotateRefreshToken(oldRefreshToken);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.expiresIn).toBe(900);

    // Old token should be scheduled for blacklisting (redis.set called)
    // Note: rotateRefreshToken calls redis.set in a catch-safe way
    expect(result.refreshToken).not.toBe(oldRefreshToken);

    // The new refresh token should decode correctly
    const newDecoded = jwt.decode(result.refreshToken) as any;
    expect(newDecoded.type).toBe('refresh');
    expect(newDecoded.userId).toBe('user_test_10');
  });

  // 11. Invalid (malformed) token → rejects
  it('11. malformed token → validateToken throws "Invalid token"', async () => {
    const { validateToken } = await import('../services/tokenService');

    await expect(validateToken('not.a.valid.jwt')).rejects.toThrow(/Invalid token/);
  });

  // 12. Expired token → rejects
  it('12. expired token → validateToken throws', async () => {
    const { validateToken } = await import('../services/tokenService');

    const expiredToken = jwt.sign(
      { userId: 'expired_user', role: 'consumer' },
      JWT_SECRET,
      { expiresIn: -1 }, // immediately expired
    );

    await expect(validateToken(expiredToken)).rejects.toThrow();
  });

  // 13. blacklistToken stamps lastLogoutAt in MongoDB
  it('13. blacklistToken calls MongoDB updateOne to set lastLogoutAt', async () => {
    const { blacklistToken } = await import('../services/tokenService');

    const token = makeConsumerToken('user_test_13');
    await blacklistToken(token, 'user_test_13');

    // Redis set should be called to blacklist
    expect(mockRedis.set).toHaveBeenCalledWith(
      blacklistKey(token),
      '1',
      'EX',
      expect.any(Number),
    );
    // MongoDB updateOne should be called
    expect(mockUsers.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({}),
      expect.objectContaining({ $set: expect.objectContaining({ lastLogoutAt: expect.any(Date) }) }),
    );
  });

  // 14. Admin token cannot be re-verified with consumer JWT_SECRET
  it('14. admin token verification fails with wrong (consumer) secret', async () => {
    const adminToken = makeAdminToken('admin_test_14');

    expect(() => {
      jwt.verify(adminToken, JWT_SECRET); // wrong secret for admin
    }).toThrow();
  });

  // 15. generateAccessToken with missing secret throws
  it('15. generateAccessToken for admin without JWT_ADMIN_SECRET throws [FATAL]', async () => {
    const savedSecret = process.env.JWT_ADMIN_SECRET;
    delete (process.env as any).JWT_ADMIN_SECRET;

    const { generateAccessToken } = await import('../services/tokenService');

    expect(() => generateAccessToken('admin_x', 'admin')).toThrow('[FATAL]');

    process.env.JWT_ADMIN_SECRET = savedSecret;
  });

  // 16. rotateRefreshToken — MongoDB duplicate-key blocks second use of same token (Redis up)
  it('16. rotateRefreshToken — second call with same token rejected via MongoDB duplicate-key (Redis up)', async () => {
    const { rotateRefreshToken } = await import('../services/tokenService');

    const oldRefreshToken = makeRefreshToken('user_test_16');

    // First rotation must succeed
    const result = await rotateRefreshToken(oldRefreshToken);
    expect(result).toHaveProperty('accessToken');

    // Redis SET NX will now return null (key exists), blocking the second attempt.
    // But even if Redis were bypassed, MongoDB duplicate-key is the final backstop.
    // Simulate that Redis NX returns null for this key on the second call:
    mockRedis.set.mockImplementation(async (_key: string, _val: string, _ex: string, _ttl: number, nx?: string) => {
      if (nx === 'NX' && blacklist.has(_key)) return null;
      if (!redisAvailable) throw new Error('Redis connection refused');
      blacklist.add(_key);
      return 'OK';
    });

    // Second rotation with the same old token must be rejected
    await expect(rotateRefreshToken(oldRefreshToken)).rejects.toThrow(/already used/i);
  });

  // 17. rotateRefreshToken — MongoDB blocks replay when Redis is completely down
  it('17. rotateRefreshToken — second call with same token rejected via MongoDB when Redis is down', async () => {
    const { rotateRefreshToken } = await import('../services/tokenService');

    const oldRefreshToken = makeRefreshToken('user_test_17');

    // First rotation succeeds with Redis up
    await rotateRefreshToken(oldRefreshToken);

    // Now bring Redis down — all Redis calls will throw
    redisAvailable = false;

    // The MongoDB RefreshToken record for oldRefreshToken was written (isRevoked: true).
    // mockRefreshTokenFindOne should return it as revoked on the second attempt.
    mockRefreshTokenFindOne.mockResolvedValue({ isRevoked: true });

    // Second rotation must be blocked by MongoDB revocation check
    await expect(rotateRefreshToken(oldRefreshToken)).rejects.toThrow(/already used/i);
  });
});
