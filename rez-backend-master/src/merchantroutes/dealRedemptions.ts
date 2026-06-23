import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import DealRedemption from '../models/DealRedemption';
import { Store } from '../models/Store';
import mongoose from 'mongoose';
import Joi from 'joi';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const useCodeSchema = Joi.object({
  storeId: Joi.string().required(),
  benefitApplied: Joi.number().min(0).optional(),
  orderAmount: Joi.number().min(0).optional(),
  notes: Joi.string().max(500).optional()
});

const listQuerySchema = Joi.object({
  storeId: Joi.string().optional(),
  status: Joi.string().valid('active', 'used', 'expired', 'pending').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// ============================================
// HELPER: Get merchant's store IDs
// ============================================

async function getMerchantStoreIds(merchantId: string): Promise<mongoose.Types.ObjectId[]> {
  const stores = await Store.find({ merchantId: merchantId }).select('_id').lean();
  return stores.map(s => s._id as mongoose.Types.ObjectId);
}

// ============================================
// VERIFY REDEMPTION CODE
// ============================================

/**
 * @route   GET /api/merchant/deal-redemptions/verify/:code
 * @desc    Verify a deal redemption code before applying benefit
 * @access  Private (Merchant)
 */
router.get('/verify/:code', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const code = req.params.code?.toUpperCase().trim();

    // Validate code format: RZ-XXXXXXXX (8 alphanumeric chars after RZ-)
    const codeRegex = /^RZ-[A-Z2-9]{8}$/;
    if (!code || !codeRegex.test(code)) {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'Invalid code format. Expected format: RZ-XXXXXXXX'
      });
    }

    // Find redemption by code (case-insensitive)
    const redemption = await DealRedemption.findOne({
      redemptionCode: code
    }).populate('user', 'profile.firstName profile.lastName phoneNumber');

    if (!redemption) {
      return res.json({
        success: true,
        valid: false,
        reason: 'Code not found'
      });
    }

    // Get merchant's stores
    const merchantStoreIds = await getMerchantStoreIds(merchantId);

    // Check if deal is for a specific store
    const dealStoreId = redemption.dealSnapshot.storeId;

    if (dealStoreId) {
      // Deal is for a specific store - verify merchant owns it
      const storeMatch = merchantStoreIds.some(
        storeId => storeId.toString() === dealStoreId.toString()
      );

      if (!storeMatch) {
        return res.json({
          success: true,
          valid: false,
          reason: 'This code is not valid at your store'
        });
      }
    }
    // If no storeId in deal, it's a platform-wide deal - any merchant can redeem

    // Check status
    if (redemption.status === 'pending') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This code is pending payment confirmation'
      });
    }

    if (redemption.status === 'used') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This code has already been used',
        usedAt: redemption.usedAt
      });
    }

    if (redemption.status === 'expired') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This code has expired',
        expiredAt: redemption.expiresAt
      });
    }

    if (redemption.status === 'cancelled') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This code was cancelled'
      });
    }

    // Check expiry date
    if (new Date() > redemption.expiresAt) {
      // Update status to expired
      await DealRedemption.updateOne(
        { _id: redemption._id },
        { status: 'expired' }
      );

      return res.json({
        success: true,
        valid: false,
        reason: 'This code has expired',
        expiredAt: redemption.expiresAt
      });
    }

    // Code is valid!
    const user = redemption.user as any;

    return res.json({
      success: true,
      valid: true,
      redemption: {
        id: redemption._id,
        code: redemption.redemptionCode,
        status: redemption.status,
        expiresAt: redemption.expiresAt,
        dealSnapshot: {
          store: redemption.dealSnapshot.store,
          cashback: redemption.dealSnapshot.cashback,
          discount: redemption.dealSnapshot.discount,
          coins: redemption.dealSnapshot.coins,
          bonus: redemption.dealSnapshot.bonus,
          image: redemption.dealSnapshot.image
        },
        campaignSnapshot: {
          title: redemption.campaignSnapshot.title,
          subtitle: redemption.campaignSnapshot.subtitle,
          type: redemption.campaignSnapshot.type,
          terms: redemption.campaignSnapshot.terms,
          minOrderValue: redemption.campaignSnapshot.minOrderValue,
          maxBenefit: redemption.campaignSnapshot.maxBenefit
        },
        isPaid: redemption.isPaid,
        user: user ? {
          name: `${user.profile?.firstName || ''} ${user.profile?.lastName?.charAt(0) || ''}`.trim() || 'Customer'
        } : null
      }
    });

  } catch (error: any) {
    logger.error('[MERCHANT DEAL VERIFY] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify code',
      error: error.message
    });
  }
});

