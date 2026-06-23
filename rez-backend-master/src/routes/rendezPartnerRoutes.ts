// @ts-nocheck
/**
 * Rendez Partner API Routes
 *
 * Mounted at: /api/rendez
 * Auth:       x-partner-key header (validated by rendezPartnerAuth middleware)
 *
 * Rendez backend sets REZ_PARTNER_API_URL=https://api.rez.money/api/rendez
 * and all client paths are relative to that base URL.
 *
 * Endpoints provided:
 *   Auth:         GET  /auth/verify-token
 *                 POST /auth/link
 *   Merchants:    GET  /merchants/nearby
 *   Bookings:     POST /bookings/create
 *   Rewards:      POST /rewards/trigger
 *   Wallet:       POST /wallet/hold
 *                 POST /wallet/release
 *                 POST /wallet/refund
 *                 GET  /wallet/balance/:userId
 *   Partner v1:   GET  /partner/v1/bookings/:ref/verify
 *                 POST /partner/v1/bookings/refund
 *                 POST /partner/v1/coins/credit
 *                 POST /partner/v1/bookings/credit
 *   Gifts:        GET  /gifts/catalog
 *                 POST /gifts/issue
 *                 POST /gifts/activate/:id
 *                 POST /gifts/cancel/:id
 *                 GET  /gifts/voucher/:id
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, Document, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import { rendezPartnerAuth } from '../middleware/rendezPartnerAuth';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { Wallet } from '../models/Wallet';
import { TableBooking } from '../models/TableBooking';
import StoreVoucher from '../models/StoreVoucher';
import rewardEngine from '../core/rewardEngine';
import { createServiceLogger } from '../config/logger';

const router = Router();
const logger = createServiceLogger('rendez-partner');

// ── Inline RendezWalletHold model (no standalone model file needed) ──────────

interface IRendezWalletHold extends Document {
  holdId: string;
  senderUserId: Types.ObjectId;
  amountPaise: number; // held amount in paise (or coin units)
  coinAmount: number; // held REZ coins
  idempotencyKey: string;
  reason: string;
  status: 'held' | 'released' | 'refunded';
  recipientUserId?: Types.ObjectId;
  releasedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
}

const RendezWalletHoldSchema = new Schema<IRendezWalletHold>(
  {
    holdId: { type: String, required: true, unique: true, index: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 0 },
    coinAmount: { type: Number, required: true, min: 0 },
    idempotencyKey: { type: String, required: true, unique: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held' },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    releasedAt: { type: Date },
    refundedAt: { type: Date },
  },
  { timestamps: true, collection: 'rendez_wallet_holds' },
);

const RendezWalletHold =
  (mongoose.models['RendezWalletHold'] as mongoose.Model<IRendezWalletHold>) ||
  mongoose.model<IRendezWalletHold>('RendezWalletHold', RendezWalletHoldSchema);

// ── Inline RendezGiftVoucher model ───────────────────────────────────────────

interface IRendezGiftVoucher extends Document {
  voucherId: string;
  catalogItemId: string; // StoreVoucher._id reference
  senderUserId: Types.ObjectId;
  receiverUserId: Types.ObjectId;
  holdId: string;
  idempotencyKey: string;
  qrCodeData: string;
  status: 'active' | 'activated' | 'cancelled' | 'expired';
  storeId: Types.ObjectId;
  expiresAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

const RendezGiftVoucherSchema = new Schema<IRendezGiftVoucher>(
  {
    voucherId: { type: String, required: true, unique: true, index: true },
    catalogItemId: { type: String, required: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    holdId: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    qrCodeData: { type: String, required: true },
    status: { type: String, enum: ['active', 'activated', 'cancelled', 'expired'], default: 'active' },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    expiresAt: { type: Date, required: true },
    activatedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true, collection: 'rendez_gift_vouchers' },
);

const RendezGiftVoucher =
  (mongoose.models['RendezGiftVoucher'] as mongoose.Model<IRendezGiftVoucher>) ||
  mongoose.model<IRendezGiftVoucher>('RendezGiftVoucher', RendezGiftVoucherSchema);

// ── Helper: generate booking number ─────────────────────────────────────────

function generateBookingNumber(): string {
  return `RDZ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function generateVoucherId(): string {
  return `GV-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

function generateHoldId(): string {
  return `HOLD-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

// ═══════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /auth/verify-token
 * Verify a REZ user JWT and return basic user info.
 * Rendez passes the user's REZ token in the Authorization header.
 *
 * BAK-GATEWAY-016 FIX: Add ownership check — the calling Rendez service must be
 * the registered integration partner. Prevents a rogue service from using a stolen
 * token to look up arbitrary REZ users.
 */
