/**
 * Test file for new gamification endpoints
 * Tests the three new endpoints added:
 * 1. GET /api/gamification/challenges/my-progress
 * 2. GET /api/gamification/streaks
 * 3. GET /api/gamification/stats
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  getMyChallengeProgress,
  getGamificationStats
} from '../controllers/gamificationController';
import streakController from '../controllers/streakController';

// Mock services
jest.mock('../services/challengeService');
jest.mock('../services/streakService');
jest.mock('../services/coinService');
jest.mock('../services/leaderboardService');
jest.mock('../models/UserAchievement');
jest.mock('../models/GameSession');

describe('New Gamification Endpoints', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      user: {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        id: '507f1f77bcf86cd799439011'
      } as any
    };

    mockRes = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('GET /api/gamification/challenges/my-progress', () => {
    it('should return user challenge progress with stats', async () => {
      const challengeService = require('../services/challengeService').default;

      const mockProgress = [
        {
          _id: 'progress1',
          user: '507f1f77bcf86cd799439011',
          challenge: {
            _id: 'challenge1',
            active: true,
            rewards: { coins: 100 }
          },
          completed: true,
          rewardsClaimed: true,
          progress: 100
        },
        {
          _id: 'progress2',
          user: '507f1f77bcf86cd799439011',
          challenge: {
            _id: 'challenge2',
            active: true,
            rewards: { coins: 50 }
          },
          completed: false,
          rewardsClaimed: false,
          progress: 50
        },
        {
          _id: 'progress3',
          user: '507f1f77bcf86cd799439011',
          challenge: {
            _id: 'challenge3',
            active: false,
            rewards: { coins: 200 }
          },
          completed: false,
          rewardsClaimed: false,
          progress: 30
        }
      ];

      challengeService.getUserProgress.mockResolvedValue(mockProgress);

      await getMyChallengeProgress(mockReq as Request, mockRes as Response, jest.fn());

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Challenge progress retrieved successfully',
          data: expect.objectContaining({
            challenges: mockProgress,
            stats: expect.objectContaining({
              completed: 1,
              active: 1,
              expired: 1,
              totalCoinsEarned: 100
            })
          })
        })
      );
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await expect(
        getMyChallengeProgress(mockReq as Request, mockRes as Response, jest.fn())
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('GET /api/gamification/streaks', () => {
    it('should return current user login streak', async () => {
      const streakService = require('../services/streakService').default;

      const mockStreak = {
        currentStreak: 7,
        longestStreak: 14,
        totalDays: 50,
        lastActivityDate: new Date('2025-11-03'),
        frozen: false,
        freezeExpiresAt: null,
        streakStartDate: new Date('2025-10-27')
      };

      streakService.getOrCreateStreak.mockResolvedValue(mockStreak);

      await streakController.getCurrentUserStreak(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login streak retrieved successfully',
          data: expect.objectContaining({
            streak: 7,
            type: 'login',
            lastLogin: mockStreak.lastActivityDate,
            longestStreak: 14,
            totalDays: 50,
            frozen: false
          })
        })
      );
    });

    it('should handle authentication error', async () => {
      mockReq.user = undefined;

      await streakController.getCurrentUserStreak(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required'
        })
      );
    });
  });

  describe('GET /api/gamification/stats', () => {
    it('should return comprehensive gamification stats', async () => {
      const coinService = require('../services/coinService').default;
      const streakService = require('../services/streakService').default;
      const challengeService = require('../services/challengeService').default;
      const leaderboardService = require('../services/leaderboardService').default;
      const UserAchievement = require('../models/UserAchievement').UserAchievement;
      const GameSession = require('../models/GameSession').default;

      // Mock all service calls
      coinService.getCoinBalance.mockResolvedValue(5000);

      streakService.getUserStreaks.mockResolvedValue({
        login: { current: 7, longest: 14, totalDays: 50 },
        order: { current: 3, longest: 5, totalDays: 20 },
        review: { current: 2, longest: 4, totalDays: 15 }
      });

      challengeService.getUserStatistics.mockResolvedValue({
        totalChallenges: 10,
        completedChallenges: 5,
        totalCoinsEarned: 2000
      });

      UserAchievement.find = jest.fn().mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(12)
      });

      leaderboardService.getAllUserRanks.mockResolvedValue({
        spending: { rank: 15 },
        reviews: { rank: 8 },
        referrals: { rank: 25 },
        coins: { rank: 10 },
        cashback: { rank: 20 }
      });

      GameSession.aggregate = jest.fn().mockResolvedValue([
        { totalGames: 50, gamesWon: 35 }
      ]);

      await getGamificationStats(mockReq as Request, mockRes as Response, jest.fn());

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Gamification stats retrieved successfully',
          data: expect.objectContaining({
            gamesPlayed: 50,
            gamesWon: 35,
            totalCoins: 5000,
            achievements: 12,
            streak: 7,
            longestStreak: 14,
            challengesCompleted: 5,
            challengesActive: 5,
            rank: 15,
            allRanks: expect.objectContaining({
              spending: 15,
              reviews: 8,
              referrals: 25,
              coins: 10,
              cashback: 20
            })
          })
        })
      );
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await expect(
        getGamificationStats(mockReq as Request, mockRes as Response, jest.fn())
      ).rejects.toThrow('Authentication required');
    });

    it('should handle missing data gracefully', async () => {
      const coinService = require('../services/coinService').default;
      const streakService = require('../services/streakService').default;
      const challengeService = require('../services/challengeService').default;
      const leaderboardService = require('../services/leaderboardService').default;
      const UserAchievement = require('../models/UserAchievement').UserAchievement;
      const GameSession = require('../models/GameSession').default;

      // Mock services returning minimal data
      coinService.getCoinBalance.mockResolvedValue(0);
      streakService.getUserStreaks.mockResolvedValue({
        login: { current: 0, longest: 0, totalDays: 0 }
      });
      challengeService.getUserStatistics.mockResolvedValue({
        totalChallenges: 0,
        completedChallenges: 0,
        totalCoinsEarned: 0
      });
      UserAchievement.find = jest.fn().mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0)
      });
      leaderboardService.getAllUserRanks.mockResolvedValue({});
      GameSession.aggregate = jest.fn().mockResolvedValue([]);

      await getGamificationStats(mockReq as Request, mockRes as Response, jest.fn());

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            gamesPlayed: 0,
            gamesWon: 0,
            totalCoins: 0,
            achievements: 0,
            streak: 0,
            rank: 0
          })
        })
      );
    });
  });
});
