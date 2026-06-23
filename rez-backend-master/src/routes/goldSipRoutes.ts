// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { getGoldSip, createGoldSip, cancelGoldSip } from '../controllers/goldSipController';

const router = Router();

// Rate limiter for SIP operations (20 per minute per user)
const sipLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many SIP operations. Please try again later.',
});

// GET: Fetch user's active SIP, holdings, and history
router.get('/', sipLimiter, authenticate, getGoldSip);

// POST: Create a new SIP
router.post('/', sipLimiter, authenticate, createGoldSip);

// DELETE: Cancel active SIP
router.delete('/', sipLimiter, authenticate, cancelGoldSip);

export default router;
