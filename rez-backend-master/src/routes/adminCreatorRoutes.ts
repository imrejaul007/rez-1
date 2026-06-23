import { Router } from 'express';
import {
  adminGetCreators,
  adminApproveCreator,
  adminRejectCreator,
  adminToggleFeatured,
  adminUpdateTier,
  adminSuspendCreator,
  adminUnsuspendCreator,
  adminGetStats,
  adminGetPicks,
  adminModeratePick,
  adminGetConfig,
  adminUpdateConfig,
  adminGetConversions,
} from '../controllers/creatorController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth);
router.use(requireAdmin);

// Get all creators (with optional status filter)
router.get('/', adminGetCreators);

// Get creator program stats
router.get('/stats', adminGetStats);

// Get creator program config
router.get('/config', adminGetConfig);

// Update creator program config
router.put('/config', adminUpdateConfig);

// Get all picks for moderation
router.get('/picks', adminGetPicks);

// Moderate a pick (approve/reject)
router.patch('/picks/:pickId/moderate', adminModeratePick);

// Get conversions
router.get('/conversions', adminGetConversions);

// Approve a creator
router.patch('/:id/approve', adminApproveCreator);

// Reject a creator
router.patch('/:id/reject', adminRejectCreator);

// Toggle featured status
router.patch('/:id/feature', adminToggleFeatured);

// Update creator tier
router.patch('/:id/tier', adminUpdateTier);

// Suspend a creator
router.patch('/:id/suspend', adminSuspendCreator);

// Unsuspend a creator
router.patch('/:id/unsuspend', adminUnsuspendCreator);

export default router;
