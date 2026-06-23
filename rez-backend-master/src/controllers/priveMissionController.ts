import { Request, Response } from 'express';
import { priveMissionService } from '../services/priveMissionService';
import { logger } from '../config/logger';
import priveAccessService from '../services/priveAccessService';
import { PriveMission } from '../models/PriveMission';
import { UserMission } from '../models/UserMission';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/prive/missions
 * List available missions for user's tier
 */
export const getMissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }
    const tier = accessCheck.effectiveTier || 'none';

    const missions = await priveMissionService.getAvailableMissions(userId, tier);

    res.json({
      success: true,
      data: { missions },
    });
});

/**
 * GET /api/prive/missions/active
 * Get user's active/claimed missions
 */
export const getActiveMissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const missions = await priveMissionService.getActiveMissions(userId);

    res.json({
      success: true,
      data: { missions },
    });
});

/**
 * POST /api/prive/missions/:id/claim
 * Claim a mission
 */
export const claimMission = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mission ID' });
    }

    const userMission = await priveMissionService.claimMission(userId, id);

    res.json({
      success: true,
      data: { userMission },
    });
});

/**
 * POST /api/prive/missions/:id/complete
 * Complete a mission and claim reward
 */
export const completeMission = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mission ID' });
    }

    const result = await priveMissionService.completeMission(userId, id);

    res.json({
      success: true,
      data: { reward: result },
    });
});

/**
 * GET /api/prive/missions/completed
 * Get completed missions
 */
export const getCompletedMissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const missions = await priveMissionService.getCompletedMissions(userId);

    res.json({
      success: true,
      data: { missions },
    });
});