router.get('/auth/verify-token', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ success: false, message: 'Authorization header with Bearer token required' });
  }

  // BAK-GATEWAY-016: Validate caller ownership via x-internal-service header.
  const callerService = req.headers['x-internal-service'] as string | undefined;
  const expectedService = process.env.RENDEZ_SERVICE_NAME || 'Rendez';
  if (!callerService || callerService !== expectedService) {
    logger.warn('[RendezPartner] verify-token called by unauthorized service', { callerService, expectedService });
    return res.status(403).json({ success: false, message: 'Unauthorized service' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    logger.error('[RendezPartner] JWT_SECRET not configured');
    return res.status(503).json({ success: false, message: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as { id?: string; userId?: string };
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    const user = await User.findById(userId).select('phone isPhoneVerified isActive').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is inactive' });
    }

    return res.json({
      valid: true,
      rez_user_id: userId,
      phone: (user as any).phone || '',
      verified_status: (user as any).isPhoneVerified ? 'verified' : 'pending',
    });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    logger.error('[RendezPartner] verify-token error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Token verification failed' });
  }
});

/**
 * POST /auth/link
 * Link a Rendez account to a REZ account.
 * Stores rendezUserId on the REZ User document.
 *
 * BAK-GATEWAY-016 FIX: Require x-internal-service header for ownership check.
 * Without this, any caller with a valid REZ JWT could link any other user account.
 */
