/**
 * merchantroutes/loyaltyTiers.ts
 * Loyalty tier management routes for merchants
 */

import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { MerchantLoyaltyTier } from '../models/MerchantLoyaltyTier';
import { MerchantCustomerSnapshot } from '../models/MerchantCustomerSnapshot';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * GET /merchant/loyalty-tiers
 * Get loyalty tier program configuration for store
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const program = await MerchantLoyaltyTier.findOne({ storeId });

    if (!program) {
      return res.json({
        success: true,
        data: null,
        message: 'No loyalty program found for this store',
      });
    }

    return res.json({
      success: true,
      data: program,
    });
  } catch (error) {
    logger.error('Error fetching loyalty tiers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty tiers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/loyalty-tiers
 * Create a new loyalty tier program
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { storeId, name, tiers, description } = req.body;

    if (!storeId || !name || !tiers || !Array.isArray(tiers)) {
      return res.status(400).json({
        success: false,
        message: 'storeId, name, and tiers array are required',
      });
    }

    // Check if program already exists
    const existing = await MerchantLoyaltyTier.findOne({ storeId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Loyalty program already exists for this store',
      });
    }

    const program = new MerchantLoyaltyTier({
      storeId,
      name,
      description: description || '',
      tiers,
      isActive: true,
    });

    await program.save();

    return res.status(201).json({
      success: true,
      data: program,
      message: 'Loyalty program created successfully',
    });
  } catch (error) {
    logger.error('Error creating loyalty program:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create loyalty program',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /merchant/loyalty-tiers/:id
 * Update loyalty tier program (tiers, name, status)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['name', 'description', 'tiers', 'isActive'];
    const validUpdates = Object.keys(updates).filter((key) => allowedFields.includes(key));

    if (validUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Allowed fields for update: ${allowedFields.join(', ')}`,
      });
    }

    const program = await MerchantLoyaltyTier.findByIdAndUpdate(
      id,
      { $set: Object.fromEntries(validUpdates.map((key) => [key, updates[key]])) },
      { new: true, runValidators: true },
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty program not found',
      });
    }

    return res.json({
      success: true,
      data: program,
      message: 'Loyalty program updated successfully',
    });
  } catch (error) {
    logger.error('Error updating loyalty program:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update loyalty program',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/loyalty-tiers/members
 * Get customers with their current loyalty tier membership
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    const { storeId, tier, limit = 20, offset = 0 } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    const filter: any = { merchantId: storeId.toString() };

    // Filter by tier if provided
    if (tier) {
      filter.currentLoyaltyTier = tier;
    }

    const total = await MerchantCustomerSnapshot.countDocuments(filter);
    const members = await MerchantCustomerSnapshot.find(filter)
      .limit(limitNum)
      .skip(offsetNum)
      .sort({ lastVisitAt: -1 });

    const hasMore = offsetNum + limitNum < total;

    return res.json({
      success: true,
      data: {
        members: members.map((m) => ({
          customerId: m._id,
          customerName: (m as any).customerName,
          customerPhone: (m as any).customerPhone || m.phone,
          currentLoyaltyTier: (m as any).currentLoyaltyTier,
          totalSpent: m.totalSpend,
          visitCount: m.totalVisits,
          lastVisitAt: m.lastVisitAt,
        })),
        total,
        hasMore,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    logger.error('Error fetching loyalty members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty members',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
