import { Router, Request, Response, NextFunction } from 'express';
import {
  getTableStatus,
  updateTableStatus,
  startDineInOrder,
  getTableOrder,
  updateTableOrderItems,
  fireCourse,
} from '../controllers/merchant/tableManagementController';
import { authMiddleware } from '../middleware/merchantauth';
import Joi from 'joi';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation schemas
const startOrderSchema = Joi.object({
  storeId: Joi.string().hex().length(24).required(),
  tableId: Joi.string().hex().length(24).required(),
  guestCount: Joi.number().integer().min(1).max(50).required(),
  customerPhone: Joi.string()
    .pattern(/^[0-9+\-\s()]*$/)
    .optional(),
});

const fireCourseSchema = Joi.object({
  storeId: Joi.string().hex().length(24).required(),
  tableId: Joi.string().hex().length(24).required(),
  course: Joi.string().valid('starter', 'main', 'dessert', 'beverage').required(),
});

// Validation middleware helper
const validate = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  req.body = value;
  next();
};

// Table status
router.get('/table-status', getTableStatus);
router.put('/table-status/:tableId', updateTableStatus);
router.patch('/:tableId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'occupied', 'reserved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const merchantId = (req as any).merchantId;
    const { tableId } = req.params;
    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }
    // Import Store model
    const Store = require('../models/Store').default || require('../models/Store');
    const store = await Store.findOne({ _id: storeId, merchantId });
    if (!store) {
      return res.status(403).json({ success: false, message: 'Not authorized for this store' });
    }
    // Update table status in store's tableConfig
    const tableIndex = store.tableConfig?.findIndex(
      (t: any) => t._id?.toString() === tableId || t.tableNumber?.toString() === tableId,
    );
    if (tableIndex >= 0) {
      store.tableConfig[tableIndex].status = status;
      await store.save();
    }
    // Also update any open sessions if marking as available
    if (status === 'available') {
      const TableSession = require('../models/TableSession').default || require('../models/TableSession');
      await TableSession.updateMany(
        { storeId, tableId, status: 'open' },
        { $set: { status: 'closed', closedAt: new Date() } },
      );
    }
    res.json({ success: true, data: { tableId, status } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update table status' });
  }
});
router.patch('/:tableId', async (req, res) => {
  try {
    const { tableNumber, capacity, storeId } = req.body;
    const merchantId = (req as any).merchantId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }
    const Store = require('../models/Store').default || require('../models/Store');
    const store = await Store.findOne({ _id: storeId, merchantId });
    if (!store) {
      return res.status(403).json({ success: false, message: 'Not authorized for this store' });
    }
    const tableIndex = store.tableConfig?.findIndex(
      (t: any) => t._id?.toString() === req.params.tableId || t.tableNumber?.toString() === req.params.tableId,
    );
    if (tableIndex < 0) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    if (tableNumber !== undefined) store.tableConfig[tableIndex].tableNumber = tableNumber;
    if (capacity !== undefined) store.tableConfig[tableIndex].capacity = capacity;
    await store.save();
    res.json({ success: true, message: 'Table updated successfully', data: store.tableConfig[tableIndex] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update table' });
  }
});

// Dine-in order management
router.post('/dine-in/start-order', validate(startOrderSchema), startDineInOrder);
router.get('/table-orders/:tableId', getTableOrder);
router.put('/table-orders/:sessionId/items', updateTableOrderItems);
router.post('/dine-in/fire-course', validate(fireCourseSchema), fireCourse);

export default router;
