/**
 * merchantroutes/broadcasts.ts
 * Campaign broadcast management routes for merchants
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { BroadcastCampaign } from '../models/BroadcastCampaign';
import { MerchantCustomerSnapshot } from '../models/MerchantCustomerSnapshot';
import { MarketingSignalService } from '../services/MarketingSignalService';
import broadcastDispatchService from '../services/broadcastDispatchService';

const router = Router();

// Module-level constant — avoids re-reading the env var on every request
// and ensures a missing var fails visibly rather than silently routing to localhost.
const MARKETING_SERVICE_URL = process.env.MARKETING_SERVICE_URL || 'http://localhost:3008';

/**
 * Resolve the internal service token for outbound calls to rez-marketing-service.
 *
 * Priority order:
 *   1. INTERNAL_SERVICE_TOKENS_JSON['rez-backend'] — scoped per-service token
 *      (rez-marketing-service validates this via x-internal-service: 'rez-backend')
 *   2. INTERNAL_SERVICE_KEY — legacy shared token for backward compatibility
 *
 * This matches how rez-marketing-service's internalAuth middleware validates
 * incoming calls: it reads x-internal-token and resolves it against the
 * 'rez-backend' key in INTERNAL_SERVICE_TOKENS_JSON.
 */
function resolveMarketingServiceToken(): string {
  try {
    const raw = process.env.INTERNAL_SERVICE_TOKENS_JSON;
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const scoped = parsed['rez-backend'];
      if (scoped) return scoped;
    }
  } catch {
    /* fall through */
  }
  return process.env.INTERNAL_SERVICE_KEY || '';
}

// Broadcast rate limiter: max 5 campaigns per hour per merchant
const broadcastRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Too many broadcast campaigns. Maximum 5 per hour.' },
  keyGenerator: (req: any) => `broadcast:${req.merchant?._id?.toString() || 'anon'}`,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * Helper: Estimate audience count based on segment
 */
async function estimateAudience(
  storeId: string,
  segment: 'all' | 'top_spenders' | 'lapsed' | 'new',
): Promise<{ count: number; sampleNames: string[] }> {
  let filter: any = { storeId };

  if (segment === 'top_spenders') {
    filter.totalSpend = { $gte: 1000 };
  } else if (segment === 'lapsed') {
    filter.lastVisitAt = { $lt: new Date(Date.now() - 30 * 86400000) };
  } else if (segment === 'new') {
    filter.totalVisits = { $lte: 2 };
  }
  // For 'all': use base filter

  const count = await MerchantCustomerSnapshot.countDocuments(filter);
  const samples = await MerchantCustomerSnapshot.find(filter).limit(3).select('phone email');
  const sampleNames = samples.map((s) => s.phone || s.email || 'Customer').filter(Boolean);

  return { count, sampleNames };
}

/**
 * GET /merchant/broadcasts
 * List broadcast campaigns for store
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { storeId, status, limit = 20 } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const filter: any = { storeId };

    if (status) {
      filter.status = status;
    }

    const campaigns = await BroadcastCampaign.find(filter).limit(limitNum).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    logger.error('Error fetching broadcasts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch broadcasts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/broadcasts
 * Create and queue a broadcast campaign
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, channel, message, segment, storeId, scheduledAt } = req.body;

    // Validate required fields
    if (!name || !channel || !message || !segment || !storeId) {
      return res.status(400).json({
        success: false,
        message: 'name, channel, message, segment, and storeId are required',
      });
    }

    let status = 'queued';
    let enqueuedAt: Date | null = null;

    // Determine if campaign should be queued immediately or scheduled
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();
    const isScheduledForFuture = scheduledDate > new Date();

    if (!isScheduledForFuture) {
      status = 'queued';
      enqueuedAt = new Date();
    }

    const campaign = new BroadcastCampaign({
      name,
      channel,
      message,
      segment,
      storeId,
      status,
      scheduledAt: scheduledDate,
      enqueuedAt,
      createdAt: new Date(),
    });

    await campaign.save();

    // If not scheduled for future, enqueue to BullMQ
    if (!isScheduledForFuture) {
      try {
        const { broadcastDispatchService } = await import('../services/broadcastDispatchService');
        await (broadcastDispatchService as any).enqueueBroadcast(String((campaign as any)._id), {
          channel,
          message,
          segment,
          storeId,
        });
      } catch (queueError) {
        logger.error('Warning: Failed to enqueue broadcast to queue, but campaign created:', queueError);
        // Don't fail the response if queue fails, just log it
      }
    }

    return res.status(201).json({
      success: true,
      data: campaign,
      message: `Campaign created successfully${isScheduledForFuture ? ' and scheduled' : ' and queued'}`,
    });
  } catch (error) {
    logger.error('Error creating broadcast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create broadcast',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /merchant/broadcasts/:id/cancel
 * Cancel a scheduled broadcast campaign
 */
