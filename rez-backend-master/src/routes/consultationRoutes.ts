import express from 'express';
import {
  createConsultation,
  getUserConsultations,
  getConsultation,
  getStoreConsultations,
  cancelConsultation,
  checkAvailability
} from '../controllers/consultationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/availability/:storeId', checkAvailability);

// Protected routes (require authentication)
router.post('/', authenticate, createConsultation);
router.get('/user', authenticate, getUserConsultations);
router.get('/store/:storeId', authenticate, getStoreConsultations);
router.get('/:consultationId', authenticate, getConsultation);
router.put('/:consultationId/cancel', authenticate, cancelConsultation);

export default router;
