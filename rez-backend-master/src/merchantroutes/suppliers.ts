/**
 * routes/merchant/suppliers.ts
 * Supplier management routes
 */

import { Router } from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
} from '../controllers/merchant/supplierController';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// List suppliers with pagination
router.get('/', getSuppliers);

// Get a single supplier
router.get('/:id', getSupplier);

// Create a new supplier
router.post('/', createSupplier);

// Update supplier
router.put('/:id', updateSupplier);

// Delete (soft delete) supplier
router.delete('/:id', deleteSupplier);

// Get products for a supplier
router.get('/:id/products', getSupplierProducts);

export default router;