// ============================================
// MARK REDEMPTION AS USED
// ============================================

/**
 * @route   POST /api/merchant/deal-redemptions/:code/use
 * @desc    Mark a deal redemption as used at the merchant's store
 * @access  Private (Merchant)
 */
router.post('/:code/use', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const code = req.params.code?.toUpperCase().trim();

    // Validate code format: RZ-XXXXXXXX (8 alphanumeric chars after RZ-)
    const codeRegex = /^RZ-[A-Z2-9]{8}$/;
    if (!code || !codeRegex.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code format. Expected format: RZ-XXXXXXXX'
      });
    }

    // Validate request body
    const { error, value } = useCodeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { storeId, benefitApplied, orderAmount, notes } = value;

    // Verify merchant owns the store
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId
    });

    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission for this store'
      });
    }

    // Find and update the redemption atomically
    const redemption = await DealRedemption.findOneAndUpdate(
      {
        redemptionCode: code,
        status: 'active',
        expiresAt: { $gt: new Date() }
      },
      {
        $set: {
          status: 'used',
          usedAt: new Date(),
          usedByMerchantId: new mongoose.Types.ObjectId(merchantId),
          usedAtStoreId: new mongoose.Types.ObjectId(storeId),
          benefitApplied: benefitApplied,
          orderAmount: orderAmount,
          merchantNotes: notes
        }
      },
      { new: true }
    );

    if (!redemption) {
      // Check why it failed
      const existingRedemption = await DealRedemption.findOne({ redemptionCode: code });

      if (!existingRedemption) {
        return res.status(404).json({
          success: false,
          message: 'Code not found'
        });
      }

      if (existingRedemption.status === 'used') {
        return res.status(400).json({
          success: false,
          message: 'This code has already been used',
          usedAt: existingRedemption.usedAt
        });
      }

      if (existingRedemption.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'This code is pending payment confirmation'
        });
      }

      if (existingRedemption.status === 'expired' || new Date() > existingRedemption.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'This code has expired'
        });
      }

      if (existingRedemption.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'This code was cancelled'
        });
      }

      // Check store ownership for store-specific deals
      const dealStoreId = existingRedemption.dealSnapshot.storeId;
      if (dealStoreId && dealStoreId.toString() !== storeId) {
        return res.status(400).json({
          success: false,
          message: 'This code is not valid at your store'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Unable to redeem this code'
      });
    }

    logger.info(`✅ [MERCHANT DEAL USE] Code ${code} marked as used by merchant ${merchantId} at store ${storeId}`);

    return res.json({
      success: true,
      message: 'Deal redeemed successfully',
      data: {
        code: redemption.redemptionCode,
        status: redemption.status,
        usedAt: redemption.usedAt,
        benefitApplied: redemption.benefitApplied,
        orderAmount: redemption.orderAmount
      }
    });

  } catch (error: any) {
    logger.error('[MERCHANT DEAL USE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to redeem code',
      error: error.message
    });
  }
});

// ============================================
// LIST MERCHANT'S REDEMPTIONS
// ============================================

