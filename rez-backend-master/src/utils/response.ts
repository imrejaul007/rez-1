import { Response } from 'express';

// Standard API response interface
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    timestamp?: string;
    version?: string;
  };
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

// Success response helper
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: APIResponse['meta']
): Response => {
  const response: APIResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta: { ...meta, timestamp: new Date().toISOString() } })
  };

  return res.status(statusCode).json(response);
};

// Error response helper
export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  errors?: Array<{ field?: string; message: string }> | any
): Response => {
  const response: APIResponse = {
    success: false,
    message,
    ...(errors && { errors }),
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  return res.status(statusCode).json(response);
};

// Paginated response helper
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
): Response => {
  const pages = Math.ceil(total / limit);
  
  const response: APIResponse<T[]> = {
    success: true,
    message,
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        pages
      },
      timestamp: new Date().toISOString()
    }
  };

  return res.status(200).json(response);
};

// Created response helper
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

// No content response helper
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

// Not found response helper
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return sendError(res, message, 404);
};

// Bad request response helper
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request'
): Response => {
  return sendError(res, message, 400);
};

// Validation error response helper
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string }>,
  message: string = 'Validation failed'
): Response => {
  return sendError(res, message, 400, errors);
};

// Unauthorized response helper
export const sendUnauthorized = (
  res: Response,
  message: string = 'Authentication required'
): Response => {
  return sendError(res, message, 401);
};

// Forbidden response helper
export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return sendError(res, message, 403);
};

// Conflict response helper
export const sendConflict = (
  res: Response,
  message: string = 'Resource already exists'
): Response => {
  return sendError(res, message, 409);
};

// Too many requests response helper
export const sendTooManyRequests = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return sendError(res, message, 429);
};

// Internal server error response helper
export const sendInternalError = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return sendError(res, message, 500);
};

// Service unavailable response helper
export const sendServiceUnavailable = (
  res: Response,
  message: string = 'Service temporarily unavailable'
): Response => {
  return sendError(res, message, 503);
};