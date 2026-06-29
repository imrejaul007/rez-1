/**
 * TEST SUITE 3: OTP Security Tests
 *
 * Validates that OTP is HMAC-hashed before storage, rate limiting works correctly,
 * lockout fires after max failures, and Redis unavailability causes fail-closed behaviour.
 */

jest.setTimeout(10000);

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Redis mock — controllable in-memory store
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};
let redisAvailable = true;

function makeRedisError() {
  return new Error('Redis connection refused');
}

const mockRedis = {
  incr: jest.fn().mockImplementation(async (key: string) => {
    if (!redisAvailable) throw makeRedisError();
    store[key] = String((parseInt(store[key] || '0', 10) || 0) + 1);
    return parseInt(store[key], 10);
  }),
  expire: jest.fn().mockImplementation(async () => {
    if (!redisAvailable) throw makeRedisError();
    return 1;
  }),
  exists: jest.fn().mockImplementation(async (key: string) => {
    if (!redisAvailable) throw makeRedisError();
    return store[key] !== undefined ? 1 : 0;
  }),
  get: jest.fn().mockImplementation(async (key: string) => {
    if (!redisAvailable) throw makeRedisError();
    return store[key] ?? null;
  }),
  set: jest.fn().mockImplementation(async (key: string, value: string) => {
    if (!redisAvailable) throw makeRedisError();
    store[key] = value;
    return 'OK';
  }),
  del: jest.fn().mockImplementation(async (...keys: string[]) => {
    if (!redisAvailable) throw makeRedisError();
    keys.forEach((k) => delete store[k]);
    return keys.length;
  }),
};

jest.mock('../config/redis', () => ({ redis: mockRedis }));

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
// BullMQ Queue mock — suppress actual SMS queue
// ---------------------------------------------------------------------------
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  Object.keys(store).forEach((k) => delete store[k]);
}

