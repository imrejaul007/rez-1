import { Request, Response } from 'express';
import challengeService from '../services/challengeService';
import { asyncHandler } from '../utils/asyncHandler';

class ChallengeController {
  // GET /api/challenges/daily
  getDailyChallenges = asyncHandler(async (req: Request, res: Response) => {
    try {
      const challenges = await challengeService.getDailyChallenges();

      res.json({
        success: true,
        data: challenges
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/challenges/active
  getActiveChallenges = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { type } = req.query;

      const challenges = await challengeService.getActiveChallenges(
        type as string | undefined
      );

      res.json({
        success: true,
        data: challenges
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/challenges/my-progress
  getMyProgress = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { includeCompleted } = req.query;

      const progress = await challengeService.getUserProgress(
        userId,
        includeCompleted === 'true'
      );

      res.json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/challenges/:id/join
  joinChallenge = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const progress = await challengeService.joinChallenge(userId, id);

      res.json({
        success: true,
        data: progress,
        message: 'Successfully joined challenge'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/challenges/:id/claim
  claimRewards = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const result = await challengeService.claimRewards(userId, id);

      res.json({
        success: true,
        data: result,
        message: 'Rewards claimed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/challenges/:id/leaderboard
  getChallengeLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await challengeService.getChallengeLeaderboard(id, limit);

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/challenges/statistics
  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const stats = await challengeService.getUserStatistics(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/challenges/generate-daily (Admin only)
  generateDailyChallenges = asyncHandler(async (req: Request, res: Response) => {
    try {
      const challenges = await challengeService.generateDailyChallenges();

      res.json({
        success: true,
        data: challenges,
        message: 'Daily challenges generated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
}

export default new ChallengeController();
