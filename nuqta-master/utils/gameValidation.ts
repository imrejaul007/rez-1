// @ts-nocheck
/**
 * Game Input Validation Utilities
 *
 * Provides comprehensive validation for all game-related inputs
 * Prevents common attack vectors and ensures data integrity
 */

import { QuizAnswerRequest } from '@/types/gamification.types';

// Validation error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ==================== GENERAL VALIDATORS ====================

/**
 * Validate coin amount
 * Ensures coin amounts are positive integers within reasonable bounds
 */
export function validateCoinAmount(amount: number): boolean {
  if (typeof amount !== 'number') {
    throw new ValidationError('Coin amount must be a number', 'amount', 'INVALID_TYPE');
  }

  if (!Number.isInteger(amount)) {
    throw new ValidationError('Coin amount must be an integer', 'amount', 'NOT_INTEGER');
  }

  if (amount < 0) {
    throw new ValidationError('Coin amount cannot be negative', 'amount', 'NEGATIVE_VALUE');
  }

  if (amount > 1000000) {
    throw new ValidationError('Coin amount exceeds maximum limit', 'amount', 'EXCEEDS_LIMIT');
  }

  return true;
}

/**
 * Validate user ID
 */
export function validateUserId(userId: string): boolean {
  if (typeof userId !== 'string') {
    throw new ValidationError('User ID must be a string', 'userId', 'INVALID_TYPE');
  }

  if (userId.trim().length === 0) {
    throw new ValidationError('User ID cannot be empty', 'userId', 'EMPTY_VALUE');
  }

  // MongoDB ObjectId validation (24 character hex string)
  const objectIdRegex = /^[a-f\d]{24}$/i;
  if (!objectIdRegex.test(userId)) {
    throw new ValidationError('Invalid user ID format', 'userId', 'INVALID_FORMAT');
  }

  return true;
}

/**
 * Validate game ID
 */
export function validateGameId(gameId: string): boolean {
  if (typeof gameId !== 'string') {
    throw new ValidationError('Game ID must be a string', 'gameId', 'INVALID_TYPE');
  }

  if (gameId.trim().length === 0) {
    throw new ValidationError('Game ID cannot be empty', 'gameId', 'EMPTY_VALUE');
  }

  // MongoDB ObjectId validation
  const objectIdRegex = /^[a-f\d]{24}$/i;
  if (!objectIdRegex.test(gameId)) {
    throw new ValidationError('Invalid game ID format', 'gameId', 'INVALID_FORMAT');
  }

  return true;
}

// ==================== QUIZ VALIDATORS ====================

/**
 * Validate quiz answer
 * Ensures answer is within valid range and prevents tampering
 */
export function validateQuizAnswer(answer: number, maxOptions: number = 4): boolean {
  if (typeof answer !== 'number') {
    throw new ValidationError('Answer must be a number', 'answer', 'INVALID_TYPE');
  }

  if (!Number.isInteger(answer)) {
    throw new ValidationError('Answer must be an integer', 'answer', 'NOT_INTEGER');
  }

  if (answer < 0 || answer >= maxOptions) {
    throw new ValidationError(
      `Answer must be between 0 and ${maxOptions - 1}`,
      'answer',
      'OUT_OF_RANGE'
    );
  }

  return true;
}

/**
 * Validate quiz answer request
 */
export function validateQuizAnswerRequest(request: QuizAnswerRequest): boolean {
  // Validate game ID
  validateGameId(request.gameId);

  // Validate question ID
  if (typeof request.questionId !== 'string' || request.questionId.trim().length === 0) {
    throw new ValidationError('Invalid question ID', 'questionId', 'INVALID_VALUE');
  }

  // Validate answer
  validateQuizAnswer(request.answer);

  return true;
}

/**
 * Validate quiz difficulty
 */
export function validateQuizDifficulty(
  difficulty: string
): difficulty is 'easy' | 'medium' | 'hard' {
  const validDifficulties = ['easy', 'medium', 'hard'];

  if (!validDifficulties.includes(difficulty)) {
    throw new ValidationError(
      'Invalid quiz difficulty',
      'difficulty',
      'INVALID_VALUE'
    );
  }

  return true;
}

// ==================== SPIN WHEEL VALIDATORS ====================

/**
 * Validate spin wheel result
 * Ensures spin results are within expected bounds (anti-cheat)
 */
export function validateSpinWheelResult(rotation: number): boolean {
  if (typeof rotation !== 'number') {
    throw new ValidationError('Rotation must be a number', 'rotation', 'INVALID_TYPE');
  }

  if (rotation < 0 || rotation > 360) {
    throw new ValidationError(
      'Rotation must be between 0 and 360 degrees',
      'rotation',
      'OUT_OF_RANGE'
    );
  }

  return true;
}