function hmac(otp: string, phone: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${phone}:${otp}`).digest('hex');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OTP Security', () => {
  const PHONE = '9876543210';
  const COUNTRY_CODE = '+91';
  const FULL_PHONE = `${COUNTRY_CODE}${PHONE}`;
  const TEST_SECRET = 'test-secret-abc123';

  beforeAll(() => {
    process.env.OTP_HMAC_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    clearStore();
    redisAvailable = true;
    jest.clearAllMocks();
    // Re-attach implementations
    mockRedis.incr.mockImplementation(async (key: string) => {
      if (!redisAvailable) throw makeRedisError();
      store[key] = String((parseInt(store[key] || '0', 10) || 0) + 1);
      return parseInt(store[key], 10);
    });
    mockRedis.expire.mockImplementation(async () => {
      if (!redisAvailable) throw makeRedisError();
      return 1;
    });
    mockRedis.exists.mockImplementation(async (key: string) => {
      if (!redisAvailable) throw makeRedisError();
      return store[key] !== undefined ? 1 : 0;
    });
    mockRedis.get.mockImplementation(async (key: string) => {
      if (!redisAvailable) throw makeRedisError();
      return store[key] ?? null;
    });
    mockRedis.set.mockImplementation(async (key: string, value: string) => {
      if (!redisAvailable) throw makeRedisError();
      store[key] = value;
      return 'OK';
    });
    mockRedis.del.mockImplementation(async (...keys: string[]) => {
      if (!redisAvailable) throw makeRedisError();
      keys.forEach((k) => delete store[k]);
      return keys.length;
    });
  });

  // 1. sendOTP stores HMAC (64-char hex), not the raw 6-digit OTP
  it('1. sendOTP stores a 64-char HMAC hex string, NOT the raw 6-digit OTP', async () => {
    const { sendOTP } = await import('../services/otpService');

    const result = await sendOTP(PHONE, COUNTRY_CODE);
    expect(result.success).toBe(true);

    // Find the value stored under the otp: key
    const otpKey = `otp:${FULL_PHONE}`;
    const storedValue = store[otpKey];

    expect(storedValue).toBeDefined();
    // Must be 64 hex chars (SHA-256 HMAC output)
    expect(storedValue).toMatch(/^[a-f0-9]{64}$/);
    // Must NOT be a 6-digit plain OTP
    expect(storedValue).not.toMatch(/^\d{6}$/);
  });

  // 2. verifyOTP returns true for the correct OTP
  it('2. verifyOTP returns true for the correct OTP', async () => {
    const { sendOTP, verifyOTP } = await import('../services/otpService');

    // Intercept the OTP that gets stored
    let capturedOtp: string | null = null;
    const originalSet = mockRedis.set;
    mockRedis.set.mockImplementation(async (key: string, value: string, ...rest: any[]) => {
      if (key.startsWith('otp:')) {
        // We need to capture the OTP before it's hashed
        // We do this by intercepting crypto.createHmac — but simpler: store the hash
        // and brute-force from known range. Instead, spy on the randomInt.
      }
      return originalSet(key, value, ...rest);
    });

    // Patch crypto.randomInt to return a known OTP
    const knownOtp = '123456';
    jest.spyOn(crypto, 'randomInt').mockReturnValue(parseInt(knownOtp, 10) as any);

    await sendOTP(PHONE, COUNTRY_CODE);

    const result = await verifyOTP(PHONE, knownOtp, COUNTRY_CODE);
    expect(result).toBe(true);
  });

  // 3. verifyOTP returns false for a wrong OTP
  it('3. verifyOTP returns false for a wrong OTP', async () => {
    const { sendOTP, verifyOTP } = await import('../services/otpService');

    jest.spyOn(crypto, 'randomInt').mockReturnValue(654321 as any);
    await sendOTP(PHONE, COUNTRY_CODE);

    const result = await verifyOTP(PHONE, '000000', COUNTRY_CODE);
    expect(result).toBe(false);
  });

  // 4. verifyOTP returns false after correct OTP is consumed (deleted from Redis)
  it('4. verifyOTP returns false after correct OTP is used (deleted)', async () => {
    const { sendOTP, verifyOTP } = await import('../services/otpService');

    const knownOtp = '789012';
    jest.spyOn(crypto, 'randomInt').mockReturnValue(parseInt(knownOtp, 10) as any);
    await sendOTP(PHONE, COUNTRY_CODE);

    // First use — should succeed
    const first = await verifyOTP(PHONE, knownOtp, COUNTRY_CODE);
    expect(first).toBe(true);

    // OTP key is deleted on success; store should no longer have it
    expect(store[`otp:${FULL_PHONE}`]).toBeUndefined();

    // Second use of same OTP — should fail
    const second = await verifyOTP(PHONE, knownOtp, COUNTRY_CODE);
    expect(second).toBe(false);
  });

  // 5. Rate limiting: 5 OTPs in 15min succeeds, 6th fails
  it('5. 5 OTP requests succeed; 6th is rate-limited', async () => {
    const { sendOTP } = await import('../services/otpService');

    for (let i = 0; i < 5; i++) {
      const result = await sendOTP(PHONE, COUNTRY_CODE);
      expect(result.success).toBe(true);
    }

    // 6th request — rate counter is now 6, exceeds MAX_OTP_PER_WINDOW (5)
    const sixth = await sendOTP(PHONE, COUNTRY_CODE);
    expect(sixth.success).toBe(false);
    expect(sixth.message).toMatch(/Too many OTP requests/i);
  });

  // 6. Lockout after MAX_FAIL_ATTEMPTS (5) wrong verifications
  it('6. Phone is locked after 5 consecutive wrong verifications', async () => {
    const { sendOTP, verifyOTP } = await import('../services/otpService');

    jest.spyOn(crypto, 'randomInt').mockReturnValue(111111 as any);
    await sendOTP(PHONE, COUNTRY_CODE);

    // 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await verifyOTP(PHONE, '000000', COUNTRY_CODE);
    }

    // Lock key should now exist
    const lockKey = `otp-lock:${FULL_PHONE}`;
    expect(store[lockKey]).toBeDefined();

    // sendOTP should report locked
    const lockedResult = await sendOTP(PHONE, COUNTRY_CODE);
    expect(lockedResult.success).toBe(false);
    expect(lockedResult.message).toMatch(/locked/i);
  });

  // 7. Redis unavailable → sendOTP returns { success: false } (fail-closed)
  it('7. Redis unavailable → sendOTP returns success:false', async () => {
    redisAvailable = false;
    const { sendOTP } = await import('../services/otpService');

    const result = await sendOTP(PHONE, COUNTRY_CODE);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unavailable|temporarily/i);
  });

  // 8. Missing OTP_HMAC_SECRET env var → throws [FATAL]
  it('8. Missing OTP_HMAC_SECRET throws a [FATAL] error', async () => {
    const savedSecret = process.env.OTP_HMAC_SECRET;
    delete (process.env as any).OTP_HMAC_SECRET;

    // hashOTP is called during verifyOTP when checking the stored hash
    // We store a hash value in Redis and then attempt verify, which calls hashOTP
    store[`otp:${FULL_PHONE}`] = 'some-stored-hash';

    const { verifyOTP } = await import('../services/otpService');

    await expect(verifyOTP(PHONE, '123456', COUNTRY_CODE)).rejects.toThrow('[FATAL]');

    process.env.OTP_HMAC_SECRET = savedSecret;
  });

  // 9. HMAC is phone-scoped (OTP for one phone cannot verify another)
  it('9. OTP for one phone cannot verify a different phone', async () => {
    const { sendOTP, verifyOTP } = await import('../services/otpService');

    const knownOtp = '555555';
    jest.spyOn(crypto, 'randomInt').mockReturnValue(parseInt(knownOtp, 10) as any);
    await sendOTP(PHONE, COUNTRY_CODE);

    // Attempt to verify the same OTP code against a different phone
    const wrongPhone = '1111111111';
    const result = await verifyOTP(wrongPhone, knownOtp, COUNTRY_CODE);
    expect(result).toBe(false);
  });

  // 10. Stored HMAC is bound to the exact phone:OTP combination
  it('10. HMAC stored in Redis matches expected HMAC computation', async () => {
    const { sendOTP } = await import('../services/otpService');

    const knownOtp = '246810';
    jest.spyOn(crypto, 'randomInt').mockReturnValue(parseInt(knownOtp, 10) as any);
    await sendOTP(PHONE, COUNTRY_CODE);

    const otpKey = `otp:${FULL_PHONE}`;
    const storedHash = store[otpKey];

    const expectedHash = hmac(knownOtp, FULL_PHONE, TEST_SECRET);
    expect(storedHash).toBe(expectedHash);
  });
});
