import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import {
  getReferrals,
  getAnalytics,
  getFraudDashboard,
  approveReferral,
  rejectReferral,
  runFraudScan,
  getLeaderboard,
  getStatsSummary,
} from '../../controllers/adminReferralController';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard summary
router.get('/stats-summary', getStatsSummary);

// Analytics
router.get('/analytics', getAnalytics);

// Fraud management
router.get('/fraud', getFraudDashboard);
router.post('/scan-fraud', runFraudScan);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// List & filter referrals (must come after specific routes)
router.get('/', getReferrals);

// Individual referral actions (parameterized routes last)
router.post('/:id/approve', approveReferral);
router.post('/:id/reject', rejectReferral);

export default router;
