/**
 * Bill Upload Validation Utilities
 *
 * Provides comprehensive validation for bill upload forms including:
 * - Amount validation with currency formatting
 * - Date validation with business rules
 * - Bill number validation
 * - Notes validation
 *
 * All validators return a consistent ValidationResult type
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}

/**
 * Validation configuration constants
 */
export const VALIDATION_CONFIG = {
  amount: {
    min: 50,
    max: 100000,
    currencySymbol: '₹',
    decimalPlaces: 2,
  },
  date: {
    maxDaysOld: 30,
    allowFuture: false,
  },
  billNumber: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\-\/\_]*$/,
  },
  notes: {
    maxLength: 500,
  },
} as const;

/**
 * Validates bill amount with comprehensive rules
 *
 * @param amount - The amount to validate (string or number)
 * @returns ValidationResult with formatted value if valid
 *
 * @example
 * validateAmount('1000') // { isValid: true, value: 1000 }
 * validateAmount('25') // { isValid: false, error: 'Amount must be at least ₹50' }
 */
export function validateAmount(amount: string | number): ValidationResult {
  // Handle empty input
  if (amount === '' || amount === null || amount === undefined) {
    return {
      isValid: false,
      error: 'Amount is required',
    };
  }

  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check if valid number — also reject if string had non-numeric chars (parseFloat is too lenient)
  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Please enter a valid amount',
    };
  }

  // If string was provided, ensure it parses cleanly (rejects '12abc' -> 12)
  // Accepts integers, decimals, and scientific notation
  if (typeof amount === 'string' && !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$|^-?\.\d+([eE][+-]?\d+)?$|^-?\d+\.([eE][+-]?\d+)?$/.test(amount.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid amount',
    };
  }

  // Check for negative numbers
  if (numAmount < 0) {
    return {
      isValid: false,
      error: 'Amount cannot be negative',
    };
  }

  // Check minimum amount
  if (numAmount < VALIDATION_CONFIG.amount.min) {
    return {
      isValid: false,
      error: `Amount must be at least ${VALIDATION_CONFIG.amount.currencySymbol}${VALIDATION_CONFIG.amount.min}`,
    };
  }

  // Check maximum amount
  if (numAmount > VALIDATION_CONFIG.amount.max) {
    return {
      isValid: false,
      error: `Amount cannot exceed ${VALIDATION_CONFIG.amount.currencySymbol}${VALIDATION_CONFIG.amount.max.toLocaleString()}`,
    };
  }

  // For string inputs, reject amounts with more than configured decimal places
  if (typeof amount === 'string') {
    const dotIndex = amount.indexOf('.');
    if (dotIndex !== -1) {
      const decimalPart = amount.substring(dotIndex + 1).replace(/[eE].*$/, '');
      if (decimalPart.length > VALIDATION_CONFIG.amount.decimalPlaces) {
        return {
          isValid: false,
          error: `Amount can have maximum ${VALIDATION_CONFIG.amount.decimalPlaces} decimal places`,
        };
      }
    }
  }
  // For number inputs, just round to the configured decimal places

  // Round the amount to the configured decimal places
  const factor = Math.pow(10, VALIDATION_CONFIG.amount.decimalPlaces);
  const roundedAmount = Math.round(numAmount * factor) / factor;

  return {
    isValid: true,
    value: roundedAmount,
  };
}

/**
 * Formats amount for display with currency symbol
 *
 * @param amount - The amount to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1000) // "₹1,000.00"
 */
