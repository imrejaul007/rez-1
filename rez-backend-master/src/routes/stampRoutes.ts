// @ts-nocheck
/**
 * routes/stampRoutes.ts
 *
 * Consumer-facing stamp card API routes.
 * Mounted at: /api/stamps
 * Auth: JWT Bearer token (consumer app) or x-session-token (web ordering legacy).
 *
 * Endpoints:
 *   POST /stamps/earn   — record a stamp for a purchase
 *   GET  /stamps/user   — list all stamp cards for a user
 *   GET  /stamps/user/:cardId — get a specific user stamp card with event history
 *   POST /stamps/redeem — redeem a completed stamp card for a reward
 */

import { Router, Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import crypto from 'crypto';

import { StampCard } from '../models/StampCard';
import { UserStampCard } from '../models/UserStampCard';
import { StampEvent } from '../models/StampEvent';
import { StampRedemption } from '../models/StampRedemption';
import { verifyToken } from '../middleware/auth';
import { logger } from '../config/logger';
import redisService from '../services/redisService';
import rateLimit from 'express-rate-limit';

const router = Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────

const earnLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

const redeemLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve the authenticated userId from the request.
 * Tries JWT Bearer token first, then falls back to web-session token.
 * Returns { userId, phone } or null if unauthenticated.
 */
async function resolveUser(req: Request): Promise<{ userId: string; phone: string } | null> {
  // JWT Bearer token path
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwtToken = authHeader.slice(7);
    try {
      const payload = verifyToken(jwtToken);
      if (payload?.userId) {
        const phone = (payload as any).phoneNumber || (payload as any).phone || '';

        // Fast path: payload has userId directly
        return { userId: payload.userId as string, phone };
      }
    } catch (err) {
      logger.debug('[STAMP ROUTES] JWT verification failed', { error: (err as Error).message });
    }
  }

  // Legacy web-session token path
  const sessionToken = (req.headers['x-session-token'] as string) || (req.query.sessionToken as string);

  if (sessionToken) {
    try {
      const phone = await getWebSession(sessionToken);
      if (phone) {
        // Look up userId by phone
        const { User } = await import('../models/User');
        const user = await User.findOne({ phoneNumber: phone }).select('_id').lean();
        if (user) {
          return { userId: (user._id as Types.ObjectId).toString(), phone };
        }
      }
    } catch (err) {
      logger.debug('[STAMP ROUTES] Web session resolution failed', { error: (err as Error).message });
    }
  }

  return null;
}

async function getWebSession(sessionId: string): Promise<string | null> {
  const key = `web_session:${sessionId}`;
  try {
    const stored = await redisService.get<string>(key);
    if (stored) return stored;
  } catch {
    // Redis unavailable — fall through
  }
  return null;
}

