// @ts-nocheck
/**
 * Express Validation Middleware
 * Validates request body, query, and params using Zod schemas
 *
 * Usage:
 *   import { validateBody, validateQuery, validateParams } from '@rez/shared/validation';
 *
 *   router.post('/users', validateBody(userRegistrationSchema), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Format Zod validation errors into a standard response
 */
function formatZodError(error: ZodError): { errors: Array<{ path: string; message: string }> } {
  return {
    errors: error.issues.map((issue: { path: (string | number)[]; message: string }) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        ...formatZodError(result.error),
      });
    }

    // Replace body with validated/transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'QUERY_VALIDATION_ERROR',
        ...formatZodError(result.error),
      });
    }

    // Replace query with validated/transformed data
    req.query = result.data as any;
    next();
  };
}

/**
 * Validate route parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'PARAMS_VALIDATION_ERROR',
        ...formatZodError(result.error),
      });
    }

    // Replace params with validated/transformed data
    req.params = result.data as any;
    next();
  };
}

/**
 * Validate multiple parts of the request at once
 */
export function validate<TBody, TQuery, TParams>(schemas: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ location: string; errors: Array<{ path: string; message: string }> }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push({ location: 'body', errors: formatZodError(result.error).errors });
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push({ location: 'query', errors: formatZodError(result.error).errors });
      } else {
        req.query = result.data as any;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push({ location: 'params', errors: formatZodError(result.error).errors });
      } else {
        req.params = result.data as any;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    next();
  };
}
