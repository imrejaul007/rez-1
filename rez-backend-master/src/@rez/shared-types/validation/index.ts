// @ts-nocheck
/**
 * Validation Schemas Package
 * Centralized input validation using Zod
 *
 * Usage:
 *   import { userSchema, paginationSchema, validateBody } from '@rez/shared/validation';
 */

export * from './user';
export * from './common';
export * from './middleware';

// Re-export Zod for convenience
export { z } from 'zod';
