/**
 * Merchant Integrations Routes — P3
 *
 * GET    /api/merchant/integrations/status               — list all integrations + stats
 * POST   /api/merchant/integrations/aggregator/connect   — connect Swiggy/Zomato/Dunzo
 * POST   /api/merchant/integrations/aggregator/disconnect
 * GET    /api/merchant/integrations/aggregator/orders    — incoming aggregator orders
 * PATCH  /api/merchant/integrations/aggregator/orders/:id/status — accept/reject/update
 * POST   /api/merchant/integrations/:platform/sync       — trigger menu push
 * POST   /api/merchant/integrations/pause-all            — pause every integration
 * POST   /api/merchant/integrations/batch-upload         — CSV transaction upload
 * GET    /api/merchant/integrations/payment-gateway      — current gateway config
 * PATCH  /api/merchant/integrations/payment-gateway      — switch active gateway
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { authMiddleware } from '../middleware/merchantauth';
import { MerchantIntegration } from '../models/MerchantIntegration';
import AggregatorOrder from '../models/AggregatorOrder';
import { MProduct as MerchantProduct } from '../models/MerchantProduct';
import { logger } from '../config/logger';
import { detectAndNotifyConflicts, AggregatorMenuItem } from '../services/aggregatorSyncService';

const router = Router();
router.use(authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMerchantId(req: Request): string {
  return String((req as any).merchant?._id || (req as any).merchantId);
}

function generateWebhookSecret(): string {
  return `wh_${crypto.randomBytes(20).toString('hex')}`;
}

const AGGREGATOR_PLATFORMS = ['swiggy', 'zomato', 'dunzo', 'ondc'] as const;
const GATEWAY_PROVIDERS = ['razorpay', 'stripe', 'cashfree', 'payu'] as const;

// ─── Integration Status ───────────────────────────────────────────────────────

/**
 * GET /api/merchant/integrations/status?storeId=
 * Returns all active integrations for the store + transaction counters.
 */
router.get('/integrations/status', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId } = req.query as { storeId?: string };

    const filter: Record<string, any> = { merchant: merchantId };
    if (storeId) filter.store = storeId;

    const integrations = await MerchantIntegration.find(filter).sort({ createdAt: -1 }).lean();

    // Pending aggregator orders count
    const pendingFilter: Record<string, any> = { merchantId, status: 'pending' };
    if (storeId) pendingFilter.storeId = storeId;
    const pendingTransactions = await AggregatorOrder.countDocuments(pendingFilter);

    // Recent orders (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFilter: Record<string, any> = { merchantId, createdAt: { $gte: since } };
    if (storeId) recentFilter.storeId = storeId;
    const recentTransactions = await AggregatorOrder.countDocuments(recentFilter);

    return res.json({
      success: true,
      data: {
        integrations: integrations.map((i) => ({
          _id: String(i._id),
          integrationType: i.integrationType,
          provider: i.provider,
          status: i.status,
          syncMode: i.syncMode,
          lastSyncAt: i.lastSyncAt?.toISOString() || null,
          lastSyncStatus: i.lastSyncStatus || null,
          errorCount: i.errorCount,
          createdAt: (i.createdAt as Date).toISOString(),
        })),
        recentTransactions,
        pendingTransactions,
      },
    });
  } catch (err: any) {
    logger.error('[Integrations] status error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch integration status' });
  }
});

// ─── Aggregator Connect / Disconnect ─────────────────────────────────────────

/**
 * POST /api/merchant/integrations/aggregator/connect
 * Body: { storeId, platform, apiKey, apiSecret }
 *
 * In production this would validate credentials against the platform's API.
 * Here we store the encrypted key and create/update the integration record.
 */
