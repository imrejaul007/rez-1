// @ts-nocheck
import { Router, Request, Response } from 'express';
import express from 'express';
import * as crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { AdBazaarScan } from '../models/AdBazaarScan';
import { createServiceLogger } from '../config/logger';
import { handleAdBazaarWebhook } from '../services/adBazaarIntegration';

const router = Router();
const logger = createServiceLogger('adbazaar-integration');

// ── Internal key middleware ──
// This is a service-to-service route secured by a shared secret, not JWT.
// AdBazaar sends x-internal-key with value of REZ_INTERNAL_KEY (AdBazaar's env var name).
// REZ backend stores the same secret as ADBAZAAR_INTERNAL_KEY.
// Both env var names refer to the same shared secret — accept either for backwards compat.
router.use((req: Request, res: Response, next) => {
  const key = req.headers['x-internal-key'];
  const expectedKey = process.env.ADBAZAAR_INTERNAL_KEY || process.env.REZ_INTERNAL_KEY;
  // SECURITY: Use timingSafeEqual to prevent timing-based secret enumeration.
  // Plain `key !== expectedKey` leaks key length and content information through
  // response-time variance that an attacker can measure statistically.
  const valid =
    expectedKey &&
    typeof key === 'string' &&
    key.length === expectedKey.length &&
    crypto.timingSafeEqual(Buffer.from(key, 'utf8'), Buffer.from(expectedKey, 'utf8'));
  if (!valid) {
    logger.warn('[AdBazaar] Unauthorised request — bad or missing x-internal-key', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
});

/**
 * @route   POST /api/adbazaar/scan
 * @desc    Credit brand coins to a REZ user after they scan an AdBazaar QR code.
 *          Called by AdBazaar service when a scan event is confirmed.
 * @access  Internal (x-internal-key)
 */
router.post('/scan', async (req: Request, res: Response) => {
  const { rezUserId, qrCodeId, merchantId, coinsAmount, visitBonusCoins, scanEventId, adPlacementTitle } = req.body;

  // ── Input validation ──
  if (!rezUserId || !qrCodeId || !merchantId || !scanEventId || !adPlacementTitle) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: rezUserId, qrCodeId, merchantId, scanEventId, adPlacementTitle',
    });
  }

  const parsedCoins = Number(coinsAmount);
  if (!parsedCoins || parsedCoins < 0 || !Number.isFinite(parsedCoins)) {
    return res.status(400).json({
      success: false,
      message: 'coinsAmount must be a non-negative number',
    });
  }

  const parsedVisitBonus = visitBonusCoins != null ? Number(visitBonusCoins) : 0;
  if (!Number.isFinite(parsedVisitBonus) || parsedVisitBonus < 0) {
    return res.status(400).json({
      success: false,
      message: 'visitBonusCoins must be a non-negative number',
    });
  }

  const totalCoins = parsedCoins + parsedVisitBonus;

  if (!mongoose.Types.ObjectId.isValid(rezUserId) || !mongoose.Types.ObjectId.isValid(merchantId)) {
    return res.status(400).json({
      success: false,
      message: 'rezUserId and merchantId must be valid MongoDB ObjectIds',
    });
  }

  try {
    // ── 1. Resolve user ──
    const user = await User.findById(rezUserId).select('_id isActive').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'REZ user not found' });
    }
    if (!user.isActive) {
      return res.status(400).json({ success: false, message: 'REZ user account is inactive' });
    }

    // ── 2. Resolve merchant/store ──
    const store = await Store.findById(merchantId).select('_id name logo merchantId').lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Merchant (store) not found' });
    }

    // ── 3. Idempotency guard — reject duplicate scan events ──
    const existingScan = await AdBazaarScan.findOne({ scanEventId }).lean();
    if (existingScan) {
      logger.warn('[AdBazaar] Duplicate scanEventId rejected', { scanEventId, rezUserId });
      return res.status(409).json({
        success: false,
        message: 'Scan event already processed',
        scanEventId,
      });
    }

    // ── 4. Get or create user wallet ──
    let wallet = await Wallet.findOne({ user: rezUserId });
    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(rezUserId));
    }
    if (!wallet) {
      return res.status(500).json({ success: false, message: 'Failed to resolve user wallet' });
    }

    // ── 5. Credit branded coins to the user's wallet ──
    // AdBazaar coins are credited as branded coins associated with the merchant/store.
    // Pattern mirrors merchantroutes/coins.ts — addBrandedCoins on wallet +
    // branded_award CoinTransaction for the ledger trail.
    await wallet.addBrandedCoins(
      new mongoose.Types.ObjectId(merchantId),
      store.name,
      parsedCoins,
      store.logo,
      '#6366F1',
    );

    await CoinTransaction.createTransaction(
      rezUserId,
      'branded_award',
      parsedCoins,
      'merchant_award',
      `${parsedCoins} ${store.name} coins earned via AdBazaar ad scan — "${adPlacementTitle}"`,
      {
        storeId: merchantId,
        storeName: store.name,
        coinType: 'branded',
        awardedBy: merchantId,
        adBazaarScanEventId: scanEventId,
        adBazaarQrCodeId: qrCodeId,
        adPlacementTitle,
      },
    );

    // ── 5b. Credit visit bonus if this is the user's first visit ──
    if (parsedVisitBonus > 0) {
      await wallet.addBrandedCoins(
        new mongoose.Types.ObjectId(merchantId),
        store.name,
        parsedVisitBonus,
        store.logo,
        '#F59E0B', // amber for visit bonus
      );

      await CoinTransaction.createTransaction(
        rezUserId,
        'branded_award',
        parsedVisitBonus,
        'merchant_award',
        `${parsedVisitBonus} ${store.name} visit bonus coins — first-time scan of "${adPlacementTitle}"`,
        {
          storeId: merchantId,
          storeName: store.name,
          coinType: 'branded',
          awardedBy: merchantId,
          adBazaarScanEventId: scanEventId,
          adBazaarQrCodeId: qrCodeId,
          adPlacementTitle,
          isVisitBonus: true,
        },
      );
    }

    // ── 6. Persist attribution record ──
    await AdBazaarScan.create({
      rezUserId: new mongoose.Types.ObjectId(rezUserId),
      merchantId: new mongoose.Types.ObjectId(merchantId),
      scanEventId,
      coinsAwarded: parsedCoins,
      visitBonusAwarded: parsedVisitBonus,
      visitAttributed: parsedVisitBonus > 0,
      visitAttributedAt: parsedVisitBonus > 0 ? new Date() : undefined,
      scannedAt: new Date(),
    });

    logger.info('[AdBazaar] Scan processed — coins credited', {
      rezUserId,
      merchantId,
      storeName: store.name,
      coinsAwarded: parsedCoins,
      visitBonusAwarded: parsedVisitBonus,
      totalAwarded: totalCoins,
      scanEventId,
    });

    return res.status(200).json({
      success: true,
      coinsEarned: parsedCoins,
      visitBonusEarned: parsedVisitBonus,
      totalEarned: totalCoins,
      merchantName: store.name,
      merchantProfile: {
        name: store.name,
        logo: store.logo || null,
        offerUrl: null, // extend when AdBazaar passes an offer URL in future
      },
    });
  } catch (error: any) {
    logger.error('[AdBazaar] Error processing scan event', {
      error: error.message,
      rezUserId,
      scanEventId,
    });
    return res.status(500).json({
      success: false,
      message: 'Internal error processing AdBazaar scan',
    });
  }
});

