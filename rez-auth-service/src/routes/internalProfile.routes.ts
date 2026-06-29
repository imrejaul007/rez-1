import { Router, Request, Response } from 'express';
import { requireInternalToken } from '../middleware/internalAuth';
import { ProfileService } from '../services/profile.service';
import { logger } from '../config/logger';

const router = Router();

// POST /internal/profile/transaction - Record transaction from any vertical
router.post('/profile/transaction', requireInternalToken, async (req: Request, res: Response) => {
  try {
    const { userId, phone, vertical, amount, merchantId, category } = req.body;

    if (!userId || !phone || !vertical || !amount || !merchantId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    await ProfileService.recordTransaction({
      userId,
      phone,
      vertical,
      amount: parseFloat(amount),
      merchantId,
      category: category || 'general',
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalProfile] Failed to record transaction', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /internal/profile/engagement - Record engagement
router.post('/profile/engagement', requireInternalToken, async (req: Request, res: Response) => {
  try {
    const { userId, phone } = req.body;

    if (!userId || !phone) {
      res.status(400).json({ success: false, message: 'Missing userId or phone' });
      return;
    }

    await ProfileService.recordEngagement(userId, phone);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('[InternalProfile] Failed to record engagement', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /internal/profile/:userId - Get profile summary
router.get('/profile/:userId', requireInternalToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { phone } = req.query;

    if (!phone) {
      res.status(400).json({ success: false, message: 'Phone query param required' });
      return;
    }

    const profile = await ProfileService.getProfileSummary(userId, String(phone));
    res.json({ success: true, data: profile });
  } catch (err: any) {
    logger.error('[InternalProfile] Failed to get profile', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /internal/profile/refresh - Batch refresh engagement scores (for scheduler)
router.post('/profile/refresh', requireInternalToken, async (req: Request, res: Response) => {
  try {
    const { batchSize = 1000 } = req.body;
    const UserProfile = (await import('../models/UserProfile')).UserProfile;

    const cursor = UserProfile.find({}).limit(batchSize).cursor();
    let count = 0;

    for await (const profile of cursor) {
      try {
        await ProfileService.recordEngagement(profile.userId, profile.phone);
        count++;
      } catch (err: any) {
        logger.warn('[InternalProfile] Failed to refresh profile', { userId: profile.userId, error: err.message });
      }
    }

    res.json({ success: true, data: { count } });
  } catch (err: any) {
    logger.error('[InternalProfile] Batch refresh failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
