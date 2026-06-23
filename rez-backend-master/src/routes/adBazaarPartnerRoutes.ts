// @ts-nocheck
/**
 * AdBazaar Partner Integration Routes
 *
 * Exposes secure endpoints for AdBazaar to:
 *   - Credit brand coins when a user scans a QR code on a physical ad
 *   - Receive attribution webhooks (visit / purchase events)
 *   - Query a user's branded coin balance
 *
 * Auth: HMAC-SHA256 via X-AdBazaar-Signature header.
 *   signature = HMAC-SHA256(ADBAZAAR_WEBHOOK_SECRET, JSON.stringify(req.body))
 *
 * Env vars required:
 *   ADBAZAAR_WEBHOOK_SECRET — shared secret provisioned by AdBazaar
 */

import * as crypto from 'crypto';
import express, { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { AdBazaarScan } from '../models/AdBazaarScan';
import { createServiceLogger } from '../config/logger';

const router = Router();
const logger = createServiceLogger('adbazaar-partner');

// ── Capture raw body so HMAC is computed over the original bytes ──────────────
router.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);

// ── HMAC-SHA256 signature validation middleware ────────────────────────────────
function validateAdBazaarSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-adbazaar-signature'] as string | undefined;
  const secret = process.env.ADBAZAAR_WEBHOOK_SECRET;

  if (!secret) {
    logger.error('[AdBazaar Partner] ADBAZAAR_WEBHOOK_SECRET env var not set');
    res.status(503).json({ success: false, error: 'Partner integration not configured' });
    return;
  }

  if (!signature) {
    res.status(401).json({ success: false, error: 'Missing X-AdBazaar-Signature header' });
    return;
  }

  // Use raw body if available (preserves exact byte order); fallback to re-serialised body.
  const payload = (req as any).rawBody ?? JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Timing-safe comparison — prevents brute-force timing oracle attacks.
  let signaturesMatch = false;
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    signaturesMatch = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    signaturesMatch = false;
  }

  if (!signaturesMatch) {
    logger.warn('[AdBazaar Partner] Invalid HMAC signature', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({ success: false, error: 'Invalid signature' });
    return;
  }

  next();
}

// All partner routes require valid HMAC signature
router.use(validateAdBazaarSignature);

