import { Router } from 'express';
import {
  uploadPhotos,
  getMyUploads,
  getStorePhotos,
  moderatePhoto,
  getPendingPhotos,
} from '../controllers/photoUploadController';
import { authenticate as authenticateToken } from '../middleware/auth';

const router = Router();

// User endpoints (authenticated)
router.post('/upload', authenticateToken, uploadPhotos);
router.get('/my-uploads', authenticateToken, getMyUploads);

// Public endpoint
router.get('/store/:storeId', getStorePhotos);

// Admin/Merchant endpoints (authenticated — role check can be added via middleware)
router.get('/pending', authenticateToken, getPendingPhotos);
router.patch('/:id/moderate', authenticateToken, moderatePhoto);

export default router;
