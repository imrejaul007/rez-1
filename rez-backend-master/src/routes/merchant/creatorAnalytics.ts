import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/merchantauth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError, sendBadRequest } from '../../utils/response';
import CreatorPick from '../../models/CreatorPick';
import CreatorConversion from '../../models/CreatorConversion';
import { Store } from '../../models/Store';
import * as pickApprovalService from '../../services/pickApprovalService';
import mongoose from 'mongoose';

const router = Router();

// Verify that a store belongs to the authenticated merchant
async function verifyStoreOwnership(storeId: string, merchantId: string): Promise<any> {
  if (!mongoose.Types.ObjectId.isValid(storeId)) return null;
  const store = await Store.findById(storeId).select('merchantId').lean();
  if (!store) return null;
  if (String((store as any).merchantId) !== merchantId) return null;
  return store;
}

// All routes require merchant authentication

// ============================================
// PENDING PICKS (Merchant Approval)
// ============================================

/**
 * GET /merchant/stores/:storeId/pending-picks
 * List picks pending merchant approval for this store
 */
router.get('/:storeId/pending-picks', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchantId;
  const { page = 1, limit = 20 } = req.query;

  const result = await pickApprovalService.getMerchantPendingPicks(
    merchantId,
    storeId,
    Number(page),
    Math.min(Number(limit), 50)
  );

  sendSuccess(res, result);
}));

/**
 * GET /merchant/stores/:storeId/pending-picks/count
 * Count of pending picks for badge display
 */
router.get('/:storeId/pending-picks/count', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchantId;

  const count = await pickApprovalService.getMerchantPendingPickCount(merchantId, storeId);
  sendSuccess(res, { count });
}));

/**
 * POST /merchant/stores/:storeId/picks/:pickId/approve
 * Approve a creator pick with optional reward
 */
router.post('/:storeId/picks/:pickId/approve', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId, pickId } = req.params;
  const merchantId = (req as any).merchantId;
  const { rewardType, rewardAmount } = req.body;

  let rewardOptions;
  if (rewardType && rewardType !== 'none' && rewardAmount && rewardAmount > 0) {
    if (!['rez_coins', 'branded_coins'].includes(rewardType)) {
      return sendBadRequest(res, 'Invalid reward type. Must be rez_coins or branded_coins');
    }
    rewardOptions = { type: rewardType, amount: Number(rewardAmount) };
  }

  try {
    const pick = await pickApprovalService.merchantApprovePick(pickId, merchantId, storeId, rewardOptions);
    sendSuccess(res, {
      message: 'Pick approved successfully',
      pickId: pick._id,
      status: pick.status,
      reward: rewardOptions || null,
    });
  } catch (err: any) {
    if (err.message.includes('Insufficient')) {
      return sendBadRequest(res, err.message);
    }
    throw err;
  }
}));

/**
 * POST /merchant/stores/:storeId/picks/:pickId/reject
 * Reject a creator pick
 */
router.post('/:storeId/picks/:pickId/reject', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId, pickId } = req.params;
  const merchantId = (req as any).merchantId;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return sendBadRequest(res, 'Reason is required for rejection');
  }

  const pick = await pickApprovalService.merchantRejectPick(pickId, merchantId, reason.trim());
  sendSuccess(res, {
    message: 'Pick rejected',
    pickId: pick._id,
    status: pick.status,
  });
}));

/**
 * GET /merchant/stores/:storeId/pick-history
 * All reviewed picks (approved + rejected) for this store
 */
router.get('/:storeId/pick-history', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchantId;
  const { page = 1, limit = 20 } = req.query;

  const result = await pickApprovalService.getMerchantPickHistory(
    merchantId,
    storeId,
    Number(page),
    Math.min(Number(limit), 50)
  );

  sendSuccess(res, result);
}));

// ============================================
// ANALYTICS (Existing endpoints — auth fixed)
// ============================================

/**
 * GET /merchant/stores/:storeId/creator-picks
 * Get approved/published creator picks for analytics
 */
