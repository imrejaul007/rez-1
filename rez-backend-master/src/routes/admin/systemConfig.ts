// @ts-nocheck
import { Router, Request, Response } from 'express';
import SystemConfig from '../../models/SystemConfig';
import { requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError, sendBadRequest } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';

const router = Router();

/**
 * GET /api/admin/system-config
 * Fetch all system configuration
 */
router.get(
  '/system-config',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const configs = await SystemConfig.find().sort({ category: 1, key: 1 }).lean();
      sendSuccess(res, { configs }, 'System config retrieved');
    } catch (err) {
      sendError(res, 'Failed to fetch system config', 500);
    }
  }),
);

/**
 * GET /api/admin/system-config/:key
 * Fetch a specific config value
 */
router.get(
  '/system-config/:key',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const config = await SystemConfig.findOne({ key: req.params.key }).lean();
      if (!config) return sendBadRequest(res, 'Config not found');
      sendSuccess(res, { config }, 'Config retrieved');
    } catch (err) {
      sendError(res, 'Failed to fetch config', 500);
    }
  }),
);

/**
 * PATCH /api/admin/system-config/:key
 * Update a system configuration value
 *
 * BAK-GATEWAY-004 FIX: Only whitelisted fields can be updated.
 * Previously the entire req.body was written directly to the config document,
 * allowing an admin with limited UI permissions to update any field (e.g. _id,
 * createdAt, category) via direct API calls.
 */
const CONFIG_UPDATE_ALLOWLIST = ['value', 'description', 'type', 'category'];

router.patch(
  '/system-config/:key',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { value, description, type, category } = req.body;

      // Reject any unknown fields — prevent mass assignment of arbitrary keys
      const receivedKeys = Object.keys(req.body);
      const disallowed = receivedKeys.filter((k) => !CONFIG_UPDATE_ALLOWLIST.includes(k));
      if (disallowed.length > 0) {
        logger.warn('[SystemConfig] PATCH with disallowed fields attempted', { key: req.params.key, disallowed });
        return sendBadRequest(res, `Disallowed fields: ${disallowed.join(', ')}`);
      }

      const updateFields: Record<string, any> = {};
      if (value !== undefined) updateFields.value = value;
      if (description !== undefined) updateFields.description = description;
      if (type !== undefined) updateFields.type = type;
      if (category !== undefined) updateFields.category = category;

      if (Object.keys(updateFields).length === 0) {
        return sendBadRequest(res, 'No valid fields provided');
      }

      const config = await SystemConfig.findOneAndUpdate(
        { key: req.params.key },
        { $set: updateFields },
        { new: true },
      );

      if (!config) return sendBadRequest(res, 'Config not found');
      sendSuccess(res, { config }, 'Config updated');
    } catch (err) {
      sendError(res, 'Failed to update config', 500);
    }
  }),
);

/**
 * POST /api/admin/system-config
 * Create a new system configuration
 */
router.post(
  '/system-config',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { key, value, type, description, category } = req.body;

      if (!key || !value || !type || !category) {
        return sendBadRequest(res, 'Key, value, type, and category are required');
      }

      const existing = await SystemConfig.findOne({ key });
      if (existing) {
        return sendBadRequest(res, 'Config with this key already exists');
      }

      const config = new SystemConfig({
        key,
        value,
        type,
        description,
        category,
      });

      await config.save();
      sendSuccess(res, { config }, 'Config created', 201);
    } catch (err) {
      sendError(res, 'Failed to create config', 500);
    }
  }),
);

export default router;
