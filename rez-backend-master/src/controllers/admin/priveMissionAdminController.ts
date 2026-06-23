import { Request, Response } from 'express';
import { PriveMission } from '../../models/PriveMission';
import { UserMission } from '../../models/UserMission';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import mongoose from 'mongoose';

/**
 * GET /api/admin/prive/missions
 */
export const getAdminMissions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const { status, pillar, tier } = req.query;

  const query: any = { isDeleted: false };
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;
  if (pillar) query.targetPillar = pillar;
  if (tier) query.tierRequired = tier;

  const [missions, total] = await Promise.all([
    PriveMission.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PriveMission.countDocuments(query),
  ]);

  sendSuccess(res, {
    missions,
    pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
  });
});

/**
 * POST /api/admin/prive/missions
 */
export const createAdminMission = asyncHandler(async (req: Request, res: Response) => {
  const {
    title, description, shortDescription, icon, targetPillar, actionType,
    targetCount, reward, startDate, endDate, tierRequired, maxParticipants,
    estimatedPillarGain, pointsPerEffort, priority,
  } = req.body;

  if (!title || !targetPillar || !actionType || !targetCount || !startDate || !endDate) {
    throw new AppError('Missing required fields: title, targetPillar, actionType, targetCount, startDate, endDate', 400);
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError('startDate must be before endDate', 400);
  }

  // Validate numeric ranges
  const parsedTargetCount = Number(targetCount);
  if (!Number.isInteger(parsedTargetCount) || parsedTargetCount < 1 || parsedTargetCount > 10000) {
    throw new AppError('targetCount must be an integer between 1 and 10000', 400);
  }

  const rewardCoins = reward?.coins ?? 0;
  if (typeof rewardCoins !== 'number' || rewardCoins < 0 || rewardCoins > 999999) {
    throw new AppError('reward.coins must be between 0 and 999999', 400);
  }

  const parsedMaxParticipants = Number(maxParticipants) || 0;
  if (parsedMaxParticipants < 0 || parsedMaxParticipants > 100000) {
    throw new AppError('maxParticipants must be between 0 and 100000', 400);
  }

  const parsedPillarGain = Number(estimatedPillarGain) || 0;
  if (parsedPillarGain < 0 || parsedPillarGain > 100) {
    throw new AppError('estimatedPillarGain must be between 0 and 100', 400);
  }

  const validTiers = ['none', 'entry', 'signature', 'elite'];
  if (tierRequired && !validTiers.includes(tierRequired)) {
    throw new AppError(`tierRequired must be one of: ${validTiers.join(', ')}`, 400);
  }

  const mission = await PriveMission.create({
    title, description, shortDescription, icon, targetPillar, actionType,
    targetCount: parsedTargetCount,
    reward: reward || { coins: 0, coinType: 'rez', pillarBoost: 0, displayText: '' },
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    tierRequired: tierRequired || 'none',
    maxParticipants: parsedMaxParticipants,
    estimatedPillarGain: parsedPillarGain,
    pointsPerEffort: pointsPerEffort || 1,
    priority: priority || 0,
    createdBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
  });

  sendSuccess(res, { mission }, 'Mission created');
});

/**
 * PUT /api/admin/prive/missions/:id
 */
export const updateAdminMission = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid mission ID', 400);
  }

  const mission = await PriveMission.findById(id).lean();
  if (!mission || mission.isDeleted) {
    throw new AppError('Mission not found', 404);
  }

  const allowedFields = [
    'title', 'description', 'shortDescription', 'icon', 'targetPillar', 'actionType',
    'targetCount', 'reward', 'startDate', 'endDate', 'tierRequired', 'maxParticipants',
    'estimatedPillarGain', 'pointsPerEffort', 'priority', 'isActive',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (mission as any)[field] = req.body[field];
    }
  }

  await mission.save();
  sendSuccess(res, { mission }, 'Mission updated');
});

/**
 * DELETE /api/admin/prive/missions/:id (soft delete)
 */
export const deleteAdminMission = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid mission ID', 400);
  }

  const mission = await PriveMission.findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true });
  if (!mission) {
    throw new AppError('Mission not found', 404);
  }

  sendSuccess(res, { mission }, 'Mission deleted');
});

/**
 * GET /api/admin/prive/missions/:id/analytics
 */
export const getMissionAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid mission ID', 400);
  }

  const missionId = new mongoose.Types.ObjectId(id);
  const mission = await PriveMission.findById(missionId).lean();
  if (!mission) {
    throw new AppError('Mission not found', 404);
  }

  const [totalClaims, completed, expired, abandoned] = await Promise.all([
    UserMission.countDocuments({ missionId }),
    UserMission.countDocuments({ missionId, status: 'completed' }),
    UserMission.countDocuments({ missionId, status: 'expired' }),
    UserMission.countDocuments({ missionId, status: 'abandoned' }),
  ]);

  const claimRate = mission.currentParticipants > 0 ? (totalClaims / mission.currentParticipants) * 100 : 0;
  const completionRate = totalClaims > 0 ? (completed / totalClaims) * 100 : 0;

  // Average completion time
  const completedMissions = await UserMission.find({ missionId, status: 'completed', completedAt: { $exists: true } })
    .select('claimedAt completedAt')
    .lean();

  let avgCompletionDays = 0;
  if (completedMissions.length > 0) {
    const totalDays = completedMissions.reduce((sum, m) => {
      const diff = (new Date(m.completedAt!).getTime() - new Date(m.claimedAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + diff;
    }, 0);
    avgCompletionDays = Math.round((totalDays / completedMissions.length) * 10) / 10;
  }

  sendSuccess(res, {
    mission: { _id: mission._id, title: mission.title },
    analytics: {
      totalClaims,
      completed,
      expired,
      abandoned,
      active: totalClaims - completed - expired - abandoned,
      claimRate: Math.round(claimRate * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      avgCompletionDays,
    },
  });
});