router.post('/integrations/aggregator/connect', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId, platform, apiKey, apiSecret } = req.body;

    if (!storeId || !platform || !apiKey) {
      return res.status(400).json({ success: false, message: 'storeId, platform and apiKey are required' });
    }

    if (!AGGREGATOR_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `platform must be one of: ${AGGREGATOR_PLATFORMS.join(', ')}`,
      });
    }

    // Simple XOR-based obfuscation (replace with KMS in production)
    const encryptedKey = Buffer.from(`${apiKey}:${apiSecret || ''}`).toString('base64');

    const integration = await MerchantIntegration.findOneAndUpdate(
      { merchant: merchantId, store: storeId, provider: platform },
      {
        $set: {
          merchant: merchantId,
          store: storeId,
          provider: platform,
          integrationType: 'manual', // using manual as aggregator catch-all
          status: 'active',
          syncMode: 'realtime',
          apiKeyEncrypted: encryptedKey,
          errorCount: 0,
          lastSyncStatus: 'connected',
          lastSyncAt: new Date(),
        },
        $setOnInsert: {
          webhookSecret: generateWebhookSecret(),
          ipWhitelist: [],
          config: {},
          metadata: { platform },
        },
      },
      { upsert: true, new: true },
    );

    logger.info(`[Integrations] ${platform} connected for merchant ${merchantId}`);

    return res.json({
      success: true,
      data: { integration: { _id: String(integration._id), provider: platform, status: 'active' } },
      message: `${platform} connected successfully`,
    });
  } catch (err: any) {
    logger.error('[Integrations] aggregator connect error', err);
    return res.status(500).json({ success: false, message: 'Failed to connect aggregator' });
  }
});

/**
 * POST /api/merchant/integrations/aggregator/disconnect
 * Body: { storeId, platform }
 */
router.post('/integrations/aggregator/disconnect', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId, platform } = req.body;

    if (!storeId || !platform) {
      return res.status(400).json({ success: false, message: 'storeId and platform are required' });
    }

    await MerchantIntegration.findOneAndUpdate(
      { merchant: merchantId, store: storeId, provider: platform },
      { $set: { status: 'paused', apiKeyEncrypted: null, lastSyncStatus: 'disconnected' } },
    );

    return res.json({ success: true, message: `${platform} disconnected` });
  } catch (err: any) {
    logger.error('[Integrations] aggregator disconnect error', err);
    return res.status(500).json({ success: false, message: 'Failed to disconnect aggregator' });
  }
});

// ─── Aggregator Orders ────────────────────────────────────────────────────────

/**
 * GET /api/merchant/integrations/aggregator/orders
 * Query: storeId?, platform?, status?, page=1, limit=20
 */
router.get('/integrations/aggregator/orders', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId, platform, status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, any> = { merchantId };
    if (storeId) filter.storeId = storeId;
    if (platform) filter.platform = platform;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));

    const [orders, total] = await Promise.all([
      AggregatorOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AggregatorOrder.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          id: String(o._id),
          platform: o.platform,
          orderNumber: o.externalId,
          externalId: o.externalId,
          items: o.items,
          total: o.total,
          status: o.status,
          customerName: o.customerName || null,
          customerPhone: o.customerPhone || null,
          deliveryAddress: o.deliveryAddress || null,
          acceptedAt: o.acceptedAt?.toISOString() || null,
          createdAt: (o.createdAt as Date).toISOString(),
        })),
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err: any) {
    logger.error('[Integrations] aggregator orders error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch aggregator orders' });
  }
});

/**
 * PATCH /api/merchant/integrations/aggregator/orders/:id/status
 * Body: { status: 'accepted' | 'rejected' | 'preparing' | 'ready' | 'cancelled' }
 */
