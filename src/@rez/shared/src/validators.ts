/**
 * Validation utilities for REZ backend services.
 * Provides common validation functions for email, phone, OTP, etc.
 */

import validator from 'validator';

/**
 * Validates an email address.
 * @param email - The email to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email);
}

/**
 * Validates a phone number.
 * Supports international formats with + prefix.
 * @param phone - The phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  // Remove all spaces and special characters except +
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check for valid international format
  // Basic pattern: + followed by 10-15 digits
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validates a 6-digit OTP code.
 * @param otp - The OTP to validate
 * @returns True if valid, false otherwise
 */
export function isValidOTP(otp: string): boolean {
  if (!otp || typeof otp !== 'string') return false;
  // OTP should be exactly 6 digits
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
}

/**
 * Validates an ObjectId (MongoDB).
 * @param id - The ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  // MongoDB ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id.trim());
}

/**
 * Validates a URL.
 * @param url - The URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
}

/**
 * Validates a string length is within bounds.
 * @param str - The string to validate
 * @param min - Minimum length (default: 1)
 * @param max - Maximum length (default: undefined)
 * @returns True if valid, false otherwise
 */
export function isValidLength(str: string, min: number = 1, max?: number): boolean {
  if (!str || typeof str !== 'string') return false;
  const len = str.trim().length;
  if (len < min) return false;
  if (max !== undefined && len > max) return false;
  return true;
}

/**
 * Validates alphanumeric string.
 * @param str - The string to validate
 * @returns True if valid, false otherwise
 */
export function isAlphanumeric(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return validator.isAlphanumeric(str);
}

/**
 * Validates numeric string.
 * @param str - The string to validate
 * @returns True if valid, false otherwise
 */
export function isNumeric(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return validator.isNumeric(str);
}

/**
 * Validates a strong password.
 * @param password - The password to validate
 * @param options - Validation options
 * @returns True if valid, false otherwise
 */
export function isStrongPassword(
  password: string,
  options: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): boolean {
  if (!password || typeof password !== 'string') return false;

  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true
  } = options;

  // Check length
  if (password.length < minLength || password.length > maxLength) {
    return false;
  }

  // Check uppercase
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  // Check lowercase
  if (requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }

  // Check numbers
  if (requireNumbers && !/\d/.test(password)) {
    return false;
  }

  // Check special characters
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Validates a referral code format.
 * @param code - The referral code to validate
 * @returns True if valid, false otherwise
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  // Referral code format: alphanumeric, 6-10 characters
  const referralCodeRegex = /^[A-Z0-9]{6,10}$/;
  return referralCodeRegex.test(code.toUpperCase());
}

/**
 * Validates a date string.
 * @param dateStr - The date string to validate
 * @returns True if valid, false otherwise
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validates an ISO date string.
 * @param dateStr - The date string to validate
 * @returns True if valid, false otherwise
 */
export function isValidISODate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString();
}
