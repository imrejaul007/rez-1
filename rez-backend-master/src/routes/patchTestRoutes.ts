// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

// GET /api/consumer/patch-tests — get user's patch test history
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select('patchTests').lean();
    res.json({ success: true, data: user?.patchTests || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/consumer/patch-tests/check?category=hair_colour — check if valid test exists
router.get('/check', requireAuth, async (req: any, res) => {
  try {
    const { category } = req.query;

    // RACHEL: attack surface — input validation: validate category parameter (string max length)
    if (category && (typeof category !== 'string' || category.length > 100)) {
      return res.status(400).json({ success: false, error: 'Invalid category parameter' });
    }

    const user = await User.findById(req.user.id).select('patchTests').lean();
    const now = new Date();
    const valid = (user?.patchTests || []).find(
      (pt: any) => pt.serviceCategory === category && pt.result === 'pass' && new Date(pt.expiresAt) > now,
    );
    res.json({ success: true, data: { hasValidTest: !!valid, lastTest: valid || null } });
  } catch (err: any) {
    // RACHEL: attack surface — verbose error responses: hide implementation details
    res.status(500).json({ success: false, error: 'An error occurred checking patch test status' });
  }
});

export default router;
