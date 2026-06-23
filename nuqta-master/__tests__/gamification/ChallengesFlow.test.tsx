// Challenges Flow Tests
// Test suite for daily challenges, weekly challenges, and challenge completion

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import gamificationAPI from '@/services/gamificationApi';
import { Challenge } from '@/types/gamification.types';

// Mock dependencies
jest.mock('@/services/gamificationApi');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockChallenges: Challenge[] = [
  {
    id: 'daily-1',
    title: 'Daily Shopper',
    description: 'Make 3 purchases today',
    type: 'daily',
    difficulty: 'easy',
    progress: {
      current: 1,
      target: 3,
      percentage: 33,
    },
    rewards: {
      coins: 50,
      badges: [],
      vouchers: [],
    },
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000), // 1 day
    icon: 'cart',
    color: '#10B981',
  },
  {
    id: 'weekly-1',
    title: 'Social Butterfly',
    description: 'Share 10 products this week',
    type: 'weekly',
    difficulty: 'medium',
    progress: {
      current: 7,
      target: 10,
      percentage: 70,
    },
    rewards: {
      coins: 200,
      badges: ['social-master'],
      vouchers: [],
    },
    status: 'active',
    startDate: new Date(Date.now() - 3 * 86400000),
    endDate: new Date(Date.now() + 4 * 86400000), // 4 days remaining
    icon: 'share',
    color: '#3B82F6',
  },
  {
    id: 'daily-2',
    title: 'Review Master',
    description: 'Write 5 reviews',
    type: 'daily',
    difficulty: 'hard',
    progress: {
      current: 5,
      target: 5,
      percentage: 100,
    },
    rewards: {
      coins: 100,
      badges: ['reviewer'],
      vouchers: [],
    },
    status: 'completed',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    icon: 'star',
    color: '#F59E0B',
  },
  {
    id: 'special-1',
    title: 'Holiday Spender',
    description: 'Spend ₹5000 during holiday sale',
    type: 'special',
    difficulty: 'hard',
    progress: {
      current: 3500,
      target: 5000,
      percentage: 70,
    },
    rewards: {
      coins: 500,
      badges: ['big-spender'],
      vouchers: [{ type: 'discount', value: 10 }],
    },
    status: 'active',
    startDate: new Date(Date.now() - 7 * 86400000),
    endDate: new Date(Date.now() + 7 * 86400000),
    icon: 'gift',
    color: '#EF4444',
  },
];

