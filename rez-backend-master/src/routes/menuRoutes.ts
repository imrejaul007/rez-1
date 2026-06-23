// Menu Routes
import express from 'express';
import {
  getStoreMenu,
  createOrUpdateMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItem,
  createPreOrder,
  getUserPreOrders,
  getPreOrder,
  cancelPreOrder,
  searchMenuItems,
} from '../controllers/menuController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes - Menu viewing
router.get('/store/:storeId', getStoreMenu);
router.get('/items/:itemId', getMenuItem);
router.get('/search', searchMenuItems);

// Protected routes - Menu management (store owners/admins only)
router.post('/store/:storeId', authenticate, createOrUpdateMenu);
router.post('/items', authenticate, addMenuItem);
router.put('/items/:itemId', authenticate, updateMenuItem);
router.delete('/items/:itemId', authenticate, deleteMenuItem);

// Protected routes - Pre-orders
router.post('/pre-orders', authenticate, createPreOrder);
router.get('/pre-orders/user', authenticate, getUserPreOrders);
router.get('/pre-orders/:preOrderId', authenticate, getPreOrder);
router.put('/pre-orders/:preOrderId/cancel', authenticate, cancelPreOrder);

export default router;
