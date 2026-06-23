// @ts-nocheck
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getOverview, getHotels, toggleBrandCoin } from '../../controllers/admin/otaAdminController';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// Overview / aggregate stats
router.get('/overview', getOverview);

// Hotel list (paginated)
router.get('/hotels', getHotels);

// Toggle brand coin for a specific hotel
router.post('/hotels/:hotelId/brand-coin', toggleBrandCoin);

export default router;
