import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info('🔍 [Validation] Validating request body:', {
      bodyKeys: Object.keys(req.body || {}),
      hasFile: !!req.file,
      contentType: req.headers['content-type'],
    });
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.error('❌ [Validation] Validation failed:', error.details);
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    logger.info('✅ [Validation] Validation passed');
    // Replace req.body with validated and sanitized data
    req.body = value;
   return next();
  };
};
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Trim all string values in req.query
    Object.keys(req.query).forEach((key) => {
      const val = req.query[key];
      if (typeof val === 'string') {
        req.query[key] = val.trim();
      }
    });

    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors: validationErrors
      });
    }

    (req as any).validatedQuery = value;
    return next();
  };
};




export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors: validationErrors
      });
    }

    req.params = value;
   return next();
  };
};