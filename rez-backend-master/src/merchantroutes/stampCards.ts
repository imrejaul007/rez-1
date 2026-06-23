/**
 * merchantroutes/stampCards.ts
 *
 * Merchant-facing stamp card management API.
 * Mounted at: /api/merchant/stamp-cards
 * Auth: Merchant JWT (validated by authMiddleware).
 *
 * IMPORTANT: merchantId always comes from the authenticated token (req.merchantId).
 * The client MUST NOT pass merchantId in the request body — that would be a
 * privilege escalation vulnerability.
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { StampCard } from '../models/StampCard';
import { UserStampCard } from '../models/UserStampCard';
import { getRedis } from '../config/redis-pool';

const router = Router();

router.use(authMiddleware);

/**
 * GET /merchant/stamp-cards
 * List stamp cards for the authenticated merchant.
 *
 * Query params:
 *   storeId  (string, optional) — filter to a specific store
 *   isActive (boolean, optional)
 *   page     (number, default 1)
 *   limit    (number, default 20, max 100)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { storeId, isActive, page: pageRaw = '1', limit: limitRaw = '20' } = req.query;
    const page = Math.max(1, parseInt(pageRaw as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw as string, 10) || 20));

    const query: Record<string, any> = { merchantId: new Types.ObjectId(merchantId) };
    if (storeId && Types.ObjectId.isValid(storeId as string)) {
      query.storeId = new Types.ObjectId(storeId as string);
    }
    if (isActive !== undefined) {
      query.isActive = String(isActive) === 'true';
    }

    const [stampCards, total] = await Promise.all([
      StampCard.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StampCard.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        items: stampCards,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('[STAMP CARDS] GET /: merchantId=', req.merchantId, error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stamp cards' });
  }
});

/**
 * GET /merchant/stamp-cards/:id
 * Get a single stamp card by ID.
 * Verifies merchant ownership.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    const stampCard = await StampCard.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
    }).lean();

    if (!stampCard) {
      return res.status(404).json({ success: false, message: 'Stamp card not found' });
    }

    return res.json({ success: true, data: stampCard });
  } catch (error) {
    logger.error('[STAMP CARDS] GET /:id:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stamp card' });
  }
});

/**
 * POST /merchant/stamp-cards
 * Create a new stamp card program.
 *
 * Body:
 *   storeId       (ObjectId, required)
 *   name         (string, required)
 *   requiredStamps (number, required, min 1, max 50, default 10)
 *   reward        (array of IReward, required) — [{ type, description, value, productId? }]
 *   isActive     (boolean, default true)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { storeId, name, requiredStamps = 10, reward, isActive = true } = req.body;

    if (!storeId || !name) {
      return res.status(400).json({
        success: false,
        message: 'storeId and name are required',
      });
    }

    if (!Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid storeId format' });
    }

    if (!Array.isArray(reward) || reward.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one reward is required',
      });
    }

    // Validate each reward entry
    const validRewardTypes = ['free_item', 'discount_pct', 'coins'];
    for (let i = 0; i < reward.length; i++) {
      const r = reward[i];
      if (!validRewardTypes.includes(r.type)) {
        return res.status(400).json({
          success: false,
          message: `reward[${i}].type must be one of: ${validRewardTypes.join(', ')}`,
        });
      }
      if (!r.description) {
        return res.status(400).json({
          success: false,
          message: `reward[${i}].description is required`,
        });
      }
      if (typeof r.value !== 'number' || r.value < 0) {
        return res.status(400).json({
          success: false,
          message: `reward[${i}].value must be a non-negative number`,
        });
      }
    }

    const stampCard = new StampCard({
      merchantId: new Types.ObjectId(merchantId),
      storeId: new Types.ObjectId(storeId),
      name,
      requiredStamps,
      reward,
      isActive,
      totalCompleted: 0,
    });

    await stampCard.save();

    logger.info(`[STAMP CARDS] Created: merchantId=${merchantId} cardId=${stampCard._id} name="${name}"`);

    return res.status(201).json({
      success: true,
      data: stampCard,
      message: 'Stamp card created successfully',
    });
  } catch (error) {
    logger.error('[STAMP CARDS] POST /:', error);
    return res.status(500).json({ success: false, message: 'Failed to create stamp card' });
  }
});

/**
 * PATCH /merchant/stamp-cards/:id
 * Update a stamp card (name, requiredStamps, reward, isActive).
 * Does NOT update internal counters (totalCompleted).
 *
 * Body fields (all optional):
 *   name, requiredStamps, reward, isActive
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { id } = req.params;
    const updates = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    // Whitelist only safe fields — never update totalCompleted from the client
    const ALLOWED = ['name', 'requiredStamps', 'reward', 'isActive'];
    const safeUpdate: Record<string, any> = {};
    for (const field of ALLOWED) {
      if (updates[field] !== undefined) {
        safeUpdate[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: `Allowed fields: ${ALLOWED.join(', ')}`,
      });
    }

    const stampCard = await StampCard.findOneAndUpdate(
      { _id: new Types.ObjectId(id), merchantId: new Types.ObjectId(merchantId) },
      { $set: safeUpdate },
      { new: true, runValidators: true },
    );

    if (!stampCard) {
      return res.status(404).json({ success: false, message: 'Stamp card not found' });
    }

    return res.json({ success: true, data: stampCard });
  } catch (error) {
    logger.error('[STAMP CARDS] PATCH /:id:', error);
    return res.status(500).json({ success: false, message: 'Failed to update stamp card' });
  }
});

/**
 * DELETE /merchant/stamp-cards/:id
 * Soft-delete a stamp card by setting isActive = false.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    const stampCard = await StampCard.findOneAndUpdate(
      { _id: new Types.ObjectId(id), merchantId: new Types.ObjectId(merchantId) },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!stampCard) {
      return res.status(404).json({ success: false, message: 'Stamp card not found' });
    }

    return res.json({ success: true, message: 'Stamp card deactivated' });
  } catch (error) {
    logger.error('[STAMP CARDS] DELETE /:id:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete stamp card' });
  }
});

/**
 * GET /merchant/stamp-cards/:id/stats
 * Get enrollment and completion statistics for a stamp card.
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    const stampCard = await StampCard.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
    }).lean();

    if (!stampCard) {
      return res.status(404).json({ success: false, message: 'Stamp card not found' });
    }

    const [totalActive, totalCompleted, totalRedeemed] = await Promise.all([
      UserStampCard.countDocuments({ cardId: new Types.ObjectId(id), status: 'active' }),
      UserStampCard.countDocuments({ cardId: new Types.ObjectId(id), status: 'completed' }),
      UserStampCard.countDocuments({ cardId: new Types.ObjectId(id), status: 'redeemed' }),
    ]);

    return res.json({
      success: true,
      data: {
        cardId: id,
        cardName: stampCard.name,
        requiredStamps: stampCard.requiredStamps,
        totalCompleted: stampCard.totalCompleted ?? 0,
        totalActive,
        totalRedeemed,
        totalParticipants: totalActive + (stampCard.totalCompleted ?? 0) + totalRedeemed,
      },
    });
  } catch (error) {
    logger.error('[STAMP CARDS] GET /:id/stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

/**
 * GET /merchant/stamp-cards/:id/customers
 * List customers enrolled in a stamp card with their progress.
 *
 * Query params:
 *   status  ('active' | 'completed' | 'redeemed', optional)
 *   page    (default 1)
 *   limit   (default 20, max 100)
 */
