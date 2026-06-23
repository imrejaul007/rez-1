/**
 * Phone number normalization utilities.
 * Extracted from authController.ts — supports international numbers.
 */

/**
 * Normalize a phone number to E.164 format with country code.
 * Handles Indian (+91) and UAE (+971) numbers with or without country code prefix.
 *
 * @param phone - Raw phone number from user input
 * @returns E.164 formatted phone number (e.g. "+919876543210")
 */
export const normalizePhoneNumber = (phone: string): string => {
  // Remove all spaces and special characters except +
  let normalized = phone.replace(/[\s\-()]/g, '');

  // Already E.164 — return as-is
  if (normalized.startsWith('+')) {
    return normalized;
  }

  // If starts with 91 but is NOT a full E.164 (e.g. "919876543210" = 11 digits)
  // the preceding condition would have caught "+919876543210". Here we only strip
  // when the number is clearly too long to be a local number without country code.
  // For Indian mobile numbers the total is always 12 digits (10 local + 91).
  if (normalized.startsWith('91') && normalized.length > 12) {
    return `+${normalized}`;
  }
  if (normalized.startsWith('971') && normalized.length > 13) {
    return `+${normalized}`;
  }

  // Default: assume Indian number if no country code, add +91
  return `+91${normalized}`;
};
