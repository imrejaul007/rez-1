import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  adminGetCampaigns,
  adminCreateCampaign,
  adminUpdateCampaign,
  adminDeleteCampaign,
  adminUpdateStatus,
  adminGetAnalytics,
  adminGetClaims,
  adminFundCampaign,
  adminGetDashboard,
  adminGetFraudAlerts,
  adminDuplicateCampaign,
  adminRejectClaim,
} from '../../controllers/bonusZoneController';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard & aggregate routes
router.get('/dashboard', adminGetDashboard);
router.get('/fraud-alerts', adminGetFraudAlerts);

// Campaign CRUD
router.get('/campaigns', adminGetCampaigns);
router.post('/campaigns', adminCreateCampaign);

// Campaign-specific routes
router.put('/campaigns/:id', adminUpdateCampaign);
router.delete('/campaigns/:id', adminDeleteCampaign);
router.patch('/campaigns/:id/status', adminUpdateStatus);
router.get('/campaigns/:id/analytics', adminGetAnalytics);
router.get('/campaigns/:id/claims', adminGetClaims);
router.post('/campaigns/:id/fund', adminFundCampaign);
router.post('/campaigns/:id/duplicate', adminDuplicateCampaign);

// Claim-specific routes
router.patch('/claims/:claimId/reject', adminRejectClaim);

export default router;