router.get('/:id/customers', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { id } = req.params;
    const { status, page: pageRaw = '1', limit: limitRaw = '20' } = req.query;
    const page = Math.max(1, parseInt(pageRaw as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw as string, 10) || 20));

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    const stampCard = await StampCard.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
    }).lean();

    if (!stampCard) {
      return res.status(404).json({ success: false, message: 'Stamp card not found' });
    }

    const query: Record<string, any> = { cardId: new Types.ObjectId(id) };
    if (status && ['active', 'completed', 'redeemed'].includes(status as string)) {
      query.status = status;
    }

    const [userCards, total] = await Promise.all([
      UserStampCard.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'phoneNumber name email')
        .lean(),
      UserStampCard.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        items: userCards.map((uc) => ({
          _id: uc._id,
          userId: uc.userId,
          stamps: uc.stamps,
          requiredStamps: stampCard.requiredStamps,
          status: uc.status,
          progress: Math.round((uc.stamps / stampCard.requiredStamps) * 100),
          completedAt: uc.completedAt,
          redeemedAt: uc.redeemedAt,
          createdAt: uc.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('[STAMP CARDS] GET /:id/customers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer list' });
  }
});

/**
 * POST /merchant/stamp-cards/:id/stamp
 * Manually add a stamp to a customer's card.
 * This is used by POS / merchant-app when processing a purchase.
 *
 * Body:
 *   userId     (string, required) — the User _id
 *   storeId    (string, required) — must match the card's storeId
 *   sessionId  (string, optional) — for idempotency dedup
 *   orderId    (string, optional) — linked order
 *   stampsEarned (number, default 1) — stamps to add
 *
 * Note: For consumer-initiated stamp earning, use the consumer API:
 *   POST /api/stamps/earn (with JWT auth).
 */