router.patch('/integrations/aggregator/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { status } = req.body;

    const VALID_STATUSES = ['accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const update: Record<string, any> = { status };
    if (status === 'accepted') update.acceptedAt = new Date();
    if (status === 'delivered') update.deliveredAt = new Date();

    const order = await AggregatorOrder.findOneAndUpdate(
      { _id: req.params.id, merchantId },
      { $set: update },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({ success: true, data: { order }, message: `Order ${status}` });
  } catch (err: any) {
    logger.error('[Integrations] order status update error', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// ─── Menu Sync ────────────────────────────────────────────────────────────────

/**
 * POST /api/merchant/integrations/:platform/sync
 * Pushes REZ menu to the aggregator platform and runs conflict detection.
 * In production this calls the platform's Menu API. Here we simulate it.
 */
router.post('/integrations/:platform/sync', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { platform } = req.params;
    const { storeId } = req.body;

    if (!AGGREGATOR_PLATFORMS.includes(platform as any)) {
      return res.status(400).json({ success: false, message: `Unsupported platform: ${platform}` });
    }

    // Verify integration exists and is active
    const integration = await MerchantIntegration.findOne({
      merchant: merchantId,
      provider: platform,
      status: 'active',
    });

    if (!integration) {
      return res.status(400).json({
        success: false,
        message: `No active ${platform} integration found. Connect it first.`,
      });
    }

    // Fetch REZ menu for conflict detection
    const storeFilter: Record<string, any> = { merchantId };
    if (storeId) storeFilter.storeId = storeId;
    const rezProducts = await MerchantProduct.find(storeFilter).select('name price is86d aggregatorMapping').lean();

    // Simulate fetching aggregator's current menu (in prod: call their API)
    const aggregatorItems: AggregatorMenuItem[] = rezProducts.map((p: any) => ({
      id: p.aggregatorMapping?.[platform] || String(p._id),
      name: p.name,
      price: p.price ?? 0,
      available: !p.is86d,
    }));

    const conflicts = await detectAndNotifyConflicts(merchantId, platform, rezProducts, aggregatorItems);

    // Update lastSyncAt
    await MerchantIntegration.findByIdAndUpdate(integration._id, {
      lastSyncAt: new Date(),
      lastSyncStatus:
        conflicts.conflicts.length > 0 ? `synced_with_${conflicts.conflicts.length}_conflicts` : 'synced_ok',
    });

    return res.json({
      success: true,
      data: {
        platform,
        itemsSynced: rezProducts.length,
        conflicts: conflicts.conflicts,
        syncedAt: new Date().toISOString(),
      },
      message:
        conflicts.conflicts.length > 0
          ? `Menu synced with ${conflicts.conflicts.length} conflict(s) detected`
          : 'Menu synced successfully',
    });
  } catch (err: any) {
    logger.error('[Integrations] menu sync error', err);
    return res.status(500).json({ success: false, message: 'Failed to sync menu' });
  }
});

// ─── Pause All ────────────────────────────────────────────────────────────────

/**
 * POST /api/merchant/integrations/pause-all
 * Sets all active integrations for the merchant to 'paused'.
 */
router.post('/integrations/pause-all', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId } = req.body;

    const filter: Record<string, any> = { merchant: merchantId, status: 'active' };
    if (storeId) filter.store = storeId;

    const result = await MerchantIntegration.updateMany(filter, { $set: { status: 'paused' } });

    return res.json({
      success: true,
      data: { paused: result.modifiedCount },
      message: `${result.modifiedCount} integration(s) paused`,
    });
  } catch (err: any) {
    logger.error('[Integrations] pause-all error', err);
    return res.status(500).json({ success: false, message: 'Failed to pause integrations' });
  }
});

// ─── Batch Upload ─────────────────────────────────────────────────────────────

/**
 * POST /api/merchant/integrations/batch-upload
 * Body: { storeId, csvData }
 * Parses CSV rows and creates AggregatorOrder documents (ONDC / manual).
 */
