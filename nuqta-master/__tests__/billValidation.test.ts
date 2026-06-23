/**
 * Bill Validation Tests
 *
 * Comprehensive test suite for bill validation utilities.
 * Tests all validation functions, edge cases, error messages,
 * and boundary conditions.
 *
 * @coverage 95%+ target
 */

import {
  validateAmount,
  validateBillDate,
  validateBillNumber,
  validateNotes,
  validateMerchant,
  validateBillForm,
  validateField,
  formatCurrency,
  VALIDATION_CONFIG,
  type ValidationResult,
  type BillFormData,
} from '@/utils/billValidation';

describe('Bill Validation Utilities', () => {
  // =============================================================================
  // AMOUNT VALIDATION TESTS
  // =============================================================================

  describe('validateAmount', () => {
    describe('Valid amounts', () => {
      test('accepts valid integer amount', () => {
        const result = validateAmount('1000');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(1000);
        expect(result.error).toBeUndefined();
      });

      test('accepts valid decimal amount', () => {
        const result = validateAmount('999.99');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(999.99);
      });

      test('accepts minimum valid amount (50)', () => {
        const result = validateAmount('50');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(50);
      });

      test('accepts maximum valid amount (100000)', () => {
        const result = validateAmount('100000');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100000);
      });

      test('accepts amount with one decimal place', () => {
        const result = validateAmount('100.5');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100.5);
      });

      test('accepts amount with two decimal places', () => {
        const result = validateAmount('100.50');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100.5);
      });

      test('accepts numeric type input', () => {
        const result = validateAmount(1000);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(1000);
      });

      test('rounds amount correctly', () => {
        const result = validateAmount(100.004);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100);
      });
    });

    describe('Invalid amounts', () => {
      test('rejects empty string', () => {
        const result = validateAmount('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Amount is required');
      });

      test('rejects null value', () => {
        const result = validateAmount(null as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Amount is required');
      });

      test('rejects undefined value', () => {
        const result = validateAmount(undefined as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Amount is required');
      });

      test('rejects non-numeric string', () => {
        const result = validateAmount('abc');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid amount');
      });

      test('rejects negative amount', () => {
        const result = validateAmount('-100');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Amount cannot be negative');
      });

      test('rejects zero amount', () => {
        const result = validateAmount('0');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least');
      });

      test('rejects amount below minimum (49)', () => {
        const result = validateAmount('49');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least ₹50');
      });

      test('rejects amount above maximum (100001)', () => {
        const result = validateAmount('100001');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed');
      });

      test('rejects amount with more than 2 decimal places', () => {
        const result = validateAmount('100.999');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('maximum 2 decimal places');
      });

      test('rejects NaN result', () => {
        const result = validateAmount('12abc');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid amount');
      });
    });

    describe('Edge cases', () => {
      test('handles very small decimal amount', () => {
        const result = validateAmount('50.01');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(50.01);
      });

      test('handles amount with leading zeros', () => {
        const result = validateAmount('0100');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100);
      });

      test('handles amount with trailing zeros', () => {
        const result = validateAmount('100.00');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100);
      });

      test('handles scientific notation', () => {
        const result = validateAmount('1e3');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(1000);
      });

      test('handles whitespace in amount', () => {
        const result = validateAmount(' 100 ');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(100);
      });
    });
  });

  // =============================================================================
  // DATE VALIDATION TESTS
  // =============================================================================

  describe('validateBillDate', () => {
    describe('Valid dates', () => {
      test('accepts today\'s date', () => {
        const result = validateBillDate(new Date());
        expect(result.isValid).toBe(true);
      });

      test('accepts date from 1 day ago', () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(true);
      });

      test('accepts date from 29 days ago (within limit)', () => {
        const date = new Date();
        date.setDate(date.getDate() - 29);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(true);
      });

      test('accepts ISO string format', () => {
        const dateString = new Date().toISOString();
        const result = validateBillDate(dateString);
        expect(result.isValid).toBe(true);
      });

      test('accepts YYYY-MM-DD format', () => {
        const dateString = new Date().toISOString().split('T')[0];
        const result = validateBillDate(dateString);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Invalid dates', () => {
      test('rejects null date', () => {
        const result = validateBillDate(null);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Bill date is required');
      });

      test('rejects undefined date', () => {
        const result = validateBillDate(undefined);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Bill date is required');
      });

      test('rejects invalid date string', () => {
        const result = validateBillDate('invalid-date');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid date');
      });

      test('rejects future date (tomorrow)', () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Bill date cannot be in the future');
      });

      test('rejects date older than 30 days', () => {
        const date = new Date();
        date.setDate(date.getDate() - 31);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot be older than 30 days');
      });

      test('rejects far future date', () => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Bill date cannot be in the future');
      });
    });

    describe('Edge cases', () => {
      test('accepts date exactly 30 days ago', () => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(true);
      });

      test('handles different time zones', () => {
        const date = new Date();
        const result = validateBillDate(date.toISOString());
        expect(result.isValid).toBe(true);
      });

      test('handles midnight dates correctly', () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(true);
      });

      test('handles end of day dates correctly', () => {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        const result = validateBillDate(date);
        expect(result.isValid).toBe(true);
      });
    });
  });

  // =============================================================================
  // BILL NUMBER VALIDATION TESTS
  // =============================================================================

  describe('validateBillNumber', () => {
    describe('Valid bill numbers', () => {
      test('accepts valid bill number with letters and numbers', () => {
        const result = validateBillNumber('INV-2024-001');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('INV-2024-001');
      });

      test('accepts bill number with only numbers', () => {
        const result = validateBillNumber('123456');
        expect(result.isValid).toBe(true);
      });

      test('accepts bill number with hyphens', () => {
        const result = validateBillNumber('ABC-123-XYZ');
        expect(result.isValid).toBe(true);
      });

      test('accepts bill number with slashes', () => {
        const result = validateBillNumber('2024/01/001');
        expect(result.isValid).toBe(true);
      });

      test('accepts bill number with underscores', () => {
        const result = validateBillNumber('INV_2024_001');
        expect(result.isValid).toBe(true);
      });

      test('accepts empty bill number (optional field)', () => {
        const result = validateBillNumber('');
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('accepts null bill number', () => {
        const result = validateBillNumber(null);
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('accepts undefined bill number', () => {
        const result = validateBillNumber(undefined);
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('trims whitespace from bill number', () => {
        const result = validateBillNumber('  INV-001  ');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('INV-001');
      });
    });

    describe('Invalid bill numbers', () => {
      test('rejects bill number too short (less than 3 chars)', () => {
        const result = validateBillNumber('AB');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least 3 characters');
      });

      test('rejects bill number too long (more than 50 chars)', () => {
        const result = validateBillNumber('A'.repeat(51));
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed 50 characters');
      });

      test('rejects bill number with special characters', () => {
        const result = validateBillNumber('INV@2024!');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('letters, numbers');
      });

      test('rejects bill number with spaces', () => {
        const result = validateBillNumber('INV 2024 001');
        expect(result.isValid).toBe(false);
      });
    });

    describe('Edge cases', () => {
      test('accepts bill number with minimum length (3 chars)', () => {
        const result = validateBillNumber('ABC');
        expect(result.isValid).toBe(true);
      });

      test('accepts bill number with maximum length (50 chars)', () => {
        const result = validateBillNumber('A'.repeat(50));
        expect(result.isValid).toBe(true);
      });

      test('handles whitespace-only bill number as empty', () => {
        const result = validateBillNumber('   ');
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });
    });
  });

  // =============================================================================
  // NOTES VALIDATION TESTS
  // =============================================================================

  describe('validateNotes', () => {
    describe('Valid notes', () => {
      test('accepts short notes', () => {
        const result = validateNotes('Monthly grocery shopping');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('Monthly grocery shopping');
      });

      test('accepts empty notes (optional field)', () => {
        const result = validateNotes('');
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('accepts null notes', () => {
        const result = validateNotes(null);
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('accepts undefined notes', () => {
        const result = validateNotes(undefined);
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('accepts notes with maximum length (500 chars)', () => {
        const notes = 'a'.repeat(500);
        const result = validateNotes(notes);
        expect(result.isValid).toBe(true);
      });

      test('accepts notes with special characters', () => {
        const result = validateNotes('Purchase @ Store #1 - 50% off!');
        expect(result.isValid).toBe(true);
      });

      test('accepts notes with line breaks', () => {
        const result = validateNotes('Line 1\nLine 2\nLine 3');
        expect(result.isValid).toBe(true);
      });

      test('trims whitespace from notes', () => {
        const result = validateNotes('  Test notes  ');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('Test notes');
      });
    });

    describe('Invalid notes', () => {
      test('rejects notes exceeding maximum length', () => {
        const notes = 'a'.repeat(501);
        const result = validateNotes(notes);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed 500 characters');
      });
    });

    describe('Edge cases', () => {
      test('handles whitespace-only notes as empty', () => {
        const result = validateNotes('   ');
        expect(result.isValid).toBe(true);
        expect(result.value).toBeNull();
      });

      test('accepts notes with exactly 500 characters', () => {
        const notes = 'a'.repeat(500);
        const result = validateNotes(notes);
        expect(result.isValid).toBe(true);
      });
    });
  });

  // =============================================================================
  // MERCHANT VALIDATION TESTS
  // =============================================================================

  describe('validateMerchant', () => {
    describe('Valid merchant names', () => {
      test('accepts valid merchant name', () => {
        const result = validateMerchant('ABC Store');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('ABC Store');
      });

      test('accepts merchant name with minimum length (2 chars)', () => {
        const result = validateMerchant('AB');
        expect(result.isValid).toBe(true);
      });

      test('accepts merchant name with numbers', () => {
        const result = validateMerchant('Store 24/7');
        expect(result.isValid).toBe(true);
      });

      test('trims whitespace from merchant name', () => {
        const result = validateMerchant('  ABC Store  ');
        expect(result.isValid).toBe(true);
        expect(result.value).toBe('ABC Store');
      });
    });

    describe('Invalid merchant names', () => {
      test('rejects empty merchant name', () => {
        const result = validateMerchant('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Merchant/Store name is required');
      });

      test('rejects null merchant name', () => {
        const result = validateMerchant(null);
        expect(result.isValid).toBe(false);
      });

      test('rejects merchant name too short (1 char)', () => {
        const result = validateMerchant('A');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least 2 characters');
      });

      test('rejects merchant name too long (>100 chars)', () => {
        const result = validateMerchant('A'.repeat(101));
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed 100 characters');
      });

      test('rejects whitespace-only merchant name', () => {
        const result = validateMerchant('   ');
        expect(result.isValid).toBe(false);
      });
    });

    describe('Edge cases', () => {
      test('accepts merchant name with exactly 100 characters', () => {
        const result = validateMerchant('A'.repeat(100));
        expect(result.isValid).toBe(true);
      });

      test('accepts merchant name with exactly 2 characters', () => {
        const result = validateMerchant('AB');
        expect(result.isValid).toBe(true);
      });
    });
  });

  // =============================================================================
  // FULL FORM VALIDATION TESTS
  // =============================================================================

  describe('validateBillForm', () => {
    const validFormData: BillFormData = {
      amount: '1000',
      date: new Date(),
      merchant: 'ABC Store',
      billNumber: 'INV-001',
      notes: 'Test notes',
    };

    describe('Valid forms', () => {
      test('validates complete valid form', () => {
        const result = validateBillForm(validFormData);
        expect(result.isValid).toBe(true);
        expect(Object.keys(result.errors).length).toBe(0);
        expect(result.values.amount).toBe(1000);
      });

      test('validates form without optional fields', () => {
        const formData: BillFormData = {
          amount: '1000',
          date: new Date(),
          merchant: 'ABC Store',
        };
        const result = validateBillForm(formData);
        expect(result.isValid).toBe(true);
        expect(result.values.billNumber).toBeNull();
        expect(result.values.notes).toBeNull();
      });
    });

    describe('Invalid forms', () => {
      test('returns errors for all invalid fields', () => {
        const formData: BillFormData = {
          amount: '',
          date: null,
          merchant: '',
        };
        const result = validateBillForm(formData);
        expect(result.isValid).toBe(false);
        expect(result.errors.amount).toBeDefined();
        expect(result.errors.date).toBeDefined();
        expect(result.errors.merchant).toBeDefined();
      });

      test('returns error for invalid amount only', () => {
        const formData = { ...validFormData, amount: '25' };
        const result = validateBillForm(formData);
        expect(result.isValid).toBe(false);
        expect(result.errors.amount).toBeDefined();
        expect(result.errors.date).toBeUndefined();
      });

      test('returns error for invalid date only', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        const formData = { ...validFormData, date: futureDate };
        const result = validateBillForm(formData);
        expect(result.isValid).toBe(false);
        expect(result.errors.date).toBeDefined();
      });
    });
  });

  // =============================================================================
  // FIELD VALIDATION TESTS
  // =============================================================================

  describe('validateField', () => {
    test('validates amount field', () => {
      const result = validateField('amount', '1000');
      expect(result.isValid).toBe(true);
    });

    test('validates date field', () => {
      const result = validateField('date', new Date());
      expect(result.isValid).toBe(true);
    });

    test('validates merchant field', () => {
      const result = validateField('merchant', 'ABC Store');
      expect(result.isValid).toBe(true);
    });

    test('validates billNumber field', () => {
      const result = validateField('billNumber', 'INV-001');
      expect(result.isValid).toBe(true);
    });

    test('validates notes field', () => {
      const result = validateField('notes', 'Test notes');
      expect(result.isValid).toBe(true);
    });

    test('returns valid for unknown field', () => {
      const result = validateField('unknown' as any, 'value');
      expect(result.isValid).toBe(true);
    });
  });

  // =============================================================================
  // CURRENCY FORMATTING TESTS
  // =============================================================================

  describe('formatCurrency', () => {
    test('formats integer amount', () => {
      const result = formatCurrency(1000);
      expect(result).toMatch(/₹/);
      expect(result).toMatch(/1,000/);
    });

    test('formats decimal amount with 2 places', () => {
      const result = formatCurrency(1000.50);
      expect(result).toMatch(/1,000.50/);
    });

    test('formats amount with Indian number system', () => {
      const result = formatCurrency(100000);
      expect(result).toMatch(/1,00,000/);
    });

    test('formats small amount', () => {
      const result = formatCurrency(50);
      expect(result).toMatch(/50.00/);
    });

    test('formats zero amount', () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/0.00/);
    });
  });

  // =============================================================================
  // CONFIGURATION TESTS
  // =============================================================================

  describe('VALIDATION_CONFIG', () => {
    test('has correct amount constraints', () => {
      expect(VALIDATION_CONFIG.amount.min).toBe(50);
      expect(VALIDATION_CONFIG.amount.max).toBe(100000);
      expect(VALIDATION_CONFIG.amount.decimalPlaces).toBe(2);
    });

    test('has correct date constraints', () => {
      expect(VALIDATION_CONFIG.date.maxDaysOld).toBe(30);
      expect(VALIDATION_CONFIG.date.allowFuture).toBe(false);
    });

    test('has correct bill number constraints', () => {
      expect(VALIDATION_CONFIG.billNumber.minLength).toBe(3);
      expect(VALIDATION_CONFIG.billNumber.maxLength).toBe(50);
    });

    test('has correct notes constraints', () => {
      expect(VALIDATION_CONFIG.notes.maxLength).toBe(500);
    });
  });
});