router.get('/:storeId/creator-picks', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchantId;
  const store = await verifyStoreOwnership(storeId, merchantId);
  if (!store) return sendError(res, 'Store not found or access denied', 404);
  const { page = 1, limit = 20 } = req.query;

  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 50);

  const picks = await CreatorPick.find({
    store: new mongoose.Types.ObjectId(storeId),
    status: 'approved',
    isPublished: true,
  })
    .populate('creator', 'displayName avatar tier')
    .populate('product', 'name pricing images')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const total = await CreatorPick.countDocuments({
    store: new mongoose.Types.ObjectId(storeId),
    status: 'approved',
    isPublished: true,
  });

  const mappedPicks = picks.map((pick: any) => ({
    id: pick._id,
    title: pick.title,
    productName: pick.product?.name || '',
    productPrice: pick.product?.pricing?.selling || pick.product?.pricing?.original || 0,
    creatorName: pick.creator?.displayName || 'Unknown',
    creatorAvatar: pick.creator?.avatar,
    creatorTier: pick.creator?.tier,
    views: pick.engagement?.views || 0,
    clicks: pick.engagement?.clicks || 0,
    purchases: pick.conversions?.totalPurchases || 0,
    revenue: pick.conversions?.totalRevenue || 0,
    commission: pick.conversions?.totalCommissionEarned || 0,
    trendingScore: pick.trendingScore || 0,
    createdAt: pick.createdAt,
  }));

  sendSuccess(res, { picks: mappedPicks, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
}));

/**
 * GET /merchant/stores/:storeId/creator-conversions
 * Get conversions from creator picks for this store
 */
router.get('/:storeId/creator-conversions', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchantId;
  const store = await verifyStoreOwnership(storeId, merchantId);
  if (!store) return sendError(res, 'Store not found or access denied', 404);
  const { page = 1, limit = 20, status } = req.query;

  const pageNum = Number(page);
  const limitNum = Math.min(Number(limit), 50);

  const storePicks = await CreatorPick.find({
    store: new mongoose.Types.ObjectId(storeId),
  }).select('_id').lean();

  const pickIds = storePicks.map((p: any) => p._id);

  const query: any = { pick: { $in: pickIds } };
  if (status) query.status = status;

  const conversions = await CreatorConversion.find(query)
    .populate('creator', 'displayName')
    .populate('buyer', 'name')
    .populate('product', 'name')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const total = await CreatorConversion.countDocuments(query);

  const mappedConversions = conversions.map((c: any) => ({
    id: c._id,
    creatorName: c.creator?.displayName || 'Unknown',
    buyerName: c.buyer?.name || 'Unknown',
    productName: c.product?.name || 'Unknown',
    purchaseAmount: c.purchaseAmount,
    commissionAmount: c.commissionAmount,
    commissionRate: c.commissionRate,
    status: c.status,
    createdAt: c.createdAt,
  }));

  sendSuccess(res, { conversions: mappedConversions, total, page: pageNum });
}));

/**
 * GET /merchant/stores/:storeId/creator-stats
 * Aggregated creator program stats for this store
 */
router.get('/:storeId/creator-stats', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchantId;
  const storeDoc = await verifyStoreOwnership(storeId, merchantId);
  if (!storeDoc) return sendError(res, 'Store not found or access denied', 404);
  const storeObjectId = new mongoose.Types.ObjectId(storeId);

  // Aggregate pick stats
  const pickStats = await CreatorPick.aggregate([
    { $match: { store: storeObjectId, status: 'approved' } },
    {
      $group: {
        _id: null,
        totalPicks: { $sum: 1 },
        totalViews: { $sum: '$engagement.views' },
        totalClicks: { $sum: '$engagement.clicks' },
        totalPurchases: { $sum: '$conversions.totalPurchases' },
        totalRevenue: { $sum: '$conversions.totalRevenue' },
        totalCommission: { $sum: '$conversions.totalCommissionEarned' },
      },
    },
  ]);

  // Count unique creators
  const uniqueCreators = await CreatorPick.distinct('creator', {
    store: storeObjectId,
    status: 'approved',
  });

  // Count pending picks
  const pendingPicks = await CreatorPick.countDocuments({
    store: storeObjectId,
    status: 'pending_merchant',
    'merchantApproval.status': 'pending',
  });

  const ps = pickStats[0] || {};

  sendSuccess(res, {
    totalPicks: ps.totalPicks || 0,
    uniqueCreators: uniqueCreators.length,
    totalViews: ps.totalViews || 0,
    totalClicks: ps.totalClicks || 0,
    totalPurchases: ps.totalPurchases || 0,
    totalRevenue: ps.totalRevenue || 0,
    totalCommission: ps.totalCommission || 0,
    pendingPicks,
    conversionRate: ps.totalClicks > 0
      ? Math.round((ps.totalPurchases / ps.totalClicks) * 100 * 100) / 100
      : 0,
  });
}));

export default router;