function sendError(res: Response, statusCode: number, message: string, code: string) {
  return res.status(statusCode).json({ success: false, message, code } as any);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateRewardCode(): string {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `REZ-STAMP-${suffix}`;
}

// ─── POST /stamps/earn ────────────────────────────────────────────────────────
/**
 * Record a stamp for a user's purchase.
 *
 * Body:
 *   cardId      (string, required) — the StampCard program _id
 *   orderId     (string, optional) — the Order _id that triggered the stamp
 *   orderNumber (string, optional) — display-friendly order reference
 *   stampsEarned (number, optional, default 1) — number of stamps to add
 *   source      (string, optional, default 'order') — 'order' | 'bonus' | 'manual'
 *   idempotencyKey (string, optional) — prevents duplicate stamp events
 *
 * Behavior:
 *   - Uses Redis deduplication via idempotencyKey (24h TTL).
 *   - Creates UserStampCard if it does not exist (upsert).
 *   - Automatically marks card 'completed' when stamps >= requiredStamps.
 *   - Records a StampEvent for the audit trail.
 */
router.post('/earn', earnLimiter, async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');

    const { cardId, orderId, orderNumber, stampsEarned = 1, source = 'order', idempotencyKey } = req.body;

    if (!cardId) return sendError(res, 400, 'cardId is required', 'MISSING_CARD_ID');

    // Idempotency guard
    if (idempotencyKey) {
      try {
        const cached = await redisService.get(`stamp_earn:${idempotencyKey}`);
        if (cached) {
          return res.json({
            success: true,
            message: 'Stamp already recorded for this event',
            idempotent: true,
          });
        }
      } catch {
        // Redis unavailable — proceed without deduplication
      }
    }

    // Validate cardId format
    if (!Types.ObjectId.isValid(cardId)) {
      return sendError(res, 400, 'Invalid cardId format', 'INVALID_CARD_ID');
    }

    // Load the stamp card definition
    const stampCard = await StampCard.findById(cardId).lean();
    if (!stampCard) return sendError(res, 404, 'Stamp card not found', 'CARD_NOT_FOUND');
    if (!stampCard.isActive) return sendError(res, 400, 'Stamp card is not active', 'CARD_INACTIVE');

    const merchantId = (stampCard as any).merchantId?._id?.toString() ?? (stampCard as any).merchantId?.toString();
    const storeId = (stampCard as any).storeId?._id?.toString() ?? (stampCard as any).storeId?.toString();

    // Resolve userId as ObjectId
    const userId = new Types.ObjectId(user.userId);
    const merchantIdObj = new Types.ObjectId(merchantId);
    const storeIdObj = new Types.ObjectId(storeId);
    const cardIdObj = new Types.ObjectId(cardId);

    // Find or create user stamp card (upsert)
    let userCard = await UserStampCard.findOne({ userId, cardId: cardIdObj });
    if (!userCard) {
      userCard = new UserStampCard({
        userId,
        merchantId: merchantIdObj,
        storeId: storeIdObj,
        cardId: cardIdObj,
        stamps: 0,
        status: 'active',
      });
    }

    // Prevent earning on already-redeemed cards
    if (userCard.status === 'redeemed') {
      return sendError(res, 400, 'This card has already been redeemed', 'CARD_ALREADY_REDEEMED');
    }

    // Determine how many stamps to add (cap at remaining stamps needed)
    const stampsToAdd = Math.min(stampsEarned, stampCard.requiredStamps - (userCard.stamps || 0));
    userCard.stamps = (userCard.stamps || 0) + stampsToAdd;

    // Check for completion
    if (userCard.stamps >= stampCard.requiredStamps) {
      userCard.status = 'completed';
      userCard.completedAt = new Date();

      // Increment totalCompleted counter on the card
      await StampCard.updateOne({ _id: cardIdObj }, { $inc: { totalCompleted: 1 } });
    }
    await userCard.save();

    // Record StampEvent for audit trail
    const stampEvent = await StampEvent.create({
      userId,
      merchantId: merchantIdObj,
      storeId: storeIdObj,
      cardId: cardIdObj,
      userCardId: userCard._id as Types.ObjectId,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      orderNumber,
      stampsEarned: stampsToAdd,
      source,
      idempotencyKey,
    });

    // Mark idempotency key as processed (24h TTL)
    if (idempotencyKey) {
      try {
        await redisService.set(`stamp_earn:${idempotencyKey}`, '1', 86400);
      } catch {
        // Redis unavailable — best-effort dedup
      }
    }

    logger.info(
      `[STAMP] Earn: userId=${user.userId} cardId=${cardId} stamps=+${stampsToAdd} total=${userCard.stamps}/${stampCard.requiredStamps} status=${userCard.status}`,
    );

    return res.json({
      success: true,
      data: {
        eventId: stampEvent._id,
        cardId: cardId.toString(),
        stamps: userCard.stamps,
        requiredStamps: stampCard.requiredStamps,
        status: userCard.status,
        isCompleted: userCard.status === 'completed',
        stampsToNextReward: Math.max(0, stampCard.requiredStamps - userCard.stamps),
      },
    });
  } catch (error) {
    logger.error('[STAMP ROUTES] Error in /earn', { error });
    return sendError(res, 500, 'Failed to record stamp', 'INTERNAL_ERROR');
  }
});

// ─── GET /stamps/user ─────────────────────────────────────────────────────────
/**
 * List all stamp cards for the authenticated user.
 *
 * Query params:
 *   merchantId (string, optional) — filter to a specific merchant
 *   status     (string, optional) — 'active' | 'completed' | 'redeemed'
 *   page       (number, default 1)
 *   limit      (number, default 20, max 100)
 *
 * Returns each UserStampCard enriched with its parent StampCard definition
 * and a summary of reward tiers.
 */