router.post('/auth/link', async (req: Request, res: Response) => {
  // BAK-GATEWAY-016: Require authorized caller
  const callerService = req.headers['x-internal-service'] as string | undefined;
  const expectedService = process.env.RENDEZ_SERVICE_NAME || 'Rendez';
  if (!callerService || callerService !== expectedService) {
    logger.warn('[RendezPartner] auth/link called by unauthorized service', { callerService, expectedService });
    return res.status(403).json({ success: false, message: 'Unauthorized service' });
  }

  const { rez_user_id, rendez_user_id } = req.body;

  if (!rez_user_id || !rendez_user_id) {
    return res.status(400).json({ success: false, message: 'rez_user_id and rendez_user_id are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(rez_user_id)) {
    return res.status(400).json({ success: false, message: 'rez_user_id must be a valid user ID' });
  }

  try {
    const result = await User.findByIdAndUpdate(
      rez_user_id,
      { $set: { rendezUserId: rendez_user_id, rendezLinkedAt: new Date() } },
      { new: true, select: '_id' },
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'REZ user not found' });
    }

    logger.info('[RendezPartner] Account linked', { rez_user_id, rendez_user_id });
    return res.json({ success: true, message: 'Accounts linked successfully' });
  } catch (err: any) {
    logger.error('[RendezPartner] auth/link error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to link accounts' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// MERCHANT ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /merchants/nearby
 * Return nearby restaurant/café/bar/lounge merchants for Rendez date suggestions.
 */
router.get('/merchants/nearby', async (req: Request, res: Response) => {
  const { lat, lng, radius_km } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radiusKm = parseFloat((radius_km as string) || '5');

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
    return res.status(400).json({ success: false, message: 'lat, lng, and radius_km must be valid numbers' });
  }

  const DINE_IN_CATEGORIES = [
    'restaurant',
    'cafe',
    'bar',
    'lounge',
    'bakery',
    'dessert',
    'restaurants',
    'cafes',
    'bars-pubs',
    'cafes-restaurants',
  ];

  try {
    const nearby = await Store.find({
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusKm * 1000,
        },
      },
      isActive: true,
      category: { $in: DINE_IN_CATEGORIES },
    })
      .select('_id name category location rating reviewCount images')
      .limit(30)
      .lean();

    const merchants = nearby.map((s: any) => {
      const coords: [number, number] = s.location?.coordinates || [0, 0];
      const dLng = coords[0] - longitude;
      const dLat = coords[1] - latitude;
      const distanceKm = Math.sqrt(dLng * dLng + dLat * dLat) * 111;

      return {
        merchant_id: s._id.toString(),
        name: s.name,
        category: s.category || 'restaurant',
        address: s.location?.address || '',
        distance_km: Math.round(distanceKm * 100) / 100,
        rating: s.rating || 0,
        photo_url: s.images && s.images[0] ? s.images[0] : undefined,
      };
    });

    return res.json(merchants);
  } catch (err: any) {
    logger.error('[RendezPartner] merchants/nearby error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch nearby merchants' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// BOOKING ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /bookings/create
 * Create a table booking at a merchant for a Rendez couple.
 */
router.post('/bookings/create', async (req: Request, res: Response) => {
  const { merchant_id, user1_rez_id, user2_rez_id, date, party_size } = req.body;

  if (!merchant_id || !user1_rez_id || !user2_rez_id || !date || !party_size) {
    return res.status(400).json({
      success: false,
      message: 'merchant_id, user1_rez_id, user2_rez_id, date, and party_size are required',
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(merchant_id) ||
    !mongoose.Types.ObjectId.isValid(user1_rez_id) ||
    !mongoose.Types.ObjectId.isValid(user2_rez_id)
  ) {
    return res.status(400).json({ success: false, message: 'Invalid ObjectId format for merchant, user1, or user2' });
  }

  const parsedPartySize = parseInt(party_size, 10);
  if (isNaN(parsedPartySize) || parsedPartySize < 2) {
    return res.status(400).json({ success: false, message: 'party_size must be at least 2' });
  }

  const bookingDate = new Date(date);
  if (isNaN(bookingDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  try {
    const store = await Store.findById(merchant_id).select('name').lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const user1 = await User.findById(user1_rez_id).select('profile phone').lean();
    if (!user1) {
      return res.status(404).json({ success: false, message: 'user1 not found' });
    }

    const bookingNumber = generateBookingNumber();
    const hours = bookingDate.getHours();
    const minutes = bookingDate.getMinutes();
    const bookingTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const booking = await TableBooking.create({
      bookingNumber,
      storeId: merchant_id,
      userId: user1_rez_id,
      bookingDate,
      bookingTime,
      partySize: parsedPartySize,
      customerName: (user1 as any)?.profile?.firstName || 'Guest',
      customerPhone: (user1 as any)?.phone || '',
      specialRequests: `Rendez couple booking. Second guest REZ ID: ${user2_rez_id}`,
      status: 'pending',
    });

    logger.info('[RendezPartner] Booking created', {
      bookingNumber,
      storeId: merchant_id,
      user1: user1_rez_id,
      user2: user2_rez_id,
    });

    return res.status(201).json({
      booking_id: (booking._id as any).toString(),
      confirmation_code: bookingNumber,
    });
  } catch (err: any) {
    logger.error('[RendezPartner] bookings/create error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// REWARD ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /rewards/trigger
 * Trigger meetup reward coins for both users after a verified Rendez date.
 */
router.post('/rewards/trigger', async (req: Request, res: Response) => {
  const { booking_id, user1_rez_id, user2_rez_id, match_id } = req.body;

  if (!booking_id || !user1_rez_id || !user2_rez_id || !match_id) {
    return res.status(400).json({
      success: false,
      message: 'booking_id, user1_rez_id, user2_rez_id, and match_id are required',
    });
  }

  const MEETUP_REWARD_COINS = 50; // coins per user per meetup

  try {
    const [result1, result2] = await Promise.all([
      rewardEngine.issue({
        userId: user1_rez_id,
        amount: MEETUP_REWARD_COINS,
        rewardType: 'partner_bonus',
        source: 'rendez_meetup',
        description: 'Rendez date meetup reward',
        operationType: 'loyalty_credit',
        referenceId: match_id,
        referenceModel: 'RendezMeetup',
        coinType: 'rez',
        metadata: { booking_id, match_id, partner: 'rendez', source: 'rendez_meetup' },
      }),
      rewardEngine.issue({
        userId: user2_rez_id,
        amount: MEETUP_REWARD_COINS,
        rewardType: 'partner_bonus',
        source: 'rendez_meetup',
        description: 'Rendez date meetup reward',
        operationType: 'loyalty_credit',
        referenceId: match_id,
        referenceModel: 'RendezMeetup',
        coinType: 'rez',
        metadata: { booking_id, match_id, partner: 'rendez', source: 'rendez_meetup' },
      }),
    ]);

    logger.info('[RendezPartner] Meetup rewards issued', {
      match_id,
      user1_coins: result1.amount,
      user2_coins: result2.amount,
    });

    return res.json({
      reward_id: result1.transactionId?.toString() || match_id,
      user1_coins: result1.amount,
      user2_coins: result2.amount,
    });
  } catch (err: any) {
    logger.error('[RendezPartner] rewards/trigger error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to trigger meetup rewards' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// WALLET ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /wallet/hold
 * Hold REZ coins from a user's wallet for a pending gift.
 * BED-001: added authenticate middleware
 */
router.post('/wallet/hold', authenticate, async (req: Request, res: Response) => {
  const { rez_user_id, amount_paise, idempotency_key, reason } = req.body;

  if (!rez_user_id || !amount_paise || !idempotency_key || !reason) {
    return res.status(400).json({
      success: false,
      message: 'rez_user_id, amount_paise, idempotency_key, and reason are required',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(rez_user_id)) {
    return res.status(400).json({ success: false, message: 'rez_user_id must be a valid user ID' });
  }

  // Idempotency: return existing hold if already created
  const existing = await RendezWalletHold.findOne({ idempotencyKey: idempotency_key }).lean();
  if (existing) {
    const wallet = await Wallet.findOne({ userId: rez_user_id }).lean();
    const rezCoins = (wallet as any)?.coins?.find((c: any) => c.type === 'rez');
    return res.json({
      hold_id: existing.holdId,
      balance_after: rezCoins?.amount || 0,
    });
  }

  try {
    const wallet = await Wallet.findOne({ userId: rez_user_id }).lean();
    const rezCoins = (wallet as any)?.coins?.find((c: any) => c.type === 'rez');
    const currentBalance = rezCoins?.amount || 0;

    // Convert amount_paise to coin units (1 REZ coin = 1 paise equivalent in Rendez's model)
    const coinsToHold = Math.ceil(amount_paise / 100); // 100 paise = 1 coin

    if (currentBalance < coinsToHold) {
      return res.status(422).json({ success: false, message: 'Insufficient REZ coin balance' });
    }

    const holdId = generateHoldId();

    // BAK-GATEWAY-013 FIX: Atomically deduct coins from wallet AND create hold record.
    // Uses a MongoDB transaction to ensure both succeed or both fail — prevents
    // coin drain if the DB write succeeds but the deduction fails (or vice versa).
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Step 1: Atomically deduct from coins[] subdocument and balance.available
      // Uses $inc with a balance guard to prevent over-deduction.
      const deductionResult = await Wallet.updateOne(
        {
          userId: new mongoose.Types.ObjectId(rez_user_id),
          'coins.type': 'rez',
          'coins.amount': { $gte: coinsToHold },
          'balance.available': { $gte: coinsToHold },
        },
        {
          $inc: {
            'coins.$.amount': -coinsToHold,
            'balance.available': -coinsToHold,
            'balance.total': -coinsToHold,
          },
        },
      ).session(session);

      if (deductionResult.modifiedCount === 0) {
        // Guard failed — race condition or insufficient balance (shouldn't happen given
        // the pre-check above, but double-checking handles concurrent requests)
        await session.abortTransaction();
        return res.status(422).json({ success: false, message: 'Insufficient REZ coin balance' });
      }

      // Step 2: Create the hold record within the same transaction
      await RendezWalletHold.create(
        [
          {
            holdId,
            senderUserId: rez_user_id,
            amountPaise: amount_paise,
            coinAmount: coinsToHold,
            idempotencyKey: idempotency_key,
            reason,
            status: 'held',
          },
        ],
        { session },
      );

      await session.commitTransaction();
      logger.info('[RendezPartner] Wallet hold created', { holdId, rez_user_id, coinsToHold });

      return res.json({
        hold_id: holdId,
        balance_after: currentBalance - coinsToHold,
      });
    } catch (txErr: any) {
      await session.abortTransaction();
      throw txErr;
    } finally {
      await session.endSession();
    }
  } catch (err: any) {
    logger.error('[RendezPartner] wallet/hold error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to create wallet hold' });
  }
});

/**
 * POST /wallet/release
 * Release a wallet hold and transfer coins to recipient.
 * BED-001: added authenticate middleware
 */
router.post('/wallet/release', authenticate, async (req: Request, res: Response) => {
  const { hold_id, recipient_rez_user_id } = req.body;

  if (!hold_id || !recipient_rez_user_id) {
    return res.status(400).json({ success: false, message: 'hold_id and recipient_rez_user_id are required' });
  }

  try {
    const hold = await RendezWalletHold.findOne({ holdId: hold_id });
    if (!hold) {
      return res.status(404).json({ success: false, message: 'Hold not found' });
    }
    if (hold.status !== 'held') {
      return res.status(409).json({ success: false, message: `Hold is already ${hold.status}` });
    }

    // Credit coins to recipient
    await rewardEngine.issue({
      userId: recipient_rez_user_id,
      amount: hold.coinAmount,
      rewardType: 'partner_bonus',
      source: 'rendez_gift',
      description: `Rendez gift received (hold ${hold_id})`,
      operationType: 'loyalty_credit',
      referenceId: hold_id,
      referenceModel: 'RendezWalletHold',
      coinType: 'rez',
      metadata: { hold_id, partner: 'rendez', source: 'gift_release' },
    });

    await RendezWalletHold.findByIdAndUpdate(hold._id, {
      status: 'released',
      recipientUserId: recipient_rez_user_id,
      releasedAt: new Date(),
    });

    logger.info('[RendezPartner] Wallet hold released', { hold_id, recipient_rez_user_id });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[RendezPartner] wallet/release error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to release wallet hold' });
  }
});

/**
 * POST /wallet/refund
 * Refund a wallet hold back to the original sender.
 * BED-001: added authenticate middleware
 */
router.post('/wallet/refund', authenticate, async (req: Request, res: Response) => {
  const { hold_id, reason } = req.body;

  if (!hold_id) {
    return res.status(400).json({ success: false, message: 'hold_id is required' });
  }

  try {
    const hold = await RendezWalletHold.findOne({ holdId: hold_id });
    if (!hold) {
      return res.status(404).json({ success: false, message: 'Hold not found' });
    }
    if (hold.status !== 'held') {
      return res.status(409).json({ success: false, message: `Hold is already ${hold.status}` });
    }

    // Refund coins back to original sender
    await rewardEngine.issue({
      userId: hold.senderUserId.toString(),
      amount: hold.coinAmount,
      rewardType: 'partner_bonus',
      source: 'rendez_gift_refund',
      description: `Rendez gift refund — ${reason || 'partner refund'}`,
      operationType: 'loyalty_credit',
      referenceId: hold_id,
      referenceModel: 'RendezWalletHold',
      coinType: 'rez',
      metadata: { hold_id, reason, partner: 'rendez', source: 'gift_refund' },
    });

    await RendezWalletHold.findByIdAndUpdate(hold._id, {
      status: 'refunded',
      refundedAt: new Date(),
    });

    logger.info('[RendezPartner] Wallet hold refunded', { hold_id });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[RendezPartner] wallet/refund error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to refund wallet hold' });
  }
});

/**
 * GET /wallet/balance/:userId
 * Get a user's REZ coin balance.
 * BED-001 + BED-016: added authenticate middleware + ownership verification
 */
router.get('/wallet/balance/:userId', authenticate, async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'userId must be a valid user ID' });
  }

  // BED-016: Ownership check — only the owning user or an admin can view this balance
  if (req.userId !== userId && (!req.user || req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Forbidden: you can only view your own wallet balance' });
  }

  try {
    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) {
      return res.json({ balance_paise: 0, coin_balance: 0 });
    }

    const rezCoins = (wallet as any).coins?.find((c: any) => c.type === 'rez');
    const coinBalance = rezCoins?.amount || 0;

    return res.json({
      balance_paise: 0, // REZ is coin-only — no fiat balance exposed to partners
      coin_balance: coinBalance,
    });
  } catch (err: any) {
    logger.error('[RendezPartner] wallet/balance error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch wallet balance' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PARTNER V1 BOOKING ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /partner/v1/bookings/:ref/verify
 * Verify a REZ booking reference is valid, unused, and correct merchant type.
 */
// BAK-GATEWAY-002 FIX: Add partner-level auth to all /partner/v1 routes.
// The router-level rendezPartnerAuth in routes.ts provides protection, but
// explicit route-level middleware documents the auth requirement and guards against
// future refactoring that might accidentally remove the router-level guard.
router.get('/partner/v1/bookings/:ref/verify', rendezPartnerAuth, async (req: Request, res: Response) => {
  const { ref } = req.params;

  if (!ref) {
    return res.status(400).json({ success: false, message: 'booking ref is required' });
  }

  try {
    const booking = await TableBooking.findOne({ bookingNumber: ref }).populate('storeId', 'category').lean();

    if (!booking) {
      return res.json({
        valid: false,
        used: false,
        merchantType: '',
        merchantId: '',
        capacity: 0,
        expiresAt: new Date(0).toISOString(),
      });
    }

    const store = (booking as any).storeId;
    const isUsed = ['completed', 'cancelled', 'no_show'].includes(booking.status);

    // Booking expires 24 hours after scheduled date
    const expiresAt = new Date(booking.bookingDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    return res.json({
      valid: booking.status !== 'cancelled',
      used: isUsed,
      merchantType: store?.category || 'restaurant',
      merchantId: store?._id?.toString() || '',
      capacity: booking.partySize,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    logger.error('[RendezPartner] partner/v1/bookings verify error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to verify booking' });
  }
});

/**
 * POST /partner/v1/bookings/refund
 * Mark a booking as cancelled and issue a refund if advance payment was made.
 */
router.post('/partner/v1/bookings/refund', rendezPartnerAuth, async (req: Request, res: Response) => {
  const { booking_ref, reason } = req.body;

  if (!booking_ref) {
    return res.status(400).json({ success: false, message: 'booking_ref is required' });
  }

  try {
    const booking = await TableBooking.findOne({ bookingNumber: booking_ref });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.json({ success: true, message: 'Booking already cancelled' });
    }

    await booking.updateStatus('cancelled');
    logger.info('[RendezPartner] Booking cancelled via partner refund', { booking_ref, reason });

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[RendezPartner] partner/v1/bookings/refund error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to refund booking' });
  }
});

/**
 * POST /partner/v1/coins/credit
 * Credit REZ coins to a user (referral rewards, bonuses).
 * BAK-GATEWAY-003 FIX: Added maximum coin credit per-request ceiling.
 * A partner with a compromised key could otherwise credit unlimited coins
 * in a single call. The ceiling is configurable via env var.
 */
const MAX_PARTNER_COIN_CREDIT = parseInt(process.env.MAX_PARTNER_COIN_CREDIT || '10000', 10);

router.post('/partner/v1/coins/credit', rendezPartnerAuth, async (req: Request, res: Response) => {
  const { rez_user_id, coins, reason, meta } = req.body;

  if (!rez_user_id || !coins || !reason) {
    return res.status(400).json({ success: false, message: 'rez_user_id, coins, and reason are required' });
  }

  const parsedCoins = parseInt(coins, 10);
  if (isNaN(parsedCoins) || parsedCoins <= 0) {
    return res.status(400).json({ success: false, message: 'coins must be a positive integer' });
  }

  // BAK-GATEWAY-003 FIX: Enforce per-request credit ceiling
  if (parsedCoins > MAX_PARTNER_COIN_CREDIT) {
    logger.warn('[RendezPartner] partner/v1/coins/credit exceeded ceiling', {
      requested: parsedCoins,
      ceiling: MAX_PARTNER_COIN_CREDIT,
    });
    return res.status(400).json({
      success: false,
      message: `coins exceeds maximum of ${MAX_PARTNER_COIN_CREDIT} per request`,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(rez_user_id)) {
    return res.status(400).json({ success: false, message: 'rez_user_id must be a valid user ID' });
  }

  try {
    const result = await rewardEngine.issue({
      userId: rez_user_id,
      amount: parsedCoins,
      rewardType: 'partner_bonus',
      source: 'rendez_credit',
      description: reason,
      operationType: 'loyalty_credit',
      referenceId: `rendez-${Date.now()}`,
      referenceModel: 'RendezCredit',
      coinType: 'rez',
      metadata: { partner: 'rendez', reason, ...(meta || {}) },
    });

    logger.info('[RendezPartner] Coins credited', { rez_user_id, coins: parsedCoins });
    return res.json({ success: true, transaction_id: result.transactionId?.toString() });
  } catch (err: any) {
    logger.error('[RendezPartner] partner/v1/coins/credit error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to credit coins' });
  }
});

/**
 * POST /partner/v1/bookings/credit
 * Issue a locked credit tied to booking category (plan cancelled with applicants).
 */
router.post('/partner/v1/bookings/credit', rendezPartnerAuth, async (req: Request, res: Response) => {
  const { rez_user_id, booking_ref, ttl_days, locked, reason } = req.body;

  if (!rez_user_id || !booking_ref) {
    return res.status(400).json({ success: false, message: 'rez_user_id and booking_ref are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(rez_user_id)) {
    return res.status(400).json({ success: false, message: 'rez_user_id must be a valid user ID' });
  }

  try {
    const booking = await TableBooking.findOne({ bookingNumber: booking_ref }).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const creditCoins = 25; // locked credit for cancelled plans with applicants
    const overrideExpiryDays = ttl_days || 30;

    const result = await rewardEngine.issue({
      userId: rez_user_id,
      amount: creditCoins,
      rewardType: 'partner_bonus',
      source: 'rendez_booking_credit',
      description: reason || `Locked credit for booking ${booking_ref}`,
      operationType: 'loyalty_credit',
      referenceId: booking_ref,
      referenceModel: 'TableBooking',
      coinType: 'promo', // locked/promo coin type for category-restricted credits
      overrideExpiryDays,
      metadata: {
        partner: 'rendez',
        booking_ref,
        locked: locked ?? true,
        source: 'plan_cancelled_with_applicants',
      },
    });

    logger.info('[RendezPartner] Locked booking credit issued', { rez_user_id, booking_ref, creditCoins });
    return res.json({ success: true, transaction_id: result.transactionId?.toString() });
  } catch (err: any) {
    logger.error('[RendezPartner] partner/v1/bookings/credit error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to issue booking credit' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GIFT ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /gifts/catalog
 * Return available gift vouchers as a catalog, optionally filtered by city.
 */
router.get('/gifts/catalog', async (req: Request, res: Response) => {
  const { city } = req.query;

  try {
    const now = new Date();
    const query: Record<string, any> = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gt: now },
    };

    const vouchers = await StoreVoucher.find(query).populate('store', 'name logo city category').limit(50).lean();

    const items = vouchers
      .filter((v: any) => {
        if (!city) return true;
        const storeCity = v.store?.city || v.store?.location?.city || '';
        return storeCity.toLowerCase().includes((city as string).toLowerCase());
      })
      .map((v: any) => ({
        id: v._id.toString(),
        name: v.name,
        description: v.description || '',
        amount_paise: v.discountType === 'fixed' ? v.discountValue * 100 : 0,
        merchant_name: v.store?.name || '',
        merchant_logo_url: v.store?.logo || '',
        category: v.store?.category || 'restaurant',
        validity_days: Math.ceil((new Date(v.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        tier:
          v.discountValue >= 500
            ? 'exclusive'
            : v.discountValue >= 200
              ? 'experience'
              : v.discountValue >= 100
                ? 'treat'
                : v.discountValue >= 50
                  ? 'coffee'
                  : 'signal',
        city: v.store?.city || v.store?.location?.city || '',
      }));

    return res.json(items);
  } catch (err: any) {
    logger.error('[RendezPartner] gifts/catalog error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch gift catalog' });
  }
});

/**
 * POST /gifts/issue
 * Issue a gift voucher from sender to receiver (hold must already exist).
 */
router.post('/gifts/issue', async (req: Request, res: Response) => {
  const { catalog_item_id, sender_rez_id, receiver_rez_id, hold_id, idempotency_key } = req.body;

  if (!catalog_item_id || !sender_rez_id || !receiver_rez_id || !hold_id || !idempotency_key) {
    return res.status(400).json({
      success: false,
      message: 'catalog_item_id, sender_rez_id, receiver_rez_id, hold_id, and idempotency_key are required',
    });
  }

  // Idempotency check
  const existing = await RendezGiftVoucher.findOne({ idempotencyKey: idempotency_key }).lean();
  if (existing) {
    return res.json({
      voucher_id: existing.voucherId,
      qr_code_url: existing.qrCodeData,
      expires_at: existing.expiresAt.toISOString(),
    });
  }

  try {
    const catalogItem = await StoreVoucher.findById(catalog_item_id).lean();
    if (!catalogItem) {
      return res.status(404).json({ success: false, message: 'Catalog item not found' });
    }

    const hold = await RendezWalletHold.findOne({ holdId: hold_id });
    if (!hold || hold.status !== 'held') {
      return res.status(422).json({ success: false, message: 'Invalid or already-used wallet hold' });
    }

    const expiryDays = 48; // default 48h gift expiry (matches env.FRAUD.GIFT_EXPIRY_HOURS)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryDays);

    const voucherId = generateVoucherId();
    const qrCodeData = `REZ-GIFT:${voucherId}`;

    await RendezGiftVoucher.create({
      voucherId,
      catalogItemId: catalog_item_id,
      senderUserId: sender_rez_id,
      receiverUserId: receiver_rez_id,
      holdId: hold_id,
      idempotencyKey: idempotency_key,
      qrCodeData,
      status: 'active',
      storeId: (catalogItem as any).store,
      expiresAt,
    });

    logger.info('[RendezPartner] Gift voucher issued', { voucherId, sender_rez_id, receiver_rez_id });

    return res.status(201).json({
      voucher_id: voucherId,
      qr_code_url: qrCodeData,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err: any) {
    logger.error('[RendezPartner] gifts/issue error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to issue gift voucher' });
  }
});

/**
 * POST /gifts/activate/:id
 * Activate a gift voucher (recipient uses it at the merchant).
 */
router.post('/gifts/activate/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const voucher = await RendezGiftVoucher.findOne({ voucherId: id });
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Gift voucher not found' });
    }

    if (voucher.status === 'activated') {
      return res.json({ success: true, message: 'Voucher already activated' });
    }

    if (voucher.status === 'cancelled') {
      return res.status(409).json({ success: false, message: 'Voucher has been cancelled' });
    }

    if (new Date() > voucher.expiresAt) {
      return res.status(422).json({ success: false, message: 'Voucher has expired' });
    }

    // Release the hold to the merchant (receiver activates → store gets the value)
    const hold = await RendezWalletHold.findOne({ holdId: voucher.holdId });
    if (hold && hold.status === 'held') {
      await rewardEngine.issue({
        userId: voucher.receiverUserId.toString(),
        amount: hold.coinAmount,
        rewardType: 'partner_bonus',
        source: 'rendez_gift_activation',
        description: `Gift voucher ${id} activated`,
        operationType: 'loyalty_credit',
        referenceId: id,
        referenceModel: 'RendezGiftVoucher',
        coinType: 'rez',
        metadata: { voucher_id: id, hold_id: voucher.holdId, partner: 'rendez' },
      });

      await RendezWalletHold.findByIdAndUpdate(hold._id, { status: 'released', releasedAt: new Date() });
    }

    await RendezGiftVoucher.findByIdAndUpdate(voucher._id, {
      status: 'activated',
      activatedAt: new Date(),
    });

    logger.info('[RendezPartner] Gift voucher activated', { voucherId: id });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[RendezPartner] gifts/activate error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to activate voucher' });
  }
});

/**
 * POST /gifts/cancel/:id
 * Cancel a gift voucher and refund the hold.
 */
router.post('/gifts/cancel/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const voucher = await RendezGiftVoucher.findOne({ voucherId: id });
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Gift voucher not found' });
    }

    if (voucher.status === 'cancelled') {
      return res.json({ success: true, message: 'Voucher already cancelled' });
    }

    if (voucher.status === 'activated') {
      return res.status(409).json({ success: false, message: 'Cannot cancel an already-activated voucher' });
    }

    // Refund hold back to sender
    const hold = await RendezWalletHold.findOne({ holdId: voucher.holdId });
    if (hold && hold.status === 'held') {
      await rewardEngine.issue({
        userId: hold.senderUserId.toString(),
        amount: hold.coinAmount,
        rewardType: 'partner_bonus',
        source: 'rendez_gift_cancel',
        description: `Gift voucher ${id} refund — ${reason || 'cancelled'}`,
        operationType: 'loyalty_credit',
        referenceId: id,
        referenceModel: 'RendezGiftVoucher',
        coinType: 'rez',
        metadata: { voucher_id: id, hold_id: voucher.holdId, reason, partner: 'rendez' },
      });

      await RendezWalletHold.findByIdAndUpdate(hold._id, { status: 'refunded', refundedAt: new Date() });
    }

    await RendezGiftVoucher.findByIdAndUpdate(voucher._id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason || 'partner_cancel',
    });

    logger.info('[RendezPartner] Gift voucher cancelled', { voucherId: id });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error('[RendezPartner] gifts/cancel error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to cancel voucher' });
  }
});

/**
 * GET /gifts/voucher/:id
 * Get voucher details.
 */
router.get('/gifts/voucher/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const voucher = await RendezGiftVoucher.findOne({ voucherId: id }).populate('storeId', 'name').lean();

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Gift voucher not found' });
    }

    return res.json({
      qr_code_url: (voucher as any).qrCodeData,
      status: (voucher as any).status,
      merchant_name: (voucher as any).storeId?.name || '',
      valid_until: (voucher as any).expiresAt,
    });
  } catch (err: any) {
    logger.error('[RendezPartner] gifts/voucher error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch voucher' });
  }
});

export default router;