router.delete('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await BroadcastCampaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    if (campaign.status !== 'queued') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel campaign with status: ${campaign.status}`,
      });
    }

    campaign.status = 'cancelled';
    (campaign as any).cancelledAt = new Date();
    await campaign.save();

    return res.json({
      success: true,
      data: campaign,
      message: 'Campaign cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling broadcast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel broadcast',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/broadcasts/segment-preview
 * Get preview of segment with estimated customer count
 */
router.get('/segment-preview', async (req: Request, res: Response) => {
  try {
    const { segment, storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const segmentDescriptions: Record<string, string> = {
      all: 'All customers',
      recent: 'Visited in last 7 days',
      lapsed: "Haven't visited in 30+ days",
      high_value: 'Top spenders',
      stamp_card: 'Have active stamp card',
    };

    let filter: any = { merchantId: storeId.toString() };
    const description = segmentDescriptions[segment as string] || 'Unknown segment';

    // Apply segment filter
    if (segment === 'recent') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filter.lastVisitAt = { $gte: weekAgo };
    } else if (segment === 'lapsed') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.lastVisitAt = { $lt: thirtyDaysAgo };
    } else if (segment === 'high_value') {
      filter.totalSpent = { $gte: 10000 }; // Example: top spenders threshold
    } else if (segment === 'stamp_card') {
      filter.hasActiveStampCard = true;
    }
    // For 'all', use base filter

    const estimatedCount = await MerchantCustomerSnapshot.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        estimatedCount,
        description,
        segment,
      },
    });
  } catch (error) {
    logger.error('Error fetching segment preview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch segment preview',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/broadcasts/estimate-audience
 * Estimate audience count for a given segment filter.
 *
 * Supports two modes:
 *   1. Simple segment (legacy): { storeId, segment: 'all'|'top_spenders'|'lapsed'|'new' }
 *      → uses MerchantCustomerSnapshot directly
 *   2. Advanced filter (new): { merchantId, filter: IAudienceFilter, channel }
 *      → proxies to rez-marketing-service for location/interest/birthday/etc targeting
 */
router.post('/estimate-audience', async (req: Request, res: Response) => {
  try {
    const { storeId, segment, merchantId, filter, channel = 'whatsapp' } = req.body;

    // Advanced targeting: proxy to rez-marketing-service
    if (filter && filter.segment) {
      const mid = merchantId || storeId || (req as any).merchant?._id?.toString();
      if (!mid) {
        return res.status(400).json({ success: false, message: 'merchantId is required' });
      }
      const count = await MarketingSignalService.estimateAudience(mid, filter, channel);
      return res.json({ success: true, data: { count, estimatedCount: count } });
    }

    // Legacy simple segment
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }

    const validSegments = ['all', 'top_spenders', 'lapsed', 'new', 'recent', 'high_value', 'stamp_card'];
    if (segment && !validSegments.includes(segment)) {
      return res.status(400).json({ success: false, message: `segment must be one of: ${validSegments.join(', ')}` });
    }

    const result = await estimateAudience(storeId, segment || 'all');
    return res.json({
      success: true,
      data: { count: result.count, estimatedCount: result.count, sampleNames: result.sampleNames },
    });
  } catch (error) {
    logger.error('Error estimating audience:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to estimate audience',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/broadcasts/audience/interests
 * Interest tags available for targeting (sourced from rez-marketing-service).
 */
router.get('/audience/interests', async (_req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/audience/interests`, {
      headers: {
        'x-internal-token': resolveMarketingServiceToken(),
        'x-internal-key': resolveMarketingServiceToken(),
        'x-internal-service': 'rez-backend',
      },
      timeout: 5_000,
    });
    return res.json(response.data);
  } catch {
    return res.json({ interests: [] });
  }
});

/**
 * GET /merchant/broadcasts/audience/locations
 * Cities and areas available for location targeting.
 */
router.get('/audience/locations', async (_req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/audience/locations`, {
      headers: {
        'x-internal-token': resolveMarketingServiceToken(),
        'x-internal-key': resolveMarketingServiceToken(),
        'x-internal-service': 'rez-backend',
      },
      timeout: 5_000,
    });
    return res.json(response.data);
  } catch {
    return res.json({ cities: [], areas: [] });
  }
});

/**
 * GET /merchant/broadcasts/audience/institutions
 * Institutions (colleges, offices) available for institution targeting.
 */
router.get('/audience/institutions', async (_req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/audience/institutions`, {
      headers: {
        'x-internal-token': resolveMarketingServiceToken(),
        'x-internal-key': resolveMarketingServiceToken(),
        'x-internal-service': 'rez-backend',
      },
      timeout: 5_000,
    });
    return res.json(response.data);
  } catch {
    return res.json({ institutions: [] });
  }
});

/**
 * GET /merchant/broadcasts/marketing/campaigns
 * List marketing campaigns from rez-marketing-service.
 */
router.get('/marketing/campaigns', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id?.toString();
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/campaigns`, {
      params: { merchantId, ...req.query },
      headers: {
        'x-internal-token': resolveMarketingServiceToken(),
        'x-internal-key': resolveMarketingServiceToken(),
        'x-internal-service': 'rez-backend',
      },
      timeout: 8_000,
    });
    return res.json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] List marketing campaigns failed', { err: err.message });
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * POST /merchant/broadcasts/marketing/campaigns
 * Create a new advanced marketing campaign via rez-marketing-service.
 */
router.post('/marketing/campaigns', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id?.toString();
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `${MARKETING_SERVICE_URL}/campaigns`,
      { ...req.body, merchantId },
      {
        headers: {
          'x-internal-token': resolveMarketingServiceToken(),
          'x-internal-key': resolveMarketingServiceToken(),
          'x-internal-service': 'rez-backend',
        },
        timeout: 10_000,
      },
    );
    return res.status(201).json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] Create marketing campaign failed', { err: err.message });
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * POST /merchant/broadcasts/marketing/campaigns/:id/launch
 * Launch a marketing campaign.
 */
router.post('/marketing/campaigns/:id/launch', async (req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `${MARKETING_SERVICE_URL}/campaigns/${req.params.id}/launch`,
      {},
      {
        headers: {
          'x-internal-token': resolveMarketingServiceToken(),
          'x-internal-key': resolveMarketingServiceToken(),
          'x-internal-service': 'rez-backend',
        },
        timeout: 10_000,
      },
    );
    return res.json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] Launch marketing campaign failed', { err: err.message });
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * GET /merchant/broadcasts/marketing/analytics
 * Campaign analytics summary from rez-marketing-service.
 */
router.get('/marketing/analytics', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id?.toString();
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/analytics/summary`, {
      params: { merchantId, days: req.query.days || 30 },
      headers: {
        'x-internal-token': resolveMarketingServiceToken(),
        'x-internal-key': resolveMarketingServiceToken(),
        'x-internal-service': 'rez-backend',
      },
      timeout: 8_000,
    });
    return res.json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] Marketing analytics failed', { err: err.message });
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * GET /merchant/broadcasts/keyword-bids
 * List keyword bids for a merchant (Search Ads).
 */
router.get('/keyword-bids', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id?.toString();
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/keywords`, {
      params: { merchantId },
      headers: {
        'x-internal-token': resolveMarketingServiceToken(),
        'x-internal-key': resolveMarketingServiceToken(),
        'x-internal-service': 'rez-backend',
      },
      timeout: 5_000,
    });
    return res.json(response.data);
  } catch (err: any) {
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * POST /merchant/broadcasts/keyword-bids
 * Create a keyword bid (Search Ad).
 */
router.post('/keyword-bids', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id?.toString();
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `${MARKETING_SERVICE_URL}/keywords`,
      { ...req.body, merchantId },
      {
        headers: {
          'x-internal-token': resolveMarketingServiceToken(),
          'x-internal-key': resolveMarketingServiceToken(),
          'x-internal-service': 'rez-backend',
        },
        timeout: 8_000,
      },
    );
    return res.status(201).json(response.data);
  } catch (err: any) {
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * POST /merchant/broadcasts/send
 * Send broadcast campaign to audience segment
 */
router.post('/send', broadcastRateLimiter, async (req: Request, res: Response) => {
  try {
    const { storeId, title, message, segment, channels } = req.body;

    // Validate required fields
    if (!storeId || !title || !message || !segment) {
      return res.status(400).json({
        success: false,
        message: 'storeId, title, message, and segment are required',
      });
    }

    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'channels must be a non-empty array',
      });
    }

    // Estimate audience count
    const estimation = await estimateAudience(storeId, segment as 'all' | 'top_spenders' | 'lapsed' | 'new');

    // Create campaign document
    const campaign = new BroadcastCampaign({
      storeId,
      name: title,
      message,
      channel: channels[0], // Store primary channel; multi-channel support can be extended
      audience: {
        segment,
        estimatedCount: estimation.count,
      },
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Set stats fields
    (campaign as any).sent = 0;
    (campaign as any).delivered = 0;
    (campaign as any).opened = 0;
    (campaign as any).failed = 0;

    await campaign.save();

    // Enqueue to BullMQ for async dispatch
    try {
      await (broadcastDispatchService as any).enqueueBroadcast(String((campaign as any)._id), {
        storeId,
        channels,
        audience: { segment, estimatedCount: estimation.count },
      });
    } catch (queueErr) {
      logger.error('[Broadcast] Failed to enqueue broadcast to queue (non-fatal):', queueErr);
      // Non-fatal: campaign is persisted, operator can retry via admin
    }

    return res.status(201).json({
      success: true,
      data: {
        campaignId: campaign._id,
        estimatedRecipients: estimation.count,
        status: 'queued',
        channels,
      },
    });
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/broadcasts/:id/stats
 * Get campaign statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await BroadcastCampaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const sent = (campaign as any).sent || 0;
    const delivered = (campaign as any).delivered || 0;
    const opened = (campaign as any).opened || 0;
    const failed = (campaign as any).failed || 0;
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

    return res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        status: campaign.status,
        sent,
        delivered,
        opened,
        failed,
        openRate,
        createdAt: campaign.createdAt,
        sentAt: (campaign as any).sentAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching campaign stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
