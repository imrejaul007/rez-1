// @ts-nocheck
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  getAdCampaigns,
  getAdCampaignStats,
  approveAdCampaign,
  rejectAdCampaign,
  pauseAdCampaign,
} from '../../controllers/admin/adCampaignAdminController';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// List & stats
router.get('/', getAdCampaigns);
router.get('/stats', getAdCampaignStats);

// Campaign actions
router.post('/:id/approve', approveAdCampaign);
router.post('/:id/reject', rejectAdCampaign);
router.post('/:id/pause', pauseAdCampaign);

export default router;
