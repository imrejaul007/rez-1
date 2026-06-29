/**
 * OAuth2 Partner Admin API
 * BIZ-001: Automated partner registration
 *
 * Allows partners to self-register via API instead of manual GitHub PRs.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../../config/logger';
import { redis } from '../../config/redis';
import { requireInternalToken } from '../../middleware/internalAuth';

// In production, store partners in MongoDB
// For now, store in Redis with backup

const PARTNERS_KEY = 'oauth:admin:partners';
const PARTNER_PREFIX = 'oauth:partner:';

const router = Router();

/**
 * GET /admin/oauth/partners
 * List all registered OAuth partners
 */
router.get('/partners', requireInternalToken, async (_req: Request, res: Response) => {
  try {
    // Phase 6.24: SCAN instead of KEYS. KEYS is O(N) and blocks Redis on
    // large keyspaces; SCAN is cursor-based and non-blocking. The keyspace
    // is small here, but using KEYS anywhere is a known footgun.
    const partnerKeys: string[] = [];
    const stream = redis.scanStream({ match: `${PARTNER_PREFIX}*`, count: 100 });
    for await (const keys of stream) {
      for (const key of keys as string[]) partnerKeys.push(key);
    }
    const partners = await Promise.all(
      partnerKeys.map(async (key: string) => {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      success: true,
      partners: partners.filter(Boolean),
      count: partners.filter(Boolean).length,
    });
  } catch (error) {
    logger.error('Failed to list partners:', error);
    res.status(500).json({ error: 'Failed to list partners' });
  }
});

/**
 * POST /admin/oauth/partners
 * Register a new OAuth partner (BIZ-001: automated registration)
 *
 * Body:
 *   name: string (required)
 *   redirectUris: string[] (required)
 *   scopes: string[] (default: ['profile'])
 *   ownerEmail: string (required for notifications)
 */
router.post('/partners', requireInternalToken, async (req: Request, res: Response) => {
  const { name, redirectUris, scopes = ['profile'], ownerEmail } = req.body;

  if (!name || !redirectUris || !ownerEmail) {
    res.status(400).json({
      error: 'Missing required fields: name, redirectUris, ownerEmail'
    });
    return;
  }

  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    res.status(400).json({ error: 'redirectUris must be a non-empty array' });
    return;
  }

  // CRITICAL FIX (AUTH-OAUTH-001): Validate redirect URIs to prevent open-redirect attacks.
  // An attacker who can register arbitrary redirect URIs can hijack OAuth authorization codes
  // by controlling the redirect after user consent. Validations:
  // 1. Must be valid URLs (parseable by URL constructor)
  // 2. Must use HTTPS (no HTTP to prevent credential interception)
  // 3. Must not contain fragments (#) which could be used to inject parameters
  // 4. Must not be localhost or file:// (invalid for production OAuth)
  const validatedRedirectUris: string[] = [];
  for (const uri of redirectUris) {
    if (typeof uri !== 'string' || uri.length === 0) {
      res.status(400).json({ error: 'Each redirect URI must be a non-empty string' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      res.status(400).json({ error: `Invalid redirect URI: ${uri}` });
      return;
    }

    // HTTPS is required in production OAuth flows
    if (parsed.protocol !== 'https:') {
      res.status(400).json({ error: `redirect URI must use HTTPS: ${uri}` });
      return;
    }

    // Fragments (#) could be used to inject parameters into the callback
    if (parsed.hash) {
      res.status(400).json({ error: 'redirect URI must not contain fragments (#)' });
      return;
    }

    // Reject localhost and file:// URIs in production
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16')
    ) {
      res.status(400).json({ error: `redirect URI cannot use private network or localhost: ${uri}` });
      return;
    }

    validatedRedirectUris.push(uri);
  }

  try {
    const clientId = `partner_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('base64url');

    const partner = {
      clientId,
      clientSecret,
      name,
      redirectUris: validatedRedirectUris,
      scopes,
      ownerEmail,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      createdBy: (req as unknown as { user?: { sub?: string } }).user?.sub || 'admin',
    };

    // Store in Redis
    await redis.set(
      `${PARTNER_PREFIX}${clientId}`,
      JSON.stringify(partner)
    );

    logger.info(`[OAuth Admin] Partner registered: ${name} (${clientId})`);

    res.status(201).json({
      success: true,
      partner: {
        clientId,
        clientSecret, // Only shown once!
        name,
        redirectUris: validatedRedirectUris,
        scopes,
        status: 'pending_verification',
      },
      message: 'Partner registered. Share client_id and client_secret with partner. They must verify ownership of redirect URIs.',
    });
  } catch (error) {
    logger.error('Failed to register partner:', error);
    res.status(500).json({ error: 'Failed to register partner' });
  }
});

/**
 * POST /admin/oauth/partners/:clientId/verify
 * Verify partner domain ownership
 *
 * Body:
 *   verificationCode: string (DNS TXT record or file-based verification)
 */
router.post('/partners/:clientId/verify', requireInternalToken, async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { verificationMethod } = req.body;

  const partnerData = await redis.get(`${PARTNER_PREFIX}${clientId}`);
  if (!partnerData) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }

  const partner = JSON.parse(partnerData);

  // Verify ownership of redirect URIs
  const unverifiedUris = partner.redirectUris || [];

  res.json({
    success: true,
    partnerId: clientId,
    verificationRequired: unverifiedUris.map((uri: string) => ({
      uri,
      method: 'dns-txt',
      record: `_rez-oauth-verification.${new URL(uri).hostname}`,
      value: `partner-verification=${clientId}`,
    })),
    instructions: 'Add DNS TXT record to each domain, then call /admin/oauth/partners/:id/confirm-verification',
  });
});

/**
 * POST /admin/oauth/partners/:clientId/activate
 * Activate a partner after verification
 */
router.post('/partners/:clientId/activate', requireInternalToken, async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { confirmed } = req.body;

  if (!confirmed) {
    res.status(400).json({ error: 'Must confirm activation' });
    return;
  }

  const partnerData = await redis.get(`${PARTNER_PREFIX}${clientId}`);
  if (!partnerData) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }

  const partner = JSON.parse(partnerData);
  partner.status = 'active';
  partner.activatedAt = new Date().toISOString();

  await redis.set(`${PARTNER_PREFIX}${clientId}`, JSON.stringify(partner));

  logger.info(`[OAuth Admin] Partner activated: ${clientId}`);

  res.json({
    success: true,
    message: 'Partner activated',
    partnerId: clientId,
  });
});

/**
 * DELETE /admin/oauth/partners/:clientId
 * Deactivate a partner
 */
router.delete('/partners/:clientId', requireInternalToken, async (req: Request, res: Response) => {
  const { clientId } = req.params;

  const partnerData = await redis.get(`${PARTNER_PREFIX}${clientId}`);
  if (!partnerData) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }

  await redis.del(`${PARTNER_PREFIX}${clientId}`);

  logger.info(`[OAuth Admin] Partner deleted: ${clientId}`);

  res.json({ success: true, message: 'Partner deleted' });
});

export default router;
