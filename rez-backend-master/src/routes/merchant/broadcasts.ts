// @ts-nocheck
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/merchantauth';
import { MarketingSignalService } from '../../services/MarketingSignalService';
import { logger } from '../../config/logger';

/**
 * Merchant broadcasts routes — proxy layer to rez-marketing-service.
 *
 * Merchant app calls these routes (authenticated via merchant JWT).
 * Routes proxy to rez-marketing-service and return results.
 *
 * Base: /api/merchant/broadcasts
 */

const router = Router();

// All routes require merchant auth
router.use(authMiddleware);

/**
 * Resolve and validate MARKETING_SERVICE_URL at request time so that missing
 * configuration fails loudly with a 503 rather than silently hitting localhost.
 * Returns the URL string on success, or writes a 503 response and returns null.
 */
function resolveMarketingServiceUrl(res: Response): string | null {
  const url = process.env.MARKETING_SERVICE_URL;
  if (!url) {
    logger.error('[Broadcasts] MARKETING_SERVICE_URL is not configured');
    res.status(503).json({ success: false, error: 'Marketing service not configured' });
    return null;
  }
  return url;
}

/**
 * POST /api/merchant/broadcasts/estimate-audience
 * Returns estimated audience count for a given segment filter + channel.
 * Called by marketing.tsx before campaign launch to show reach count.
 *
 * Body: { filter: IAudienceFilter, channel: string }
 */
router.post('/estimate-audience', async (req: Request, res: Response) => {
  const merchantId = (req as any).user?.merchantId || (req as any).user?.id;
  const { filter, channel = 'whatsapp' } = req.body;

  if (!filter) {
    return res.status(400).json({ success: false, message: 'filter is required' });
  }

  const count = await MarketingSignalService.estimateAudience(merchantId, filter, channel);
  res.json({ success: true, estimatedCount: count });
});

/**
 * POST /api/merchant/broadcasts/campaigns
 * Create a new marketing campaign via rez-marketing-service.
 * Proxies the full campaign payload.
 */
router.post('/campaigns', async (req: Request, res: Response) => {
  const merchantId = (req as any).user?.merchantId || (req as any).user?.id;
  const createdBy = (req as any).user?.id;

  const MARKETING_SERVICE_URL = resolveMarketingServiceUrl(res);
  if (!MARKETING_SERVICE_URL) return;
  const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

  try {
    // D15: Whitelist the campaign fields we forward — don't spread raw merchant
    // input at an internal service boundary. Marketing service has its own
    // validation but defense-in-depth keeps schema drift from opening holes.
    const CAMPAIGN_FIELDS = [
      'name',
      'title',
      'description',
      'type',
      'channel',
      'channels',
      'templateId',
      'template',
      'segmentId',
      'segment',
      'audience',
      'targetCriteria',
      'startDate',
      'endDate',
      'scheduleAt',
      'payload',
      'content',
      'subject',
      'body',
      'metadata',
      'tags',
      'priority',
      'throttleRate',
      'status',
    ] as const;
    const safeBody: Record<string, any> = {};
    for (const key of CAMPAIGN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        safeBody[key] = (req.body as any)[key];
      }
    }

    const axios = (await import('axios')).default;
    // OBS-1: forward the correlation ID + caller identity so marketing-service
    // traces tie back to this request chain. Without this, a failure in the
    // marketing service looks like it came from nowhere.
    const correlationId = (req as any).correlationId as string | undefined;
    const response = await axios.post(
      `${MARKETING_SERVICE_URL}/campaigns`,
      { ...safeBody, merchantId, createdBy },
      {
        headers: {
          'x-internal-key': INTERNAL_SERVICE_KEY,
          'x-internal-service': 'rez-backend',
          ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
        },
        timeout: 10_000,
      },
    );
    res.status(201).json(response.data);
  } catch (err: any) {
    // OBS-8: richer structured context so a 502 we return is debuggable.
    logger.error('[Broadcasts] Create campaign failed', {
      err: err?.message,
      code: err?.code,
      status: err?.response?.status,
      responseBody:
        typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data).slice(0, 500) : undefined,
      merchantId,
      correlationId: (req as any).correlationId,
    });
    res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * GET /api/merchant/broadcasts/campaigns
 * List campaigns for this merchant.
 */
router.get('/campaigns', async (req: Request, res: Response) => {
  const merchantId = (req as any).user?.merchantId || (req as any).user?.id;
  const MARKETING_SERVICE_URL = resolveMarketingServiceUrl(res);
  if (!MARKETING_SERVICE_URL) return;
  const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/campaigns`, {
      params: { merchantId, ...req.query },
      headers: { 'x-internal-key': INTERNAL_SERVICE_KEY },
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] List campaigns failed', { err: err.message });
    res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * POST /api/merchant/broadcasts/campaigns/:id/launch
 * Launch a campaign.
 */
router.post('/campaigns/:id/launch', async (req: Request, res: Response) => {
  const MARKETING_SERVICE_URL = resolveMarketingServiceUrl(res);
  if (!MARKETING_SERVICE_URL) return;
  const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

  try {
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `${MARKETING_SERVICE_URL}/campaigns/${req.params.id}/launch`,
      {},
      { headers: { 'x-internal-key': INTERNAL_SERVICE_KEY }, timeout: 10_000 },
    );
    res.json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] Launch campaign failed', { err: err.message });
    res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * GET /api/merchant/broadcasts/analytics
 * Campaign analytics summary for this merchant.
 */
router.get('/analytics', async (req: Request, res: Response) => {
  const merchantId = (req as any).user?.merchantId || (req as any).user?.id;
  const MARKETING_SERVICE_URL = resolveMarketingServiceUrl(res);
  if (!MARKETING_SERVICE_URL) return;
  const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/analytics/summary`, {
      params: { merchantId, days: req.query.days || 30 },
      headers: { 'x-internal-key': INTERNAL_SERVICE_KEY },
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err: any) {
    logger.error('[Broadcasts] Analytics failed', { err: err.message });
    res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * GET /api/merchant/broadcasts/audience/interests
 * Available interest tags with user counts (for interest targeting picker).
 */
router.get('/audience/interests', async (_req: Request, res: Response) => {
  const MARKETING_SERVICE_URL = resolveMarketingServiceUrl(res);
  if (!MARKETING_SERVICE_URL) return;
  const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/audience/interests`, {
      headers: { 'x-internal-key': INTERNAL_SERVICE_KEY },
      timeout: 10_000,
    });
    res.json(response.data);
  } catch {
    res.json({ interests: [] });
  }
});

/**
 * GET /api/merchant/broadcasts/audience/locations
 * Available cities/areas with user counts (for location targeting picker).
 */
router.get('/audience/locations', async (_req: Request, res: Response) => {
  const MARKETING_SERVICE_URL = resolveMarketingServiceUrl(res);
  if (!MARKETING_SERVICE_URL) return;
  const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${MARKETING_SERVICE_URL}/audience/locations`, {
      headers: { 'x-internal-key': INTERNAL_SERVICE_KEY },
      timeout: 10_000,
    });
    res.json(response.data);
  } catch {
    res.json({ cities: [], areas: [] });
  }
});

export default router;