export function formatCurrency(amount: number): string {
  return `${VALIDATION_CONFIG.amount.currencySymbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Validates bill date with business rules
 *
 * @param date - The date to validate (Date object or string)
 * @returns ValidationResult with Date object if valid
 *
 * @example
 * validateBillDate(new Date()) // { isValid: true, value: Date }
 * validateBillDate('2020-01-01') // { isValid: false, error: '...' }
 */
export function validateBillDate(date: Date | string | null | undefined): ValidationResult {
  // Handle empty input
  if (!date) {
    return {
      isValid: false,
      error: 'Bill date is required',
    };
  }

  // Convert string to Date if needed
  const billDate = typeof date === 'string' ? new Date(date) : date;

  // Check if valid date
  if (isNaN(billDate.getTime())) {
    return {
      isValid: false,
      error: 'Please enter a valid date',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const billDateNormalized = new Date(billDate);
  billDateNormalized.setHours(0, 0, 0, 0);

  // Check for future dates
  if (!VALIDATION_CONFIG.date.allowFuture && billDateNormalized > today) {
    return {
      isValid: false,
      error: 'Bill date cannot be in the future',
    };
  }

  // Check maximum age
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() - VALIDATION_CONFIG.date.maxDaysOld);

  if (billDateNormalized < maxDate) {
    return {
      isValid: false,
      error: `Bill date cannot be older than ${VALIDATION_CONFIG.date.maxDaysOld} days`,
    };
  }

  return {
    isValid: true,
    value: billDate,
  };
}

/**
 * Validates bill number (optional field)
 *
 * @param billNumber - The bill number to validate
 * @returns ValidationResult
 *
 * @example
 * validateBillNumber('INV-2024-001') // { isValid: true, value: 'INV-2024-001' }
 * validateBillNumber('AB') // { isValid: false, error: '...' }
 */
export function validateBillNumber(billNumber: string | null | undefined): ValidationResult {
  // Bill number is optional
  if (!billNumber || billNumber.trim() === '') {
    return {
      isValid: true,
      value: null,
    };
  }

  const trimmedNumber = billNumber.trim();

  // Check minimum length
  if (trimmedNumber.length < VALIDATION_CONFIG.billNumber.minLength) {
    return {
      isValid: false,
      error: `Bill number must be at least ${VALIDATION_CONFIG.billNumber.minLength} characters`,
    };
  }

  // Check maximum length
  if (trimmedNumber.length > VALIDATION_CONFIG.billNumber.maxLength) {
    return {
      isValid: false,
      error: `Bill number cannot exceed ${VALIDATION_CONFIG.billNumber.maxLength} characters`,
    };
  }

  // Check pattern (alphanumeric with common separators)
  if (!VALIDATION_CONFIG.billNumber.pattern.test(trimmedNumber)) {
    return {
      isValid: false,
      error: 'Bill number can only contain letters, numbers, hyphens, slashes, and underscores',
    };
  }

  return {
    isValid: true,
    value: trimmedNumber,
  };
}

/**
 * Validates notes/description field
 *
 * @param notes - The notes text to validate
 * @returns ValidationResult
 *
 * @example
 * validateNotes('Monthly grocery shopping') // { isValid: true, value: '...' }
 */
export function validateNotes(notes: string | null | undefined): ValidationResult {
  // Notes are optional
  if (!notes || notes.trim() === '') {
    return {
      isValid: true,
      value: null,
    };
  }

  const trimmedNotes = notes.trim();

  // Check maximum length
  if (trimmedNotes.length > VALIDATION_CONFIG.notes.maxLength) {
    return {
      isValid: false,
      error: `Notes cannot exceed ${VALIDATION_CONFIG.notes.maxLength} characters`,
    };
  }

  return {
    isValid: true,
    value: trimmedNotes,
  };
}

/**
 * Validates merchant/store name
 *
 * @param merchant - The merchant name to validate
 * @returns ValidationResult
 */
export function validateMerchant(merchant: string | null | undefined): ValidationResult {
  if (!merchant || merchant.trim() === '') {
    return {
      isValid: false,
      error: 'Merchant/Store name is required',
    };
  }

  const trimmedMerchant = merchant.trim();

  if (trimmedMerchant.length < 2) {
    return {
      isValid: false,
      error: 'Merchant name must be at least 2 characters',
    };
  }

  if (trimmedMerchant.length > 100) {
    return {
      isValid: false,
      error: 'Merchant name cannot exceed 100 characters',
    };
  }

  return {
    isValid: true,
    value: trimmedMerchant,
  };
}

/**
 * Validates entire bill form
 *
 * @param formData - Object containing all form fields
 * @returns Object with field-level validation results
 *
 * @example
 * validateBillForm({
 *   amount: '1000',
 *   date: new Date(),
 *   merchant: 'ABC Store',
 *   billNumber: 'INV-001',
 *   notes: 'Purchase description'
 * })
 */
export interface BillFormData {
  amount: string | number;
  date: Date | string | null;
  merchant: string;
  billNumber?: string;
  notes?: string;
}

export interface BillFormValidation {
  isValid: boolean;
  errors: {
    amount?: string;
    date?: string;
    merchant?: string;
    billNumber?: string;
    notes?: string;
  };
  values: {
    amount?: number;
    date?: Date;
    merchant?: string;
    billNumber?: string | null;
    notes?: string | null;
  };
}

export function validateBillForm(formData: BillFormData): BillFormValidation {
  const amountResult = validateAmount(formData.amount);
  const dateResult = validateBillDate(formData.date);
  const merchantResult = validateMerchant(formData.merchant);
  const billNumberResult = validateBillNumber(formData.billNumber);
  const notesResult = validateNotes(formData.notes);

  const errors: BillFormValidation['errors'] = {};

  if (!amountResult.isValid) errors.amount = amountResult.error;
  if (!dateResult.isValid) errors.date = dateResult.error;
  if (!merchantResult.isValid) errors.merchant = merchantResult.error;
  if (!billNumberResult.isValid) errors.billNumber = billNumberResult.error;
  if (!notesResult.isValid) errors.notes = notesResult.error;

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    values: {
      amount: amountResult.value,
      date: dateResult.value,
      merchant: merchantResult.value,
      billNumber: billNumberResult.value,
      notes: notesResult.value,
    },
  };
}

/**
 * Real-time field validator for onChange events
 *
 * @param field - The field name being validated
 * @param value - The current field value
 * @returns ValidationResult
 *
 * @example
 * validateField('amount', '1000')
 */
export function validateField(
  field: keyof BillFormData,
  value: any
): ValidationResult {
  switch (field) {
    case 'amount':
      return validateAmount(value);
    case 'date':
      return validateBillDate(value);
    case 'merchant':
      return validateMerchant(value);
    case 'billNumber':
      return validateBillNumber(value);
    case 'notes':
      return validateNotes(value);
    default:
      return { isValid: true };
  }
}