router.post('/:id/stamp', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { id } = req.params;
    const { userId, storeId, sessionId, orderId, stampsEarned = 1 } = req.body;

    if (!userId || !storeId) {
      return res.status(400).json({
        success: false,
        message: 'userId and storeId are required',
      });
    }

    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    // Idempotency: prevent double-stamp on same session
    const dedupeKey = `stamp:${storeId}:${userId}:${sessionId || orderId || 'manual'}`;
    try {
      const redis = getRedis();
      const alreadyStamped = await redis.get(dedupeKey);
      if (alreadyStamped) {
        return res.status(200).json({
          success: true,
          message: 'Already stamped for this session',
          idempotent: true,
        });
      }
      await redis.setex(dedupeKey, 86400, '1');
    } catch {
      // Redis unavailable — proceed without dedup
    }

    // Verify the card belongs to this merchant
    const stampCard = await StampCard.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
    }).lean();

    if (!stampCard) {
      return res.status(404).json({ success: false, message: 'Stamp card not found' });
    }
    if (!stampCard.isActive) {
      return res.status(400).json({ success: false, message: 'Stamp card is not active' });
    }

    // Upsert user stamp card
    let userCard = await UserStampCard.findOne({
      cardId: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (!userCard) {
      userCard = new UserStampCard({
        userId: new Types.ObjectId(userId),
        merchantId: new Types.ObjectId(merchantId),
        storeId: new Types.ObjectId(storeId),
        cardId: new Types.ObjectId(id),
        stamps: 0,
        status: 'active',
      });
    }

    if (userCard.status === 'redeemed') {
      return res.status(400).json({ success: false, message: 'Card already redeemed' });
    }

    const stampsToAdd = Math.min(stampsEarned, stampCard.requiredStamps - (userCard.stamps || 0));
    userCard.stamps = (userCard.stamps || 0) + stampsToAdd;

    if (userCard.stamps >= stampCard.requiredStamps) {
      userCard.status = 'completed';
      userCard.completedAt = new Date();
      await StampCard.updateOne({ _id: new Types.ObjectId(id) }, { $inc: { totalCompleted: 1 } });
    }
    await userCard.save();

    logger.info(
      `[STAMP CARDS] Manual stamp: merchantId=${merchantId} cardId=${id} userId=${userId} stamps=+${stampsToAdd} total=${userCard.stamps}`,
    );

    return res.json({
      success: true,
      data: {
        userCardId: userCard._id,
        cardId: id,
        stamps: userCard.stamps,
        requiredStamps: stampCard.requiredStamps,
        status: userCard.status,
        isCompleted: userCard.status === 'completed',
      },
    });
  } catch (error) {
    logger.error('[STAMP CARDS] POST /:id/stamp:', error);
    return res.status(500).json({ success: false, message: 'Failed to add stamp' });
  }
});

export default router;
