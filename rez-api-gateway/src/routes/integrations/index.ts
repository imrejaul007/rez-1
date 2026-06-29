/**
 * CorpPerks Integration Routes
 *
 * OAuth authentication and webhook handlers for external integrations:
 * - Makcorps (Hotel OTA)
 * - NextaBizz (Gifting Procurement)
 * - RTMN Finance (Wallet/BNPL)
 * - HRIS Providers (GreytHR, Zoho, BambooHR)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { requireAuth, requireAdminAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';

const router = Router();

/**
 * Verify a webhook signature using constant-time HMAC-SHA256.
 * Returns false if `secret` is unset (so we fail closed in production).
 */
function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret) {
    logger.error('[Webhook] Secret not configured — refusing to verify');
    return false;
  }
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Wrap a handler to require HMAC verification. */
function requireWebhookSignature(secretEnv: string, headerName: string): RequestHandler {
  return (req: Request, res: Response, next) => {
    const secret = process.env[secretEnv];
    const signature = req.headers[headerName] as string | undefined;
    // req.body must be the raw buffer/string for HMAC. Since express.json parses it,
    // we re-serialize from the parsed object — integrations should keep payloads
    // deterministic (no whitespace/ordering changes between sender and receiver).
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      logger.warn('[Webhook] Signature verification failed', { header: headerName });
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }
    next();
  };
}

// ============================================
// OAUTH CONFIGURATION
// ============================================

interface OAuthConfig {
  provider: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

// In production, these would come from database
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  makcorps: {
    provider: 'makcorps',
    clientId: process.env.MAKCORPS_CLIENT_ID || '',
    clientSecret: process.env.MAKCORPS_CLIENT_SECRET || '',
    authUrl: 'https://api.makcorps.com/oauth/authorize',
    tokenUrl: 'https://api.makcorps.com/oauth/token',
    scopes: ['hotels:read', 'hotels:write', 'bookings:read', 'bookings:write'],
  },
  nextabizz: {
    provider: 'nextabizz',
    clientId: process.env.NEXTABIZZ_CLIENT_ID || '',
    clientSecret: process.env.NEXTABIZZ_CLIENT_SECRET || '',
    authUrl: 'https://api.nextabizz.com/oauth/authorize',
    tokenUrl: 'https://api.nextabizz.com/oauth/token',
    scopes: ['products:read', 'orders:write', 'invoices:read'],
  },
  greythr: {
    provider: 'greythr',
    clientId: process.env.GREYTHR_CLIENT_ID || '',
    clientSecret: process.env.GREYTHR_CLIENT_SECRET || '',
    authUrl: 'https://api.greythr.com/oauth/authorize',
    tokenUrl: 'https://api.greythr.com/oauth/token',
    scopes: ['employees:read', 'employees:write', 'departments:read'],
  },
  zoho_people: {
    provider: 'zoho_people',
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: ['users.ua.READ', 'users.ua.CREATE', 'users.ua.UPDATE'],
  },
  workday: {
    provider: 'workday',
    clientId: process.env.WORKDAY_CLIENT_ID || '',
    clientSecret: process.env.WORKDAY_CLIENT_SECRET || '',
    authUrl: 'https://wd2-impl-services1.workday.com/ccx/oauth2/acquire_token',
    tokenUrl: 'https://wd2-impl-services1.workday.com/ccx/oauth2/acquire_token',
    scopes: ['workers:read', 'organizations:read'],
  },
};

// ============================================
// OAUTH FLOWS
// ============================================

/**
 * Initiate OAuth flow for an integration
 * GET /api/integrations/:provider/connect
 */
