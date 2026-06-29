import crypto from 'crypto';

describe('Security Fixes', () => {
  describe('OTP HMAC Storage', () => {
    it('stored OTP value is HMAC not plaintext', async () => {
      // Mock redis.set to capture what's stored
      const storedValues: string[] = [];
      jest.spyOn(require('../config/redis').redis, 'set').mockImplementation(
        async (_key: string, value: string) => { storedValues.push(value); return 'OK'; }
      );
      jest.spyOn(require('../config/redis').redis, 'get').mockResolvedValue('1');
      jest.spyOn(require('../config/redis').redis, 'incr').mockResolvedValue(1);
      jest.spyOn(require('../config/redis').redis, 'expire').mockResolvedValue(1);
      jest.spyOn(require('../config/redis').redis, 'exists').mockResolvedValue(0);

      process.env.OTP_HMAC_SECRET = 'test-hmac-secret';
      const otpService = require('../services/otpService');
      await otpService.sendOTP('9876543210');

      // The stored value should be a 64-char hex string (SHA256 HMAC), not a 6-digit number
      const otpStoredValue = storedValues.find(v => v.length === 64);
      expect(otpStoredValue).toBeDefined();
      expect(otpStoredValue).toMatch(/^[a-f0-9]{64}$/);
    });

    it('throws if OTP_HMAC_SECRET is not set', () => {
      const savedSecret = process.env.OTP_HMAC_SECRET;
      delete (process.env as any).OTP_HMAC_SECRET;

      // hashOTP is not exported — verify via verifyOTP path indirectly by checking
      // that the error propagates through the module
      jest.spyOn(require('../config/redis').redis, 'exists').mockResolvedValue(0);
      jest.spyOn(require('../config/redis').redis, 'get').mockResolvedValue('somehash');

      const otpService = require('../services/otpService');
      expect(() => {
        // hashOTP is called inside verifyOTP — trigger it
        otpService.verifyOTP('9876543210', '123456');
      }).rejects.toThrow('OTP_HMAC_SECRET');

      process.env.OTP_HMAC_SECRET = savedSecret;
    });
  });

  describe('Timing-safe Internal Token', () => {
    it('uses crypto.timingSafeEqual', () => {
      const spy = jest.spyOn(crypto, 'timingSafeEqual');
      // Reset module registry so the import gets a fresh module
      jest.resetModules();
      const { requireInternalToken } = require('../middleware/internalAuth');
      const req = { headers: { 'x-internal-token': 'wrong-token', 'x-internal-service': 'rez-auth-service' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      process.env.INTERNAL_SERVICE_TOKENS_JSON = JSON.stringify({ 'rez-auth-service': 'correct-token' });
      requireInternalToken(req, res, next);
      expect(spy).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for wrong token', () => {
      jest.resetModules();
      const { requireInternalToken } = require('../middleware/internalAuth');
      const req = { headers: { 'x-internal-token': 'bad', 'x-internal-service': 'rez-auth-service' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      process.env.INTERNAL_SERVICE_TOKENS_JSON = JSON.stringify({ 'rez-auth-service': 'correct-token' });
      requireInternalToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() for correct token', () => {
      jest.resetModules();
      const { requireInternalToken } = require('../middleware/internalAuth');
      const req = { headers: { 'x-internal-token': 'correct-token', 'x-internal-service': 'rez-auth-service' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      process.env.INTERNAL_SERVICE_TOKENS_JSON = JSON.stringify({ 'rez-auth-service': 'correct-token' });
      requireInternalToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 503 when INTERNAL_SERVICE_TOKENS_JSON is not configured', () => {
      jest.resetModules();
      const savedTokens = process.env.INTERNAL_SERVICE_TOKENS_JSON;
      delete (process.env as any).INTERNAL_SERVICE_TOKENS_JSON;
      const { requireInternalToken } = require('../middleware/internalAuth');
      const req = { headers: { 'x-internal-service': 'rez-auth-service' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      requireInternalToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
      process.env.INTERNAL_SERVICE_TOKENS_JSON = savedTokens;
    });
  });

  describe('Token blacklist fail-closed', () => {
    it('denies token when both Redis and MongoDB fail during blacklist check', async () => {
      jest.resetModules();

      // Mock redis to throw a connection error
      jest.mock('../config/redis', () => ({
        redis: {
          exists: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        },
      }));

      // Mock mongoose connection to also fail
      jest.mock('mongoose', () => ({
        connection: {
          collection: jest.fn().mockReturnValue({
            findOne: jest.fn().mockRejectedValue(new Error('MongoNetworkError')),
          }),
        },
        Types: { ObjectId: jest.fn().mockImplementation(id => id) },
      }));

      const { validateToken } = require('../services/tokenService');

      // A valid-looking token structure — it will fail at the verification step
      // after the blacklist check, but we want to confirm the error from the
      // MongoDB fallback failure path is "Authentication service temporarily unavailable"
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NiIsInJvbGUiOiJjb25zdW1lciIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.fake';

      await expect(validateToken(fakeToken)).rejects.toThrow('Authentication service temporarily unavailable');
    });
  });
});
