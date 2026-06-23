import { logger } from '../../config/logger';
/**
 * Admin Routes - Loyalty Milestones
 * CRUD for LoyaltyMilestone model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import LoyaltyMilestone from '../../models/LoyaltyMilestone';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { pick } from '../../utils/safeAssign';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/loyalty-milestones
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.rewardType) filter.rewardType = req.query.rewardType;
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.search) filter.title = { $regex: escapeRegex(req.query.search as string), $options: 'i' };

    const [milestones, total] = await Promise.all([
      LoyaltyMilestone.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      LoyaltyMilestone.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      milestones,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Loyalty milestones fetched');
  }));

/**
 * GET /api/admin/loyalty-milestones/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findById(req.params.id).lean();
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    return sendSuccess(res, milestone, 'Loyalty milestone fetched');
  }));

/**
 * POST /api/admin/loyalty-milestones
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { title, description, targetType, targetValue, reward, rewardType } = req.body;
    if (!title || !description || !targetType || !targetValue || !reward || !rewardType) {
      return sendError(res, 'title, description, targetType, targetValue, reward, rewardType are required', 400);
    }

    // SECURITY: explicit allowlist. Loyalty milestones drive coin rewards
    // and tier progression; an injected field could pay out arbitrary
    // amounts or skip tier requirements.
    const milestone = await LoyaltyMilestone.create(pick(req.body, [
      'title', 'description', 'targetType', 'targetValue', 'reward',
      'rewardType', 'isActive', 'startsAt', 'expiresAt', 'tier',
      'priority', 'maxCompletions', 'eligibleUserIds',
    ]));
    return sendSuccess(res, milestone, 'Loyalty milestone created');
  }));

/**
 * PUT /api/admin/loyalty-milestones/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    return sendSuccess(res, milestone, 'Loyalty milestone updated');
  }));

/**
 * PATCH /api/admin/loyalty-milestones/:id/toggle
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findById(req.params.id);
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    milestone.isActive = !milestone.isActive;
    await milestone.save();
    return sendSuccess(res, milestone, `Loyalty milestone ${milestone.isActive ? 'activated' : 'deactivated'}`);
  }));

/**
 * DELETE /api/admin/loyalty-milestones/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findByIdAndDelete(req.params.id);
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    return sendSuccess(res, null, 'Loyalty milestone deleted');
  }));

export default router;
