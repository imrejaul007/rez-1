/**
 * Admin Routes - Privé
 *
 * Manages Privé offers, vouchers, user reputation, and analytics.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireOperator, requireSeniorAdmin } from '../../middleware/auth';
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getVouchers,
  invalidateVoucher,
  extendVoucher,
  issueVoucher,
  getUserReputation,
  overrideUserReputation,
  recalculateUserReputation,
  getAnalytics,
} from '../../controllers/admin/priveAdminController';
import {
  getAccessList,
  grantAccess,
  revokeAccess,
  getInviteCodes,
  deactivateCode,
  getInviteAnalytics,
  getInviteConfig,
  updateInviteConfig,
} from '../../controllers/admin/priveInviteAdminController';
import {
  getSmartSpendItems,
  createSmartSpendItem,
  updateSmartSpendItem,
  deleteSmartSpendItem,
  toggleSmartSpendItemStatus,
  reorderSmartSpendItems,
  getSmartSpendAnalytics,
} from '../../controllers/admin/smartSpendAdminController';
import {
  getProgramConfig,
  updateProgramConfig,
  updateTierThresholds,
  updatePillarWeights,
  updateFeatureFlags,
  updateTiers,
  getAuditLog,
} from '../../controllers/admin/priveConfigAdminController';
import {
  getAdminMissions,
  createAdminMission,
  updateAdminMission,
  deleteAdminMission,
  getMissionAnalytics,
} from '../../controllers/admin/priveMissionAdminController';
import {
  getAdminConciergeTickets,
  assignConciergeTicket,
  respondConciergeTicket,
  resolveConciergeTicket,
  getConciergeAnalytics,
} from '../../controllers/admin/priveConciergeAdminController';
import { Product } from '../../models/Product';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// ─── Program Config (senior admin for writes — affects tier thresholds, weights, flags) ──
router.get('/program-config', getProgramConfig);
router.put('/program-config', requireSeniorAdmin, updateProgramConfig);
router.put('/program-config/tier-thresholds', requireSeniorAdmin, updateTierThresholds);
router.put('/program-config/pillar-weights', requireSeniorAdmin, updatePillarWeights);
router.put('/program-config/feature-flags', requireSeniorAdmin, updateFeatureFlags);
router.put('/program-config/tiers', requireSeniorAdmin, updateTiers);

// ─── Audit Log ──────────────────────────────────────────────────────────────
router.get('/audit-log', getAuditLog);

// ─── Missions (operator for writes) ──────────────────────────────────────
router.get('/missions', getAdminMissions);
router.post('/missions', requireOperator, createAdminMission);
router.put('/missions/:id', requireOperator, updateAdminMission);
router.delete('/missions/:id', requireOperator, deleteAdminMission);
router.get('/missions/:id/analytics', getMissionAnalytics);

// ─── Offers (operator for writes) ────────────────────────────────────────────
router.get('/offers', getOffers);
router.post('/offers', requireOperator, createOffer);
router.put('/offers/:id', requireOperator, updateOffer);
router.delete('/offers/:id', requireOperator, deleteOffer);
router.patch('/offers/:id/status', requireOperator, toggleOfferStatus);

// ─── Vouchers (operator for issue/extend, senior for invalidate) ─────────────
router.get('/vouchers', getVouchers);
router.post('/vouchers', requireOperator, issueVoucher);
router.patch('/vouchers/:id/invalidate', requireSeniorAdmin, invalidateVoucher);
router.patch('/vouchers/:id/extend', requireOperator, extendVoucher);

// ─── User Reputation (senior for override, operator for recalculate) ────────
router.get('/users/:userId/reputation', getUserReputation);
router.patch('/users/:userId/reputation', requireSeniorAdmin, overrideUserReputation);
router.post('/users/:userId/recalculate', requireOperator, recalculateUserReputation);

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics', getAnalytics);

// ─── Smart Spend ────────────────────────────────────────────────────────────
router.get('/smart-spend', getSmartSpendItems);
router.get('/smart-spend/analytics', getSmartSpendAnalytics);
router.post('/smart-spend', createSmartSpendItem);
router.put('/smart-spend/reorder', reorderSmartSpendItems);
router.put('/smart-spend/:id', updateSmartSpendItem);
router.delete('/smart-spend/:id', deleteSmartSpendItem);
router.patch('/smart-spend/:id/status', toggleSmartSpendItemStatus);

// ─── Invite & Access Management (operator for grant/revoke, senior for config) ──
router.get('/access', getAccessList);
router.post('/access/grant', requireOperator, grantAccess);
router.post('/access/revoke', requireSeniorAdmin, revokeAccess);
router.get('/invite-codes', getInviteCodes);
router.patch('/invite-codes/:id/deactivate', requireOperator, deactivateCode);
router.get('/invite-analytics', getInviteAnalytics);
router.get('/invite-config', getInviteConfig);
router.put('/invite-config', requireSeniorAdmin, updateInviteConfig);

// ─── Concierge ───────────────────────────────────────────────────────────────
router.get('/concierge/tickets', getAdminConciergeTickets);
router.put('/concierge/tickets/:id/assign', assignConciergeTicket);
router.post('/concierge/tickets/:id/respond', respondConciergeTicket);
router.post('/concierge/tickets/:id/resolve', resolveConciergeTicket);
router.get('/concierge/analytics', getConciergeAnalytics);

// ─── Lifecycle Analytics ─────────────────────────────────────────────────────
router.get('/lifecycle-analytics', asyncHandler(async (req: Request, res: Response) => {
  const PriveAccess = (await import('../../models/PriveAccess')).default;
  const { UserReputation } = await import('../../models/UserReputation');
  const { UserMission } = await import('../../models/UserMission');
  const { PriveAuditLog } = await import('../../models/PriveAuditLog');
  const { SupportTicket } = await import('../../models/SupportTicket');
  const { CoinTransaction } = await import('../../models/CoinTransaction');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalMembers,
    tierDistribution,
    activeLast30d,
    missionEngagement,
    conciergeMetrics,
    coinFlow,
  ] = await Promise.all([
    // Total active members
    PriveAccess.countDocuments({ status: 'active' }),

    // Tier distribution
    PriveAccess.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
    ]).catch(() => []),

    // Active members in last 30 days (have transactions)
    CoinTransaction.distinct('user', { createdAt: { $gte: thirtyDaysAgo } }).then(u => u.length).catch(() => 0),

    // Mission engagement
    Promise.all([
      UserMission.countDocuments({ status: 'active' }),
      UserMission.countDocuments({ status: 'completed', completedAt: { $gte: thirtyDaysAgo } }),
      UserMission.countDocuments({ status: 'expired', updatedAt: { $gte: thirtyDaysAgo } }),
    ]).then(([active, completed, expired]) => ({
      activeMissions: active,
      completedLast30d: completed,
      expiredLast30d: expired,
      completionRate: (active + completed + expired) > 0
        ? Math.round((completed / (active + completed + expired)) * 100)
        : 0,
    })).catch(() => ({ activeMissions: 0, completedLast30d: 0, expiredLast30d: 0, completionRate: 0 })),

    // Concierge SLA metrics
    Promise.all([
      SupportTicket.countDocuments({ isPriveTicket: true, status: { $in: ['open', 'in_progress'] } }),
      SupportTicket.countDocuments({ isPriveTicket: true, slaBreached: true, createdAt: { $gte: thirtyDaysAgo } }),
      SupportTicket.countDocuments({ isPriveTicket: true, createdAt: { $gte: thirtyDaysAgo } }),
    ]).then(([open, breached, total]) => ({
      openTickets: open,
      slaBreached: breached,
      totalLast30d: total,
      complianceRate: total > 0 ? Math.round(((total - breached) / total) * 100) : 100,
    })).catch(() => ({ openTickets: 0, slaBreached: 0, totalLast30d: 0, complianceRate: 100 })),

    // Coin earn vs burn
    CoinTransaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]).catch(() => []),
  ]);

  // Format tier distribution
  const tiers = tierDistribution.reduce((acc: Record<string, number>, t: any) => {
    acc[t._id || 'unknown'] = t.count;
    return acc;
  }, {});

  // Format coin flow
  const coinSummary = coinFlow.reduce((acc: any, c: any) => {
    if (['earned', 'bonus'].includes(c._id)) {
      acc.totalEarned += c.total;
      acc.earnTransactions += c.count;
    } else if (['spent', 'redeemed'].includes(c._id)) {
      acc.totalSpent += Math.abs(c.total);
      acc.spendTransactions += c.count;
    }
    return acc;
  }, { totalEarned: 0, totalSpent: 0, earnTransactions: 0, spendTransactions: 0 });

  // Activation rate (members who transacted in last 30d / total members)
  const activationRate = totalMembers > 0
    ? Math.round((activeLast30d / totalMembers) * 100)
    : 0;

  sendSuccess(res, {
    totalMembers,
    tierDistribution: tiers,
    activationRate,
    activeLast30d,
    missionEngagement,
    conciergeMetrics,
    coinFlow: coinSummary,
  });
}));

// ─── Review Eligibility ─────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/review-eligible-products
 * List products with Privé review eligibility
 */
router.get('/review-eligible-products', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = { isPriveReviewEligible: true, isActive: true, isDeleted: { $ne: true } };

  const [products, total] = await Promise.all([
    Product.find(query)
      .select('name images pricing store isPriveReviewEligible priveReviewRewardCoins')
      .populate('store', 'name logo')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  sendSuccess(res, {
    products,
    pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
  });
}));

/**
 * PUT /api/admin/prive/products/:productId/review-eligibility
 * Toggle product Privé review eligibility
 */
router.put('/products/:productId/review-eligibility', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { isPriveReviewEligible, priveReviewRewardCoins } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (typeof isPriveReviewEligible === 'boolean') {
    product.isPriveReviewEligible = isPriveReviewEligible;
  }
  if (typeof priveReviewRewardCoins === 'number' && priveReviewRewardCoins >= 0 && priveReviewRewardCoins <= 500) {
    product.priveReviewRewardCoins = priveReviewRewardCoins;
  }

  await product.save();

  sendSuccess(res, { product }, 'Product review eligibility updated');
}));

export default router;
