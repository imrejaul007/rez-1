/**
 * Validation Utility Tests
 * Tests for input validation functions
 */

import {
  validateSharePlatform,
  validateReferralCode,
  validateEmail,
  sanitizeInput,
  validateApiParams,
  isValidSharePlatform,
} from '@/utils/validation';
import { validEmails, invalidEmails, validReferralCodes, invalidReferralCodes } from '@/__mocks__/data/testFixtures';

describe('Validation Utils', () => {
  // ============================================
  // validateSharePlatform Tests
  // ============================================
  describe('validateSharePlatform', () => {
    it('should validate supported share platforms', () => {
      const validPlatforms = ['whatsapp', 'telegram', 'email', 'sms', 'facebook', 'twitter', 'instagram'];

      validPlatforms.forEach(platform => {
        expect(validateSharePlatform(platform)).toBe(true);
      });
    });

    it('should handle case insensitive platform names', () => {
      expect(validateSharePlatform('WhatsApp')).toBe(true);
      expect(validateSharePlatform('TELEGRAM')).toBe(true);
      expect(validateSharePlatform('Email')).toBe(true);
    });

    it('should trim whitespace from platform names', () => {
      expect(validateSharePlatform('  whatsapp  ')).toBe(true);
      expect(validateSharePlatform('telegram   ')).toBe(true);
    });

    it('should reject invalid platforms', () => {
      expect(validateSharePlatform('invalid')).toBe(false);
      expect(validateSharePlatform('linkedin')).toBe(false);
      expect(validateSharePlatform('snapchat')).toBe(false);
    });

    it('should reject empty or null inputs', () => {
      expect(validateSharePlatform('')).toBe(false);
      expect(validateSharePlatform(null as any)).toBe(false);
      expect(validateSharePlatform(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validateSharePlatform(123 as any)).toBe(false);
      expect(validateSharePlatform({} as any)).toBe(false);
      expect(validateSharePlatform([] as any)).toBe(false);
    });
  });

  // ============================================
  // validateReferralCode Tests
  // ============================================
  describe('validateReferralCode', () => {
    it('should validate correct referral codes', () => {
      validReferralCodes.forEach(code => {
        expect(validateReferralCode(code)).toBe(true);
      });
    });

    it('should reject codes that are too short', () => {
      expect(validateReferralCode('AB1')).toBe(false);
      expect(validateReferralCode('A1B2')).toBe(false);
      expect(validateReferralCode('ABC12')).toBe(false);
    });

    it('should reject codes that are too long', () => {
      expect(validateReferralCode('TOOLONGCODE123')).toBe(false);
      expect(validateReferralCode('ABCDEFGHIJKLM')).toBe(false);
    });

    it('should reject codes with special characters', () => {
      expect(validateReferralCode('ABC@123')).toBe(false);
      expect(validateReferralCode('CODE-123')).toBe(false);
      expect(validateReferralCode('REF_CODE')).toBe(false);
    });

    it('should reject codes with spaces', () => {
      expect(validateReferralCode('CODE 123')).toBe(false);
      expect(validateReferralCode(' CODE123')).toBe(false);
    });

    it('should reject empty or null inputs', () => {
      expect(validateReferralCode('')).toBe(false);
      expect(validateReferralCode(null as any)).toBe(false);
      expect(validateReferralCode(undefined as any)).toBe(false);
    });

    it('should trim whitespace and validate', () => {
      expect(validateReferralCode('  ABC123  ')).toBe(true);
    });
  });

  // ============================================
  // validateEmail Tests
  // ============================================
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidTestEmails = [
        'invalid',
        'test@',
        '@example.com',
        'test @example.com',
        'test@example',
      ];

      invalidTestEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle case insensitive emails', () => {
      expect(validateEmail('TEST@EXAMPLE.COM')).toBe(true);
      expect(validateEmail('Test@Example.Com')).toBe(true);
    });

    it('should trim whitespace from emails', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });

    it('should reject empty or null inputs', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validateEmail(123 as any)).toBe(false);
      expect(validateEmail({} as any)).toBe(false);
    });

    it('should validate complex email formats', () => {
      expect(validateEmail('firstname.lastname@example.com')).toBe(true);
      expect(validateEmail('email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user_name@company-domain.com')).toBe(true);
    });
  });

  // ============================================
  // sanitizeInput Tests
  // ============================================
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<p>Hello</p>')).toBe('Hello');
      expect(sanitizeInput('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
      expect(sanitizeInput('<div><span>Text</span></div>')).toBe('Text');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  Hello  ')).toBe('Hello');
      expect(sanitizeInput('\n\tHello\n\t')).toBe('Hello');
    });

    it('should remove multiple consecutive spaces', () => {
      expect(sanitizeInput('Hello    World')).toBe('Hello World');
      expect(sanitizeInput('Test   multiple   spaces')).toBe('Test multiple spaces');
    });

    it('should handle combined sanitization', () => {
      expect(sanitizeInput('  <p>Hello   World</p>  ')).toBe('Hello World');
      expect(sanitizeInput('<div>  Test    String  </div>')).toBe('Test String');
    });

    it('should return empty string for empty or null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should preserve valid text content', () => {
      expect(sanitizeInput('Simple text')).toBe('Simple text');
      expect(sanitizeInput('Text with numbers 123')).toBe('Text with numbers 123');
      expect(sanitizeInput('Special chars: !@#$%')).toBe('Special chars: !@#$%');
    });

    it('should handle nested HTML tags', () => {
      expect(sanitizeInput('<div><p><span>Nested</span></p></div>')).toBe('Nested');
    });

    it('should handle self-closing tags', () => {
      expect(sanitizeInput('Text <br/> with <img src="test"/> tags')).toBe('Text with tags');
    });
  });

  // ============================================
  // validateApiParams Tests
  // ============================================
  describe('validateApiParams', () => {
    it('should validate all parameters successfully', () => {
      const params = {
        platform: 'whatsapp',
        email: 'test@example.com',
        code: 'ABC123',
      };

      const validators = {
        platform: validateSharePlatform,
        email: validateEmail,
        code: validateReferralCode,
      };

      const result = validateApiParams(params, validators);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should detect invalid parameters', () => {
      const params = {
        platform: 'invalid-platform',
        email: 'invalid-email',
        code: 'AB', // Too short
      };

      const validators = {
        platform: validateSharePlatform,
        email: validateEmail,
        code: validateReferralCode,
      };

      const result = validateApiParams(params, validators);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(3);
      expect(result.errors.platform).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.code).toBeDefined();
    });

    it('should detect partial validation failures', () => {
      const params = {
        platform: 'whatsapp',
        email: 'invalid',
      };

      const validators = {
        platform: validateSharePlatform,
        email: validateEmail,
      };

      const result = validateApiParams(params, validators);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(1);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.platform).toBeUndefined();
    });

    it('should provide descriptive error messages', () => {
      const params = { email: 'invalid' };
      const validators = { email: validateEmail };

      const result = validateApiParams(params, validators);

      expect(result.errors.email).toContain('Invalid value for parameter: email');
    });
  });

  // ============================================
  // isValidSharePlatform Tests
  // ============================================
  describe('isValidSharePlatform', () => {
    it('should validate valid share platforms', () => {
      expect(isValidSharePlatform('whatsapp')).toBe(true);
      expect(isValidSharePlatform('telegram')).toBe(true);
      expect(isValidSharePlatform('email')).toBe(true);
    });

    it('should reject invalid platforms', () => {
      expect(isValidSharePlatform('invalid')).toBe(false);
      expect(isValidSharePlatform('linkedin')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidSharePlatform(123)).toBe(false);
      expect(isValidSharePlatform(null)).toBe(false);
      expect(isValidSharePlatform(undefined)).toBe(false);
      expect(isValidSharePlatform({})).toBe(false);
    });

    it('should act as a type guard', () => {
      const value: unknown = 'whatsapp';

      if (isValidSharePlatform(value)) {
        // TypeScript should recognize value as SharePlatform here
        const platform: string = value;
        expect(platform).toBe('whatsapp');
      }
    });
  });

  // ============================================
  // Edge Cases and Performance Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle very long inputs gracefully', () => {
      const longString = 'a'.repeat(10000);
      expect(() => sanitizeInput(longString)).not.toThrow();
      expect(() => validateEmail(longString)).not.toThrow();
    });

    it('should handle special Unicode characters', () => {
      expect(sanitizeInput('Hello 世界 🌍')).toBe('Hello 世界 🌍');
      expect(validateEmail('tëst@ëxample.com')).toBe(true); // Most validators accept this
    });

    it('should handle malformed HTML', () => {
      expect(sanitizeInput('<div><p>Unclosed tags')).toBe('Unclosed tags');
      expect(sanitizeInput('Text with < and > symbols')).toBe('Text with symbols');
    });
  });

  // ============================================
  // Performance Tests
  // ============================================
  describe('Performance', () => {
    it('should validate many emails quickly', () => {
      const emails = Array(1000).fill('test@example.com');
      const start = Date.now();

      emails.forEach(email => validateEmail(email));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should sanitize many inputs quickly', () => {
      const inputs = Array(1000).fill('<p>Test</p>');
      const start = Date.now();

      inputs.forEach(input => sanitizeInput(input));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
