import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import EventRewardConfig from '../../models/EventRewardConfig';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/event-rewards
 * @desc    List all reward configs (global + per-event)
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.eventId) {
    filter.eventId = new Types.ObjectId(req.query.eventId as string);
  }
  if (req.query.global === 'true') {
    filter.eventId = null;
  }
  if (req.query.active === 'true') {
    filter.isActive = true;
  }

  const configs = await EventRewardConfig.find(filter)
    .populate('eventId', 'title')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: { configs } });
}));

/**
 * @route   GET /api/admin/event-rewards/global
 * @desc    Get the global default reward config
 * @access  Admin
 */
router.get('/global', asyncHandler(async (req: Request, res: Response) => {
  const config = await (EventRewardConfig as any).getGlobalDefault();
  res.json({ success: true, data: { config } });
}));

/**
 * @route   GET /api/admin/event-rewards/:id
 * @desc    Get a specific reward config
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid config ID' });
  }

  const config = await EventRewardConfig.findById(req.params.id)
    .populate('eventId', 'title')
    .populate('createdBy', 'firstName lastName');

  if (!config) {
    return res.status(404).json({ success: false, message: 'Reward config not found' });
  }

  res.json({ success: true, data: { config } });
}));

/**
 * @route   POST /api/admin/event-rewards
 * @desc    Create reward config (global or per-event)
 * @access  Admin
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { eventId, name, rewards, isActive, validFrom, validUntil } = req.body;

  if (!name || !rewards || !Array.isArray(rewards) || rewards.length === 0) {
    return res.status(400).json({ success: false, message: 'name and rewards[] are required' });
  }

  // Validate reward actions
  const validActions = ['entry_reward', 'purchase_reward', 'sharing_reward', 'voting_reward', 'participation_reward', 'checkin_reward', 'review_reward'];
  for (const reward of rewards) {
    if (!validActions.includes(reward.action)) {
      return res.status(400).json({ success: false, message: `Invalid action: ${reward.action}` });
    }
    if (typeof reward.coins !== 'number' || reward.coins < 0) {
      return res.status(400).json({ success: false, message: `Invalid coins for ${reward.action}` });
    }
  }

  // If global (no eventId), check there's only one active global config
  if (!eventId) {
    const existingGlobal = await EventRewardConfig.findOne({ eventId: null, isActive: true });
    if (existingGlobal && isActive !== false) {
      return res.status(400).json({
        success: false,
        message: 'An active global reward config already exists. Deactivate it first or update it.',
      });
    }
  }

  const config = await EventRewardConfig.create({
    eventId: eventId || null,
    name,
    rewards,
    isActive: isActive !== false,
    validFrom: validFrom ? new Date(validFrom) : undefined,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    createdBy: (req as any).user._id || (req as any).user.id,
  });

  res.status(201).json({
    success: true,
    data: { config },
    message: 'Reward config created successfully',
  });
}));

/**
 * @route   PUT /api/admin/event-rewards/:id
 * @desc    Update reward config
 * @access  Admin
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid config ID' });
  }

  const config = await EventRewardConfig.findById(req.params.id);
  if (!config) {
    return res.status(404).json({ success: false, message: 'Reward config not found' });
  }

  const allowedFields = ['name', 'rewards', 'isActive', 'validFrom', 'validUntil'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (config as any)[field] = req.body[field];
    }
  }

  await config.save();

  res.json({
    success: true,
    data: { config },
    message: 'Reward config updated successfully',
  });
}));

/**
 * @route   DELETE /api/admin/event-rewards/:id
 * @desc    Delete reward config
 * @access  Admin
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid config ID' });
  }

  const config = await EventRewardConfig.findByIdAndDelete(req.params.id);
  if (!config) {
    return res.status(404).json({ success: false, message: 'Reward config not found' });
  }

  res.json({ success: true, message: 'Reward config deleted successfully' });
}));

export default router;