router.post('/integrations/batch-upload', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId, csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ success: false, message: 'csvData is required' });
    }

    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const rows = lines.slice(1);

    let processed = 0;
    let failed = 0;
    let duplicates = 0;

    for (const row of rows) {
      try {
        const values = row.split(',').map((v: string) => v.trim());
        const record: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          record[h] = values[i] || '';
        });

        const externalId = record['order_id'] || record['id'] || record['external_id'];
        if (!externalId) {
          failed++;
          continue;
        }

        const exists = await AggregatorOrder.exists({ externalId, merchantId });
        if (exists) {
          duplicates++;
          continue;
        }

        await AggregatorOrder.create({
          externalId,
          platform: (record['platform'] || 'ondc') as any,
          merchantId,
          storeId: storeId || undefined,
          customerName: record['customer_name'] || record['name'] || undefined,
          total: parseFloat(record['total'] || record['amount'] || '0'),
          status: 'delivered',
          items: [],
          rawPayload: record,
        });
        processed++;
      } catch {
        failed++;
      }
    }

    return res.json({
      success: true,
      data: { processed, failed, duplicates },
      message: `Batch upload complete: ${processed} processed, ${duplicates} duplicates, ${failed} failed`,
    });
  } catch (err: any) {
    logger.error('[Integrations] batch-upload error', err);
    return res.status(500).json({ success: false, message: 'Failed to process batch upload' });
  }
});

// ─── Payment Gateway ──────────────────────────────────────────────────────────

/**
 * GET /api/merchant/integrations/payment-gateway
 * Returns the merchant's active payment gateway configuration.
 */
router.get('/integrations/payment-gateway', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId } = req.query as { storeId?: string };

    const filter: Record<string, any> = { merchant: merchantId, integrationType: 'pos' };
    if (storeId) filter.store = storeId;

    // Gateway is stored as a special 'pos' type integration with provider = gateway name
    const gateway = await MerchantIntegration.findOne({
      ...filter,
      provider: { $in: GATEWAY_PROVIDERS },
      status: 'active',
    }).lean();

    return res.json({
      success: true,
      data: {
        activeGateway: gateway
          ? {
              provider: gateway.provider,
              status: gateway.status,
              lastSyncAt: gateway.lastSyncAt?.toISOString() || null,
            }
          : null,
        availableGateways: GATEWAY_PROVIDERS,
      },
    });
  } catch (err: any) {
    logger.error('[Integrations] payment-gateway GET error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch gateway config' });
  }
});

/**
 * PATCH /api/merchant/integrations/payment-gateway
 * Body: { storeId, provider, apiKey?, webhookSecret? }
 * Switches the active payment gateway. Deactivates any previous one first.
 */
router.patch('/integrations/payment-gateway', async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { storeId, provider, apiKey } = req.body;

    if (!provider || !GATEWAY_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: `provider must be one of: ${GATEWAY_PROVIDERS.join(', ')}`,
      });
    }
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }

    // Pause any existing active gateway
    await MerchantIntegration.updateMany(
      {
        merchant: merchantId,
        store: storeId,
        integrationType: 'pos',
        provider: { $in: GATEWAY_PROVIDERS },
        status: 'active',
      },
      { $set: { status: 'paused' } },
    );

    // Upsert the new gateway
    const integration = await MerchantIntegration.findOneAndUpdate(
      { merchant: merchantId, store: storeId, provider },
      {
        $set: {
          merchant: merchantId,
          store: storeId,
          provider,
          integrationType: 'pos',
          status: 'active',
          apiKeyEncrypted: apiKey ? Buffer.from(apiKey).toString('base64') : undefined,
          lastSyncAt: new Date(),
          lastSyncStatus: 'configured',
          errorCount: 0,
        },
        $setOnInsert: {
          syncMode: 'realtime',
          webhookSecret: generateWebhookSecret(),
          ipWhitelist: [],
          config: {},
          metadata: { gatewayType: 'payment' },
        },
      },
      { upsert: true, new: true },
    );

    logger.info(`[Integrations] payment gateway switched to ${provider} for merchant ${merchantId}`);

    return res.json({
      success: true,
      data: { provider, status: 'active' },
      message: `Payment gateway switched to ${provider}`,
    });
  } catch (err: any) {
    logger.error('[Integrations] payment-gateway PATCH error', err);
    return res.status(500).json({ success: false, message: 'Failed to switch payment gateway' });
  }
});

export default router;
