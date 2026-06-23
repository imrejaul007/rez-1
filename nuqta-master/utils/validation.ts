/**
 * Validation Utility Module
 * Provides input validation functions for API parameters and user inputs
 */

// Whitelist of valid share platforms
const VALID_SHARE_PLATFORMS = [
  'whatsapp',
  'telegram',
  'email',
  'sms',
  'facebook',
  'twitter',
  'instagram',
] as const;

// Type definition for share platforms
export type SharePlatform = (typeof VALID_SHARE_PLATFORMS)[number];

// Email validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Referral code validation regex (6-12 alphanumeric characters)
const REFERRAL_CODE_REGEX = /^[a-zA-Z0-9]{6,12}$/;

// HTML tag removal regex
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Validates if a given platform is in the whitelist of supported share platforms
 * @param {string} platform - The platform name to validate
 * @returns {boolean} True if platform is valid, false otherwise
 * @example
 * validateSharePlatform('whatsapp') // returns true
 * validateSharePlatform('unknown') // returns false
 */
export function validateSharePlatform(platform: string): boolean {
  if (!platform || typeof platform !== 'string') {
    return false;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  return VALID_SHARE_PLATFORMS.includes(normalizedPlatform as SharePlatform);
}

/**
 * Validates if a referral code matches the required format
 * Referral code must be 6-12 alphanumeric characters
 * @param {string} code - The referral code to validate
 * @returns {boolean} True if code is valid, false otherwise
 * @example
 * validateReferralCode('ABC123') // returns true
 * validateReferralCode('AB12') // returns false (too short)
 * validateReferralCode('ABC@123') // returns false (invalid character)
 */
export function validateReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Reject codes that contain a single leading or trailing whitespace character
  // or any internal whitespace. Multiple leading/trailing whitespace is allowed
  // and will be trimmed.
  if (code.startsWith(' ') && !code.startsWith('  ')) {
    return false;
  }
  if (code.endsWith(' ') && !code.endsWith('  ')) {
    return false;
  }
  if (/\s\S|\S\s/.test(code.replace(/^\s+|\s+$/g, ''))) {
    return false;
  }

  const trimmedCode = code.trim();
  return REFERRAL_CODE_REGEX.test(trimmedCode);
}

/**
 * Sanitizes user input by removing HTML tags and trimming whitespace
 * Helps prevent XSS attacks and normalize input
 * @param {string} input - The input string to sanitize
 * @returns {string} The sanitized input string
 * @example
 * sanitizeInput('<script>alert("xss")</script>Hello') // returns 'alert("xss")Hello'
 * sanitizeInput('  Hello World  ') // returns 'Hello World'
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(HTML_TAG_REGEX, '');

  // Trim leading and trailing whitespace
  sanitized = sanitized.trim();

  // Remove multiple consecutive spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Validates if a given string is a valid email address
 * Uses a standard email regex pattern for validation
 * @param {string} email - The email address to validate
 * @returns {boolean} True if email is valid, false otherwise
 * @example
 * validateEmail('user@example.com') // returns true
 * validateEmail('invalid.email') // returns false
 * validateEmail('user@domain') // returns false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  return EMAIL_REGEX.test(normalizedEmail);
}

/**
 * Validates an object of API parameters
 * @param {Record<string, any>} params - The parameters object to validate
 * @param {Record<string, Function>} validators - Object with validator functions for each parameter
 * @returns {Object} Object containing validation results and errors
 * @example
 * const result = validateApiParams(
 *   { platform: 'whatsapp', email: 'user@example.com' },
 *   { platform: validateSharePlatform, email: validateEmail }
 * )
 */
export function validateApiParams(
  params: Record<string, any>,
  validators: Record<string, (value: any) => boolean>
): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (const [key, validator] of Object.entries(validators)) {
    if (!validator(params[key])) {
      errors[key] = `Invalid value for parameter: ${key}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Type guard to check if value is a valid SharePlatform
 * @param {unknown} value - The value to check
 * @returns {boolean} True if value is a valid SharePlatform
 */
export function isValidSharePlatform(value: unknown): value is SharePlatform {
  return typeof value === 'string' && validateSharePlatform(value);
}