/**
 * @route   GET /api/merchant/deal-redemptions
 * @desc    List all deal redemptions for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    // Validate query params
    const { error, value } = listQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { storeId, status, startDate, endDate, page, limit } = value;

    // Get merchant's stores
    let storeIds: mongoose.Types.ObjectId[];

    if (storeId) {
      // Verify merchant owns this specific store
      const store = await Store.findOne({ _id: storeId, merchantId: merchantId });
      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission for this store'
        });
      }
      storeIds = [new mongoose.Types.ObjectId(storeId)];
    } else {
      storeIds = await getMerchantStoreIds(merchantId);
    }

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: {
          redemptions: [],
          stats: { total: 0, active: 0, used: 0, expired: 0 },
          pagination: { page, limit, total: 0, totalPages: 0 }
        }
      });
    }

    // Build query
    const query: any = {
      'dealSnapshot.storeId': { $in: storeIds }
    };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get total count
    const total = await DealRedemption.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get redemptions with pagination
    const redemptions = await DealRedemption.find(query)
      .populate('user', 'profile.firstName profile.lastName phoneNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get stats
    const stats = await DealRedemption.aggregate([
      { $match: { 'dealSnapshot.storeId': { $in: storeIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsMap: Record<string, number> = { total: 0, active: 0, used: 0, expired: 0, pending: 0 };
    for (const stat of stats) {
      statsMap[stat._id] = stat.count;
      statsMap.total += stat.count;
    }

    return res.json({
      success: true,
      data: {
        redemptions: redemptions.map(r => ({
          id: r._id,
          code: r.redemptionCode,
          status: r.status,
          redeemedAt: r.redeemedAt,
          usedAt: r.usedAt,
          expiresAt: r.expiresAt,
          dealSnapshot: r.dealSnapshot,
          campaignSnapshot: {
            title: r.campaignSnapshot.title,
            type: r.campaignSnapshot.type
          },
          isPaid: r.isPaid,
          benefitApplied: r.benefitApplied,
          orderAmount: r.orderAmount,
          user: r.user ? {
            name: `${(r.user as any).profile?.firstName || ''} ${(r.user as any).profile?.lastName || ''}`.trim() || 'Customer'
          } : null
        })),
        stats: statsMap,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error: any) {
    logger.error('[MERCHANT DEAL LIST] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch redemptions',
      error: error.message
    });
  }
});

// ============================================
// GET REDEMPTION STATS
// ============================================

/**
 * @route   GET /api/merchant/deal-redemptions/stats
 * @desc    Get deal redemption statistics for merchant dashboard
 * @access  Private (Merchant)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    // Get merchant's stores
    const storeIds = await getMerchantStoreIds(merchantId);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: {
          today: { total: 0, used: 0, pending: 0 },
          thisWeek: { total: 0, used: 0, pending: 0 },
          thisMonth: { total: 0, used: 0, pending: 0 },
          totalRevenue: 0,
          topDeals: []
        }
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate stats
    const stats = await DealRedemption.aggregate([
      {
        $match: {
          'dealSnapshot.storeId': { $in: storeIds }
        }
      },
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: todayStart } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          thisWeek: [
            { $match: { createdAt: { $gte: weekStart } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: monthStart } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          revenue: [
            { $match: { isPaid: true, status: { $in: ['active', 'used'] } } },
            {
              $group: {
                _id: null,
                total: { $sum: '$purchaseAmount' }
              }
            }
          ],
          topDeals: [
            { $match: { status: { $in: ['active', 'used'] } } },
            {
              $group: {
                _id: '$campaignSnapshot.title',
                redemptions: { $sum: 1 }
              }
            },
            { $sort: { redemptions: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    const result = stats[0];

    // Helper to format period stats
    const formatPeriodStats = (data: Array<{ _id: string; count: number }>) => {
      const map: Record<string, number> = { total: 0, used: 0, pending: 0, active: 0 };
      for (const item of data) {
        map[item._id] = item.count;
        map.total += item.count;
      }
      return map;
    };

    return res.json({
      success: true,
      data: {
        today: formatPeriodStats(result.today),
        thisWeek: formatPeriodStats(result.thisWeek),
        thisMonth: formatPeriodStats(result.thisMonth),
        totalRevenue: result.revenue[0]?.total || 0,
        topDeals: result.topDeals.map((d: any) => ({
          campaign: d._id,
          redemptions: d.redemptions
        }))
      }
    });

  } catch (error: any) {
    logger.error('[MERCHANT DEAL STATS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

export default router;
