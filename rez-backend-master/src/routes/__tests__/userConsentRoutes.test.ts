// @ts-nocheck
/**
 * Unit tests for userConsentRoutes helpers.
 *
 * Covers the pure validation helpers exported via __testOnly. The HTTP
 * handlers are intentionally not end-to-end tested here — that's covered
 * by the integration suite once the in-memory Mongo harness is available
 * in CI. What we DO test is that category + status validation behave
 * correctly, because those are the gatekeepers that prevent a client
 * from writing a garbage consent row to the audit ledger.
 */

// Mock UserConsent model so the route module can load.
jest.mock('../../models/UserConsent', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    record: jest.fn(),
  },
  CONSENT_CATEGORIES: [
    'whatsapp_transactional',
    'whatsapp_marketing',
    'sms_transactional',
    'sms_marketing',
    'email_transactional',
    'email_marketing',
    'push_marketing',
    'analytics',
    'data_sharing',
  ],
  CONSENT_STATUSES: ['granted', 'withdrawn'],
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { __testOnly } from '../userConsentRoutes';
const { isConsentCategory, isConsentStatus, getUserId } = __testOnly;

describe('userConsentRoutes helpers', () => {
  // ─── isConsentCategory ─────────────────────────────────────────────────────
  describe('isConsentCategory', () => {
    it('accepts every known category', () => {
      expect(isConsentCategory('whatsapp_transactional')).toBe(true);
      expect(isConsentCategory('whatsapp_marketing')).toBe(true);
      expect(isConsentCategory('sms_transactional')).toBe(true);
      expect(isConsentCategory('sms_marketing')).toBe(true);
      expect(isConsentCategory('email_transactional')).toBe(true);
      expect(isConsentCategory('email_marketing')).toBe(true);
      expect(isConsentCategory('push_marketing')).toBe(true);
      expect(isConsentCategory('analytics')).toBe(true);
      expect(isConsentCategory('data_sharing')).toBe(true);
    });

    it('rejects unknown strings', () => {
      expect(isConsentCategory('whatsapp')).toBe(false);
      expect(isConsentCategory('bogus')).toBe(false);
      expect(isConsentCategory('TRANSACTIONAL')).toBe(false);
    });

    it('rejects non-strings', () => {
      expect(isConsentCategory(undefined)).toBe(false);
      expect(isConsentCategory(null)).toBe(false);
      expect(isConsentCategory(123)).toBe(false);
      expect(isConsentCategory({})).toBe(false);
      expect(isConsentCategory([])).toBe(false);
    });
  });

  // ─── isConsentStatus ───────────────────────────────────────────────────────
  describe('isConsentStatus', () => {
    it('accepts granted + withdrawn', () => {
      expect(isConsentStatus('granted')).toBe(true);
      expect(isConsentStatus('withdrawn')).toBe(true);
    });

    it('rejects other plausible-sounding values', () => {
      expect(isConsentStatus('denied')).toBe(false);
      expect(isConsentStatus('yes')).toBe(false);
      expect(isConsentStatus('no')).toBe(false);
      expect(isConsentStatus('revoked')).toBe(false);
      expect(isConsentStatus('')).toBe(false);
    });

    it('rejects non-strings', () => {
      expect(isConsentStatus(undefined)).toBe(false);
      expect(isConsentStatus(null)).toBe(false);
      expect(isConsentStatus(true)).toBe(false);
    });
  });

  // ─── getUserId ─────────────────────────────────────────────────────────────
  describe('getUserId', () => {
    it('prefers req.userId when present', () => {
      expect(getUserId({ userId: 'user-1', user: { _id: 'user-2' } } as any)).toBe('user-1');
    });

    it('falls back to req.user._id', () => {
      expect(getUserId({ user: { _id: 'user-2' } } as any)).toBe('user-2');
    });

    it('coerces ObjectId-like values to string', () => {
      const objectIdLike = { toString: () => 'mock-oid-123' };
      expect(getUserId({ userId: objectIdLike } as any)).toBe('mock-oid-123');
    });

    it('throws when neither is present', () => {
      expect(() => getUserId({} as any)).toThrow(/user id missing/i);
      expect(() => getUserId({ user: {} } as any)).toThrow(/user id missing/i);
    });
  });
});
