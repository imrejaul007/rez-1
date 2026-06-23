/**
 * src/controllers/tryGameificationController.ts
 * TRY gamification endpoints: missions, badges, leaderboard, surprise trials
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendInternalError
} from '../utils/response';
import { logger } from '../config/logger';

// Models
import { WeeklyMission } from '../models/WeeklyMission';
import { UserMissionProgress } from '../models/UserMissionProgress';
import { CategoryBadge } from '../models/CategoryBadge';
import { Leaderboard } from '../models/Leaderboard';
import { TrialOffer } from '../models/TrialOffer';

// Services
import gamificationService from '../services/gamificationService';

/**
 * Helper: Get period key for leaderboard lookups
 */
function getPeriodKey(period: string, date: Date): string {
  if (period === 'weekly') {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  } else if (period === 'monthly') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } else {
    return 'alltime';
  }
}

/**
 * GET /api/try/missions
 * Returns: active missions + user's progress for each
 */
export const getUserMissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const now = new Date();

  try {
    // Find active missions
    const missions = await WeeklyMission.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now }
    }).lean();

    if (missions.length === 0) {
      return sendSuccess(res, { missions: [], progress: [] });
    }

    // Get user's progress for each mission
    const progressMap = await UserMissionProgress.find({
      userId,
      missionId: { $in: missions.map(m => m._id) }
    }).lean();

    const progressById: Record<string, any> = {};
    progressMap.forEach(p => {
      progressById[p.missionId.toString()] = p;
    });

    // Enrich missions with progress
    const enrichedMissions = missions.map(mission => ({
      ...mission,
      progress: progressById[(mission._id as any).toString()] || {
        completedTrialIds: [],
        currentCount: 0,
        completed: false,
        completedAt: null,
        rewardCredited: false
      }
    }));

    return sendSuccess(res, { missions: enrichedMissions });
  } catch (error) {
    logger.error('[TryGameController] getUserMissions error', {
      userId: userId.toString(),
      error: (error as Error).message
    });
    return sendInternalError(res, 'Failed to fetch missions');
  }
});

/**
 * GET /api/try/badges
 * Returns: user's category badges, sorted by trialCount desc
 */
export const getUserBadges = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const badges = await CategoryBadge.find({ userId })
      .sort({ trialCount: -1 })
      .lean();

    return sendSuccess(res, { badges });
  } catch (error) {
    logger.error('[TryGameController] getUserBadges error', {
      userId: userId.toString(),
      error: (error as Error).message
    });
    return sendInternalError(res, 'Failed to fetch badges');
  }
});

/**
 * GET /api/try/leaderboard?city=&period=weekly|monthly|alltime
 * Returns: top 50 entries + user's own rank if not in top 50
 */
export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { city, period } = req.query;

  if (!city || !period) {
    return sendBadRequest(res, 'City and period are required');
  }

  if (!['weekly', 'monthly', 'alltime'].includes(period as string)) {
    return sendBadRequest(res, 'Invalid period. Must be weekly, monthly, or alltime');
  }

  try {
    const now = new Date();
    const periodKey = getPeriodKey(period as string, now);

    // Get top 50 entries
    const topEntries = await Leaderboard.find({
      city,
      period,
      periodKey
    })
      .sort({ score: -1 })
      .limit(50)
      .lean();

    // Get user's entry
    const userEntry = await Leaderboard.findOne({
      userId,
      city,
      period,
      periodKey
    }).lean();

    const leaderboard = {
      top50: topEntries,
      userRank: userEntry || null,
      period,
      city
    };

    return sendSuccess(res, leaderboard);
  } catch (error) {
    logger.error('[TryGameController] getLeaderboard error', {
      userId: userId.toString(),
      error: (error as Error).message
    });
    return sendInternalError(res, 'Failed to fetch leaderboard');
  }
});

/**
 * GET /api/try/surprise
 * Returns: this week's surprise trial (category + distance shown, merchant name hidden until revealed)
 */
export const getSurpriseTrial = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const surprise = await gamificationService.getSurpriseTrial(userId as any);

    if (!surprise) {
      return sendNotFound(res, 'No surprise trial assigned for this week');
    }

    // If not revealed, return minimal info (hide merchant details)
    if (!surprise.revealed) {
      const trial = await TrialOffer.findById(surprise.trialId)
        .select('category')
        .lean();

      return sendSuccess(
        res,
        {
          trialId: surprise.trialId,
          weekKey: surprise.weekKey,
          revealed: false,
          category: trial?.category || 'unknown',
          hint: 'Tap to reveal your mystery trial!'
        }
      );
    }

    // If revealed, return full trial info with merchant details
    const trial = await TrialOffer.findById(surprise.trialId)
      .populate('merchantId', 'businessName businessAddress logo')
      .lean();

    return sendSuccess(res, { ...surprise, trial });
  } catch (error) {
    logger.error('[TryGameController] getSurpriseTrial error', {
      userId: userId.toString(),
      error: (error as Error).message
    });
    return sendInternalError(res, 'Failed to fetch surprise trial');
  }
});

/**
 * POST /api/try/surprise/reveal
 * Reveals the merchant name and full details
 * Marks SurpriseTrial.revealed = true
 */
export const revealSurpriseTrial = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const trial = await gamificationService.revealSurpriseTrial(userId as any);

    if (!trial) {
      return sendNotFound(res, 'Surprise trial not found');
    }

    // Populate merchant details
    const enrichedTrial = await TrialOffer.findById(trial._id)
      .populate('merchantId', 'businessName businessAddress logo')
      .lean();

    return sendSuccess(res, enrichedTrial);
  } catch (error) {
    logger.error('[TryGameController] revealSurpriseTrial error', {
      userId: userId.toString(),
      error: (error as Error).message
    });

    if ((error as Error).message.includes('not found')) {
      return sendNotFound(res, (error as Error).message);
    }

    return sendInternalError(res, 'Failed to reveal surprise trial');
  }
});
