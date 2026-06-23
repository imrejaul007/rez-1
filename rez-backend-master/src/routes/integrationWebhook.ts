import { Router, Request, Response } from 'express';
import express from 'express';
import { integrationService } from '../services/integrationService';
import { createServiceLogger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const logger = createServiceLogger('integration-webhook');

// Capture raw body for HMAC signature verification
// Express JSON parser loses the original byte-for-byte body
router.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

/**
 * @route   POST /api/integrations/webhook
 * @desc    Universal webhook receiver for external merchant systems (POS/PMS/booking/inventory)
 * @access  Public (secured by HMAC signature verification)
 *
 * Headers:
 *   x-rez-signature — HMAC-SHA256 signature
 *   x-provider-name — Provider identifier (e.g. 'petpooja', 'cloudbeds')
 */
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
    const provider = (req.headers['x-provider-name'] as string) || req.body?.provider;
    const signature = (req.headers['x-rez-signature'] as string) || '';

    if (!provider) {
      return res.status(400).json({ success: false, message: 'x-provider-name header is required' });
    }
    if (!signature) {
      return res.status(401).json({ success: false, message: 'x-rez-signature header is required' });
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const { extTxn, isDuplicate } = await integrationService.processWebhook(
      provider,
      rawBody,
      req.body,
      signature,
    );

    if (isDuplicate) {
      logger.info('Duplicate webhook received, ignoring', {
        provider,
        externalId: extTxn.externalId,
      });
      return res.status(200).json({ success: true, message: 'Already processed', id: extTxn._id });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction received',
      id: extTxn._id,
      status: extTxn.status,
    });
}));

export default router;
