// @ts-nocheck
/**
 * Admin Routes - Platform Settings
 * Global platform configuration (cashback multiplier, maintenance mode, max coins)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import SystemConfig from '../../models/SystemConfig';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';
import { AdminAuditLog } from '../../models/AdminAuditLog';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

interface PlatformSettings {
  cashbackMultiplier: 1 | 2;
  maintenanceMode: boolean;
  maxCoinsPerDay: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  cashbackMultiplier: 1,
  maintenanceMode: false,
  maxCoinsPerDay: 500,
};

/**
 * GET /api/admin/settings
 * Get platform settings
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const config = await SystemConfig.findOne({ key: 'platform_settings' }).lean();
      const settings = config?.value || DEFAULT_SETTINGS;
      return sendSuccess(res, settings, 'Platform settings fetched');
    } catch (error: any) {
      logger.error('[PlatformSettings] GET failed:', error.message);
      return sendError(res, 'Failed to fetch platform settings', 500);
    }
  }),
);

/**
 * PATCH /api/admin/settings
 * Update platform settings (superadmin only)
 */
router.patch(
  '/',
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { cashbackMultiplier, maintenanceMode, maxCoinsPerDay } = req.body;

      // Validate inputs
      if (cashbackMultiplier !== undefined) {
        if (![1, 2].includes(cashbackMultiplier)) {
          return sendError(res, 'cashbackMultiplier must be 1 or 2', 400);
        }
      }

      if (maxCoinsPerDay !== undefined) {
        if (typeof maxCoinsPerDay !== 'number' || maxCoinsPerDay < 0) {
          return sendError(res, 'maxCoinsPerDay must be >= 0', 400);
        }
      }

      if (maintenanceMode !== undefined) {
        if (typeof maintenanceMode !== 'boolean') {
          return sendError(res, 'maintenanceMode must be boolean', 400);
        }
      }

      // Get current settings for audit
      const currentConfig = await SystemConfig.findOne({ key: 'platform_settings' });
      // FIX-TS-001: Cast oldSettings to PlatformSettings to satisfy TypeScript
      // SystemConfig.value is typed as mixed, so we need explicit cast here
      const oldSettings = (currentConfig?.value as unknown as PlatformSettings) || DEFAULT_SETTINGS;

      // Build new settings (merge with existing)
      const newSettings: PlatformSettings = {
        cashbackMultiplier: cashbackMultiplier ?? oldSettings.cashbackMultiplier,
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : oldSettings.maintenanceMode,
        maxCoinsPerDay: maxCoinsPerDay ?? oldSettings.maxCoinsPerDay,
      };

      // Update or create
      const updated = await SystemConfig.findOneAndUpdate(
        { key: 'platform_settings' },
        { $set: { value: newSettings, updatedBy: (req as any).userId, updatedAt: new Date() } },
        { new: true, upsert: true },
      );

      // Audit log
      setImmediate(() => {
        AdminAuditLog.create({
          adminId: (req as any).userId,
          action: 'PLATFORM_SETTINGS_UPDATED',
          method: 'PATCH',
          path: req.originalUrl.split('?')[0],
          targetId: String(updated._id),
          targetType: 'platform-settings',
          ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
          requestBody: { before: oldSettings, after: newSettings },
          responseSuccess: true,
          responseStatus: 200,
          timestamp: new Date(),
        }).catch((err: Error) => {
          logger.error('[PlatformSettings] Failed to write audit log:', err.message);
        });
      });

      return sendSuccess(res, newSettings, 'Platform settings updated');
    } catch (error: any) {
      logger.error('[PlatformSettings] PATCH failed:', error.message);
      return sendError(res, 'Failed to update platform settings', 500);
    }
  }),
);

export default router;