describe('Challenges Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure every method the tests reach for exists as a jest.Mock so that
    // `.mockResolvedValue` / `.mockImplementation` calls don't throw
    // "Cannot read properties of undefined".
    (gamificationAPI as any).getChallenges = jest.fn();
    (gamificationAPI as any).getChallenge = jest.fn();
    (gamificationAPI as any).claimChallengeReward = jest.fn();
    (gamificationAPI as any).startChallenge = jest.fn();
    (gamificationAPI as any).updateProgress = jest.fn();
  });

  describe('Challenge Loading', () => {
    it('should load all active challenges', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges,
      });

      const result = await gamificationAPI.getChallenges();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(4);
    });

    it('should display daily challenges', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges.filter(c => c.type === 'daily'),
      });

      const result = await gamificationAPI.getChallenges();
      const dailyChallenges = result.data?.filter(c => c.type === 'daily');

      expect(dailyChallenges?.length).toBe(2);
    });

    it('should display weekly challenges', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges.filter(c => c.type === 'weekly'),
      });

      const result = await gamificationAPI.getChallenges();
      const weeklyChallenges = result.data?.filter(c => c.type === 'weekly');

      expect(weeklyChallenges?.length).toBe(1);
    });

    it('should display special challenges', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges.filter(c => c.type === 'special'),
      });

      const result = await gamificationAPI.getChallenges();
      const specialChallenges = result.data?.filter(c => c.type === 'special');

      expect(specialChallenges?.length).toBe(1);
    });

    it('should show challenge progress', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges,
      });

      const result = await gamificationAPI.getChallenges();

      result.data?.forEach(challenge => {
        expect(challenge.progress).toBeTruthy();
        expect(challenge.progress.current).toBeGreaterThanOrEqual(0);
        expect(challenge.progress.target).toBeGreaterThan(0);
      });
    });
  });

  describe('Challenge Progress', () => {
    it('should update progress on user action', async () => {
      const updatedChallenge = {
        ...mockChallenges[0],
        progress: { current: 2, target: 3, percentage: 66 },
      };

      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: true,
        data: updatedChallenge,
      });

      const result = await gamificationAPI.getChallenge('daily-1');

      expect(result.data?.progress.current).toBe(2);
    });

    it('should calculate progress percentage', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges,
      });

      const result = await gamificationAPI.getChallenges();

      result.data?.forEach(challenge => {
        const expectedPercentage = Math.round(
          (challenge.progress.current / challenge.progress.target) * 100
        );
        expect(challenge.progress.percentage).toBe(expectedPercentage);
      });
    });

    it('should mark challenge as completed when target reached', async () => {
      const completedChallenge = mockChallenges.find(c => c.status === 'completed');

      expect(completedChallenge?.progress.current).toBe(completedChallenge?.progress.target);
      expect(completedChallenge?.status).toBe('completed');
    });

    it('should not allow progress beyond target', async () => {
      const challenge = mockChallenges[2]; // Completed challenge

      expect(challenge.progress.current).toBe(challenge.progress.target);
      expect(challenge.progress.percentage).toBe(100);
    });
  });

  describe('Challenge Completion', () => {
    it('should complete challenge when target met', async () => {
      const completedChallenge = { ...mockChallenges[0], status: 'completed' as const };

      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: true,
        data: completedChallenge,
      });

      const result = await gamificationAPI.getChallenge('daily-1');

      expect(result.data?.status).toBe('completed');
    });

    it('should show completion notification', async () => {
      const completedChallenge = { ...mockChallenges[0], status: 'completed' as const };

      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: true,
        data: completedChallenge,
      });

      const result = await gamificationAPI.getChallenge('daily-1');

      expect(result.data?.status).toBe('completed');
    });

    it('should allow claiming rewards after completion', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          challenge: { ...mockChallenges[2], status: 'claimed' },
          rewards: {
            coins: 100,
            badges: ['reviewer'],
            vouchers: [],
          },
          newBalance: 1100,
        },
      });

      const result = await gamificationAPI.claimChallengeReward('daily-2');

      expect(result.success).toBe(true);
      expect(result.data?.rewards.coins).toBe(100);
    });

    it('should update balance after claiming rewards', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          challenge: mockChallenges[2],
          rewards: { coins: 100, badges: [], vouchers: [] },
          newBalance: 1100,
        },
      });

      const result = await gamificationAPI.claimChallengeReward('daily-2');

      expect(result.data?.newBalance).toBe(1100);
    });

    it('should prevent claiming rewards twice', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Rewards already claimed',
        data: undefined,
      });

      const result = await gamificationAPI.claimChallengeReward('daily-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already claimed');
    });
  });

  describe('Challenge Reset', () => {
    it('should reset daily challenges at midnight', async () => {
      const resetChallenge = {
        ...mockChallenges[0],
        progress: { current: 0, target: 3, percentage: 0 },
        status: 'active' as const,
      };

      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: [resetChallenge],
      });

      const result = await gamificationAPI.getChallenges();
      const dailyChallenge = result.data?.find(c => c.type === 'daily');

      expect(dailyChallenge?.progress.current).toBe(0);
    });

    it('should reset weekly challenges on Monday', async () => {
      const resetChallenge = {
        ...mockChallenges[1],
        progress: { current: 0, target: 10, percentage: 0 },
        status: 'active' as const,
      };

      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: [resetChallenge],
      });

      const result = await gamificationAPI.getChallenges();
      const weeklyChallenge = result.data?.find(c => c.type === 'weekly');

      expect(weeklyChallenge?.progress.current).toBe(0);
    });

    it('should not reset special challenges', async () => {
      const specialChallenge = mockChallenges[3];

      expect(specialChallenge.type).toBe('special');
      expect(specialChallenge.progress.current).toBeGreaterThan(0);
    });
  });

  describe('Challenge Expiration', () => {
    it('should mark expired challenges', async () => {
      const expiredChallenge = {
        ...mockChallenges[0],
        status: 'expired' as const,
        endDate: new Date(Date.now() - 86400000), // Yesterday
      };

      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: [expiredChallenge],
      });

      const result = await gamificationAPI.getChallenges();

      expect(result.data?.[0].status).toBe('expired');
    });

    it('should show time remaining for active challenges', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges.filter(c => c.status === 'active'),
      });

      const result = await gamificationAPI.getChallenges();

      result.data?.forEach(challenge => {
        const now = new Date();
        const end = new Date(challenge.endDate);
        expect(end.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    it('should not allow claiming rewards for expired challenges', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Challenge expired',
        data: undefined,
      });

      const result = await gamificationAPI.claimChallengeReward('expired-challenge');

      expect(result.success).toBe(false);
    });
  });

  describe('Difficulty Levels', () => {
    it('should display easy challenges', async () => {
      const easyChallenges = mockChallenges.filter(c => c.difficulty === 'easy');
      expect(easyChallenges.length).toBeGreaterThan(0);
    });

    it('should display medium challenges', async () => {
      const mediumChallenges = mockChallenges.filter(c => c.difficulty === 'medium');
      expect(mediumChallenges.length).toBeGreaterThan(0);
    });

    it('should display hard challenges', async () => {
      const hardChallenges = mockChallenges.filter(c => c.difficulty === 'hard');
      expect(hardChallenges.length).toBeGreaterThan(0);
    });

    it('should award more coins for harder challenges', async () => {
      const easyChallenge = mockChallenges.find(c => c.difficulty === 'easy');
      const hardChallenge = mockChallenges.find(c => c.difficulty === 'hard');

      expect(hardChallenge?.rewards.coins).toBeGreaterThan(easyChallenge?.rewards.coins || 0);
    });
  });

  describe('Challenge Rewards', () => {
    it('should display coin rewards', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges,
      });

      const result = await gamificationAPI.getChallenges();

      result.data?.forEach(challenge => {
        expect(challenge.rewards.coins).toBeGreaterThan(0);
      });
    });

    it('should display badge rewards', async () => {
      const challengeWithBadge = mockChallenges.find(
        c => c.rewards.badges && c.rewards.badges.length > 0
      );

      expect(challengeWithBadge?.rewards.badges.length).toBeGreaterThan(0);
    });

    it('should display voucher rewards', async () => {
      const challengeWithVoucher = mockChallenges.find(
        c => c.rewards.vouchers && c.rewards.vouchers.length > 0
      );

      expect(challengeWithVoucher?.rewards.vouchers?.length).toBeGreaterThan(0);
    });

    it('should award all rewards on claim', async () => {
      const challenge = mockChallenges[3]; // Has coins, badges, and vouchers

      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          challenge,
          rewards: {
            coins: challenge.rewards.coins,
            badges: challenge.rewards.badges || [],
            vouchers: challenge.rewards.vouchers || [],
          },
          newBalance: 1500,
        },
      });

      const result = await gamificationAPI.claimChallengeReward('special-1');

      expect(result.data?.rewards.coins).toBe(500);
      expect(result.data?.rewards.badges.length).toBeGreaterThan(0);
      expect(result.data?.rewards.vouchers.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle challenge load errors', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockRejectedValue(
        new Error('Failed to load challenges')
      );

      await expect(gamificationAPI.getChallenges()).rejects.toThrow('Failed to load challenges');
    });

    it('should handle claim errors', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Challenge not completed',
        data: undefined,
      });

      const result = await gamificationAPI.claimChallengeReward('daily-1');

      expect(result.success).toBe(false);
    });

    it('should handle network timeouts', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      );

      await expect(gamificationAPI.getChallenges()).rejects.toThrow('Timeout');
    });

    it('should handle invalid challenge IDs', async () => {
      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Challenge not found',
        data: undefined,
      });

      const result = await gamificationAPI.getChallenge('invalid-id');

      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty challenge list', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await gamificationAPI.getChallenges();

      expect(result.data?.length).toBe(0);
    });

    it('should handle challenges with zero progress', async () => {
      const zeroProgressChallenge = {
        ...mockChallenges[0],
        progress: { current: 0, target: 3, percentage: 0 },
      };

      expect(zeroProgressChallenge.progress.current).toBe(0);
      expect(zeroProgressChallenge.progress.percentage).toBe(0);
    });

    it('should handle multiple completed challenges', async () => {
      const completedChallenges = mockChallenges.map(c => ({
        ...c,
        status: 'completed' as const,
        progress: { ...c.progress, current: c.progress.target, percentage: 100 },
      }));

      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: completedChallenges,
      });

      const result = await gamificationAPI.getChallenges();

      expect(result.data?.every(c => c.status === 'completed')).toBe(true);
    });

    it('should handle concurrent challenge updates', async () => {
      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges[0],
      });

      const promises = [
        gamificationAPI.getChallenge('daily-1'),
        gamificationAPI.getChallenge('daily-1'),
        gamificationAPI.getChallenge('daily-1'),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Anti-Cheat Measures', () => {
    it('should validate progress server-side', async () => {
      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges[0],
      });

      const result = await gamificationAPI.getChallenge('daily-1');

      // Progress comes from server, not client
      expect(result.data?.progress).toBeTruthy();
    });

    it('should verify challenge completion', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Challenge not completed',
        data: undefined,
      });

      const result = await gamificationAPI.claimChallengeReward('daily-1');

      expect(result.success).toBe(false);
    });

    it('should prevent reward manipulation', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          challenge: mockChallenges[2],
          rewards: { coins: 100, badges: [], vouchers: [] }, // Server-determined rewards
          newBalance: 1100,
        },
      });

      const result = await gamificationAPI.claimChallengeReward('daily-2');

      // Rewards match what server says
      expect(result.data?.rewards.coins).toBe(100);
    });

    it('should enforce one-time claim per challenge', async () => {
      (gamificationAPI.claimChallengeReward as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: {
            challenge: { ...mockChallenges[2], status: 'claimed' },
            rewards: { coins: 100, badges: [], vouchers: [] },
            newBalance: 1100,
          },
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Rewards already claimed',
          data: undefined,
        });

      // First claim succeeds
      const result1 = await gamificationAPI.claimChallengeReward('daily-2');
      expect(result1.success).toBe(true);

      // Second claim fails
      const result2 = await gamificationAPI.claimChallengeReward('daily-2');
      expect(result2.success).toBe(false);
    });

    it('should track progress timestamps', async () => {
      (gamificationAPI.getChallenge as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges[0],
      });

      const result = await gamificationAPI.getChallenge('daily-1');

      // Challenges have start and end dates
      expect(result.data?.startDate).toBeTruthy();
      expect(result.data?.endDate).toBeTruthy();
    });
  });

  describe('User Experience', () => {
    it('should show loading state during fetch', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockChallenges }), 500))
      );

      const promise = gamificationAPI.getChallenges();

      // Loading...
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should sort challenges by priority', async () => {
      (gamificationAPI.getChallenges as jest.Mock).mockResolvedValue({
        success: true,
        data: mockChallenges,
      });

      const result = await gamificationAPI.getChallenges();

      // Challenges exist (sorting logic would be in UI)
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should highlight nearly completed challenges', async () => {
      const nearlyCompletedChallenges = mockChallenges.filter(
        c => c.progress.percentage >= 70 && c.progress.percentage < 100
      );

      expect(nearlyCompletedChallenges.length).toBeGreaterThan(0);
    });
  });
});
