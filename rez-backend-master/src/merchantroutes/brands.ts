import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

// ─── GET /merchant/brands ─────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchant?._id || (req as any).user?.merchantId;
    if (!merchantId) {
      sendError(res, 'Merchant not found', 401);
      return;
    }

    const { MerchantBrand } = await import('../models/MerchantBrand');
    const brands = await MerchantBrand.find({ merchantId, isActive: true })
      .populate('stores', 'name logo location.city isActive')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, brands);
  }),
);

// ─── POST /merchant/brands ────────────────────────────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchant?._id || (req as any).user?.merchantId;
    if (!merchantId) {
      sendError(res, 'Merchant not found', 401);
      return;
    }

    const { name, logo, description, storeIds = [], settings = {} } = req.body;
    if (!name) {
      sendError(res, 'Brand name required', 400);
      return;
    }

    const { MerchantBrand } = await import('../models/MerchantBrand');
    const brand = await MerchantBrand.create({
      merchantId,
      name,
      logo,
      description,
      stores: storeIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      settings,
    });

    logger.info(`[BRAND] Created brand "${name}" for merchant ${merchantId}`);
    sendSuccess(res, brand, 'Brand created');
  }),
);

// ─── GET /merchant/brands/:id ─────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchant?._id || (req as any).user?.merchantId;
    if (!merchantId) {
      sendError(res, 'Merchant not found', 401);
      return;
    }
    const { MerchantBrand } = await import('../models/MerchantBrand');
    const brand = await MerchantBrand.findOne({ _id: req.params.id, merchantId })
      .populate('stores', 'name logo location.city location.address isActive serviceCapabilities category')
      .lean();
    if (!brand) {
      sendError(res, 'Brand not found', 404);
      return;
    }
    sendSuccess(res, brand);
  }),
);

// ─── PATCH /merchant/brands/:id ───────────────────────────────────────────────
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchant?._id || (req as any).user?.merchantId;
    if (!merchantId) {
      sendError(res, 'Merchant not found', 401);
      return;
    }
    const { MerchantBrand } = await import('../models/MerchantBrand');
    const { name, logo, description, settings, addStores = [], removeStores = [] } = req.body;

    const brand = await MerchantBrand.findOne({ _id: req.params.id, merchantId });
    if (!brand) {
      sendError(res, 'Brand not found', 404);
      return;
    }

    if (name) brand.name = name;
    if (logo !== undefined) brand.logo = logo;
    if (description !== undefined) brand.description = description;
    if (settings) brand.settings = { ...brand.settings, ...settings };

    for (const storeId of addStores) {
      const oid = new mongoose.Types.ObjectId(storeId);
      if (!brand.stores.some((s: mongoose.Types.ObjectId) => s.equals(oid))) brand.stores.push(oid);
    }
    for (const storeId of removeStores) {
      const oid = new mongoose.Types.ObjectId(storeId);
      brand.stores = brand.stores.filter((s: mongoose.Types.ObjectId) => !s.equals(oid));
    }

    await brand.save();
    sendSuccess(res, brand, 'Brand updated');
  }),
);

// ─── POST /merchant/brands/:id/push-menu ─────────────────────────────────────
/**
 * Copies all active products from sourceStoreId to all other stores in the brand.
 * Non-destructive: only adds products that don't already exist (matched by name).
 */
router.post(
  '/:id/push-menu',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchant?._id || (req as any).user?.merchantId;
    if (!merchantId) {
      sendError(res, 'Merchant not found', 401);
      return;
    }
    const { sourceStoreId } = req.body;
    if (!sourceStoreId) {
      sendError(res, 'sourceStoreId required', 400);
      return;
    }

    const { MerchantBrand } = await import('../models/MerchantBrand');
    const brand = await MerchantBrand.findOne({ _id: req.params.id, merchantId }).lean();
    if (!brand) {
      sendError(res, 'Brand not found', 404);
      return;
    }

    const targetStores = (brand as any).stores.map(String).filter((id: string) => id !== String(sourceStoreId));
    if (targetStores.length === 0) {
      sendError(res, 'No target stores to push to', 400);
      return;
    }

    // Import product model dynamically (avoid circular imports)
    const { MProduct: MerchantProduct } = await import('../models/MerchantProduct');

    const sourceProducts = await MerchantProduct.find({
      storeId: new mongoose.Types.ObjectId(sourceStoreId),
      isActive: true,
    }).lean();

    let pushed = 0;
    let skipped = 0;

    for (const targetStoreId of targetStores) {
      for (const product of sourceProducts) {
        const exists = await MerchantProduct.findOne({
          storeId: new mongoose.Types.ObjectId(targetStoreId),
          name: product.name,
        }).lean();

        if (!exists) {
          const { _id, storeId, ...productData } = product as any;
          await MerchantProduct.create({
            ...productData,
            storeId: new mongoose.Types.ObjectId(targetStoreId),
          });
          pushed++;
        } else {
          skipped++;
        }
      }
    }

    logger.info(`[BRAND] Menu push: ${pushed} added, ${skipped} skipped across ${targetStores.length} outlets`);
    sendSuccess(
      res,
      { pushed, skipped, outlets: targetStores.length },
      `Menu pushed to ${targetStores.length} outlet(s)`,
    );
  }),
);

// ─── GET /merchant/brands/:id/analytics ──────────────────────────────────────
/**
 * Consolidated analytics across all stores in a brand.
 */
router.get(
  '/:id/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).merchant?._id || (req as any).user?.merchantId;
    if (!merchantId) {
      sendError(res, 'Merchant not found', 401);
      return;
    }
    const { MerchantBrand } = await import('../models/MerchantBrand');
    const brand = await MerchantBrand.findOne({ _id: req.params.id, merchantId }).select('stores name').lean();
    if (!brand) {
      sendError(res, 'Brand not found', 404);
      return;
    }

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const storeIds = (brand as any).stores.map((id: any) => new mongoose.Types.ObjectId(String(id)));

    const { StorePayment } = await import('../models/StorePayment');
    const { Store } = await import('../models/Store');

    // Consolidated revenue per store
    const revenueByStore = await StorePayment.aggregate([
      { $match: { storeId: { $in: storeIds }, status: 'completed', createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$storeId',
          revenue: { $sum: '$billAmount' },
          transactions: { $sum: 1 },
          avgOrderValue: { $avg: '$billAmount' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const stores = await Store.find({ _id: { $in: storeIds } })
      .select('name location.city')
      .lean();
    const storeNameMap: Record<string, string> = {};
    for (const s of stores)
      storeNameMap[String(s._id)] = `${s.name}${(s as any).location?.city ? ` (${(s as any).location.city})` : ''}`;

    const outlets = revenueByStore.map((r) => ({
      storeId: String(r._id),
      name: storeNameMap[String(r._id)] || 'Unknown',
      revenue: Math.round(r.revenue),
      transactions: r.transactions,
      avgOrderValue: Math.round(r.avgOrderValue),
    }));

    const totalRevenue = outlets.reduce((s, o) => s + o.revenue, 0);
    const totalTransactions = outlets.reduce((s, o) => s + o.transactions, 0);

    sendSuccess(res, {
      brandName: (brand as any).name,
      period: '30d',
      totalRevenue,
      totalTransactions,
      avgOrderValue: totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0,
      outlets,
      topOutlet: outlets[0] || null,
    });
  }),
);

export default router;
