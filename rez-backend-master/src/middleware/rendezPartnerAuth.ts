/**
 * Rendez Partner API Authentication Middleware
 *
 * All Rendez→REZ partner API calls must include:
 *   x-partner-key: <RENDEZ_PARTNER_API_KEY>
 *
 * This middleware validates that header and rejects requests that don't match.
 * It is mounted at router level on the /api/rendez/* namespace.
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('rendez-partner-auth');

export function rendezPartnerAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.RENDEZ_PARTNER_API_KEY;

  if (!apiKey) {
    logger.error('[RendezPartner] RENDEZ_PARTNER_API_KEY env var is not configured — rejecting all partner requests');
    res.status(503).json({
      success: false,
      message: 'Partner integration not configured on this server',
    });
    return;
  }

  const providedKey = req.headers['x-partner-key'];

  if (
    !providedKey ||
    typeof providedKey !== 'string' ||
    providedKey.length !== apiKey.length ||
    !crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(apiKey))
  ) {
    logger.warn('[RendezPartner] Unauthorized request — bad or missing x-partner-key', {
      ip: req.ip,
      path: req.path,
      hasKey: !!providedKey,
    });
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  next();
}
