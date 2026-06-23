/**
 * merchantroutes/bundles.ts
 * Combo/bundle product management — uses existing ComboProduct model
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { ComboProduct } from '../models/ComboProduct';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

/** GET /merchant/bundles */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { storeId, active } = req.query;
    const filter: any = { merchantId: req.merchantId };
    if (storeId) filter.storeId = storeId;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    // Filter out expired bundles
    const now = new Date();
    filter.$or = [{ validTo: { $exists: false } }, { validTo: null }, { validTo: { $gte: now } }];

    const bundles = await ComboProduct.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, data: bundles, count: bundles.length });
  } catch (err) {
    logger.error('bundles GET error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch bundles' });
  }
});

/** GET /merchant/bundles/:id */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bundle = await ComboProduct.findOne({ _id: req.params.id, merchantId: req.merchantId });
    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    return res.json({ success: true, data: bundle });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch bundle' });
  }
});

/** POST /merchant/bundles */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { storeId, name, image, items, comboPrice, validFrom, validTo } = req.body;

    if (!name || !items || !Array.isArray(items) || items.length < 2 || comboPrice == null) {
      return res.status(400).json({ success: false, message: 'name, at least 2 items, and comboPrice are required' });
    }

    const originalTotal = items.reduce((sum: number, i: any) => sum + i.basePrice * (i.quantity || 1), 0);
    if (comboPrice >= originalTotal) {
      return res.status(400).json({ success: false, message: 'comboPrice must be less than individual item total' });
    }

    const bundle = await ComboProduct.create({
      merchantId: req.merchantId,
      storeId: storeId || undefined,
      name,
      image: image || undefined,
      items,
      comboPrice,
      originalTotal,
      savings: Math.round((originalTotal - comboPrice) * 100) / 100,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validTo: validTo ? new Date(validTo) : undefined,
    });

    return res.status(201).json({ success: true, data: bundle });
  } catch (err) {
    logger.error('bundles POST error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create bundle' });
  }
});

/** PUT /merchant/bundles/:id */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { items, comboPrice, ...rest } = req.body;
    const update: any = { ...rest };

    if (items && comboPrice != null) {
      const originalTotal = items.reduce((sum: number, i: any) => sum + i.basePrice * (i.quantity || 1), 0);
      update.items = items;
      update.comboPrice = comboPrice;
      update.originalTotal = originalTotal;
      update.savings = Math.round((originalTotal - comboPrice) * 100) / 100;
    }

    const bundle = await ComboProduct.findOneAndUpdate(
      { _id: req.params.id, merchantId: req.merchantId },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    return res.json({ success: true, data: bundle });
  } catch (err) {
    logger.error('bundles PUT error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update bundle' });
  }
});

/** DELETE /merchant/bundles/:id */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const bundle = await ComboProduct.findOneAndDelete({ _id: req.params.id, merchantId: req.merchantId });
    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    return res.json({ success: true, message: 'Bundle deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete bundle' });
  }
});

/** PATCH /merchant/bundles/:id/toggle */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const bundle = await ComboProduct.findOne({ _id: req.params.id, merchantId: req.merchantId });
    if (!bundle) return res.status(404).json({ success: false, message: 'Bundle not found' });
    bundle.isActive = !bundle.isActive;
    await bundle.save();
    return res.json({ success: true, data: { isActive: bundle.isActive } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle bundle' });
  }
});

export default router;
