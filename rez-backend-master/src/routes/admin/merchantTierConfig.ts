import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import MerchantTierConfig from '../../models/MerchantTierConfig';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';
import { escapeRegex } from '../../utils/sanitize';

const router = Router();

router.use(requireAuth);

/**
 * @route   GET /api/admin/merchant-tier-config
 * @desc    Get merchant tier configuration (singleton)
 * @access  Admin
 */
router.get('/', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const config = await (MerchantTierConfig as any).getConfig();
  res.json({ success: true, data: config });
}));

/**
 * @route   PUT /api/admin/merchant-tier-config
 * @desc    Update merchant tier configuration
 * @access  Admin
 */
router.put('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const config = await (MerchantTierConfig as any).getConfig();

  if (req.body.tiers) {
    for (const tierKey of ['free', 'pro', 'enterprise'] as const) {
      if (req.body.tiers[tierKey]) {
        const incoming = req.body.tiers[tierKey];
        const existing = config.tiers[tierKey];

        if (incoming.name !== undefined) existing.name = incoming.name;
        if (incoming.commissionRate !== undefined) existing.commissionRate = incoming.commissionRate;
        if (incoming.monthlyFee !== undefined) existing.monthlyFee = incoming.monthlyFee;
        if (incoming.maxProducts !== undefined) existing.maxProducts = incoming.maxProducts;
        if (incoming.maxStores !== undefined) existing.maxStores = incoming.maxStores;
        if (incoming.features !== undefined) existing.features = incoming.features;
        if (incoming.analyticsAccess !== undefined) existing.analyticsAccess = incoming.analyticsAccess;
        if (incoming.prioritySupport !== undefined) existing.prioritySupport = incoming.prioritySupport;
        if (incoming.customBranding !== undefined) existing.customBranding = incoming.customBranding;
        if (incoming.apiAccess !== undefined) existing.apiAccess = incoming.apiAccess;
      }
    }
    config.markModified('tiers');
  }

  config.updatedBy = (req as any).admin?._id;
  await config.save();

  logger.info('[MerchantTierConfig] Config updated', { adminId: (req as any).admin?._id });
  res.json({ success: true, data: config, message: 'Merchant tier config updated' });
}));

/**
 * @route   PUT /api/admin/merchant-tier-config/:merchantId/assign
 * @desc    Assign tier to a specific merchant
 * @access  Admin
 */
router.put('/:merchantId/assign', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const { tier } = req.body;

  if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
    return res.status(400).json({ success: false, message: 'Invalid tier. Must be free, pro, or enterprise.' });
  }

  // Dynamic import to avoid circular dependency
  const { Merchant } = await import('../../models/Merchant');

  const merchant = await Merchant.findByIdAndUpdate(
    merchantId,
    { tier },
    { new: true, runValidators: true }
  ).select('businessName ownerName email phone tier');

  if (!merchant) {
    return res.status(404).json({ success: false, message: 'Merchant not found' });
  }

  logger.info('[MerchantTierConfig] Tier assigned', { merchantId, tier, adminId: (req as any).admin?._id });
  res.json({ success: true, data: merchant, message: `Tier "${tier}" assigned to ${merchant.businessName}` });
}));

/**
 * @route   GET /api/admin/merchant-tier-config/merchants/search
 * @desc    Search merchants for tier assignment
 * @access  Admin
 */
router.get('/merchants/search', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { q, page = '1', limit = '10' } = req.query;

  if (!q || String(q).trim().length < 2) {
    return res.json({ success: true, data: { merchants: [], totalItems: 0, currentPage: 1, totalPages: 0 } });
  }

  const { Merchant } = await import('../../models/Merchant');
  const escaped = escapeRegex(String(q).trim());
  const regex = new RegExp(escaped, 'i');

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));

  const filter = {
    $or: [
      { businessName: regex },
      { ownerName: regex },
      { phone: regex },
      { email: regex },
    ],
  };

  const [merchants, totalItems] = await Promise.all([
    Merchant.find(filter)
      .select('businessName ownerName email phone tier verificationStatus isActive')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Merchant.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum);

  res.json({
    success: true,
    data: {
      merchants,
      currentPage: pageNum,
      totalPages,
      totalItems,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
}));

export default router;
