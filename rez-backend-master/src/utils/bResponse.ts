/**
 * B-feature response helpers — REZ-vs-NUQTA migration (Phase 0)
 *
 * Nuqta's canonical API response envelope is:
 *     { success: boolean, data?: T, message?: string, error?: string }
 *
 * Existing helpers in `src/utils/response.ts` use a slightly different shape
 * (nested `meta`, `errors[]` arrays). The `b*` family below is intentionally
 * simpler so that frontend code ported from REZ can deserialise payloads
 * without translation layers.
 */
import { Response } from 'express';

/**
 * Send a 200 success response.
 *
 * @param res Express response object.
 * @param data Payload to wrap under the `data` key.
 * @param message Optional human-readable message.
 */
export const bSuccess = <T>(res: Response, data: T, message?: string): Response => {
  return res.status(200).json({
    success: true,
    data,
    ...(message !== undefined ? { message } : {}),
  });
};

/**
 * Send a 201 created response. Same shape as `bSuccess` but with the
 * resource-created HTTP status code.
 */
export const bCreated = <T>(res: Response, data: T, message?: string): Response => {
  return res.status(201).json({
    success: true,
    data,
    ...(message !== undefined ? { message } : {}),
  });
};

/**
 * Send an error response.
 *
 * @param res Express response object.
 * @param message Human-readable error message (also placed under `error`).
 * @param code HTTP status code (defaults to 400).
 * @param details Optional extra fields to merge into the body. Useful for
 *                validation errors, retry hints, etc.
 */
export const bError = (
  res: Response,
  message: string,
  code: number = 400,
  details?: Record<string, any>
): Response => {
  return res.status(code).json({
    success: false,
    error: message,
    ...(details ? details : {}),
  });
};

/**
 * Marker helper used by seed/fixture data. Wraps a payload with `_mocked: true`
 * so the frontend can render a "seed data" banner and disable checkout-style
 * actions. The `_mocked` flag is only attached outside production so that
 * shipped builds never leak the marker.
 *
 * @param data Payload to wrap.
 */
export const bMocked = <T>(data: T): T & { _mocked: boolean } => {
  if (process.env.NODE_ENV === 'production') {
    return data as T & { _mocked: boolean };
  }
  return { _mocked: true, ...(data as object) } as T & { _mocked: boolean };
};