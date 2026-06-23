import { Router } from 'express';
import {
  scheduleStoreVisit,
  getQueueNumber,
  getUserStoreVisits,
  getStoreVisit,
  getStoreVisits,
  cancelStoreVisit,
  getCurrentQueueStatus,
  checkStoreAvailability,
  getAvailableSlotsHandler,
  rescheduleStoreVisit
} from '../controllers/storeVisitController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Protected routes - require authentication
router.post('/schedule', authenticate, scheduleStoreVisit);
router.post('/queue', optionalAuth, getQueueNumber); // Optional auth for walk-ins
router.get('/user', authenticate, getUserStoreVisits);
router.put('/:visitId/reschedule', authenticate, rescheduleStoreVisit);
router.put('/:visitId/cancel', authenticate, cancelStoreVisit);
router.get('/store/:storeId', authenticate, getStoreVisits);
router.get('/:visitId', authenticate, getStoreVisit);

// Public routes - no authentication required
router.get('/available-slots/:storeId', getAvailableSlotsHandler);
router.get('/queue-status/:storeId', getCurrentQueueStatus);
router.get('/availability/:storeId', checkStoreAvailability);

export default router;
