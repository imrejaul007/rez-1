import { Request, Response, NextFunction, RequestHandler } from 'express';

// Async handler to catch errors in async route handlers
export const asyncHandler = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Alternative async handler with explicit typing
export const catchAsync = <T extends RequestHandler>(fn: T): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: Error) => next(error));
  };
};