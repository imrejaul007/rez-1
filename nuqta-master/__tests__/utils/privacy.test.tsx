/**
 * Privacy Utilities Test Suite
 *
 * Comprehensive tests for privacy anonymization functions covering:
 * - Email anonymization (10 tests)
 * - Phone anonymization (8 tests)
 * - Name anonymization (7 tests)
 * - Edge cases and null handling
 *
 * Total: 25 tests
 */

import {
  anonymizeEmail,
  anonymizePhone,
  anonymizeName,
  shouldAnonymize,
  getPrivacySafeText,
  logPrivacyEvent,
} from '@/utils/privacy';

describe('Privacy Utilities', () => {
  // ============================================
  // 1. Email Anonymization Tests (10 tests)
  // ============================================

  describe('anonymizeEmail', () => {
    test('anonymizes standard email correctly', () => {
      const result = anonymizeEmail('mukul@gmail.com');
      expect(result).toBe('m***@gmail.com');
    });

    test('anonymizes email with long local part', () => {
      const result = anonymizeEmail('mukulkumarraj@example.com');
      expect(result).toBe('m***@example.com');
    });

    test('anonymizes email with single character local part', () => {
      const result = anonymizeEmail('a@domain.com');
      expect(result).toBe('a***@domain.com');
    });

    test('handles null email input', () => {
      const result = anonymizeEmail(null);
      expect(result).toBe('N/A');
    });

    test('handles undefined email input', () => {
      const result = anonymizeEmail(undefined);
      expect(result).toBe('N/A');
    });

    test('handles empty string email', () => {
      const result = anonymizeEmail('');
      expect(result).toBe('N/A');
    });

    test('handles invalid email format - no @ symbol', () => {
      const result = anonymizeEmail('invalidemail.com');
      expect(result).toBe('Invalid email');
    });

    test('handles invalid email format - multiple @ symbols', () => {
      const result = anonymizeEmail('user@@example.com');
      expect(result).toBe('Invalid email');
    });

    test('handles non-string input', () => {
      const result = anonymizeEmail(12345 as any);
      expect(result).toBe('N/A');
    });

    test('handles email with subdomain correctly', () => {
      const result = anonymizeEmail('user@mail.example.com');
      expect(result).toBe('u***@mail.example.com');
    });
  });

  // ============================================
  // 2. Phone Anonymization Tests (8 tests)
  // ============================================

  describe('anonymizePhone', () => {
    test('anonymizes Indian phone number with country code', () => {
      const result = anonymizePhone('+91 9876543210');
      expect(result).toBe('+91 ******3210');
    });

    test('anonymizes phone number without country code', () => {
      const result = anonymizePhone('9876543210');
      expect(result).toBe('******3210');
    });

    test('handles phone with dashes', () => {
      const result = anonymizePhone('+91-987-654-3210');
      expect(result).toBe('+91 ******3210');
    });

    test('handles phone with parentheses', () => {
      const result = anonymizePhone('+91 (987) 654-3210');
      expect(result).toBe('+91 ******3210');
    });

    test('handles short phone numbers', () => {
      const result = anonymizePhone('1234');
      expect(result).toBe('****');
    });

    test('handles null phone input', () => {
      const result = anonymizePhone(null);
      expect(result).toBe('N/A');
    });

    test('handles undefined phone input', () => {
      const result = anonymizePhone(undefined);
      expect(result).toBe('N/A');
    });

    test('handles non-string phone input', () => {
      const result = anonymizePhone(9876543210 as any);
      expect(result).toBe('N/A');
    });
  });

  // ============================================
  // 3. Name Anonymization Tests (7 tests)
  // ============================================

  describe('anonymizeName', () => {
    test('anonymizes full name with two parts', () => {
      const result = anonymizeName('Mukul Kumar');
      expect(result).toBe('M*** K***');
    });

    test('anonymizes single name', () => {
      const result = anonymizeName('Mukul');
      expect(result).toBe('M***');
    });

    test('anonymizes name with three parts', () => {
      const result = anonymizeName('Mukul Kumar Raj');
      expect(result).toBe('M*** K*** R***');
    });

    test('handles null name input', () => {
      const result = anonymizeName(null);
      expect(result).toBe('Anonymous User');
    });

    test('handles undefined name input', () => {
      const result = anonymizeName(undefined);
      expect(result).toBe('Anonymous User');
    });

    test('handles empty string name', () => {
      const result = anonymizeName('');
      expect(result).toBe('Anonymous User');
    });

    test('handles name with extra spaces', () => {
      const result = anonymizeName('Mukul  Kumar   Raj');
      expect(result).toBe('M*** K*** R***');
    });
  });

  // ============================================
  // 4. shouldAnonymize Tests (4 tests)
  // ============================================

  describe('shouldAnonymize', () => {
    test('returns false for current user own data', () => {
      const result = shouldAnonymize('user123', 'user123');
      expect(result).toBe(false);
    });

    test('returns true for other users data', () => {
      const result = shouldAnonymize('user123', 'user456');
      expect(result).toBe(true);
    });

    test('returns true when userId is undefined', () => {
      const result = shouldAnonymize(undefined, 'user123');
      expect(result).toBe(true);
    });

    test('returns true when currentUserId is undefined', () => {
      const result = shouldAnonymize('user123', undefined);
      expect(result).toBe(true);
    });
  });

  // ============================================
  // 5. getPrivacySafeText Tests (4 tests)
  // ============================================

  describe('getPrivacySafeText', () => {
    test('anonymizes email when type is email', () => {
      const result = getPrivacySafeText('test@example.com', 'email');
      expect(result).toBe('t***@example.com');
    });

    test('anonymizes phone when type is phone', () => {
      const result = getPrivacySafeText('+91 9876543210', 'phone');
      expect(result).toBe('+91 ******3210');
    });

    test('anonymizes name when type is name', () => {
      const result = getPrivacySafeText('John Doe', 'name');
      expect(result).toBe('J*** D***');
    });

    test('returns N/A for invalid type', () => {
      const result = getPrivacySafeText('test', 'invalid' as any);
      expect(result).toBe('N/A');
    });
  });

  // ============================================
  // 6. logPrivacyEvent Tests (2 tests)
  // ============================================

  describe('logPrivacyEvent', () => {
    test('logs privacy event in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      logPrivacyEvent('view', 'email', 'user123');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Privacy Audit]',
        expect.objectContaining({
          action: 'view',
          dataType: 'email',
          userId: 'user123',
          timestamp: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
      (global as any).__DEV__ = originalDev;
    });

    test('handles missing userId gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      logPrivacyEvent('copy', 'phone');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Privacy Audit]',
        expect.objectContaining({
          action: 'copy',
          dataType: 'phone',
          userId: 'unknown',
        })
      );

      consoleSpy.mockRestore();
      (global as any).__DEV__ = originalDev;
    });
  });
});
