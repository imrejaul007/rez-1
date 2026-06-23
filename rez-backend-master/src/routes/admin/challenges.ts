import { logger } from '../../config/logger';
/**
 * Admin Routes - Challenges
 * CRUD for Challenge model (used by Play & Earn admin page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import Challenge from '../../models/Challenge';
import { CHALLENGE_TEMPLATES } from '../../config/challengeTemplates';
import challengeService from '../../services/challengeService';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/challenges
 * List all challenges with pagination and filters
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Filter by type
  if (req.query.type && ['daily', 'weekly', 'monthly', 'special'].includes(req.query.type as string)) {
    filter.type = req.query.type;
  }

  // Filter by difficulty
  if (req.query.difficulty && ['easy', 'medium', 'hard'].includes(req.query.difficulty as string)) {
    filter.difficulty = req.query.difficulty;
  }

  // Filter by status - supports both legacy and new lifecycle statuses
  const statusParam = req.query.status as string;
  if (statusParam) {
    const lifecycleStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired', 'disabled'];
    if (lifecycleStatuses.includes(statusParam)) {
      filter.status = statusParam;
    } else if (statusParam === 'inactive') {
      // Legacy: inactive = disabled or paused
      filter.status = { $in: ['disabled', 'paused'] };
    }
  }

  // Filter by featured
  if (req.query.featured === 'true') {
    filter.featured = true;
  } else if (req.query.featured === 'false') {
    filter.featured = false;
  }

  const [challenges, total] = await Promise.all([
    Challenge.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Challenge.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    challenges,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  }, 'Challenges fetched');
}));

/**
 * GET /api/admin/challenges/templates
 * Return challenge templates from config
 */
router.get('/templates', asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, CHALLENGE_TEMPLATES, 'Challenge templates fetched');
}));

/**
 * GET /api/admin/challenges/stats
 * Get aggregate stats for challenges
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();

  const [total, active, byType, byDifficulty, completionStats] = await Promise.all([
    Challenge.countDocuments(),
    Challenge.countDocuments({
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }),
    Challenge.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Challenge.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),
    Challenge.aggregate([
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: '$participantCount' },
          totalCompletions: { $sum: '$completionCount' },
        },
      },
    ]),
  ]);

  const typeMap: Record<string, number> = {};
  byType.forEach((item: any) => {
    typeMap[item._id] = item.count;
  });

  const difficultyMap: Record<string, number> = {};
  byDifficulty.forEach((item: any) => {
    difficultyMap[item._id] = item.count;
  });

  const stats = completionStats[0] || { totalParticipants: 0, totalCompletions: 0 };
  const avgCompletionRate = stats.totalParticipants > 0
    ? ((stats.totalCompletions / stats.totalParticipants) * 100).toFixed(1)
    : '0';

  return sendSuccess(res, {
    total,
    active,
    byType: typeMap,
    byDifficulty: difficultyMap,
    avgCompletionRate: parseFloat(avgCompletionRate),
    totalParticipants: stats.totalParticipants,
    totalCompletions: stats.totalCompletions,
  }, 'Challenge stats fetched');
}));

/**
 * GET /api/admin/challenges/analytics
 * Get challenge analytics: participants, completion rate, coin liability, conversion funnel
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const ChallengeAnalytics = (await import('../../models/ChallengeAnalytics')).default;

  const activeChallenges = await Challenge.find({
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).lean();

  const totalParticipants = activeChallenges.reduce((sum, c) => sum + (c.participantCount || 0), 0);
  const totalCompletions = activeChallenges.reduce((sum, c) => sum + (c.completionCount || 0), 0);
  const avgCompletionRate = totalParticipants > 0
    ? Math.round((totalCompletions / totalParticipants) * 100)
    : 0;

  // Coin liability: max possible coin payout for active challenges
  const totalCoinLiability = activeChallenges.reduce((sum, c) => {
    const maxPayout = (c.rewards?.coins || 0) * (c.maxParticipants || c.participantCount || 0);
    return sum + maxPayout;
  }, 0);

  const byType: Record<string, number> = {};
  for (const c of activeChallenges) {
    byType[c.type] = (byType[c.type] || 0) + 1;
  }

  // Per-challenge breakdown
  const challengeBreakdown = activeChallenges.map(c => ({
    _id: String(c._id),
    title: c.title,
    participants: c.participantCount || 0,
    completions: c.completionCount || 0,
    completionRate: (c.participantCount || 0) > 0
      ? Math.round(((c.completionCount || 0) / c.participantCount) * 100)
      : 0,
    coinReward: c.rewards?.coins || 0,
  }));

  // Conversion funnel from ChallengeAnalytics (last 30 days)
  let conversionFunnel: Record<string, { count: number; uniqueUsers: number }> = {};
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    conversionFunnel = await (ChallengeAnalytics as any).getConversionFunnel(undefined, thirtyDaysAgo, now);
  } catch {
    // ChallengeAnalytics may not have data yet
  }

  return sendSuccess(res, {
    activeChallenges: activeChallenges.length,
    totalParticipants,
    totalCompletions,
    avgCompletionRate,
    totalCoinLiability,
    byType,
    challengeBreakdown,
    conversionFunnel,
  }, 'Challenge analytics retrieved');
}));

/**
 * GET /api/admin/challenges/:id
 * Get single challenge by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const challenge = await Challenge.findById(req.params.id).lean();

  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  return sendSuccess(res, challenge, 'Challenge fetched');
}));

/**
 * POST /api/admin/challenges
 * Create new challenge
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      description,
      icon,
      requirements,
      rewards,
      startDate,
      endDate,
      difficulty,
      featured,
      active,
      maxParticipants,
      status,
      visibility,
      priority,
      scheduledPublishAt,
    } = req.body;

    // Validate required fields
    if (!type || !title || !description || !icon || !requirements || !rewards || !startDate || !endDate) {
      return sendError(res, 'type, title, description, icon, requirements, rewards, startDate, and endDate are required', 400);
    }

    if (!requirements.action || !requirements.target) {
      return sendError(res, 'requirements.action and requirements.target are required', 400);
    }

    if (rewards.coins === undefined || rewards.coins === null) {
      return sendError(res, 'rewards.coins is required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return sendError(res, 'endDate must be after startDate', 400);
    }

    // Validate optional lifecycle fields
    const validStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired', 'disabled'];
    if (status && !validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const validVisibilities = ['play_and_earn', 'missions', 'both'];
    if (visibility && !validVisibilities.includes(visibility)) {
      return sendError(res, `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`, 400);
    }

    if (priority !== undefined && (typeof priority !== 'number' || priority < 0 || priority > 100)) {
      return sendError(res, 'Priority must be a number between 0 and 100', 400);
    }

    if (status === 'scheduled' && !scheduledPublishAt) {
      return sendError(res, 'scheduledPublishAt is required when status is scheduled', 400);
    }

    const resolvedStatus = status || 'active';

    const challenge = await Challenge.create({
      type,
      title,
      description,
      icon,
      requirements,
      rewards,
      difficulty: difficulty || 'easy',
      startDate: start,
      endDate: end,
      featured: featured || false,
      active: resolvedStatus === 'active',
      status: resolvedStatus,
      visibility: visibility || 'both',
      priority: priority || 0,
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : undefined,
      maxParticipants,
    });

    return sendSuccess(res, challenge, 'Challenge created');
  } catch (error: any) {
    logger.error('[Admin] Error creating challenge:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to create challenge', 500);
  }
}));

/**
 * POST /api/admin/challenges/from-template
 * Create challenge from a template index
 */
