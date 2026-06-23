import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  getActiveCampaigns,
  getCampaignDetail,
  claimCampaignReward,
  getMyClaims,
  checkEligibility,
} from '../controllers/bonusZoneController';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// Rate limiter for claim endpoint (10 per minute per user)
const claimLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many claim attempts. Please try again later.',
});

// Rate limiter for eligibility checks (100 per minute per user)
const eligibilityLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many eligibility checks. Please try again later.',
});

// All routes require authentication
router.use(requireAuth);

// PHASE 2 — disabled until core is stable
router.use(requireGamificationFeature('bonusZones', { campaigns: [] }));

// Static routes first
router.get('/campaigns', getActiveCampaigns);
router.get('/my-claims', getMyClaims);

// Dynamic routes
router.get('/campaigns/:slug', getCampaignDetail);
router.get('/campaigns/:slug/eligibility', eligibilityLimiter, checkEligibility);
router.post('/campaigns/:slug/claim', claimLimiter, claimCampaignReward);

export default router;