// ==================== SCRATCH CARD VALIDATORS ====================

/**
 * Validate scratch card ID
 */
export function validateScratchCardId(cardId: string): boolean {
  if (typeof cardId !== 'string') {
    throw new ValidationError('Card ID must be a string', 'cardId', 'INVALID_TYPE');
  }

  if (cardId.trim().length === 0) {
    throw new ValidationError('Card ID cannot be empty', 'cardId', 'EMPTY_VALUE');
  }

  // MongoDB ObjectId validation
  const objectIdRegex = /^[a-f\d]{24}$/i;
  if (!objectIdRegex.test(cardId)) {
    throw new ValidationError('Invalid card ID format', 'cardId', 'INVALID_FORMAT');
  }

  return true;
}

// ==================== CHALLENGE VALIDATORS ====================

/**
 * Validate challenge ID
 */
export function validateChallengeId(challengeId: string): boolean {
  if (typeof challengeId !== 'string') {
    throw new ValidationError('Challenge ID must be a string', 'challengeId', 'INVALID_TYPE');
  }

  if (challengeId.trim().length === 0) {
    throw new ValidationError('Challenge ID cannot be empty', 'challengeId', 'EMPTY_VALUE');
  }

  // MongoDB ObjectId validation
  const objectIdRegex = /^[a-f\d]{24}$/i;
  if (!objectIdRegex.test(challengeId)) {
    throw new ValidationError('Invalid challenge ID format', 'challengeId', 'INVALID_FORMAT');
  }

  return true;
}

// ==================== SANITIZATION ====================

/**
 * Sanitize string input
 * Removes potentially dangerous characters and scripts
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove script tags and their content (full XSS removal)
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove SQL injection attempts (key SQL keywords, statement separators, and comment markers)
  sanitized = sanitized.replace(/\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|SELECT|UNION|FROM|WHERE|TABLE|INTO)\b/gi, '');
  sanitized = sanitized.replace(/('|"|;|--|\*|\/\*|\*\/|xp_|sp_|exec|execute)/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize object
 * Recursively sanitizes all string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) => {
          if (typeof item === 'string') {
            // For array items, strip HTML/script tags but preserve inner text
            return item
              .replace(/<\/?script\b[^>]*>/gi, '')
              .replace(/<[^>]*>/g, '')
              .trim();
          }
          if (typeof item === 'object' && item !== null) {
            return sanitizeObject(item);
          }
          return item;
        });
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized as T;
}

// ==================== RATE LIMIT VALIDATORS ====================

/**
 * Validate timestamp for cooldown checks
 */
export function validateCooldown(
  lastActionTime: number | null,
  cooldownMs: number
): { isValid: boolean; remainingMs: number } {
  if (!lastActionTime) {
    return { isValid: true, remainingMs: 0 };
  }

  const now = Date.now();
  const timeSinceLastAction = now - lastActionTime;
  const remainingMs = Math.max(0, cooldownMs - timeSinceLastAction);

  return {
    isValid: timeSinceLastAction >= cooldownMs,
    remainingMs,
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if value is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  const objectIdRegex = /^[a-f\d]{24}$/i;
  return objectIdRegex.test(id);
}

/**
 * Format validation error for user display
 */
export function formatValidationError(error: ValidationError): string {
  switch (error.code) {
    case 'INVALID_TYPE':
      return `Invalid input: ${error.field} has an incorrect type`;
    case 'EMPTY_VALUE':
      return `Invalid input: ${error.field} cannot be empty`;
    case 'INVALID_FORMAT':
      return `Invalid input: ${error.field} format is incorrect`;
    case 'OUT_OF_RANGE':
      return `Invalid input: ${error.field} is out of acceptable range`;
    case 'NEGATIVE_VALUE':
      return `Invalid input: ${error.field} cannot be negative`;
    case 'EXCEEDS_LIMIT':
      return `Invalid input: ${error.field} exceeds maximum limit`;
    case 'NOT_INTEGER':
      return `Invalid input: ${error.field} must be a whole number`;
    default:
      return error.message || 'Invalid input';
  }
}

// ==================== EXPORTS ====================

export const GameValidation = {
  // General
  validateCoinAmount,
  validateUserId,
  validateGameId,

  // Quiz
  validateQuizAnswer,
  validateQuizAnswerRequest,
  validateQuizDifficulty,

  // Spin Wheel
  validateSpinWheelResult,

  // Scratch Card
  validateScratchCardId,

  // Challenge
  validateChallengeId,

  // Sanitization
  sanitizeString,
  sanitizeObject,

  // Rate Limiting
  validateCooldown,

  // Helpers
  isValidObjectId,
  formatValidationError,
};

export default GameValidation;