/**
 * @route   GET /api/adbazaar/verify-merchant
 * @desc    Verify a REZ merchant (store) exists — used by AdBazaar vendor connect flow.
 * @access  Internal (x-internal-key)
 */
router.get('/verify-merchant', async (req: Request, res: Response) => {
  const { merchantId } = req.query;

  if (!merchantId || typeof merchantId !== 'string') {
    return res.status(400).json({ success: false, message: 'merchantId query param required' });
  }

  if (!mongoose.Types.ObjectId.isValid(merchantId)) {
    return res.status(400).json({ success: false, message: 'Invalid merchantId format' });
  }

  try {
    const store = await Store.findById(merchantId).select('_id name').lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }
    return res.status(200).json({ success: true, merchantId, name: store.name });
  } catch (error: any) {
    logger.error('[AdBazaar] verify-merchant error', { error: error.message, merchantId });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

/**
 * @route   POST /api/adbazaar/broadcast
 * @desc    Proxy broadcast request to rez-marketing-service /adbazaar/broadcast.
 *          Allows AdBazaar to trigger targeted broadcasts via the REZ monolith endpoint.
 * @access  Internal (x-internal-key)
 */
router.post('/broadcast', async (req: Request, res: Response) => {
  const marketingServiceUrl = process.env.MARKETING_SERVICE_URL;
  if (!marketingServiceUrl) {
    logger.error('[AdBazaar] MARKETING_SERVICE_URL is not configured');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }
  const internalKey = process.env.ADBAZAAR_INTERNAL_KEY || process.env.REZ_INTERNAL_KEY;
  if (!internalKey) {
    logger.error('[AdBazaar] ADBAZAAR_INTERNAL_KEY / REZ_INTERNAL_KEY not configured — refusing broadcast proxy');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }
  try {
    const response = await fetch(`${marketingServiceUrl}/adbazaar/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey,
        'x-internal-service': 'rez-backend',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    logger.error('[AdBazaar] Broadcast proxy error', { error: error.message });
    return res.status(502).json({ success: false, message: 'Marketing service unavailable' });
  }
});

/**
 * @route   POST /api/adbazaar/webhook-test
 * @desc    Health-check endpoint so AdBazaar can verify the integration is live.
 * @access  Internal (x-internal-key)
 */
router.post('/webhook-test', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'REZ AdBazaar integration active',
    timestamp: new Date(),
  });
});

// ── Webhook Routes (External AdBazaar API calls) ──
// These routes handle incoming webhooks from AdBazaar with HMAC-SHA256 signature verification
const webhookRouter = Router();

/**
 * Capture raw body for HMAC signature verification
 * Express JSON parser loses the original byte-for-byte body
 */
webhookRouter.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);

/**
 * @route   POST /api/webhooks/adbazaar/qr-scan
 * @desc    AdBazaar QR scan webhook - users scan ad QR codes and earn coins
 * @access  Public (secured by HMAC-SHA256 signature verification)
 *
 * Headers:
 *   X-Signature — HMAC-SHA256 signature (required)
 *
 * Body:
 *   eventId: string — Unique event ID
 *   eventType: 'qr_scan' — Event type
 *   timestamp: string — ISO 8601 timestamp
 *   campaignId: string — AdBazaar campaign ID
 *   advertiserId: string — Advertiser ID
 *   deviceId: string — User device ID (used to identify user)
 *   qrCode: string — QR code URL
 *   location: object — Location data (latitude, longitude, address)
 */
webhookRouter.post('/adbazaar/qr-scan', async (req: Request, res: Response) => {
  try {
    logger.info('[AdBazaar] QR scan webhook received', {
      eventId: req.body?.eventId,
      campaignId: req.body?.campaignId,
      advertiserId: req.body?.advertiserId,
    });

    // Delegate to service handler
    await handleAdBazaarWebhook(req, res);
  } catch (error) {
    logger.error('[AdBazaar] Webhook handler error', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
      });
    }
  }
});

export default router;
export { webhookRouter };