router.post('/from-template', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { templateIndex, startDate, featured } = req.body;

    if (templateIndex === undefined || templateIndex === null) {
      return sendError(res, 'templateIndex is required', 400);
    }

    const template = CHALLENGE_TEMPLATES[templateIndex];
    if (!template) {
      return sendError(res, 'Template not found at given index', 404);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + (template.durationDays || 1));

    const challenge = await Challenge.create({
      ...template,
      startDate: start,
      endDate: end,
      featured: featured || false,
      active: true,
    });

    return sendSuccess(res, challenge, 'Challenge created from template');
  } catch (error: any) {
    logger.error('[Admin] Error creating challenge from template:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to create challenge from template', 500);
  }
}));

/**
 * PUT /api/admin/challenges/:id
 * Update existing challenge
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid challenge ID', 400);
    }

    // Whitelist allowed fields to prevent corruption of system fields
    const allowedFields = [
      'type', 'title', 'description', 'icon', 'requirements', 'rewards',
      'difficulty', 'startDate', 'endDate', 'featured', 'active', 'maxParticipants',
      'status', 'visibility', 'priority', 'scheduledPublishAt',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }
    // Keep active in sync with status
    if (updateData.status) {
      updateData.active = updateData.status === 'active';
    }

    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!challenge) {
      return sendError(res, 'Challenge not found', 404);
    }

    return sendSuccess(res, challenge, 'Challenge updated');
  } catch (error: any) {
    logger.error('[Admin] Error updating challenge:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to update challenge', 500);
  }
}));

/**
 * PATCH /api/admin/challenges/:id/toggle
 * Toggle challenge active status
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  challenge.active = !challenge.active;
  // Keep status in sync with active toggle
  challenge.status = challenge.active ? 'active' : 'disabled';
  await challenge.save();

  return sendSuccess(res, challenge, `Challenge ${challenge.active ? 'activated' : 'deactivated'}`);
}));

/**
 * PATCH /api/admin/challenges/:id/feature
 * Toggle challenge featured status
 */
