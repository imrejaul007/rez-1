import { Router, Request, Response } from 'express';
import DynamicPricingRule, { IDynamicPricingRule } from '../models/DynamicPricingRule';
import { Types } from 'mongoose';

const router = Router();

/**
 * GET /api/merchant/dynamic-pricing?storeId=...
 * List all pricing rules for a store
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ success: false, error: 'storeId query param required' });
    }

    const rules = await DynamicPricingRule.find({
      merchantId: new Types.ObjectId(req.merchantId),
      storeId: new Types.ObjectId(storeId),
    })
      .populate('serviceIds', 'name price')
      .lean();

    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/merchant/dynamic-pricing
 * Create a new pricing rule
 */
router.post('/', async (req: any, res: Response) => {
  try {
    const { storeId, serviceIds, name, dayOfWeek, startTime, endTime, adjustmentType, adjustmentValue, label } = req.body;

    // Validation
    if (!storeId || !name || !adjustmentType || adjustmentValue === undefined || !label) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: storeId, name, adjustmentType, adjustmentValue, label',
      });
    }

    if (!['percent_off', 'percent_on', 'fixed_off', 'fixed_on'].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid adjustmentType. Must be one of: percent_off, percent_on, fixed_off, fixed_on',
      });
    }

    if (adjustmentValue < 0) {
      return res.status(400).json({ success: false, error: 'adjustmentValue must be >= 0' });
    }

    const rule = await DynamicPricingRule.create({
      merchantId: new Types.ObjectId(req.merchantId),
      storeId: new Types.ObjectId(storeId),
      serviceIds: serviceIds?.map((id: string) => new Types.ObjectId(id)) || [],
      name,
      dayOfWeek: dayOfWeek || [],
      startTime,
      endTime,
      adjustmentType,
      adjustmentValue,
      label,
      isActive: true,
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/merchant/dynamic-pricing/:id
 * Update a pricing rule
 */
router.patch('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate adjustmentType if provided
    if (updates.adjustmentType && !['percent_off', 'percent_on', 'fixed_off', 'fixed_on'].includes(updates.adjustmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid adjustmentType. Must be one of: percent_off, percent_on, fixed_off, fixed_on',
      });
    }

    // Convert service IDs if provided
    if (updates.serviceIds) {
      updates.serviceIds = updates.serviceIds.map((sid: string) => new Types.ObjectId(sid));
    }

    const rule = await DynamicPricingRule.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(req.merchantId),
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Pricing rule not found' });
    }

    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/merchant/dynamic-pricing/:id
 * Delete a pricing rule
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await DynamicPricingRule.findOneAndDelete({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(req.merchantId),
    });

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Pricing rule not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
