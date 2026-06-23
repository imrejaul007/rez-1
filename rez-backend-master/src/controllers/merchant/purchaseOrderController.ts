/**
 * Purchase Order Controller
 *
 * Manages purchase orders from suppliers
 */

import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import mongoose, { Types } from 'mongoose';
import { PurchaseOrder } from '../../models/PurchaseOrder';
import { Supplier } from '../../models/Supplier';
import { Product } from '../../models/Product';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * GET /api/merchant/purchase-orders
 * List purchase orders with filters
 */
export const getPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchant._id;
  const { status, supplierId, startDate, endDate, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * pageSize;

  const query: any = {
    merchantId: new Types.ObjectId(merchantId),
  };

  if (status) {
    query.status = status;
  }

  if (supplierId && Types.ObjectId.isValid(supplierId as string)) {
    query.supplierId = new Types.ObjectId(supplierId as string);
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      const endDateObj = new Date(endDate as string);
      endDateObj.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDateObj;
    }
  }

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query)
      .populate('supplierId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    PurchaseOrder.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * GET /api/merchant/purchase-orders/:id
 * Get a single PO with details
 */
export const getPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  }

  const order = await PurchaseOrder.findOne({
    _id: new Types.ObjectId(id),
    merchantId: new Types.ObjectId(merchantId),
  })
    .populate('supplierId')
    .populate('items.productId', 'name sku pricing')
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, message: 'Purchase order not found' });
  }

  res.json({ success: true, data: order });
});

/**
 * POST /api/merchant/purchase-orders
 * Create a new PO
 */
export const createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchant._id;
  const { supplierId, items, expectedDate, notes } = req.body;

  if (!supplierId || !Types.ObjectId.isValid(supplierId)) {
    return res.status(400).json({ success: false, message: 'Valid supplier ID is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required' });
  }

  // Verify supplier belongs to merchant
  const supplier = await Supplier.findOne({
    _id: new Types.ObjectId(supplierId),
    merchantId: new Types.ObjectId(merchantId),
  });

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  // Calculate total amount
  let totalAmount = 0;
  const processedItems = items.map((item: any) => {
    const total = (item.quantity || 0) * (item.unitCost || 0);
    totalAmount += total;
    return {
      productId: item.productId ? new Types.ObjectId(item.productId) : undefined,
      productName: item.productName || '',
      quantity: item.quantity || 1,
      unitCost: item.unitCost || 0,
      totalCost: total,
      receivedQty: 0,
    };
  });

  const order = new PurchaseOrder({
    merchantId: new Types.ObjectId(merchantId),
    supplierId: new Types.ObjectId(supplierId),
    items: processedItems,
    totalAmount,
    expectedDate: expectedDate ? new Date(expectedDate) : undefined,
    notes: notes?.trim() || '',
    createdBy: (req as any).merchant._id,
    status: 'draft',
  });

  await order.save();
  await order.populate('supplierId');

  res.status(201).json({ success: true, data: order });
});

/**
 * PUT /api/merchant/purchase-orders/:id
 * Update a PO
 */
export const updatePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;
  const { items, expectedDate, notes, status } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  }

  const order = await PurchaseOrder.findOne({
    _id: new Types.ObjectId(id),
    merchantId: new Types.ObjectId(merchantId),
  });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Purchase order not found' });
  }

  // Can only update draft orders (except status field)
  if (order.status !== 'draft' && items) {
    return res.status(400).json({ success: false, message: 'Cannot modify items on non-draft POs' });
  }

  if (items && Array.isArray(items)) {
    let totalAmount = 0;
    order.items = items.map((item: any) => {
      const total = (item.quantity || 0) * (item.unitCost || 0);
      totalAmount += total;
      return {
        ...item,
        totalCost: total,
      };
    });
    order.totalAmount = totalAmount;
  }

  if (expectedDate !== undefined) {
    order.expectedDate = expectedDate ? new Date(expectedDate) : undefined;
  }

  if (notes !== undefined) {
    order.notes = notes.trim();
  }

  if (status !== undefined) {
    const validStatuses = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    order.status = status;
  }

  await order.save();
  await order.populate('supplierId');

  res.json({ success: true, data: order });
});

/**
 * PATCH /api/merchant/purchase-orders/:id/receive
 * Mark items as received
 */
export const receivePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;
  const { items } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items array is required' });
  }

  const order = await PurchaseOrder.findOne({
    _id: new Types.ObjectId(id),
    merchantId: new Types.ObjectId(merchantId),
  });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Purchase order not found' });
  }

  // Update received quantities
  items.forEach((receivedItem: any) => {
    const orderItem = order.items.find(
      (item: any) =>
        item.productId?.toString() === receivedItem.productId || item._id?.toString() === receivedItem.itemId,
    );
    if (orderItem) {
      orderItem.receivedQty = receivedItem.receivedQty || 0;
    }
  });

  // Check if all items received
  const allReceived = order.items.every((item: any) => item.receivedQty >= item.quantity);

  order.status = allReceived ? 'received' : 'partial';
  order.receivedDate = new Date();

  await order.save();

  res.json({ success: true, message: 'Goods received', data: order });
});

/**
 * PATCH /api/merchant/purchase-orders/:id/cancel
 * Cancel a PO
 */
export const cancelPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  }

  const order = await PurchaseOrder.findOne({
    _id: new Types.ObjectId(id),
    merchantId: new Types.ObjectId(merchantId),
  });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Purchase order not found' });
  }

  if (order.status === 'received' || order.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Cannot cancel this PO' });
  }

  order.status = 'cancelled';
  await order.save();

  res.json({ success: true, message: 'Purchase order cancelled', data: order });
});
