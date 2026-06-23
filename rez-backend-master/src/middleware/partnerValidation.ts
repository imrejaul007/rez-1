// Partner Route Input Validation Middleware
// Validates all partner API inputs to prevent malicious data

import { param, body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? (err as any).path : 'unknown',
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Validation for claiming milestone rewards
 */
export const validateClaimMilestone = [
  param('milestoneId')
    .notEmpty().withMessage('Milestone ID is required')
    .isString().withMessage('Milestone ID must be a string')
    .matches(/^milestone-\d+$/).withMessage('Invalid milestone ID format (expected: milestone-{number})')
    .isLength({ max: 50 }).withMessage('Milestone ID too long'),
  handleValidationErrors
];

/**
 * Validation for claiming task rewards
 */
export const validateClaimTask = [
  param('taskId')
    .notEmpty().withMessage('Task ID is required')
    .isString().withMessage('Task ID must be a string')
    .isLength({ min: 3, max: 100 }).withMessage('Task ID must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s]+$/).withMessage('Task ID contains invalid characters'),
  handleValidationErrors
];

/**
 * Validation for claiming jackpot rewards
 */
export const validateClaimJackpot = [
  param('spendAmount')
    .notEmpty().withMessage('Spend amount is required')
    .isInt({ min: 25000, max: 100000 }).withMessage('Spend amount must be between 25000 and 100000')
    .custom((value) => {
      const validAmounts = [25000, 50000, 100000];
      const numValue = parseInt(value);
      if (!validAmounts.includes(numValue)) {
        throw new Error('Invalid jackpot tier. Must be 25000, 50000, or 100000');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation for updating task progress
 */
export const validateUpdateTaskProgress = [
  param('taskType')
    .notEmpty().withMessage('Task type is required')
    .isString().withMessage('Task type must be a string')
    .isIn(['profile', 'review', 'referral', 'social', 'purchase'])
    .withMessage('Invalid task type. Must be one of: profile, review, referral, social, purchase')
    .isLength({ max: 50 }).withMessage('Task type too long'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 1000 }).withMessage('Progress must be a number between 0 and 1000'),
  handleValidationErrors
];

/**
 * Validation for claiming partner offers
 */
export const validateClaimOffer = [
  body('offerId')
    .notEmpty().withMessage('Offer ID is required')
    .isString().withMessage('Offer ID must be a string')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Offer ID must be between 1 and 200 characters'),
  handleValidationErrors
];

/**
 * Validation for requesting payout
 */
export const validateRequestPayout = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 100, max: 100000 }).withMessage('Amount must be between ₹100 and ₹100,000')
    .custom((value) => {
      // Amount must be in multiples of 100
      if (value % 100 !== 0) {
        throw new Error('Amount must be in multiples of ₹100');
      }
      return true;
    }),
  body('method')
    .notEmpty().withMessage('Payout method is required')
    .isString().withMessage('Payout method must be a string')
    .isIn(['bank', 'upi', 'wallet']).withMessage('Invalid payout method. Must be: bank, upi, or wallet'),
  body('details')
    .optional()
    .isObject().withMessage('Details must be an object')
    .custom((value) => {
      // Validate based on method
      if (typeof value === 'object' && value !== null) {
        const keys = Object.keys(value);
        if (keys.length > 10) {
          throw new Error('Too many detail fields');
        }
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Sanitize string input (remove HTML, scripts, etc.)
 */
export const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return '';
  
  return value
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove potential XSS characters
    .trim()
    .slice(0, 1000); // Limit length
};

/**
 * Validate and sanitize user input in request body
 */
export const sanitizeRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
};

