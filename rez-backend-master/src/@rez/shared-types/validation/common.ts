// @ts-nocheck
/**
 * Common Validation Schemas
 * Shared schemas for pagination, IDs, and general validation
 */

import { z } from 'zod';

// MongoDB ObjectId
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

// UUID v4
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Cursor-based pagination (for large datasets)
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Date range
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().or(z.date()).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: 'Start date must be before or equal to end date' },
  );

// Search query
export const searchSchema = z
  .object({
    q: z.string().min(1).max(200).optional(),
    query: z.string().min(1).max(200).optional(),
  })
  .transform((data) => data.q || data.query || '');

// URL (must be HTTPS in production)
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (url) => {
      if (process.env.NODE_ENV === 'production') {
        return url.startsWith('https://');
      }
      return true;
    },
    { message: 'URL must use HTTPS in production' },
  );

// ISO Date string
export const isoDateSchema = z.string().datetime('Invalid ISO date format');

// Slug (URL-friendly identifier)
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

// Positive integer
export const positiveIntSchema = z.number().int().positive('Must be a positive integer');

// Export types
export type Pagination = z.infer<typeof paginationSchema>;
export type CursorPagination = z.infer<typeof cursorPaginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Search = z.infer<typeof searchSchema>;
