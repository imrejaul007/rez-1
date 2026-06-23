import { Request, Response, NextFunction } from 'express';
import { Store } from '../models/Store';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('qr-abuse-protection');

// ── Config ───────────────────────────────────────────────
const QR_COOLDOWN_SECONDS = 180;           // 3 minutes between same QR scans
const STORE_VELOCITY_WINDOW = 600;         // 10-minute window
const STORE_VELOCITY_MAX = 50;             // Max initiations per store per window
const DEFAULT_MAX_DISTANCE_KM = 5;         // Max km from store

// ── Haversine helper ─────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ── Middleware ────────────────────────────────────────────

/**
 * Block the same user from scanning the same QR code within 3 minutes.
 * Prevents rapid repeated scans/payment initiations.
 * Fail-open: if Redis unavailable, allows the request.
 */
export function qrCooldown() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      const qrCode = req.body?.qrCode || req.params?.qrCode || req.body?.storeId;

      // Skip if no user (public endpoint) or no identifiable QR/store
      if (!userId || !qrCode) return next();

      const key = `qr:cooldown:${userId}:${qrCode}`;
      const existing = await redisService.get(key);

      if (existing) {
        logger.warn('QR cooldown active', { userId, qrCode: String(qrCode).substring(0, 20) });
        return res.status(429).json({
          success: false,
          message: 'Please wait before scanning this QR code again',
        });
      }

      // Set cooldown
      await redisService.set(key, '1', QR_COOLDOWN_SECONDS);
      next();
    } catch {
      // Fail-open
      next();
    }
  };
}

/**
 * Validate that the user is within maxKm of the store.
 * Expects latitude/longitude in req.body alongside storeId.
 * Skips gracefully if location not provided or store has no coordinates.
 */
export function validateDistance(maxKm: number = DEFAULT_MAX_DISTANCE_KM) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, latitude, longitude } = req.body;

      // Skip if no location data provided (graceful degradation)
      if (!latitude || !longitude || !storeId) return next();

      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return next();

      const store = await Store.findById(storeId)
        .select('location.coordinates')
        .lean();

      // Skip if store has no coordinates set
      const coords = (store as any)?.location?.coordinates;
      if (!coords || coords.length < 2) return next();

      const distance = haversineDistance(lat, lng, coords[1], coords[0]);

      if (distance > maxKm) {
        const userId = (req as any).user?.id || (req as any).userId;
        logger.warn('QR distance violation', {
          userId,
          storeId,
          distanceKm: Math.round(distance * 100) / 100,
          maxKm,
        });
        return res.status(403).json({
          success: false,
          message: 'You appear to be too far from this store',
        });
      }

      next();
    } catch {
      // Fail-open
      next();
    }
  };
}

/**
 * Detect unusual scan velocity for a single store.
 * If a store receives >50 payment initiations in 10 minutes,
 * block further attempts (potential fraud ring or bot attack).
 * Fail-open: if Redis unavailable, allows the request.
 */
export function merchantScanAnomaly() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.body;
      if (!storeId) return next();

      const key = `qr:store_velocity:${storeId}`;
      const count = await redisService.atomicIncr(key, STORE_VELOCITY_WINDOW);

      if (count !== null && count > STORE_VELOCITY_MAX) {
        logger.warn('Merchant scan anomaly detected', {
          storeId,
          count,
          threshold: STORE_VELOCITY_MAX,
          windowMinutes: STORE_VELOCITY_WINDOW / 60,
        });
        return res.status(429).json({
          success: false,
          message: 'Unusual activity detected. Please try again later.',
        });
      }

      next();
    } catch {
      // Fail-open
      next();
    }
  };
}