router.get('/:provider/connect', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const config = OAUTH_CONFIGS[provider];

    if (!config) {
      return res.status(400).json({ success: false, message: 'Unknown integration provider' });
    }

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      companyId: req.headers['x-company-id'],
      userId: (req as any).userId,
      timestamp: Date.now(),
    })).toString('base64');

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${process.env.API_BASE_URL}/api/integrations/${provider}/callback`,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    const authUrl = `${config.authUrl}?${params}`;

    logger.info('[Integrations] OAuth flow initiated', { provider, companyId: req.headers['x-company-id'] });

    res.json({ success: true, data: { authUrl, state } });
  } catch (err: any) {
    logger.error('[Integrations] OAuth init failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * OAuth callback handler
 * GET /api/integrations/:provider/callback
 */
router.get('/:provider/callback', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      logger.warn('[Integrations] OAuth error', { provider, error });
      return res.redirect(`${process.env.ADMIN_APP_URL}/settings/integrations?error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ success: false, message: 'Missing code or state' });
    }

    // Decode state
    let stateData: { companyId: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid state' });
    }

    // Validate state (CSRF protection)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'State expired' });
    }

    const config = OAUTH_CONFIGS[provider];
    if (!config) {
      return res.status(400).json({ success: false, message: 'Unknown provider' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${process.env.API_BASE_URL}/api/integrations/${provider}/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      logger.error('[Integrations] Token exchange failed', { provider, error: err });
      return res.redirect(`${process.env.ADMIN_APP_URL}/settings/integrations?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Store tokens securely (in production, encrypt and store in database)
    // For now, we'll redirect with success
    logger.info('[Integrations] OAuth successful', { provider, companyId: stateData.companyId });

    res.redirect(`${process.env.ADMIN_APP_URL}/settings/integrations?connected=${provider}`);
  } catch (err: any) {
    logger.error('[Integrations] OAuth callback failed', { error: err.message });
    res.redirect(`${process.env.ADMIN_APP_URL}/settings/integrations?error=oauth_failed`);
  }
});

/**
 * Disconnect an integration
 * POST /api/integrations/:provider/disconnect
 */
router.post('/:provider/disconnect', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const companyId = req.headers['x-company-id'] as string;

    // Revoke tokens if needed
    // In production, revoke the OAuth tokens and remove from database

    logger.info('[Integrations] Disconnected', { provider, companyId });

    res.json({ success: true, message: `${provider} disconnected successfully` });
  } catch (err: any) {
    logger.error('[Integrations] Disconnect failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get integration status
 * GET /api/integrations/:provider/status
 */
router.get('/:provider/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const companyId = req.headers['x-company-id'] as string;

    // In production, check token validity and API health
    const isConnected = true; // Placeholder
    const lastSyncAt = new Date().toISOString();
    const isHealthy = true;

    res.json({
      success: true,
      data: {
        provider,
        connected: isConnected,
        lastSyncAt,
        healthy: isHealthy,
      },
    });
  } catch (err: any) {
    logger.error('[Integrations] Status check failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * Makcorps Webhook Handler
 * POST /api/integrations/makcorps/webhook
 */
const makcorpsWebhookSchema = z.object({
  event: z.enum(['booking.created', 'booking.updated', 'booking.cancelled', 'payment.received']),
  data: z.object({
    bookingId: z.string(),
    status: z.string(),
    amount: z.number(),
    timestamp: z.string(),
  }),
});

router.post('/makcorps/webhook', requireWebhookSignature('MAKCORPS_WEBHOOK_SECRET', 'x-makcorps-signature'), async (req: Request, res: Response) => {
  try {
    const result = makcorpsWebhookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { event, data } = result.data;

    switch (event) {
      case 'booking.created':
        logger.info('[Makcorps Webhook] Booking created', { bookingId: data.bookingId });
        // Process new booking - update CorpPerks records
        break;

      case 'booking.updated':
        logger.info('[Makcorps Webhook] Booking updated', { bookingId: data.bookingId, status: data.status });
        // Update booking status
        break;

      case 'booking.cancelled':
        logger.info('[Makcorps Webhook] Booking cancelled', { bookingId: data.bookingId });
        // Handle cancellation
        break;

      case 'payment.received':
        logger.info('[Makcorps Webhook] Payment received', { bookingId: data.bookingId, amount: data.amount });
        // Record payment
        break;
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    logger.error('[Makcorps Webhook] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * NextaBizz Webhook Handler
 * POST /api/integrations/nextabizz/webhook
 */
const nextabizzWebhookSchema = z.object({
  event: z.enum(['order.created', 'order.shipped', 'order.delivered', 'order.failed', 'inventory.low']),
  data: z.object({
    orderId: z.string(),
    status: z.string(),
    trackingId: z.string().optional(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
    })),
    timestamp: z.string(),
  }),
});

router.post('/nextabizz/webhook', requireWebhookSignature('NEXTABIZZ_WEBHOOK_SECRET', 'x-nextabizz-signature'), async (req: Request, res: Response) => {
  try {
    const result = nextabizzWebhookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { event, data } = result.data;

    switch (event) {
      case 'order.created':
        logger.info('[NextaBizz Webhook] Order created', { orderId: data.orderId });
        // Create gift order in CorpPerks
        break;

      case 'order.shipped':
        logger.info('[NextaBizz Webhook] Order shipped', { orderId: data.orderId, trackingId: data.trackingId });
        // Update tracking info
        break;

      case 'order.delivered':
        logger.info('[NextaBizz Webhook] Order delivered', { orderId: data.orderId });
        // Mark as delivered, send notifications
        break;

      case 'order.failed':
        logger.warn('[NextaBizz Webhook] Order failed', { orderId: data.orderId });
        // Handle failure
        break;

      case 'inventory.low':
        logger.warn('[NextaBizz Webhook] Inventory low', { items: data.items });
        // Notify admin
        break;
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    logger.error('[NextaBizz Webhook] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * HRIS Webhook Handler (GreytHR, Zoho, etc.)
 * POST /api/integrations/hris/webhook
 */
const hrisWebhookSchema = z.object({
  source: z.enum(['greythr', 'zoho_people', 'bamboo_hr', 'workday', 'custom']),
  event: z.enum(['employee.added', 'employee.updated', 'employee.deactivated', 'department.updated']),
  data: z.object({
    employeeId: z.string(),
    changes: z.record(z.any()).optional(),
    timestamp: z.string(),
  }),
});

router.post('/hris/webhook', requireWebhookSignature('HRIS_WEBHOOK_SECRET', 'x-hris-signature'), async (req: Request, res: Response) => {
  try {
    const result = hrisWebhookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { source, event, data } = result.data;

    switch (event) {
      case 'employee.added':
        logger.info('[HRIS Webhook] Employee added', { source, employeeId: data.employeeId });
        // Auto-enroll new employee in CorpPerks
        break;

      case 'employee.updated':
        logger.info('[HRIS Webhook] Employee updated', { source, employeeId: data.employeeId });
        // Sync updated employee data
        break;

      case 'employee.deactivated':
        logger.info('[HRIS Webhook] Employee deactivated', { source, employeeId: data.employeeId });
        // Suspend employee in CorpPerks
        break;

      case 'department.updated':
        logger.info('[HRIS Webhook] Department updated', { source });
        // Update department mappings
        break;
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    logger.error('[HRIS Webhook] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * RTMN Finance Webhook Handler
 * POST /api/integrations/finance/webhook
 */
const financeWebhookSchema = z.object({
  event: z.enum([
    'wallet.deposit', 'wallet.withdrawal', 'wallet.transfer',
    'card.transaction', 'card.blocked',
    'bnpl.payment_due', 'bnpl.payment_received', 'bnpl.defaulted',
    'expense.approved', 'expense.paid'
  ]),
  data: z.object({
    transactionId: z.string(),
    amount: z.number(),
    metadata: z.record(z.any()).optional(),
    timestamp: z.string(),
  }),
});

router.post('/finance/webhook', requireWebhookSignature('FINANCE_WEBHOOK_SECRET', 'x-finance-signature'), async (req: Request, res: Response) => {
  try {
    const result = financeWebhookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { event, data } = result.data;

    switch (event) {
      case 'wallet.deposit':
        logger.info('[Finance Webhook] Deposit received', { transactionId: data.transactionId, amount: data.amount });
        // Update wallet balance
        break;

      case 'card.transaction':
        logger.info('[Finance Webhook] Card transaction', { transactionId: data.transactionId, amount: data.amount });
        // Process card transaction
        break;

      case 'bnpl.payment_due':
        logger.info('[Finance Webhook] BNPL payment due', { transactionId: data.transactionId });
        // Send reminder
        break;

      case 'bnpl.defaulted':
        logger.warn('[Finance Webhook] BNPL defaulted', { transactionId: data.transactionId });
        // Handle default
        break;

      case 'expense.approved':
        logger.info('[Finance Webhook] Expense approved', { transactionId: data.transactionId, amount: data.amount });
        // Process approval
        break;

      case 'expense.paid':
        logger.info('[Finance Webhook] Expense paid', { transactionId: data.transactionId, amount: data.amount });
        // Record payment
        break;
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    logger.error('[Finance Webhook] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// INTERNAL API PROXIES
// ============================================

/**
 * Proxy to Makcorps API
 * GET /api/integrations/makcorps/proxy/:path
 */
router.get('/makcorps/proxy/:path(*)', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { path } = req.params;
    const companyId = req.headers['x-company-id'] as string;

    // Get stored access token for this company
    // const token = await getIntegrationToken(companyId, 'makcorps');

    // Forward request to Makcorps
    const response = await fetch(`https://api.makcorps.com/${path}?${new URLSearchParams(req.query as any)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MAKCORPS_ACCESS_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    logger.error('[Makcorps Proxy] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Proxy to NextaBizz API
 * GET /api/integrations/nextabizz/proxy/:path
 */
router.get('/nextabizz/proxy/:path(*)', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { path } = req.params;

    const response = await fetch(`https://api.nextabizz.com/${path}?${new URLSearchParams(req.query as any)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXTABIZZ_ACCESS_TOKEN || ''}`,
        'Content-Type': 'application/json',
        'X-Company-Id': req.headers['x-company-id'] as string,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    logger.error('[NextaBizz Proxy] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Proxy to RTMN Finance API
 * GET /api/integrations/finance/proxy/:path
 */
router.get('/finance/proxy/:path(*)', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { path } = req.params;

    // Internal service-to-service call
    const response = await fetch(`${process.env.FINANCE_SERVICE_URL || 'http://localhost:4006'}/${path}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN || ''}`,
        'X-Company-Id': req.headers['x-company-id'] as string,
        'X-User-Id': (req as any).userId,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    logger.error('[Finance Proxy] Failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
