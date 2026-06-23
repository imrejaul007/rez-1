import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import OfferRedemption from '../models/OfferRedemption';
import { Store } from '../models/Store';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { CoinTransaction } from '../models/CoinTransaction';
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
  orderAmount: Joi.number().min(0).required(),
  notes: Joi.string().max(500).optional()
});

const listQuerySchema = Joi.object({
  storeId: Joi.string().optional(),
  status: Joi.string().valid('active', 'used', 'expired', 'pending', 'cancelled').optional(),
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
// VERIFY VOUCHER/REDEMPTION CODE
// ============================================

/**
 * @route   GET /api/merchant/voucher-redemptions/verify/:code
 * @desc    Verify a voucher redemption code before applying benefit
 * @access  Private (Merchant)
 */
router.get('/verify/:code', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const code = req.params.code?.toUpperCase().trim();

    if (!code) {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'Code is required'
      });
    }

    // Find redemption by code (supports both RED-xxx and verification codes)
    let redemption = await OfferRedemption.findOne({
      $or: [
        { redemptionCode: code },
        { verificationCode: code }
      ]
    }).populate('offer', 'title image cashbackPercentage type restrictions store')
      .populate('user', 'profile.firstName profile.lastName phoneNumber');

    if (!redemption) {
      return res.json({
        success: true,
        valid: false,
        reason: 'Code not found'
      });
    }

    // Get merchant's stores
    const merchantStoreIds = await getMerchantStoreIds(merchantId);

    // Check if offer is for a specific store
    const offer = redemption.offer as any;
    const offerStoreId = offer?.store?.id?.toString() || offer?.store?.toString();

    if (offerStoreId) {
      // Offer is for a specific store - verify merchant owns it
      const storeMatch = merchantStoreIds.some(
        storeId => storeId.toString() === offerStoreId
      );

      if (!storeMatch) {
        return res.json({
          success: true,
          valid: false,
          reason: 'This voucher is not valid at your store'
        });
      }
    }
    // If no storeId in offer, it's a platform-wide voucher - any merchant can redeem

    // Check status
    if (redemption.status === 'pending') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This voucher is pending activation'
      });
    }

    if (redemption.status === 'used') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This voucher has already been used',
        usedAt: redemption.usedDate
      });
    }

    if (redemption.status === 'expired') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This voucher has expired',
        expiredAt: redemption.expiryDate
      });
    }

    if (redemption.status === 'cancelled') {
      return res.json({
        success: true,
        valid: false,
        reason: 'This voucher was cancelled'
      });
    }

    // Check expiry date
    if (new Date() > redemption.expiryDate) {
      // Update status to expired
      await OfferRedemption.updateOne(
        { _id: redemption._id },
        { status: 'expired' }
      );

      return res.json({
        success: true,
        valid: false,
        reason: 'This voucher has expired',
        expiredAt: redemption.expiryDate
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
        verificationCode: redemption.verificationCode,
        status: redemption.status,
        expiresAt: redemption.expiryDate,
        redemptionType: redemption.redemptionType,
        offer: {
          id: offer?._id,
          title: offer?.title,
          image: offer?.image,
          cashbackPercentage: offer?.cashbackPercentage || 0,
          type: offer?.type,
          restrictions: {
            minOrderValue: offer?.restrictions?.minOrderValue || 0,
            maxDiscountAmount: offer?.restrictions?.maxDiscountAmount || null
          }
        },
        user: user ? {
          name: `${user.profile?.firstName || ''} ${user.profile?.lastName?.charAt(0) || ''}`.trim() || 'Customer',
          phone: user.phoneNumber ? `****${user.phoneNumber.slice(-4)}` : null
        } : null
      }
    });

  } catch (error: any) {
    logger.error('[MERCHANT VOUCHER VERIFY] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify voucher',
      error: error.message
    });
  }
});

// ============================================
// MARK VOUCHER AS USED
// ============================================

/**
 * @route   POST /api/merchant/voucher-redemptions/:code/use
 * @desc    Mark a voucher as used at the merchant's store and credit cashback
 * @access  Private (Merchant)
 * Uses MongoDB transaction for atomicity and prevents double-spending
 */
