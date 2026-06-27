/**
 * Sanitization utilities for REZ backend services.
 * Provides input sanitization to prevent XSS and injection attacks.
 */

import validator from 'validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Deep sanitization function to recursively sanitize all string values in an object.
 * Prevents XSS attacks by escaping HTML and removing dangerous characters.
 */
function deepSanitize(input: unknown): unknown {
  if (typeof input === 'string') {
    let sanitized = validator.escape(input);
    sanitized = sanitized.trim();
    sanitized = sanitized.replace(/\0/g, '');
    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(item => deepSanitize(item));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const sanitizedKey = validator.escape(key);
        sanitized[sanitizedKey] = deepSanitize((input as Record<string, unknown>)[key]);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Middleware to sanitize request body.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters.
 */
export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
  if (req.query && typeof req.query === 'object') {
    const sanitized = deepSanitize({ ...req.query }) as Record<string, unknown>;
    for (const key of Object.keys(req.query)) {
      (req.query as Record<string, unknown>)[key] = sanitized[key];
    }
  }
  next();
}

/**
 * Middleware to sanitize URL parameters.
 */
export function sanitizeParams(req: Request, _res: Response, next: NextFunction): void {
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params) as typeof req.params;
  }
  next();
}

/**
 * Combined sanitization middleware for all request data.
 */
export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = deepSanitize({ ...req.query }) as Record<string, unknown>;
    for (const key of Object.keys(req.query)) {
      (req.query as Record<string, unknown>)[key] = sanitizedQuery[key];
    }
  }

  if (req.params && typeof req.params === 'object') {
    const sanitizedParams = deepSanitize({ ...req.params }) as typeof req.params;
    for (const key of Object.keys(req.params)) {
      (req.params as Record<string, unknown>)[key] = sanitizedParams[key];
    }
  }

  next();
}

/**
 * Sanitize a string input.
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  let sanitized = validator.escape(input.trim());
  sanitized = sanitized.replace(/\0/g, '');
  return sanitized;
}

/**
 * Sanitize HTML content - removes dangerous tags while preserving basic formatting.
 * Used for product descriptions, reviews, etc.
 * @param input - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input.trim();
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized;
}

/**
 * Sanitize email address.
 * @param email - The email to sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;

  const normalized = validator.normalizeEmail(email, {
    all_lowercase: true,
    gmail_remove_dots: false
  });

  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Sanitize phone number.
 * @param phone - The phone number to sanitize
 * @returns Sanitized phone number or null if invalid
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  const sanitized = phone.replace(/[^\d+]/g, '');

  if (sanitized.length < 10 || sanitized.length > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize URL.
 * @param url - The URL to sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true
  })) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize MongoDB query to prevent injection.
 */
export function sanitizeMongoQuery(query: unknown): unknown {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized: Record<string, unknown> = {};
  const safeOperators = ['$and', '$or', '$in', '$gte', '$lte', '$gt', '$lt', '$eq'];

  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      if (key.startsWith('$') && !safeOperators.includes(key)) {
        continue;
      }

      const value = (query as Record<string, unknown>)[key];

      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeMongoQuery(value);
      } else if (typeof value === 'string') {
        sanitized[key] = validator.escape(value.trim());
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize ObjectId.
 * @param id - The ID to sanitize
 * @returns Sanitized ID or null if invalid
 */
export function sanitizeObjectId(id: string): string | null {
  if (!id || typeof id !== 'string') return null;

  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  const trimmed = id.trim();

  if (!objectIdRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize text fields (no HTML allowed).
 */
export function sanitizeProductText(
  text: string,
  options?: {
    maxLength?: number;
    allowHTML?: boolean;
    stripTags?: boolean;
  }
): string {
  if (!text || typeof text !== 'string') return '';

  const { maxLength, allowHTML = false, stripTags = true } = options || {};

  let sanitized = text.trim();
  sanitized = sanitized.replace(/\0/g, '');

  if (stripTags || !allowHTML) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    sanitized = sanitizeHTML(sanitized);
  }

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize text by removing HTML and dangerous characters.
 * Alias for sanitizeInput for backward compatibility.
 */
export function sanitizeText(input: string): string {
  return sanitizeInput(input);
}

/**
 * Normalize phone number to international format.
 * @param phone - The phone number to normalize
 * @returns Normalized phone number with + prefix
 */
export function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '');

  if (normalized.startsWith('+')) {
    return normalized;
  }

  if (normalized.startsWith('91') && normalized.length >= 12) {
    return `+${normalized}`;
  }

  if (normalized.startsWith('971') && normalized.length >= 12) {
    return `+${normalized}`;
  }

  return `+91${normalized}`;
}

// Default export with all functions
export default {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeRequest,
  sanitizeInput,
  sanitizeHTML,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeURL,
  sanitizeMongoQuery,
  sanitizeObjectId,
  sanitizeProductText,
  sanitizeText,
  normalizePhoneNumber
};