router.patch('/:id/feature', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  challenge.featured = !challenge.featured;
  await challenge.save();

  return sendSuccess(res, challenge, `Challenge ${challenge.featured ? 'featured' : 'unfeatured'}`);
}));

/**
 * DELETE /api/admin/challenges/:id
 * Delete challenge
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const challenge = await Challenge.findByIdAndDelete(req.params.id);
  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  // Cascade: clean up orphaned progress and analytics records
  try {
    const UserChallengeProgress = (await import('../../models/UserChallengeProgress')).default;
    const ChallengeAnalytics = (await import('../../models/ChallengeAnalytics')).default;
    await Promise.all([
      UserChallengeProgress.deleteMany({ challenge: req.params.id }),
      ChallengeAnalytics.deleteMany({ challenge: req.params.id }),
    ]);
  } catch (cleanupErr) {
    logger.error('[Admin] Error cleaning up related records:', cleanupErr);
    // Don't fail the delete - challenge is already removed
  }

  return sendSuccess(res, null, 'Challenge deleted');
}));

/**
 * PATCH /api/admin/challenges/:id/status
 * Change challenge lifecycle status (pause, resume, disable, activate, schedule)
 */
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const { status, reason, scheduledPublishAt } = req.body;
  const validStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired', 'disabled'];
  if (!status || !validStatuses.includes(status)) {
    return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  if (status === 'scheduled' && !scheduledPublishAt) {
    return sendError(res, 'scheduledPublishAt is required when setting status to scheduled', 400);
  }

  const adminId = (req as any).user?._id?.toString();

  // Validate status transition
  const existing = await Challenge.findById(req.params.id);
  if (!existing) {
    return sendError(res, 'Challenge not found', 404);
  }
  const currentStatus = existing.status || (existing.active ? 'active' : 'disabled');
  const validation = challengeService.validateStatusTransition(currentStatus, status);
  if (!validation.valid) {
    return sendError(res, validation.message!, 400);
  }

  let challenge;

  switch (status) {
    case 'paused':
      challenge = await challengeService.pauseChallenge(req.params.id, reason, adminId);
      break;
    case 'active':
      challenge = await challengeService.resumeChallenge(req.params.id, adminId);
      break;
    case 'disabled':
      challenge = await challengeService.disableChallenge(req.params.id, reason, adminId);
      break;
    default: {
      const updateSet: any = { status, active: status === 'active' };
      if (status === 'scheduled' && scheduledPublishAt) {
        updateSet.scheduledPublishAt = new Date(scheduledPublishAt);
      }
      challenge = await Challenge.findByIdAndUpdate(
        req.params.id,
        {
          $set: updateSet,
          $push: {
            statusHistory: {
              status,
              changedAt: new Date(),
              changedBy: adminId ? new Types.ObjectId(adminId) : undefined,
              reason: reason || `Status changed to ${status} by admin`
            }
          }
        },
        { new: true }
      );
    }
  }

  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  return sendSuccess(res, challenge, `Challenge status changed to ${status}`);
}));

/**
 * POST /api/admin/challenges/:id/clone
 * Clone a challenge with new dates
 */
router.post('/:id/clone', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const overrides = req.body || {};
  const cloned = await challengeService.cloneChallenge(req.params.id, overrides);

  return sendSuccess(res, cloned, 'Challenge cloned successfully', 201);
}));

/**
 * PATCH /api/admin/challenges/:id/visibility
 * Set challenge visibility (play_and_earn | missions | both)
 */
router.patch('/:id/visibility', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const { visibility } = req.body;
  const validVisibilities = ['play_and_earn', 'missions', 'both'];
  if (!visibility || !validVisibilities.includes(visibility)) {
    return sendError(res, `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`, 400);
  }

  const challenge = await Challenge.findByIdAndUpdate(
    req.params.id,
    { $set: { visibility } },
    { new: true }
  );

  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  return sendSuccess(res, challenge, `Challenge visibility set to ${visibility}`);
}));

/**
 * PATCH /api/admin/challenges/:id/priority
 * Set challenge priority (0-100)
 */
router.patch('/:id/priority', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid challenge ID', 400);
  }

  const { priority } = req.body;
  if (typeof priority !== 'number' || priority < 0 || priority > 100) {
    return sendError(res, 'Priority must be a number between 0 and 100', 400);
  }

  const challenge = await Challenge.findByIdAndUpdate(
    req.params.id,
    { $set: { priority } },
    { new: true }
  );

  if (!challenge) {
    return sendError(res, 'Challenge not found', 404);
  }

  return sendSuccess(res, challenge, `Challenge priority set to ${priority}`);
}));

export default router;
