import express from 'express';
import {
  uploadHealthRecord,
  getUserHealthRecords,
  getHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  shareHealthRecord,
  revokeShare,
  archiveHealthRecord,
  getSharedWithMe
} from '../controllers/healthRecordController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Health record CRUD operations
router.post('/', uploadHealthRecord);
router.get('/', getUserHealthRecords);
router.get('/shared-with-me', getSharedWithMe);
router.get('/:id', getHealthRecord);
router.put('/:id', updateHealthRecord);
router.delete('/:id', deleteHealthRecord);

// Sharing operations
router.post('/:id/share', shareHealthRecord);
router.delete('/:id/share/:shareId', revokeShare);

// Archive operations
router.post('/:id/archive', archiveHealthRecord);

export default router;
