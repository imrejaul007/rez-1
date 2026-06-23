// @ts-nocheck
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import FeatureFlag from '../models/FeatureFlag';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import redisService from '../services/redisService';

const router = Router();

const REDIS_APP_CONFIG_KEY = 'app:config';
const REDIS_FEATURE_FLAGS_KEY = 'app:feature_flags';
const FEATURE_FLAGS_TTL = 60; // 60 seconds — short enough to pick up flag changes within a minute

// In-memory defaults — used as fallback when Redis is unavailable.
const defaultAppConfig = {
  forceUpdate: false,
  minVersion: '1.0.0',
  maintenanceMode: false,
  maintenanceMessage: "We're performing maintenance. Back shortly!",
  androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.rez.consumer',
  iosStoreUrl: 'https://apps.apple.com/app/rez/id000000000',
  updatedAt: new Date().toISOString(),
};

// In-memory cache — kept in sync with Redis so reads are fast.
// On restart the cache is re-populated from Redis on the first GET.
let appConfig = { ...defaultAppConfig };
let cachePopulated = false;

/**
 * Hydrate the in-memory cache from Redis once after each process restart.
 * Falls back silently to defaults when Redis is unavailable.
 */
async function ensureCachePopulated(): Promise<void> {
  if (cachePopulated) return;
  try {
    const stored = await redisService.get<typeof defaultAppConfig>(REDIS_APP_CONFIG_KEY);
    if (stored) {
      appConfig = stored;
    }
  } catch (err) {
    logger.warn('[appConfig] Redis read failed on startup, using in-memory defaults:', err);
  }
  cachePopulated = true;
}

/**
 * GET /api/config/app-status
 * Called by all 3 apps on startup (NO AUTH required)
 * Returns force-update, maintenance mode, store URLs, AND feature flags (for client-side flag evaluation)
 *
 * NIDHI GOVERNANCE FIX: Extended to include feature flags object so clients can make
 * feature-aware decisions without separate API call. This enables admin to control
 * feature availability across all platforms from a single endpoint without code deploy.
 */
router.get('/app-status', async (req: Request, res: Response) => {
  try {
    // Hydrate in-memory cache from Redis on first request after restart
    await ensureCachePopulated();

    // Feature flags: serve from Redis cache (TTL=60s) to avoid hitting MongoDB on every app startup.
    // Previously this was an uncached DB query that caused 12-second collection scans in production.
    let featureFlags: Record<string, boolean | number> = {};
    try {
      const cached = await redisService.get<Record<string, boolean | number>>(REDIS_FEATURE_FLAGS_KEY);
      if (cached) {
        featureFlags = cached;
      } else {
        const flags = await FeatureFlag.find({ enabled: true }).select('key enabled rolloutPercentage').lean();
        for (const flag of flags) {
          featureFlags[flag.key] = flag.rolloutPercentage === 100 ? true : flag.rolloutPercentage;
        }
        // Cache result; non-fatal if Redis write fails
        redisService.set(REDIS_FEATURE_FLAGS_KEY, featureFlags, FEATURE_FLAGS_TTL).catch(() => {});
      }
    } catch {
      // Redis unavailable — fall back to DB read
      const flags = await FeatureFlag.find({ enabled: true }).select('key enabled rolloutPercentage').lean();
      for (const flag of flags) {
        featureFlags[flag.key] = flag.rolloutPercentage === 100 ? true : flag.rolloutPercentage;
      }
    }

    res.json({
      success: true,
      data: {
        ...appConfig,
        featureFlags, // NEW: Client can now check client-side feature gates
      },
    });
  } catch (error) {
    logger.error('[appConfig] Error fetching app status:', error);
    throw new AppError('Failed to fetch app status', 500);
  }
});

/**
 * PATCH /api/config/app-status
 * Admin only — update force-update, maintenance mode settings
 */
router.patch('/app-status', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // Validate incoming data
    if (typeof updates.forceUpdate !== 'undefined' && typeof updates.forceUpdate !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'forceUpdate must be a boolean',
      });
    }

    if (typeof updates.minVersion !== 'undefined' && typeof updates.minVersion !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'minVersion must be a string',
      });
    }

    if (typeof updates.maintenanceMode !== 'undefined' && typeof updates.maintenanceMode !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'maintenanceMode must be a boolean',
      });
    }

    if (typeof updates.maintenanceMessage !== 'undefined' && typeof updates.maintenanceMessage !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'maintenanceMessage must be a string',
      });
    }

    // Update in-memory cache
    appConfig = {
      ...appConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Persist to Redis so config survives restarts (no TTL — config is long-lived)
    try {
      await redisService.set(REDIS_APP_CONFIG_KEY, appConfig);
    } catch (redisErr) {
      // Non-fatal: in-memory update already applied; log and continue
      logger.error('[appConfig] Failed to persist config to Redis:', redisErr);
    }

    res.json({
      success: true,
      data: appConfig,
    });
  } catch (error) {
    logger.error('[appConfig] Error updating app status:', error);
    throw new AppError('Failed to update app status', 500);
  }
});

export default router;
