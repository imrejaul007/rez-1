// @ts-nocheck
/**
 * Admin Delivery Configuration Routes
 * Manage global delivery settings, zones, and time slots
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { logger } from '../../config/logger';
import SystemConfig from '../../models/SystemConfig';

const router = Router();

router.use(authenticate, requireAdmin);

const DELIVERY_CONFIG_KEY = 'delivery_config';

const DEFAULT_CONFIG = {
  globalSettings: {
    defaultDeliveryFee: 30,
    freeDeliveryThreshold: 299,
    estimatedDeliveryMinutes: 30,
    deliveryHoursOpen: '08:00',
    deliveryHoursClose: '23:00',
  },
  zones: [],
  timeSlots: [],
};

// GET /admin/delivery-config
router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await SystemConfig.findOne({ key: DELIVERY_CONFIG_KEY }).lean();
    res.json({
      success: true,
      data: config?.value || DEFAULT_CONFIG,
    });
  } catch (error: any) {
    logger.error('[DeliveryConfig] Fetch failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery config' });
  }
});

// POST /admin/delivery-config
router.post('/', async (req: Request, res: Response) => {
  try {
    const { globalSettings, zones, timeSlots } = req.body;

    const updated = await SystemConfig.findOneAndUpdate(
      { key: DELIVERY_CONFIG_KEY },
      {
        $set: {
          key: DELIVERY_CONFIG_KEY,
          value: { globalSettings, zones, timeSlots },
          updatedBy: (req as any).user?._id,
        },
      },
      { new: true, upsert: true },
    );

    res.json({ success: true, data: updated.value });
  } catch (error: any) {
    logger.error('[DeliveryConfig] Update failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update delivery config' });
  }
});

export default router;
