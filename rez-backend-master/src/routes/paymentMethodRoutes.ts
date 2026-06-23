import { Router } from 'express';
import {
  getUserPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod
} from '../controllers/paymentMethodController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Payment method CRUD routes
router.get('/', getUserPaymentMethods);
router.get('/:id', getPaymentMethodById);
router.post('/', createPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);
router.patch('/:id/default', setDefaultPaymentMethod);

export default router;