import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Generic validation middleware factory
 * Creates middleware to validate request data against a Joi schema
 *
 * @param schema - Joi validation schema
 * @param source - Where to validate from ('body', 'query', 'params', or 'all')
 * @returns Express middleware function
 */
export const validate = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let dataToValidate: any;

    switch (source) {
      case 'body':
        dataToValidate = req.body;
        break;
      case 'query':
        dataToValidate = req.query;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      case 'all':
        dataToValidate = {
          body: req.body,
          query: req.query,
          params: req.params
        };
        break;
      default:
        dataToValidate = req.body;
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      convert: true // Attempt to convert values to the correct type
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace request data with validated and sanitized values
    switch (source) {
      case 'body':
        req.body = value;
        break;
      case 'query':
        req.query = value;
        break;
      case 'params':
        req.params = value;
        break;
      case 'all':
        req.body = value.body;
        req.query = value.query;
        req.params = value.params;
        break;
    }

    next();
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'body');
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'query');
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'params');
};

/**
 * Validate multiple sources at once
 */
export const validateAll = (schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: any[] = [];

    // Validate body if schema provided
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        error.details.forEach(detail => {
          validationErrors.push({
            source: 'body',
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          });
        });
      } else {
        req.body = value;
      }
    }

    // Validate query if schema provided
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        error.details.forEach(detail => {
          validationErrors.push({
            source: 'query',
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          });
        });
      } else {
        req.query = value;
      }
    }

    // Validate params if schema provided
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        error.details.forEach(detail => {
          validationErrors.push({
            source: 'params',
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          });
        });
      } else {
        req.params = value;
      }
    }

    // Return errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    next();
  };
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll
};