router.get('/user', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');

    const { merchantId, status, page: pageRaw = '1', limit: limitRaw = '20' } = req.query;
    const page = Math.max(1, parseInt(pageRaw as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw as string, 10) || 20));
    const skip = (page - 1) * limit;

    const userId = new Types.ObjectId(user.userId);
    const query: Record<string, any> = { userId };
    if (merchantId && Types.ObjectId.isValid(merchantId as string)) {
      query.merchantId = new Types.ObjectId(merchantId as string);
    }
    if (status && ['active', 'completed', 'redeemed'].includes(status as string)) {
      query.status = status;
    }

    const [userCards, total] = await Promise.all([
      UserStampCard.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      UserStampCard.countDocuments(query),
    ]);

    // Populate StampCard details for each
    const cardIds = userCards.map((uc) => uc.cardId);
    const stampCards = await StampCard.find({ _id: { $in: cardIds } }).lean();
    const cardMap = new Map(stampCards.map((sc) => [sc._id.toString(), sc]));

    const enriched = userCards.map((uc) => {
      const card = cardMap.get(uc.cardId.toString());
      return {
        _id: uc._id,
        cardId: uc.cardId,
        merchantId: uc.merchantId,
        storeId: uc.storeId,
        stamps: uc.stamps,
        requiredStamps: card?.requiredStamps ?? 0,
        status: uc.status,
        cardName: card?.name ?? 'Unknown Card',
        rewards: card?.reward ?? [],
        isCompleted: uc.stamps >= (card?.requiredStamps ?? 0),
        stampsRemaining: Math.max(0, (card?.requiredStamps ?? 0) - uc.stamps),
        completedAt: uc.completedAt,
        redeemedAt: uc.redeemedAt,
        createdAt: uc.createdAt,
        updatedAt: uc.updatedAt,
      };
    });

    return res.json({
      success: true,
      data: {
        items: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('[STAMP ROUTES] Error in /user', { error });
    return sendError(res, 500, 'Failed to fetch stamp cards', 'INTERNAL_ERROR');
  }
});

// ─── GET /stamps/user/:cardId ─────────────────────────────────────────────────
/**
 * Get a specific user stamp card with its event history.
 *
 * Returns the UserStampCard document enriched with StampCard details
 * and the last N StampEvent records (stamp history).
 */
router.get('/user/:cardId', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');

    const { cardId } = req.params;
    if (!Types.ObjectId.isValid(cardId)) {
      return sendError(res, 400, 'Invalid cardId format', 'INVALID_CARD_ID');
    }

    const userId = new Types.ObjectId(user.userId);
    const userCardIdObj = new Types.ObjectId(cardId);

    const [userCard, stampCard] = await Promise.all([
      UserStampCard.findOne({ _id: userCardIdObj, userId }).lean(),
      StampCard.findById(cardId).lean(),
    ]);

    if (!userCard) return sendError(res, 404, 'Stamp card not found', 'NOT_FOUND');

    // Fetch stamp event history (last 50 events for this user card)
    const events = await StampEvent.find({ userCardId: userCardIdObj })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('stampsEarned source orderNumber createdAt')
      .lean();

    // Fetch redemption if redeemed
    let redemption = null;
    if (userCard.status === 'redeemed') {
      const rd = await StampRedemption.findOne({ userCardId: userCardIdObj }).lean();
      if (rd) {
        redemption = {
          rewardType: rd.rewardType,
          rewardDescription: rd.rewardDescription,
          rewardCode: rd.rewardCode,
          redeemedAt: rd.createdAt,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        userCard: {
          _id: userCard._id,
          cardId: userCard.cardId,
          stamps: userCard.stamps,
          requiredStamps: stampCard?.requiredStamps ?? 0,
          status: userCard.status,
          cardName: stampCard?.name ?? 'Unknown Card',
          rewards: stampCard?.reward ?? [],
          isCompleted: userCard.stamps >= (stampCard?.requiredStamps ?? 0),
          stampsRemaining: Math.max(0, (stampCard?.requiredStamps ?? 0) - userCard.stamps),
          completedAt: userCard.completedAt,
          redeemedAt: userCard.redeemedAt,
          createdAt: userCard.createdAt,
          updatedAt: userCard.updatedAt,
        },
        events,
        redemption,
      },
    });
  } catch (error) {
    logger.error('[STAMP ROUTES] Error in /user/:cardId', { error });
    return sendError(res, 500, 'Failed to fetch stamp card', 'INTERNAL_ERROR');
  }
});

// ─── POST /stamps/redeem ──────────────────────────────────────────────────────
/**
 * Redeem a completed stamp card for its reward.
 *
 * Body:
 *   cardId           (string, required) — the UserStampCard _id
 *   rewardIndex      (number, optional, default 0) — which reward from the card's reward[] to claim
 *   orderId          (string, optional) — link redemption to an order
 *   idempotencyKey   (string, optional) — prevents double-redemption
 *
 * Behavior:
 *   - Idempotent: returns existing redemption if already redeemed.
 *   - Marks UserStampCard as 'redeemed'.
 *   - Creates a StampRedemption ledger entry.
 *   - Issues a reward code (REZ-STAMP-XXXXXXXX) for in-store redemption.
 */
