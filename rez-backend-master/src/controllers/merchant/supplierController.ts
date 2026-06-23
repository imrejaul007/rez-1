/**
 * Supplier Controller
 *
 * CRUD operations for suppliers
 */

import { Request, Response } from 'express';
import { logger } from '../../config/logger';
import mongoose, { Types } from 'mongoose';
import { Supplier } from '../../models/Supplier';
import { Product } from '../../models/Product';
import { asyncHandler } from '../../utils/asyncHandler';
import { escapeRegex } from '../../utils/sanitize';

/**
 * GET /api/merchant/suppliers
 * List suppliers with pagination and search
 */
export const getSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchant._id;
  const { search, page = '1', limit = '20', isActive = 'true' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * pageSize;

  const query: any = {
    merchantId: new Types.ObjectId(merchantId),
    isActive: isActive === 'false' ? false : true,
  };

  if (search) {
    // SECURITY: escapeRegex() prevents NoSQL/$regex injection.
    // Passing req.query.search directly as a $regex value allows an attacker to craft
    // catastrophic backtracking patterns (ReDoS) or operator injection via crafted strings.
    const safeSearch = escapeRegex((search as string).trim());
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { phone: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(query).select('-products').sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    Supplier.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: suppliers,
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  });
});

/**
 * GET /api/merchant/suppliers/:id
 * Get a single supplier with full details
 */
export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
  }

  const supplier = await Supplier.findOne({
    _id: new Types.ObjectId(id),
    merchantId: new Types.ObjectId(merchantId),
  })
    .populate('products.productId', 'name sku pricing')
    .lean();

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  res.json({ success: true, data: supplier });
});

/**
 * POST /api/merchant/suppliers
 * Create a new supplier
 */
export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchant._id;
  const { name, contactName, phone, email, address, city, state, gstNumber, paymentTerms, notes } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Supplier name is required' });
  }

  const supplier = new Supplier({
    merchantId: new Types.ObjectId(merchantId),
    name: name.trim(),
    contactName: contactName?.trim() || '',
    phone: phone?.trim() || '',
    email: email?.trim().toLowerCase() || '',
    address: address?.trim() || '',
    city: city?.trim() || '',
    state: state?.trim() || '',
    gstNumber: gstNumber?.trim().toUpperCase() || '',
    paymentTerms: paymentTerms?.trim() || 'Immediate',
    notes: notes?.trim() || '',
    products: [],
  });

  await supplier.save();

  res.status(201).json({ success: true, data: supplier });
});

/**
 * PUT /api/merchant/suppliers/:id
 * Update a supplier
 */
export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;
  const { name, contactName, phone, email, address, city, state, gstNumber, paymentTerms, notes, isActive } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (contactName !== undefined) updateData.contactName = contactName.trim();
  if (phone !== undefined) updateData.phone = phone.trim();
  if (email !== undefined) updateData.email = email.trim().toLowerCase();
  if (address !== undefined) updateData.address = address.trim();
  if (city !== undefined) updateData.city = city.trim();
  if (state !== undefined) updateData.state = state.trim();
  if (gstNumber !== undefined) updateData.gstNumber = gstNumber.trim().toUpperCase();
  if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms.trim();
  if (notes !== undefined) updateData.notes = notes.trim();
  if (isActive !== undefined) updateData.isActive = isActive;

  const supplier = await Supplier.findOneAndUpdate(
    { _id: new Types.ObjectId(id), merchantId: new Types.ObjectId(merchantId) },
    updateData,
    { new: true, runValidators: true },
  );

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  res.json({ success: true, data: supplier });
});

/**
 * DELETE /api/merchant/suppliers/:id
 * Soft delete a supplier
 */
export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
  }

  const supplier = await Supplier.findOneAndUpdate(
    { _id: new Types.ObjectId(id), merchantId: new Types.ObjectId(merchantId) },
    { isActive: false },
    { new: true },
  );

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  res.json({ success: true, message: 'Supplier deleted', data: supplier });
});

/**
 * GET /api/merchant/suppliers/:id/products
 * Get products linked to a supplier
 */
export const getSupplierProducts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const merchantId = (req as any).merchant._id;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
  }

  const supplier = await Supplier.findOne({
    _id: new Types.ObjectId(id),
    merchantId: new Types.ObjectId(merchantId),
  })
    .populate('products.productId')
    .lean();

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  res.json({
    success: true,
    data: {
      supplierId: supplier._id,
      supplierName: supplier.name,
      products: supplier.products,
    },
  });
});
