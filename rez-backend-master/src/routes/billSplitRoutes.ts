import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  createBillSplit,
  listBillSplits,
  getBillSplit,
  payBillSplit,
  declineBillSplit,
  cancelBillSplit,
} from '../controllers/billSplitController';

const router = Router();

// All routes require authentication
router.use(authenticate);

const splitWriteLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many bill split requests. Please try again later.',
});
const splitReadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests.',
});

// CRUD operations
router.post('/', splitWriteLimiter, createBillSplit);
router.get('/', splitReadLimiter, listBillSplits);
router.get('/:id', splitReadLimiter, getBillSplit);

// Participant actions
router.post('/:id/pay', splitWriteLimiter, payBillSplit);
router.post('/:id/decline', splitWriteLimiter, declineBillSplit);

// Initiator cancel
router.delete('/:id', splitWriteLimiter, cancelBillSplit);

export default router;
