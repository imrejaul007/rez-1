// @ts-nocheck
import { Router, Request, Response } from 'express';
import { CatalogItem } from '../models/CatalogItem';
import { Store } from '../models/Store';
import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify the requesting merchant owns the store.
 * Used by all protected routes.
 */
async function verifyMerchantStoreOwnership(
  storeSlug: string,
  merchantId: string,
): Promise<{ storeId: mongoose.Types.ObjectId } | null> {
  const store = await Store.findOne({ slug: storeSlug }).select('_id merchantId displayMode').lean();
  if (!store) return null;
  if ((store as any).merchantId?.toString() !== merchantId) return null;
  return { storeId: (store as any)._id as mongoose.Types.ObjectId };
}

// ─── GET /api/catalog/:storeSlug ───────────────────────────────────────────────

router.get(
  '/:storeSlug',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug } = req.params;

    const store = await Store.findOne({ slug: storeSlug, isActive: true }).select('displayMode').lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const displayMode = (store as any).displayMode || 'menu';

    // Only return items relevant to the store's displayMode
    const query: Record<string, any> = { storeSlug, isAvailable: true };

    if (displayMode === 'catalog') {
      query.type = 'product';
    } else if (displayMode === 'services' || displayMode === 'appointments') {
      query.type = 'service';
    }
    // 'menu' returns all items (backward-compatible)

    const items = await CatalogItem.find(query).lean();
    const formatted = items.map((item) => {
      const base = {
        id: String(item._id),
        type: item.type,
        name: item.name,
        description: item.description || '',
        basePrice: item.basePrice,
        formattedPrice: `₹${(item.basePrice / 100).toFixed(0)}`,
        currency: item.currency,
        images: item.images,
        tags: item.tags,
        isAvailable: item.isAvailable,
        category: item.category,
      };

      if (item.type === 'product') {
        return {
          ...base,
          variants: item.variants,
          stock: item.stock,
          mrp: item.mrp,
          formattedMrp: item.mrp ? `₹${(item.mrp / 100).toFixed(0)}` : undefined,
          savings: item.mrp && item.mrp > item.basePrice ? item.mrp - item.basePrice : undefined,
          bulkPricing: item.bulkPricing,
        };
      }

      if (item.type === 'service') {
        return {
          ...base,
          durationMinutes: item.durationMinutes,
          staff: item.staff,
          bookingRequiresDeposit: item.bookingRequiresDeposit,
          depositAmount: item.depositAmount,
        };
      }

      return base;
    });

    return res.json({ success: true, data: { displayMode, items: formatted } });
  }),
);

// ─── GET /api/catalog/:storeSlug/items/:itemId ─────────────────────────────────

router.get(
  '/:storeSlug/items/:itemId',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, itemId } = req.params;

    const item = await CatalogItem.findOne({ _id: itemId, storeSlug }).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const formatted: Record<string, any> = {
      id: String(item._id),
      type: item.type,
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice,
      formattedPrice: `₹${(item.basePrice / 100).toFixed(0)}`,
      currency: item.currency,
      images: item.images,
      tags: item.tags,
      isAvailable: item.isAvailable,
      category: item.category,
      isVeg: item.isVeg,
      spiceLevel: item.spiceLevel,
    };

    if (item.type === 'product') {
      formatted.variants = item.variants;
      formatted.stock = item.stock;
      formatted.mrp = item.mrp;
      formatted.formattedMrp = item.mrp ? `₹${(item.mrp / 100).toFixed(0)}` : undefined;
      formatted.savings = item.mrp && item.mrp > item.basePrice ? item.mrp - item.basePrice : undefined;
      formatted.bulkPricing = item.bulkPricing;
      formatted.sku = item.sku;
    }

    if (item.type === 'service') {
      formatted.durationMinutes = item.durationMinutes;
      formatted.staff = item.staff;
      formatted.bookingRequiresDeposit = item.bookingRequiresDeposit;
      formatted.depositAmount = item.depositAmount;
    }

    return res.json({ success: true, data: formatted });
  }),
);

// ─── POST /api/catalog/:storeSlug/items ────────────────────────────────────────
// Protected: merchant auth required