router.post('/redeem', redeemLimiter, async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');

    const { cardId, rewardIndex = 0, orderId, idempotencyKey } = req.body;

    if (!cardId) return sendError(res, 400, 'cardId is required', 'MISSING_CARD_ID');
    if (!Types.ObjectId.isValid(cardId)) {
      return sendError(res, 400, 'Invalid cardId format', 'INVALID_CARD_ID');
    }

    // Idempotency: return existing redemption if already processed
    if (idempotencyKey) {
      try {
        const cached = await redisService.get(`stamp_redeem:${idempotencyKey}`);
        if (cached) {
          const existing = await StampRedemption.findOne({ idempotencyKey }).lean();
          if (existing) {
            return res.json({
              success: true,
              alreadyRedeemed: true,
              redemption: {
                rewardCode: existing.rewardCode,
                rewardType: existing.rewardType,
                rewardDescription: existing.rewardDescription,
                rewardValue: existing.rewardValue,
              },
            });
          }
        }
      } catch {
        // Redis unavailable — proceed
      }
    }

    const userId = new Types.ObjectId(user.userId);
    const userCardIdObj = new Types.ObjectId(cardId);

    // Load user stamp card
    const userCard = await UserStampCard.findOne({ _id: userCardIdObj, userId });
    if (!userCard) return sendError(res, 404, 'Stamp card not found', 'NOT_FOUND');

    if (userCard.status === 'redeemed') {
      // Return existing redemption (idempotent)
      const existing = await StampRedemption.findOne({ userCardId: userCardIdObj }).lean();
      if (existing) {
        return res.json({
          success: true,
          alreadyRedeemed: true,
          redemption: {
            rewardCode: existing.rewardCode,
            rewardType: existing.rewardType,
            rewardDescription: existing.rewardDescription,
            rewardValue: existing.rewardValue,
          },
        });
      }
    }

    if (userCard.status !== 'completed') {
      return sendError(
        res,
        400,
        `Card must be completed before redemption. Current status: ${userCard.status}. Collect ${Math.max(0, (userCard as any).requiredStamps - userCard.stamps)} more stamp(s).`,
        'CARD_NOT_COMPLETED',
      );
    }

    // Load stamp card definition
    const stampCard = await StampCard.findById(userCard.cardId).lean();
    if (!stampCard) return sendError(res, 404, 'Stamp card not found', 'CARD_NOT_FOUND');
    if (!stampCard.reward || stampCard.reward.length === 0) {
      return sendError(res, 400, 'No rewards configured for this card', 'NO_REWARDS');
    }

    const idx = Math.min(rewardIndex, stampCard.reward.length - 1);
    const reward = stampCard.reward[idx];
    if (!reward) return sendError(res, 400, 'Invalid reward index', 'INVALID_REWARD_INDEX');

    const rewardCode = generateRewardCode();

    // Create redemption record
    const redemption = await StampRedemption.create({
      userId,
      merchantId: userCard.merchantId,
      storeId: userCard.storeId,
      cardId: userCard.cardId,
      userCardId: userCard._id as Types.ObjectId,
      rewardIndex: idx,
      rewardType: reward.type,
      rewardDescription: reward.description,
      rewardValue: reward.value,
      rewardCode,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      idempotencyKey,
    });

    // Mark user stamp card as redeemed
    userCard.status = 'redeemed';
    userCard.redeemedAt = new Date();
    await userCard.save();

    // Cache idempotency key (7 day TTL for redemptions)
    if (idempotencyKey) {
      try {
        await redisService.set(`stamp_redeem:${idempotencyKey}`, '1', 604800);
      } catch {
        // Redis unavailable — best-effort
      }
    }

    logger.info(
      `[STAMP] Redeem: userId=${user.userId} cardId=${cardId} reward=${reward.description} code=${rewardCode}`,
    );

    return res.json({
      success: true,
      data: {
        redemptionId: redemption._id,
        cardId: cardId.toString(),
        reward: {
          type: reward.type,
          description: reward.description,
          value: reward.value,
          productId: reward.productId?.toString(),
        },
        rewardCode,
        status: 'redeemed',
      },
    });
  } catch (error) {
    logger.error('[STAMP ROUTES] Error in /redeem', { error });
    return sendError(res, 500, 'Failed to redeem stamp card', 'INTERNAL_ERROR');
  }
});

export default router;
