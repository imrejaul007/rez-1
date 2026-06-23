/**
 * routes/merchant/purchaseOrders.ts
 * Purchase order management routes
 */

import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../controllers/merchant/purchaseOrderController';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// List POs with filters
router.get('/', getPurchaseOrders);

// Get a single PO
router.get('/:id', getPurchaseOrder);

// Create a new PO
router.post('/', createPurchaseOrder);

// Update PO
router.put('/:id', updatePurchaseOrder);

// Receive goods
router.patch('/:id/receive', receivePurchaseOrder);

// Cancel PO
router.patch('/:id/cancel', cancelPurchaseOrder);

export default router;
