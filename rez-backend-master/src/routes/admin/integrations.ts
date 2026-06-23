import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { MerchantIntegration } from '../../models/MerchantIntegration';
import { ExternalTransaction } from '../../models/ExternalTransaction';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /admin/integrations — List all merchant integrations
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { status, provider, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const query: any = {};
    if (status) query.status = status;
    if (provider) query.provider = provider;

    const [integrations, total] = await Promise.all([
      MerchantIntegration.find(query)
        .populate('merchant', 'companyName email')
        .populate('store', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      MerchantIntegration.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        integrations,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  }));

/**
 * POST /admin/integrations/:merchantId — Enable integration for merchant
 */
router.post('/:merchantId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { storeId, integrationType, provider, syncMode, ipWhitelist, config } = req.body;

    if (!storeId || !integrationType || !provider) {
      return res.status(400).json({ success: false, message: 'storeId, integrationType, and provider are required' });
    }

    // Auto-generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const integration = await MerchantIntegration.create({
      merchant: new Types.ObjectId(merchantId),
      store: new Types.ObjectId(storeId),
      integrationType,
      provider: provider.toLowerCase(),
      syncMode: syncMode || 'realtime',
      webhookSecret,
      ipWhitelist: ipWhitelist || [],
      config: config || {},
      status: 'active',
    });

    res.status(201).json({
      success: true,
      data: { integration, webhookSecret },
      message: 'Integration enabled. Share the webhook secret with the merchant.',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Integration already exists for this merchant+store+provider' });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to create integration' });
  }
}));

/**
 * PUT /admin/integrations/:id — Update integration config
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates: any = {};
    const { provider, syncMode, ipWhitelist, config, status } = req.body;

    if (provider !== undefined) updates.provider = provider.toLowerCase();
    if (syncMode !== undefined) updates.syncMode = syncMode;
    if (ipWhitelist !== undefined) updates.ipWhitelist = ipWhitelist;
    if (config !== undefined) updates.config = config;
    if (status !== undefined) updates.status = status;

    const integration = await MerchantIntegration.findByIdAndUpdate(id, updates, { new: true });
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });

    res.json({ success: true, data: { integration } });
  }));

/**
 * PATCH /admin/integrations/:id/toggle — Pause/resume integration
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const integration = await MerchantIntegration.findById(req.params.id);
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });

    integration.status = integration.status === 'active' ? 'paused' : 'active';
    if (integration.status === 'active') integration.errorCount = 0;
    await integration.save();

    res.json({ success: true, data: { status: integration.status } });
  }));

/**
 * GET /admin/integrations/:id/transactions — View sync logs
 */
router.get('/:id/transactions', asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const query: any = { integration: req.params.id };
    if (status) query.status = status;

    const [transactions, total] = await Promise.all([
      ExternalTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('-rawPayload')
        .lean(),
      ExternalTransaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  }));

/**
 * POST /admin/integrations/:id/reprocess — Reprocess failed transactions
 */
router.post('/:id/reprocess', asyncHandler(async (req: Request, res: Response) => {
    const failed = await ExternalTransaction.find({
      integration: req.params.id,
      status: { $in: ['pending', 'failed'] },
    }).limit(100);

    let reprocessed = 0;
    for (const txn of failed) {
      if (txn.user) {
        try {
          const { integrationService } = await import('../../services/integrationService');
          await integrationService.issueReward(txn, txn.user.toString(), txn.store.toString());
          reprocessed++;
        } catch {
          // Skip — already logged inside issueReward
        }
      }
    }

    res.json({ success: true, data: { reprocessed, total: failed.length } });
  }));

export default router;