router.post('/:code/use', async (req: Request, res: Response) => {
  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const code = req.params.code?.toUpperCase().trim();

    if (!code) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }

    // Validate request body
    const { error, value } = useCodeSchema.validate(req.body);
    if (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { storeId, orderAmount, notes } = value;

    // Verify merchant owns the store
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId
    }).session(session);

    if (!store) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission for this store'
      });
    }

    // Atomic find and update - prevents race conditions and double-spending
    // Only update if status is 'active' and not expired
    const redemption = await OfferRedemption.findOneAndUpdate(
      {
        $or: [
          { redemptionCode: code },
          { verificationCode: code }
        ],
        status: 'active',
        expiryDate: { $gt: new Date() }
      },
      {
        $set: {
          status: 'used',
          usedDate: new Date(),
          usedAtStore: storeId,
          verifiedBy: new mongoose.Types.ObjectId(merchantId),
          verifiedAt: new Date()
        }
      },
      {
        new: false, // Return document BEFORE update to get offer details
        session
      }
    ).populate('offer', 'title cashbackPercentage type restrictions');

    if (!redemption) {
      // Check why it failed - provide specific error message
      const existingRedemption = await OfferRedemption.findOne({
        $or: [
          { redemptionCode: code },
          { verificationCode: code }
        ]
      }).session(session);

      await session.abortTransaction();
      session.endSession();

      if (!existingRedemption) {
        return res.status(404).json({
          success: false,
          message: 'Voucher not found'
        });
      }

      if (existingRedemption.status === 'used') {
        return res.status(400).json({
          success: false,
          message: 'This voucher has already been used',
          usedAt: existingRedemption.usedDate
        });
      }

      if (existingRedemption.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'This voucher is pending activation'
        });
      }

      if (existingRedemption.status === 'expired' || new Date() > existingRedemption.expiryDate) {
        return res.status(400).json({
          success: false,
          message: 'This voucher has expired'
        });
      }

      if (existingRedemption.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'This voucher was cancelled'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Unable to redeem this voucher'
      });
    }

    const offer = redemption.offer as any;
    const userId = redemption.user.toString();

    // Check minimum order value
    if (offer?.restrictions?.minOrderValue && orderAmount < offer.restrictions.minOrderValue) {
      // Rollback - set status back to active
      await OfferRedemption.findByIdAndUpdate(
        redemption._id,
        { status: 'active', usedDate: null, usedAtStore: null, verifiedBy: null, verifiedAt: null },
        { session }
      );
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${offer.restrictions.minOrderValue} required`
      });
    }

    // Calculate cashback
    let cashbackAmount = (orderAmount * (offer?.cashbackPercentage || 0)) / 100;

    // Apply max discount cap if set
    if (offer?.restrictions?.maxDiscountAmount && cashbackAmount > offer.restrictions.maxDiscountAmount) {
      cashbackAmount = offer.restrictions.maxDiscountAmount;
    }

    // Round to 2 decimal places
    cashbackAmount = Math.round(cashbackAmount * 100) / 100;

    // Update redemption with amount
    await OfferRedemption.findByIdAndUpdate(
      redemption._id,
      { usedAmount: cashbackAmount },
      { session }
    );

    // Credit cashback via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    if (cashbackAmount > 0) {
      const { walletService } = await import('../services/walletService');
      await walletService.credit({
        userId,
        amount: cashbackAmount,
        source: 'cashback',
        description: `In-store cashback from ${offer?.title || 'offer'} at ${store.name}`,
        operationType: 'voucher_cashback',
        referenceId: `voucher-cashback:${redemption._id}`,
        referenceModel: 'OfferRedemption',
        metadata: {
          offerId: offer?._id,
          storeId: store._id,
          storeName: store.name,
          redemptionId: redemption._id,
        },
        session,
      });
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Send push notification to user (async, after transaction committed)
    try {
      const NotificationService = require('../services/notificationService').default;
      NotificationService.sendToUser(userId, {
        title: 'Cashback Credited! 🎉',
        body: `₹${cashbackAmount} cashback from ${store.name} has been added to your wallet!`,
        data: {
          type: 'cashback_credited',
          amount: cashbackAmount,
          redemptionId: (redemption as any)._id?.toString() || code,
          storeName: store.name,
        }
      }).catch((err: any) => logger.error('Failed to send cashback notification:', err));
    } catch (notifError) {
      logger.error('Failed to send cashback notification:', notifError);
    }

    logger.info(`✅ [MERCHANT VOUCHER USE] Code ${code} marked as used by merchant ${merchantId} at store ${storeId}. Cashback: ₹${cashbackAmount}`);

    return res.json({
      success: true,
      message: 'Voucher redeemed successfully',
      data: {
        code: redemption.redemptionCode,
        status: 'used',
        usedAt: new Date(),
        cashback: {
          amount: cashbackAmount,
          percentage: offer?.cashbackPercentage || 0,
          orderAmount,
        },
        customer: {
          walletCredited: cashbackAmount > 0
        }
      }
    });

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    logger.error('[MERCHANT VOUCHER USE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to redeem voucher',
      error: error.message
    });
  }
});

// ============================================
// LIST MERCHANT'S VOUCHER REDEMPTIONS
// ============================================

/**
 * @route   GET /api/merchant/voucher-redemptions
 * @desc    List all voucher redemptions used at merchant's stores
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

    // Build query - get redemptions used at merchant's stores
    const query: any = {
      usedAtStore: { $in: storeIds }
    };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.usedDate = {};
      if (startDate) query.usedDate.$gte = new Date(startDate);
      if (endDate) query.usedDate.$lte = new Date(endDate);
    }

    // Get total count
    const total = await OfferRedemption.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get redemptions with pagination
    const redemptions = await OfferRedemption.find(query)
      .populate('offer', 'title image cashbackPercentage type')
      .populate('user', 'profile.firstName profile.lastName phoneNumber')
      .populate('usedAtStore', 'name')
      .sort({ usedDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get stats
    const stats = await OfferRedemption.aggregate([
      { $match: { usedAtStore: { $in: storeIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCashback: { $sum: '$usedAmount' }
        }
      }
    ]);

    const statsMap: Record<string, number> = { total: 0, used: 0, totalCashback: 0 };
    for (const stat of stats) {
      statsMap[stat._id] = stat.count;
      statsMap.total += stat.count;
      if (stat._id === 'used') {
        statsMap.totalCashback = stat.totalCashback || 0;
      }
    }

    return res.json({
      success: true,
      data: {
        redemptions: redemptions.map(r => ({
          id: r._id,
          code: r.redemptionCode,
          status: r.status,
          usedAt: r.usedDate,
          cashbackAmount: r.usedAmount,
          offer: r.offer ? {
            id: (r.offer as any)._id,
            title: (r.offer as any).title,
            image: (r.offer as any).image,
            cashbackPercentage: (r.offer as any).cashbackPercentage
          } : null,
          store: r.usedAtStore ? {
            id: (r.usedAtStore as any)._id,
            name: (r.usedAtStore as any).name
          } : null,
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
    logger.error('[MERCHANT VOUCHER LIST] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch redemptions',
      error: error.message
    });
  }
});

// ============================================
// GET VOUCHER STATS
// ============================================

/**
 * @route   GET /api/merchant/voucher-redemptions/stats
 * @desc    Get voucher redemption statistics for merchant dashboard
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
          today: { count: 0, cashback: 0 },
          thisWeek: { count: 0, cashback: 0 },
          thisMonth: { count: 0, cashback: 0 },
          allTime: { count: 0, cashback: 0 }
        }
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate stats
    const stats = await OfferRedemption.aggregate([
      {
        $match: {
          usedAtStore: { $in: storeIds },
          status: 'used'
        }
      },
      {
        $facet: {
          today: [
            { $match: { usedDate: { $gte: todayStart } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                cashback: { $sum: '$usedAmount' }
              }
            }
          ],
          thisWeek: [
            { $match: { usedDate: { $gte: weekStart } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                cashback: { $sum: '$usedAmount' }
              }
            }
          ],
          thisMonth: [
            { $match: { usedDate: { $gte: monthStart } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                cashback: { $sum: '$usedAmount' }
              }
            }
          ],
          allTime: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                cashback: { $sum: '$usedAmount' }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];

    return res.json({
      success: true,
      data: {
        today: {
          count: result.today[0]?.count || 0,
          cashback: result.today[0]?.cashback || 0
        },
        thisWeek: {
          count: result.thisWeek[0]?.count || 0,
          cashback: result.thisWeek[0]?.cashback || 0
        },
        thisMonth: {
          count: result.thisMonth[0]?.count || 0,
          cashback: result.thisMonth[0]?.cashback || 0
        },
        allTime: {
          count: result.allTime[0]?.count || 0,
          cashback: result.allTime[0]?.cashback || 0
        }
      }
    });

  } catch (error: any) {
    logger.error('[MERCHANT VOUCHER STATS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

export default router;
