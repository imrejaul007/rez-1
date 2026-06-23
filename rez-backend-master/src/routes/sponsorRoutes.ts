import { Router } from 'express';
import sponsorController from '../controllers/sponsorController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin only routes
// GET /api/sponsors - List all sponsors
router.get('/', requireAdmin, sponsorController.getSponsors.bind(sponsorController));

// POST /api/sponsors - Create a new sponsor
router.post('/', requireAdmin, sponsorController.createSponsor.bind(sponsorController));

// GET /api/sponsors/:id - Get sponsor by ID
router.get('/:id', requireAdmin, sponsorController.getSponsorById.bind(sponsorController));

// PUT /api/sponsors/:id - Update sponsor
router.put('/:id', requireAdmin, sponsorController.updateSponsor.bind(sponsorController));

// DELETE /api/sponsors/:id - Deactivate sponsor (soft delete)
router.delete('/:id', requireAdmin, sponsorController.deactivateSponsor.bind(sponsorController));

// POST /api/sponsors/:id/activate - Reactivate sponsor
router.post('/:id/activate', requireAdmin, sponsorController.activateSponsor.bind(sponsorController));

// GET /api/sponsors/:id/events - Get sponsor's events
router.get('/:id/events', requireAdmin, sponsorController.getSponsorEvents.bind(sponsorController));

// GET /api/sponsors/:id/analytics - Get sponsor analytics
router.get('/:id/analytics', requireAdmin, sponsorController.getSponsorAnalytics.bind(sponsorController));

// Budget management
// POST /api/sponsors/:id/fund - Fund sponsor budget
router.post('/:id/fund', requireAdmin, sponsorController.fundSponsor.bind(sponsorController));

// GET /api/sponsors/:id/budget - Get budget summary
router.get('/:id/budget', requireAdmin, sponsorController.getSponsorBudget.bind(sponsorController));

// POST /api/sponsors/:id/allocate - Allocate budget to event
router.post('/:id/allocate', requireAdmin, sponsorController.allocateBudget.bind(sponsorController));

// GET /api/sponsors/:id/ledger - Get allocation ledger
router.get('/:id/ledger', requireAdmin, sponsorController.getSponsorLedger.bind(sponsorController));

export default router;
