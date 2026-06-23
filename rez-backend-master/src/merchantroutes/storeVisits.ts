import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import {
  getStoreVisitsForMerchant,
  getVisitStats,
  updateVisitStatusByMerchant
} from '../controllers/storeVisitController';

const router = Router();

// All routes require merchant authentication
router.get('/', authMiddleware, getStoreVisitsForMerchant);
router.get('/stats', authMiddleware, getVisitStats);
router.put('/:visitId/status', authMiddleware, updateVisitStatusByMerchant);

export default router;
