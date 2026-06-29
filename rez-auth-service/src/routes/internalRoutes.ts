import { Router, Request, Response } from 'express';
import { requireInternalToken } from '../middleware/internalAuth';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { ApiError } from '../utils/errorResponse';

const router = Router();
router.use(requireInternalToken);

/**
 * POST /internal/users/patch-tests
 * Called by rez-merchant-service to record patch test results for a customer.
 * This is the canonical path — patch test records live on the User document
 * which is owned by auth-service. Merchant service MUST NOT write to users
 * collection directly.
 *
 * Headers:
 *   x-internal-token: <service-internal-token>
 *   x-internal-service: rez-merchant-service
 */
router.post('/users/patch-tests', async (req: Request, res: Response) => {
  try {
    const { customerPhone, serviceCategory, result, conductedBy } = req.body;

    if (!customerPhone || !serviceCategory || !result) {
      throw new ApiError(400, 'customerPhone, serviceCategory, result are required');
    }

    if (!['pass', 'reaction'].includes(result)) {
      throw new ApiError(400, 'result must be "pass" or "reaction"');
    }

    const testedAt = new Date();
    const expiresAt = new Date(testedAt.getTime() + 6 * 30 * 24 * 3600000); // 6 months

    const patchTest = {
      serviceCategory,
      testedAt,
      expiresAt,
      result,
      conductedBy: conductedBy || 'staff',
    };

    const user = await User.findOneAndUpdate(
      { phoneNumber: customerPhone },
      {
        $push: { patchTests: patchTest },
        $setOnInsert: { phoneNumber: customerPhone },
      },
      { upsert: false, new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, `No user found with phone: ${customerPhone}`);
    }

    logger.info('[INTERNAL] Patch test recorded', {
      phone: customerPhone,
      serviceCategory,
      result,
      conductedBy,
    });

    res.json({
      success: true,
      data: {
        testedAt,
        expiresAt,
        result,
        serviceCategory,
      },
    });
  } catch (e: any) {
    logger.error('[INTERNAL] Failed to record patch test', {
      error: e.message,
      phone: req.body.customerPhone,
    });
    throw new ApiError(500, e.message);
  }
});

/**
 * GET /internal/users?phone=<phoneNumber>
 * Look up a user by phone number. Used by rez-merchant-service to
 * verify customer exists before recording patch test.
 */
router.get('/users', async (req: Request, res: Response) => {
  // E8: Audit-log every internal PII lookup so a compromised service token
  // is detectable through log anomalies. Previously there was no record of
  // which service queried which phone number — any misuse was invisible.
  const callerService = (req.headers['x-internal-service'] as string) || 'unknown';
  const correlationId = (req.headers['x-correlation-id'] as string) || 'none';
  const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
  // Mask phone in logs — log last 4 digits only.
  const maskedPhone = phone ? `***${phone.slice(-4)}` : '<empty>';

  try {
    if (!phone) {
      throw new ApiError(400, 'phone query param required');
    }

    const user = await User.findOne({ phoneNumber: phone })
      .select('_id phoneNumber name email patchTests')
      .lean();

    logger.info('[INTERNAL AUDIT] user-lookup-by-phone', {
      callerService,
      correlationId,
      phone: maskedPhone,
      found: !!user,
      ip: req.ip,
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({ success: true, data: user });
  } catch (e: any) {
    logger.error('[INTERNAL] User lookup failed', {
      error: e.message,
      callerService,
      correlationId,
      phone: maskedPhone,
    });
    throw new ApiError(500, e.message);
  }
});

/**
 * POST /internal/users/bulk
 * Bulk lookup users by IDs. Replaces direct DB access from rez-merchant-service.
 * Only returns name, email, phone — no sensitive fields.
 */
router.post('/users/bulk', async (req: Request, res: Response) => {
  const callerService = (req.headers['x-internal-service'] as string) || 'unknown';

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, 'ids array is required');
    }
    if (ids.length > 1000) {
      throw new ApiError(400, 'Maximum 1000 IDs per request');
    }

    const users = await User.find({ _id: { $in: ids } })
      .select('_id name email phone phoneNumber')
      .lean();

    logger.info('[INTERNAL AUDIT] user-bulk-lookup', {
      callerService,
      count: users.length,
      requested: ids.length,
      ip: req.ip,
    });

    res.json({ success: true, data: users });
  } catch (e: any) {
    logger.error('[INTERNAL] Bulk user lookup failed', { error: e.message, callerService });
    throw new ApiError(500, e.message);
  }
});

/**
 * POST /internal/users/:id/push-token
 * Register or update a push token for a user.
 * Replaces direct User.findByIdAndUpdate from rez-merchant-service.
 */
router.post('/users/:id/push-token', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { token, platform, deviceName, action } = req.body;

  if (!token || !platform) {
    throw new ApiError(400, 'token and platform are required');
  }
  if (!['ios', 'android', 'web'].includes(platform)) {
    throw new ApiError(400, 'platform must be ios, android, or web');
  }
  if (!['register', 'unregister'].includes(action)) {
    throw new ApiError(400, 'action must be "register" or "unregister"');
  }

  try {
    if (action === 'register') {
      // Remove any existing token with the same value to avoid duplicates
      await User.findByIdAndUpdate(id, {
        $pull: { 'pushNotifications.tokens': { token } },
      });
      // Then add the new token
      await User.findByIdAndUpdate(id, {
        $push: {
          'pushNotifications.tokens': {
            token,
            platform,
            deviceName: deviceName || null,
            registeredAt: new Date(),
            active: true,
          },
        },
        $set: { 'pushNotifications.enabled': true },
      }, { upsert: false });
    } else {
      await User.findByIdAndUpdate(id, {
        $pull: { 'pushNotifications.tokens': { token } },
      });
    }

    logger.info(`[INTERNAL] Push token ${action}d`, { userId: id, platform, callerService: req.headers['x-internal-service'] });
    res.json({ success: true });
  } catch (e: any) {
    logger.error('[INTERNAL] Push token update failed', { userId: id, error: e.message });
    throw new ApiError(500, e.message);
  }
});

export default router;