// ── Helper: validate MongoDB ObjectId ────────────────────────────────────────
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/partner/adbazaar/qr-scan
//
// Called by AdBazaar when a user scans a physical ad QR code.
// Credits brand coins to the specified REZ user.
//
// Body:
//   qrCode        string  — QR code identifier
//   userId        string  — REZ user ObjectId
//   merchantId    string  — REZ store/merchant ObjectId
//   adCampaignId  string  — AdBazaar campaign identifier
//   coinAmount    number  — Coins to credit (must be positive)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/qr-scan', async (req: Request, res: Response) => {
  const { qrCode, userId, merchantId, adCampaignId, coinAmount } = req.body;

  // Input validation
  if (!qrCode || !userId || !merchantId || !adCampaignId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: qrCode, userId, merchantId, adCampaignId',
    });
  }

  if (!isValidObjectId(userId) || !isValidObjectId(merchantId)) {
    return res.status(400).json({
      success: false,
      error: 'userId and merchantId must be valid MongoDB ObjectIds',
    });
  }

  const parsedCoins = Number(coinAmount);
  if (!Number.isFinite(parsedCoins) || parsedCoins <= 0) {
    return res.status(400).json({
      success: false,
      error: 'coinAmount must be a positive number',
    });
  }

  // Hard cap — prevents a misconfigured or compromised AdBazaar call from
  // issuing an unreasonable number of coins in one request.
  const MAX_COINS_PER_SCAN = 10_000;
  if (parsedCoins > MAX_COINS_PER_SCAN) {
    return res.status(400).json({
      success: false,
      error: `coinAmount exceeds maximum allowed per scan (${MAX_COINS_PER_SCAN})`,
    });
  }

  try {
    // 1. Resolve user
    const user = await User.findById(userId).select('_id isActive').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'REZ user not found' });
    }
    if (!(user as any).isActive) {
      return res.status(400).json({ success: false, error: 'REZ user account is inactive' });
    }

    // 2. Resolve merchant store
    const store = await Store.findById(merchantId).select('_id name logo merchantId').lean();
    if (!store) {
      return res.status(404).json({ success: false, error: 'Merchant (store) not found' });
    }

    // 3. Idempotency guard — qrCode + adCampaignId combination is unique per scan event
    const idempotencyKey = `adbazaar:qr:${qrCode}:${adCampaignId}`;
    const existingScan = await AdBazaarScan.findOne({ scanEventId: idempotencyKey }).lean();
    if (existingScan) {
      logger.warn('[AdBazaar Partner] Duplicate QR scan rejected', {
        qrCode,
        adCampaignId,
        userId,
      });
      return res.status(409).json({
        success: false,
        error: 'QR scan already processed for this campaign',
        idempotencyKey,
      });
    }

    // 4. Get or create user wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }
    if (!wallet) {
      return res.status(500).json({ success: false, error: 'Failed to resolve user wallet' });
    }

    // 5. Credit branded coins
    await (wallet as any).addBrandedCoins(
      new mongoose.Types.ObjectId(merchantId),
      (store as any).name,
      parsedCoins,
      (store as any).logo,
      '#6366F1',
    );

    await (CoinTransaction as any).createTransaction(
      userId,
      'branded_award',
      parsedCoins,
      'adbazaar_qr_scan',
      `${parsedCoins} ${(store as any).name} coins earned via AdBazaar QR scan`,
      {
        storeId: merchantId,
        storeName: (store as any).name,
        coinType: 'branded',
        awardedBy: merchantId,
        adCampaignId,
        qrCode,
        source: 'adbazaar_partner',
      },
    );

    // 6. Persist attribution record
    await AdBazaarScan.create({
      rezUserId: new mongoose.Types.ObjectId(userId),
      merchantId: new mongoose.Types.ObjectId(merchantId),
      scanEventId: idempotencyKey,
      coinsAwarded: parsedCoins,
      scannedAt: new Date(),
    });

    // 7. Read back updated balance for the response
    const updatedWallet = await Wallet.findOne({ user: userId }).lean();
    const newBalance = updatedWallet?.balance?.available ?? 0;

    logger.info('[AdBazaar Partner] QR scan processed — coins credited', {
      userId,
      merchantId,
      storeName: (store as any).name,
      coinsAwarded: parsedCoins,
      adCampaignId,
    });

    return res.status(200).json({
      success: true,
      coinsEarned: parsedCoins,
      newBalance,
      merchantName: (store as any).name,
    });
  } catch (err: any) {
    logger.error('[AdBazaar Partner] qr-scan error', {
      error: err.message,
      userId,
      adCampaignId,
    });
    return res.status(500).json({ success: false, error: 'Internal error processing QR scan' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/partner/adbazaar/webhook
//
// Attribution webhook — called by AdBazaar when a visit or purchase occurs
// that is attributed to a prior QR scan. No coin credit here; this is purely
// for analytics / attribution logging.
//
// Body:
//   event         'visit' | 'purchase'
//   userId        string  — REZ user ObjectId
//   merchantId    string  — REZ store ObjectId
//   amount        number  — Purchase amount in INR (present for 'purchase' events)
//   adCampaignId  string  — AdBazaar campaign identifier
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  const { event, userId, merchantId, amount, adCampaignId } = req.body;

  const VALID_EVENTS = ['visit', 'purchase'] as const;
  type ValidEvent = (typeof VALID_EVENTS)[number];

  if (!event || !VALID_EVENTS.includes(event as ValidEvent)) {
    return res.status(400).json({
      success: false,
      error: `event must be one of: ${VALID_EVENTS.join(', ')}`,
    });
  }

  if (!userId || !merchantId || !adCampaignId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, merchantId, adCampaignId',
    });
  }

  if (!isValidObjectId(userId) || !isValidObjectId(merchantId)) {
    return res.status(400).json({
      success: false,
      error: 'userId and merchantId must be valid MongoDB ObjectIds',
    });
  }

  if (event === 'purchase') {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number for purchase events',
      });
    }
  }

  try {
    // Log the attribution event to the analytics collection.
    // Using a minimal direct insert to the raw `adbazaarattributions` collection
    // to avoid adding a heavy new model dependency in this route file.
    await mongoose.connection.collection('adbazaarattributions').insertOne({
      event,
      userId: new mongoose.Types.ObjectId(userId),
      merchantId: new mongoose.Types.ObjectId(merchantId),
      adCampaignId,
      amount: event === 'purchase' ? Number(amount) : null,
      receivedAt: new Date(),
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    logger.info('[AdBazaar Partner] Attribution event logged', {
      event,
      userId,
      merchantId,
      adCampaignId,
    });

    return res.status(200).json({
      success: true,
      message: `Attribution event '${event}' recorded`,
    });
  } catch (err: any) {
    logger.error('[AdBazaar Partner] webhook attribution error', {
      error: err.message,
      event,
      userId,
      adCampaignId,
    });
    return res.status(500).json({ success: false, error: 'Internal error logging attribution event' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/partner/adbazaar/balance/:userId
//
// Returns the user's total branded coin balance so AdBazaar can display
// loyalty balance in their own app / ad surfaces.
// BED-014: added authenticate middleware
// ─────────────────────────────────────────────────────────────────────────────
router.get('/balance/:userId', authenticate, async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    return res.status(400).json({ success: false, error: 'userId must be a valid MongoDB ObjectId' });
  }

  // BED-014: Ownership check — only the owning user or an admin can view this balance
  if (req.userId !== userId && (!req.user || req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, error: 'Forbidden: you can only view your own balance' });
  }

  try {
    const wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      // Return zero balance rather than 404 — wallet may not exist yet for new users.
      return res.status(200).json({
        success: true,
        userId,
        balance: {
          available: 0,
          total: 0,
          branded: 0,
        },
        brandedCoins: [],
      });
    }

    // Aggregate total branded coins across all merchants
    const totalBranded = (wallet.brandedCoins ?? []).reduce((sum, bc) => sum + (bc.isActive ? bc.amount : 0), 0);

    return res.status(200).json({
      success: true,
      userId,
      balance: {
        available: wallet.balance.available,
        total: wallet.balance.total,
        branded: totalBranded,
      },
      brandedCoins: (wallet.brandedCoins ?? [])
        .filter((bc) => bc.isActive)
        .map((bc) => ({
          merchantId: bc.merchantId,
          merchantName: bc.merchantName,
          amount: bc.amount,
          earnedDate: bc.earnedDate,
          expiresAt: bc.expiresAt ?? null,
        })),
    });
  } catch (err: any) {
    logger.error('[AdBazaar Partner] balance lookup error', {
      error: err.message,
      userId,
    });
    return res.status(500).json({ success: false, error: 'Internal error fetching balance' });
  }
});

export default router;