router.post(
  '/:storeSlug/items',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug } = req.params;
    const merchantId = (req as any).merchantId;

    const ownership = await verifyMerchantStoreOwnership(storeSlug, merchantId);
    if (!ownership) {
      return res.status(403).json({ success: false, message: 'Not authorized for this store' });
    }

    const {
      type,
      name,
      description,
      basePrice,
      currency,
      images,
      tags,
      category,
      isVeg,
      spiceLevel,
      variants,
      sku,
      stock,
      mrp,
      bulkPricing,
      durationMinutes,
      staff,
      bookingRequiresDeposit,
      depositAmount,
    } = req.body;

    if (!type || !name || basePrice === undefined) {
      return res.status(400).json({ success: false, message: 'type, name, and basePrice are required' });
    }

    if (!['product', 'service'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "product" or "service"' });
    }

    const item = await CatalogItem.create({
      storeId: ownership.storeId,
      storeSlug,
      type,
      name,
      description: description || '',
      basePrice,
      currency: currency || 'INR',
      images: images || [],
      tags: tags || [],
      isAvailable: true,
      category,
      isVeg,
      spiceLevel,
      variants,
      sku,
      stock,
      mrp,
      bulkPricing,
      durationMinutes,
      staff,
      bookingRequiresDeposit,
      depositAmount,
    });

    logger.info(`[CatalogItem] Created item ${item._id} for store ${storeSlug}`);

    return res.status(201).json({ success: true, data: { id: item._id } });
  }),
);

// ─── PATCH /api/catalog/:storeSlug/items/:itemId ──────────────────────────────
// Protected: merchant auth required

router.patch(
  '/:storeSlug/items/:itemId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, itemId } = req.params;
    const merchantId = (req as any).merchantId;

    const ownership = await verifyMerchantStoreOwnership(storeSlug, merchantId);
    if (!ownership) {
      return res.status(403).json({ success: false, message: 'Not authorized for this store' });
    }

    const item = await CatalogItem.findOne({ _id: itemId, storeSlug });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const allowedFields = [
      'name',
      'description',
      'basePrice',
      'currency',
      'images',
      'tags',
      'category',
      'isVeg',
      'spiceLevel',
      'variants',
      'sku',
      'stock',
      'mrp',
      'bulkPricing',
      'durationMinutes',
      'staff',
      'bookingRequiresDeposit',
      'depositAmount',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (item as any)[field] = req.body[field];
      }
    }

    await item.save();
    logger.info(`[CatalogItem] Updated item ${itemId} for store ${storeSlug}`);

    return res.json({ success: true, data: { id: item._id } });
  }),
);

// ─── DELETE /api/catalog/:storeSlug/items/:itemId ─────────────────────────────
// Protected: merchant auth required

router.delete(
  '/:storeSlug/items/:itemId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, itemId } = req.params;
    const merchantId = (req as any).merchantId;

    const ownership = await verifyMerchantStoreOwnership(storeSlug, merchantId);
    if (!ownership) {
      return res.status(403).json({ success: false, message: 'Not authorized for this store' });
    }

    const item = await CatalogItem.findOneAndDelete({ _id: itemId, storeSlug });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    logger.info(`[CatalogItem] Deleted item ${itemId} from store ${storeSlug}`);

    return res.json({ success: true, message: 'Item deleted' });
  }),
);

// ─── PATCH /api/catalog/:storeSlug/items/:itemId/availability ──────────────────
// Protected: merchant auth required

router.patch(
  '/:storeSlug/items/:itemId/availability',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, itemId } = req.params;
    const merchantId = (req as any).merchantId;
    const { isAvailable } = req.body;

    const ownership = await verifyMerchantStoreOwnership(storeSlug, merchantId);
    if (!ownership) {
      return res.status(403).json({ success: false, message: 'Not authorized for this store' });
    }

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isAvailable must be a boolean' });
    }

    const item = await CatalogItem.findOneAndUpdate({ _id: itemId, storeSlug }, { isAvailable }, { new: true });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    logger.info(`[CatalogItem] Toggled availability for item ${itemId}: ${isAvailable}`);

    return res.json({ success: true, data: { id: item._id, isAvailable: item.isAvailable } });
  }),
);

export default router;
