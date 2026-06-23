/**
 * EmailService Tests (ITER14)
 *
 * Tests for src/services/EmailService.ts
 *
 * ITER14 fix:
 *   - Dev mode: log ONLY subject + recipient + body length, NEVER the body
 *     (so OTPs / password reset tokens / PII don't end up in dev logs).
 *   - Prod: if SendGrid key missing, THROW — never silently drop customer
 *     emails. Configured-but-invalid key also throws.
 *
 * Note: the module reads SENDGRID_API_KEY at import time. We can't easily
 * reset the module's internal flag between tests without jest.isolateModules,
 * which we use to test each scenario in isolation.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Track every log call so we can verify PII never leaks
const loggedInfo: Array<{ args: any[] }> = [];
const loggedError: Array<{ args: any[] }> = [];

jest.mock('../config/logger', () => ({
  logger: {
    info: (...args: any[]) => loggedInfo.push({ args }),
    warn: () => {},
    error: (...args: any[]) => loggedError.push({ args }),
    debug: () => {},
  },
  createServiceLogger: () => ({
    info: (...args: any[]) => loggedInfo.push({ args }),
    warn: () => {},
    error: (...args: any[]) => loggedError.push({ args }),
    debug: () => {},
  }),
}));

// Mock SendGrid — never actually call out
const mockSgMailSend = jest.fn();
jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: (...args: any[]) => mockSgMailSend(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Helper to check whether the body PII leaked into any log call.
 * Walks the log args deeply and looks for the marker substring.
 */
function logCallsContainPII(marker: string): boolean {
  const all = [...loggedInfo, ...loggedError];
  return all.some(({ args }) =>
    args.some(arg => {
      if (typeof arg === 'string') return arg.includes(marker);
      if (arg && typeof arg === 'object') {
        try {
          return JSON.stringify(arg).includes(marker);
        } catch {
          return false;
        }
      }
      return false;
    })
  );
}

// ─── Test suites — each in its own isolateModules so SENDGRID_API_KEY is fresh ──

describe('EmailService (ITER14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loggedInfo.length = 0;
    loggedError.length = 0;
  });

  // ── Test 1: prod + no key → throws (NEVER silently drop) ───────────────────

  describe('Production + SendGrid NOT configured', () => {
    let EmailService: any;
    beforeAll(() => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        delete process.env.SENDGRID_API_KEY;
        // require fresh so module re-reads env
        EmailService = require('./EmailService').EmailService;
      });
    });

    it('throws loudly in production when SendGrid is not configured (never silently drop)', async () => {
      await expect(
        EmailService.send({
          to: 'customer@example.com',
          subject: 'Verify your email',
          text: 'OTP: 123456', // PII — must not be logged
        })
      ).rejects.toThrow(/Email service is not configured/i);

      // Body PII must NEVER leak into logs even on the throw path
      expect(logCallsContainPII('OTP: 123456')).toBe(false);
    });
  });

  // ── Test 2: dev + no key → logs REDACTED preview (subject + length only) ──

  describe('Dev + SendGrid NOT configured (redacted preview)', () => {
    let EmailService: any;
    beforeAll(() => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'development';
        delete process.env.SENDGRID_API_KEY;
        EmailService = require('./EmailService').EmailService;
      });
    });

    it('does not throw in dev when SendGrid is not configured', async () => {
      await expect(
        EmailService.send({
          to: 'dev@example.com',
          subject: 'Test email',
          text: 'Hello world',
        })
      ).resolves.toBeUndefined();
    });

    it('logs subject + recipient + bodyLength but NEVER the body content (PII safe)', async () => {
      const PII_BODY = 'OTP-SECRET-MARKER-XYZ-9876';

      await EmailService.send({
        to: 'peter@example.com',
        subject: 'Verify your account',
        text: PII_BODY,
      });

      // PII body must NOT appear anywhere in the logs
      expect(logCallsContainPII(PII_BODY)).toBe(false);
      expect(logCallsContainPII('OTP-SECRET-MARKER')).toBe(false);

      // Subject + recipient should appear
      expect(logCallsContainPII('peter@example.com')).toBe(true);
      expect(logCallsContainPII('Verify your account')).toBe(true);
    });

    it('handles array recipients by joining them in the log', async () => {
      await EmailService.send({
        to: ['alice@example.com', 'bob@example.com'],
        subject: 'Multi-recipient test',
        text: 'irrelevant body',
      });

      expect(logCallsContainPII('alice@example.com')).toBe(true);
      expect(logCallsContainPII('bob@example.com')).toBe(true);
    });
  });

  // ── Test 3: configured-but-invalid key → throws (config error) ───────────

  describe('Production + SendGrid key set but INVALID (does not start with "SG.")', () => {
    let EmailService: any;
    beforeAll(() => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        process.env.SENDGRID_API_KEY = 'invalid-key-not-prefixed';
        EmailService = require('./EmailService').EmailService;
      });
    });

    it('throws when SENDGRID_API_KEY is set but does not start with "SG."', async () => {
      await expect(
        EmailService.send({
          to: 'customer@example.com',
          subject: 'Order confirmed',
          text: 'Your order #1234 is confirmed.',
        })
      ).rejects.toThrow(/invalid SendGrid API key/i);
    });

    it('isConfigured() returns false for invalid key', () => {
      expect(EmailService.isConfigured()).toBe(false);
    });
  });

  // ── Test 4: configured + valid key → calls sgMail.send ─────────────────────

  describe('Production + SendGrid VALID key (happy path)', () => {
    let EmailService: any;
    beforeAll(() => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        process.env.SENDGRID_API_KEY = 'SG.a-valid-test-key-with-enough-length';
        mockSgMailSend.mockResolvedValueOnce([{ statusCode: 202 }]);
        EmailService = require('./EmailService').EmailService;
      });
    });

    it('sends via SendGrid when configured with a valid key', async () => {
      await EmailService.send({
        to: 'happy@example.com',
        subject: 'Welcome',
        text: 'Hello!',
      });

      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      const msg = mockSgMailSend.mock.calls[0][0];
      expect(msg.to).toBe('happy@example.com');
      expect(msg.subject).toBe('Welcome');
    });

    it('isConfigured() returns true for valid key', () => {
      expect(EmailService.isConfigured()).toBe(true);
    });
  });
});