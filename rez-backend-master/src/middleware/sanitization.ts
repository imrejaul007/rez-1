import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Deep sanitization function to recursively sanitize all string values in an object
 * Prevents XSS attacks by escaping HTML and removing dangerous characters
 */
function deepSanitize(input: any): any {
  if (typeof input === 'string') {
    // Escape HTML to prevent XSS
    let sanitized = validator.escape(input);

    // Trim whitespace
    sanitized = sanitized.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(item => deepSanitize(item));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        // Sanitize the key as well
        const sanitizedKey = validator.escape(key);
        sanitized[sanitizedKey] = deepSanitize(input[key]);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Sanitize specific fields that should not be HTML-escaped but still cleaned
 * Used for fields like descriptions, content, etc.
 */
function sanitizePreservingFormat(input: string): string {
  if (typeof input !== 'string') return input;

  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove potentially dangerous scripts but preserve basic formatting
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers

  return sanitized;
}

/**
 * Middleware to sanitize request body
 * Applies deep sanitization to prevent XSS and injection attacks
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query && typeof req.query === 'object') {
    const sanitized = deepSanitize({ ...req.query });
    for (const key of Object.keys(req.query)) {
      (req.query as any)[key] = sanitized[key];
    }
  }
  next();
};

/**
 * Middleware to sanitize URL parameters
 */
export const sanitizeParams = (req: Request, res: Response, next: NextFunction) => {
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params);
  }
  next();
};

/**
 * Combined sanitization middleware for all request data
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }

  // Sanitize query — req.query may be read-only in Express 5+, so sanitize values in-place
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = deepSanitize({ ...req.query });
    for (const key of Object.keys(req.query)) {
      (req.query as any)[key] = sanitizedQuery[key];
    }
  }

  // Sanitize params — may also be read-only
  if (req.params && typeof req.params === 'object') {
    const sanitizedParams = deepSanitize({ ...req.params });
    for (const key of Object.keys(req.params)) {
      (req.params as any)[key] = sanitizedParams[key];
    }
  }

  next();
};

/**
 * Middleware to prevent NoSQL injection by blacklisting dangerous operators
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const dangerousOperators = ['$where', '$regex', '$ne', '$nin', '$exists', '$type'];

  const checkForDangerousOperators = (obj: any): boolean => {
    if (typeof obj !== 'object' || obj === null) return false;

    for (const key in obj) {
      if (dangerousOperators.some(op => key.includes(op))) {
        return true;
      }

      if (typeof obj[key] === 'object' && checkForDangerousOperators(obj[key])) {
        return true;
      }
    }

    return false;
  };

  // Check body
  if (req.body && checkForDangerousOperators(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: Potentially malicious operators detected'
    });
  }

  // Check query
  if (req.query && checkForDangerousOperators(req.query)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: Potentially malicious operators detected'
    });
  }

  next();
};

/**
 * Sanitize MongoDB query to prevent injection
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized: any = {};

  for (const key in query) {
    if (query.hasOwnProperty(key)) {
      // Skip keys that start with $ (MongoDB operators) unless they're in a safe list
      const safeOperators = ['$and', '$or', '$in', '$gte', '$lte', '$gt', '$lt', '$eq'];

      if (key.startsWith('$') && !safeOperators.includes(key)) {
        continue; // Skip dangerous operators
      }

      const value = query[key];

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
 * Validate and sanitize ObjectId
 */
export function sanitizeObjectId(id: string): string | null {
  if (!id || typeof id !== 'string') return null;

  // MongoDB ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;

  const trimmed = id.trim();

  if (!objectIdRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize email address
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
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  // Remove all non-digit characters except +
  const sanitized = phone.replace(/[^\d+]/g, '');

  // Basic validation for international format
  if (sanitized.length < 10 || sanitized.length > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize URL
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
 * Sanitize HTML content - removes dangerous tags while preserving basic formatting
 * Used for product descriptions, reviews, etc.
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object/embed tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // Remove inline event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol from links
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized;
}

/**
 * Sanitize product text fields (name, description, tags, SEO fields)
 */
export function sanitizeProductText(text: string, options?: {
  maxLength?: number;
  allowHTML?: boolean;
  stripTags?: boolean;
}): string {
  if (!text || typeof text !== 'string') return '';

  const { maxLength, allowHTML = false, stripTags = true } = options || {};

  let sanitized = text.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  if (stripTags || !allowHTML) {
    // Remove all HTML tags if not allowed
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    // Sanitize HTML while preserving safe tags
    sanitized = sanitizeHTML(sanitized);
  }

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim to max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize product data object
 */
export function sanitizeProductData(productData: any): any {
  if (!productData || typeof productData !== 'object') return productData;

  const sanitized: any = {};

  // Text fields that should be sanitized (no HTML)
  const textFields = ['name', 'shortDescription', 'brand', 'sku', 'barcode'];
  const htmlFields = ['description']; // Fields that can contain limited HTML
  const seoFields = ['metaTitle', 'metaDescription'];
  const arrayFields = ['tags', 'searchKeywords'];

  // Sanitize text fields (no HTML)
  for (const field of textFields) {
    if (productData[field]) {
      sanitized[field] = sanitizeProductText(productData[field], {
        stripTags: true,
        maxLength: field === 'name' ? 200 : undefined
      });
    }
  }

  // Sanitize HTML fields (limited HTML allowed)
  for (const field of htmlFields) {
    if (productData[field]) {
      sanitized[field] = sanitizeProductText(productData[field], {
        allowHTML: true,
        stripTags: false
      });
    }
  }

  // Sanitize SEO fields
  for (const field of seoFields) {
    if (productData[field]) {
      sanitized[field] = sanitizeProductText(productData[field], {
        stripTags: true,
        maxLength: field === 'metaTitle' ? 60 : 160
      });
    }
  }

  // Sanitize array fields (tags, keywords)
  for (const field of arrayFields) {
    if (Array.isArray(productData[field])) {
      sanitized[field] = productData[field]
        .filter((item: any) => typeof item === 'string')
        .map((item: string) => sanitizeProductText(item, { stripTags: true, maxLength: 50 }))
        .filter((item: string) => item.length > 0);
    }
  }

  // Copy over other fields without modification (numbers, booleans, objects)
  const processedFields = [...textFields, ...htmlFields, ...seoFields, ...arrayFields];
  for (const key in productData) {
    if (productData.hasOwnProperty(key) && !processedFields.includes(key)) {
      sanitized[key] = productData[key];
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize product request data
 */
export const sanitizeProductRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeProductData(req.body);
  }
  next();
};

export default {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeRequest,
  preventNoSQLInjection,
  sanitizeMongoQuery,
  sanitizeObjectId,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeURL,
  sanitizeHTML,
  sanitizeProductText,
  sanitizeProductData,
  sanitizeProductRequest
};
