import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  openOrJoinTableSession,
  getTableSession,
  addOrderToSession,
  requestBill,
  payTableSession,
} from '../controllers/tableSessionController';

const router = Router();

// Open or join a table session (requires auth)
router.post('/open', authenticate, openOrJoinTableSession);

// Get session details (public — allows checking session status)
router.get('/:sessionToken', getTableSession);

// Add an order to the session
router.post('/:sessionToken/add-order', authenticate, addOrderToSession);

// Request the bill
router.post('/:sessionToken/request-bill', authenticate, requestBill);

// Pay the session bill
router.post('/:sessionToken/pay', authenticate, payTableSession);

export default router;
