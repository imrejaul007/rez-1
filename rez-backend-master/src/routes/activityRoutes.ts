import { Router } from 'express';
import {
  getUserActivities,
  getActivityById,
  createActivity,
  deleteActivity,
  clearAllActivities,
  getActivitySummary,
  batchCreateActivities
} from '../controllers/activityController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Activity routes
router.get('/', getUserActivities);
router.get('/summary', getActivitySummary);
router.get('/:id', getActivityById);
router.post('/', createActivity);
router.post('/batch', batchCreateActivities);
router.delete('/:id', deleteActivity);
router.delete('/', clearAllActivities);

export default router;