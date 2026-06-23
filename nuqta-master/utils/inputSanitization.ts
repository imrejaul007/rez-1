/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export const sanitizeInput = (text: string): string => {
  if (!text) return '';

  return text
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .trim();
};

/**
 * Sanitize number input
 */
export const sanitizeNumber = (value: string): string => {
  if (!value) return '';

  // Only allow digits and decimal point
  return value.replace(/[^\d.]/g, '');
};

/**
 * Sanitize bill number (alphanumeric + hyphens)
 */
export const sanitizeBillNumber = (value: string): string => {
  if (!value) return '';

  // Allow alphanumeric, hyphens, and underscores
  return value.replace(/[^a-zA-Z0-9\-_]/g, '').trim();
};
