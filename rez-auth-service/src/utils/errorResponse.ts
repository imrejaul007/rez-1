/**
 * Standardized error responses for rez-auth-service.
 * Compatible with Express Response and existing auth service patterns.
 */

import type { Response } from 'express';

/**
 * Standardized error response format for all services.
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

/**
 * Standardized success response format for all services.
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

/**
 * Custom API error class with HTTP status code support.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sends a standardized error response via Express Response.
 *
 * @param res - Express Response object
 * @param statusCode - HTTP status code (number or ApiError) or error object
 * @param message - Error message (or second parameter if statusCode is an object)
 * @param code - Optional error code for client handling
 * @param details - Optional additional error details
 */
export function errorResponse(
  res: Response,
  statusCode: number | ApiError | { message: string; code?: string },
  message?: string,
  code?: string,
  details?: unknown
): void {
  let httpStatus: number;
  let errMessage: string;
  let errCode: string | undefined;
  let errDetails: unknown;

  if (statusCode instanceof ApiError) {
    httpStatus = statusCode.statusCode;
    errMessage = statusCode.message;
    errCode = statusCode.code;
    errDetails = statusCode.details;
  } else if (typeof statusCode === 'object') {
    // Handle error object with message and code
    httpStatus = 400;
    errMessage = statusCode.message;
    errCode = statusCode.code;
    errDetails = details;
  } else {
    httpStatus = statusCode;
    errMessage = message || 'An error occurred';
    errCode = code;
    errDetails = details;
  }

  res.status(httpStatus).json({
    success: false,
    error: errMessage,
    code: errCode,
    details: errDetails,
  });
}

/**
 * Creates a standardized success response object.
 *
 * @param data - Response data
 * @param requestId - Optional request ID for tracing
 * @returns SuccessResponse object
 */
export function successResponse<T>(data: T, requestId?: string): SuccessResponse<T> {
  return { success: true, data, requestId };
}

/**
 * Sends a standardized success response via Express Response.
 *
 * @param res - Express Response object
 * @param data - Response data
 * @param requestId - Optional request ID for tracing
 */
export function successResponseWithRes<T>(res: Response, data: T, requestId?: string): void {
  res.status(200).json(successResponse(data, requestId));
}

export function errorResponseWithRes(
  res: Response,
  statusCode: number | ApiError | { message: string; code?: string },
  message?: string,
  code?: string,
  details?: unknown
): void {
  errorResponse(res, statusCode, message, code, details);
}

/**
 * Error codes for common authentication errors.
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Token expired',
  AUTH_003: 'Invalid token',
  AUTH_004: 'Unauthorized access',
  AUTH_005: 'Account locked',
  AUTH_006: 'Insufficient permissions',
  AUTH_007: 'MFA required',
  AUTH_008: 'Invalid OTP',
  AUTH_009: 'OTP expired',

  // Server errors
  SRV_001: 'Internal server error',
  SRV_002: 'Database error',
  SRV_003: 'Service unavailable',

  // Resource errors
  RES_001: 'Resource not found',
  RES_002: 'Resource already exists',
  RES_003: 'Resource deleted',

  // Validation errors
  VAL_001: 'Invalid input',
  VAL_002: 'Missing required field',

  // Rate limiting
  RATE_001: 'Too many requests',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
