import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { SupportConfig } from '../../models/SupportConfig';
import { asyncHandler } from '../../utils/asyncHandler';
import { pick } from '../../utils/safeAssign';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/support-config
 * @desc    Get support configuration singleton
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const config = await SupportConfig.getOrCreate();
    res.json({ success: true, data: config });
  }));

/**
 * @route   PUT /api/admin/support-config
 * @desc    Update support configuration
 * @access  Admin
 *
 * SECURITY: each sub-section has an explicit allowlist. The previous code
 * spread-merged `req.body[field]` into `config.callbackSettings` /
 * `config.queueStatus` — allowing an attacker with a valid admin token to
 * inject internal flags like `isInternal`, `disabledBy`, `_id`. We now use
 * `pick()` for each sub-section.
 */
router.put('/', asyncHandler(async (req: Request, res: Response) => {
    const config = await SupportConfig.getOrCreate();

    // Array fields: replace entirely (each entry is already a primitive)
    const arrayFields = ['phoneNumbers', 'categories'];
    for (const field of arrayFields) {
      if (req.body[field] !== undefined) {
        (config as any)[field] = req.body[field];
        config.markModified(field);
      }
    }

    // Nested object with array: supportHours — sub-field allowlist.
    if (req.body.supportHours !== undefined) {
      const supportHours = pick<Record<string, any>>(req.body.supportHours, [
        'timezone', 'schedule', 'holidays',
      ]);
      if (supportHours.timezone !== undefined) config.supportHours.timezone = supportHours.timezone;
      if (supportHours.schedule !== undefined) config.supportHours.schedule = supportHours.schedule;
      if (supportHours.holidays !== undefined) config.supportHours.holidays = supportHours.holidays;
      config.markModified('supportHours');
    }

    // Object fields: per-field explicit allowlist (was: spread merge).
    const callbackSettingsAllowed = [
      'enabled', 'defaultWaitMinutes', 'maxQueueSize', 'priorityLevels',
      'autoEscalationMinutes', 'businessHoursOnly',
    ];
    const queueStatusAllowed = [
      'currentQueueDepth', 'averageWaitMinutes', 'lastUpdated',
    ];
    if (req.body.callbackSettings !== undefined) {
      const existing = (config as any).callbackSettings?.toObject?.() || (config as any).callbackSettings || {};
      const merged = { ...existing, ...pick<Record<string, any>>(req.body.callbackSettings, callbackSettingsAllowed) };
      (config as any).callbackSettings = merged;
      config.markModified('callbackSettings');
    }
    if (req.body.queueStatus !== undefined) {
      const existing = (config as any).queueStatus?.toObject?.() || (config as any).queueStatus || {};
      const merged = { ...existing, ...pick<Record<string, any>>(req.body.queueStatus, queueStatusAllowed) };
      (config as any).queueStatus = merged;
      config.markModified('queueStatus');
    }

    await config.save();

    res.json({ success: true, data: config, message: 'Support config updated' });
  }));

export default router;
