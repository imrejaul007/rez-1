/**
 * src/middleware/trialQR.ts
 * QR code JWT signing and verification for trial bookings
 */

import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// QR Token Payload
export interface QRTokenPayload {
  bookingId: string;
  userId: string;
  merchantId: string;
  trialId: string;
  expiresAt: number; // unix timestamp in milliseconds
  geoHash: string; // simplified geohash of merchant location
}

/**
 * Sign a QR JWT token for trial booking
 * Used when booking is created, passed to client for QR code generation
 */
export function signQRToken(payload: QRTokenPayload): string {
  const secret = process.env.TRIAL_QR_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('TRIAL_QR_SECRET or JWT_SECRET environment variable is required');
  }

  if (secret.length < 32) {
    throw new Error('QR secret must be at least 32 characters long for security');
  }

  try {
    // SEC fix: derive a standard JWT `exp` claim from the custom `expiresAt`
    // (ms-since-epoch) so the token is rejected by ANY JWT verifier, not
    // just our custom post-verify check inside `verifyQRToken`. Defense in
    // depth — if a future caller swaps `verifyQRToken` for `jwt.verify`
    // directly, the expiry is still enforced at parse time.
    const nowSec = Math.floor(Date.now() / 1000);
    const customExpSec = payload.expiresAt
      ? Math.floor(payload.expiresAt / 1000)
      : nowSec + 3600;
    const expSec = Math.max(nowSec + 60, customExpSec); // at minimum 60s in the future

    const token = jwt.sign({ ...payload, exp: expSec }, secret, {
      algorithm: 'HS256',
    });

    logger.info('[TRIAL QR] Token signed successfully', {
      bookingId: payload.bookingId,
      expiresAt: payload.expiresAt,
      jwtExp: expSec,
    });

    return token;
  } catch (error: any) {
    logger.error('[TRIAL QR] Failed to sign token: ' + error.message);
    throw error;
  }
}

/**
 * Verify a QR JWT token
 * Returns null if token is invalid or expired (never throws)
 */
export function verifyQRToken(token: string): QRTokenPayload | null {
  const secret = process.env.TRIAL_QR_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    logger.error('[TRIAL QR] QR secret not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as QRTokenPayload;

    // Check custom expiration
    if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
      logger.warn('[TRIAL QR] Token has expired', {
        bookingId: decoded.bookingId,
        expiresAt: decoded.expiresAt,
        now: Date.now(),
      });
      return null;
    }

    return decoded;
  } catch (error: any) {
    logger.warn('[TRIAL QR] Token verification failed:', {
      error: error.message,
      tokenLength: token?.length || 0,
    });
    return null;
  }
}

/**
 * Express middleware to validate QR token
 * Reads token from req.body.qrToken
 * Attaches decoded payload to req.trialQR on success
 */
export function validateTrialQR(req: Request, res: Response, next: NextFunction) {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      logger.warn('[TRIAL QR MIDDLEWARE] Missing qrToken in request body');
      res.status(400).json({
        success: false,
        message: 'QR token is required',
        code: 'MISSING_QR_TOKEN',
      });
      return;
    }

    const decoded = verifyQRToken(qrToken);

    if (!decoded) {
      logger.warn('[TRIAL QR MIDDLEWARE] Invalid or expired QR token');
      res.status(401).json({
        success: false,
        message: 'QR token is invalid or has expired',
        code: 'INVALID_QR_TOKEN',
      });
      return;
    }

    // Attach decoded payload to request
    (req as any).trialQR = decoded;

    logger.debug('[TRIAL QR MIDDLEWARE] Token validated successfully', {
      bookingId: decoded.bookingId,
      merchantId: decoded.merchantId,
    });

    next();
  } catch (error: any) {
    logger.error('[TRIAL QR MIDDLEWARE] Unexpected error during validation: ' + error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token validation',
    });
  }
}

// Extend Express Request type with trialQR property
declare global {
  namespace Express {
    interface Request {
      trialQR?: QRTokenPayload;
    }
  }
}
