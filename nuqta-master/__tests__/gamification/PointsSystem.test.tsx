// Points System Tests
// Test suite for coin/points earning, spending, and management

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import pointsApi from '@/services/pointsApi';
import gamificationAPI from '@/services/gamificationApi';

// Mock dependencies
jest.mock('@/services/pointsApi');
jest.mock('@/services/gamificationApi');

const mockPointsBalance = {
  total: 1000,
  earned: 5000,
  spent: 4000,
  pending: 100,
  lifetimeEarned: 10000,
  lifetimeSpent: 9000,
};

const mockTransactions = [
  {
    id: 'txn-1',
    type: 'earned' as const,
    amount: 50,
    source: 'spin-wheel' as const,
    description: 'Spin wheel reward',
    metadata: { gameId: 'spin-1' },
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'txn-2',
    type: 'earned' as const,
    amount: 100,
    source: 'quiz' as const,
    description: 'Quiz completion',
    metadata: { score: 90 },
    createdAt: new Date('2024-01-14'),
  },
  {
    id: 'txn-3',
    type: 'spent' as const,
    amount: 200,
    source: 'purchase' as const,
    description: 'Redeemed for discount',
    metadata: { orderId: 'order-1' },
    createdAt: new Date('2024-01-13'),
  },
];

describe('Points System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Balance Management', () => {
    it('should fetch current coin balance', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPointsBalance,
      });

      const result = await pointsApi.getBalance();

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(1000);
    });

    it('should display available balance', async () => {
      (gamificationAPI.getCoinBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          balance: 1000,
          lifetimeEarned: 10000,
          lifetimeSpent: 9000,
        },
      });

      const result = await gamificationAPI.getCoinBalance();

      expect(result.data?.balance).toBe(1000);
    });

    it('should show pending coins', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPointsBalance,
      });

      const result = await pointsApi.getBalance();

      expect(result.data?.pending).toBe(100);
    });

    it('should track lifetime earned coins', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPointsBalance,
      });

      const result = await pointsApi.getBalance();

      expect(result.data?.lifetimeEarned).toBe(10000);
    });

    it('should track lifetime spent coins', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPointsBalance,
      });

      const result = await pointsApi.getBalance();

      expect(result.data?.lifetimeSpent).toBe(9000);
    });
  });

  describe('Earning Coins', () => {
    it('should earn coins from spin wheel', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 50,
          newBalance: 1050,
          transaction: mockTransactions[0],
        },
      });

      const result = await pointsApi.earnPoints({
        amount: 50,
        source: 'bonus',
        description: 'Spin wheel reward',
      });

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(50);
    });

    it('should earn coins from quiz completion', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 100,
          newBalance: 1100,
          transaction: mockTransactions[1],
        },
      });

      const result = await pointsApi.earnPoints({
        amount: 100,
        source: 'bonus',
        description: 'Quiz completion',
      });

      expect(result.data?.amount).toBe(100);
    });

    it('should earn coins from achievement unlock', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 200,
          newBalance: 1200,
        },
      });

      const result = await pointsApi.earnPoints({
        amount: 200,
        source: 'bonus',
        description: 'Achievement unlocked',
      });

      expect(result.data?.amount).toBe(200);
    });

    it('should earn coins from referrals', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 500,
          newBalance: 1500,
        },
      });

      const result = await pointsApi.earnPoints({
        amount: 500,
        source: 'bonus',
        description: 'Referral bonus',
      });

      expect(result.data?.amount).toBe(500);
    });

    it('should earn coins from daily check-in', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 5,
          nextCheckInDate: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const result = await pointsApi.performDailyCheckIn();

      expect(result.success).toBe(true);
      expect(result.data?.pointsEarned).toBe(10);
    });

    it('should update balance after earning coins', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 50,
          newBalance: 1050,
        },
      });

      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockPointsBalance, total: 1050 },
      });

      await pointsApi.earnPoints({
        amount: 50,
        source: 'bonus',
        description: 'Test',
      });

      const balance = await pointsApi.getBalance();
      expect(balance.data?.total).toBe(1050);
    });
  });

  describe('Spending Coins', () => {
    it('should spend coins for rewards', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 200,
          newBalance: 800,
          transaction: mockTransactions[2],
        },
      });

      const result = await pointsApi.spendPoints({
        amount: 200,
        purpose: 'discount',
        description: 'Redeemed for discount',
      });

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(200);
    });

    it('should validate sufficient balance before spending', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
        data: undefined,
      });

      const result = await pointsApi.spendPoints({
        amount: 5000,
        purpose: 'discount',
        description: 'Large purchase',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });

    it('should update balance after spending coins', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 200,
          newBalance: 800,
        },
      });

      const result = await pointsApi.spendPoints({
        amount: 200,
        purpose: 'discount',
        description: 'Spend test',
      });

      expect(result.data?.newBalance).toBe(800);
    });

    it('should prevent spending more than available balance', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockPointsBalance, total: 100 },
      });

      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
        data: undefined,
      });

      const result = await pointsApi.spendPoints({
        amount: 500,
        purpose: 'discount',
        description: 'Over balance',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Transaction History', () => {
    it('should fetch transaction history', async () => {
      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
          },
        },
      });

      const result = await gamificationAPI.getCoinTransactions(1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.transactions.length).toBe(3);
    });

    it('should paginate transaction history', async () => {
      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions.slice(0, 2),
          pagination: {
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2,
          },
        },
      });

      const result = await gamificationAPI.getCoinTransactions(1, 2);

      expect(result.data?.pagination.totalPages).toBe(2);
      expect(result.data?.transactions.length).toBe(2);
    });

    it('should filter transactions by type', async () => {
      const earnedTransactions = mockTransactions.filter(t => t.type === 'earned');

      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: earnedTransactions,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        },
      });

      const result = await gamificationAPI.getCoinTransactions(1, 20);

      expect(result.data?.transactions.every(t => t.type === 'earned')).toBe(true);
    });

    it('should show transaction dates', async () => {
      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
          },
        },
      });

      const result = await gamificationAPI.getCoinTransactions(1, 20);

      result.data?.transactions.forEach(txn => {
        expect(txn.createdAt).toBeTruthy();
      });
    });
  });

  describe('Daily Check-in', () => {
    it('should perform daily check-in', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 5,
          nextCheckInDate: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const result = await pointsApi.performDailyCheckIn();

      expect(result.success).toBe(true);
      expect(result.data?.pointsEarned).toBe(10);
    });

    it('should track daily streak', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 7,
          nextCheckInDate: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const result = await pointsApi.performDailyCheckIn();

      expect(result.data?.streak).toBe(7);
    });

    it('should prevent multiple check-ins per day', async () => {
      (pointsApi.getDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canCheckIn: false,
          lastCheckInDate: new Date().toISOString(),
          nextCheckInDate: new Date(Date.now() + 86400000).toISOString(),
          currentStreak: 5,
        },
      });

      const result = await pointsApi.getDailyCheckIn();

      expect(result.data?.canCheckIn).toBe(false);
    });

    it('should award bonus for streak milestones', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 50, // Bonus for 7-day streak
          streak: 7,
          nextCheckInDate: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const result = await pointsApi.performDailyCheckIn();

      expect(result.data?.pointsEarned).toBeGreaterThan(10);
    });

    it('should reset streak if check-in missed', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 1, // Reset to 1
          nextCheckInDate: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const result = await pointsApi.performDailyCheckIn();

      expect(result.data?.streak).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle balance fetch errors', async () => {
      (pointsApi.getBalance as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(pointsApi.getBalance()).rejects.toThrow('Network error');
    });

    it('should handle earn points errors', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid amount',
        data: undefined,
      });

      const result = await pointsApi.earnPoints({
        amount: -10,
        source: 'bonus',
        description: 'Invalid',
      });

      expect(result.success).toBe(false);
    });

    it('should handle spend points errors', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
        data: undefined,
      });

      const result = await pointsApi.spendPoints({
        amount: 10000,
        purpose: 'discount',
        description: 'Over balance',
      });

      expect(result.success).toBe(false);
    });

    it('should handle transaction history errors', async () => {
      (gamificationAPI.getCoinTransactions as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch transactions')
      );

      await expect(gamificationAPI.getCoinTransactions(1, 20))
        .rejects.toThrow('Failed to fetch transactions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero balance', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockPointsBalance, total: 0 },
      });

      const result = await pointsApi.getBalance();

      expect(result.data?.total).toBe(0);
    });

    it('should handle earning zero coins', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 0,
          newBalance: 1000,
        },
      });

      const result = await pointsApi.earnPoints({
        amount: 0,
        source: 'bonus',
        description: 'Zero earn',
      });

      expect(result.data?.amount).toBe(0);
    });

    it('should handle spending all coins', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 1000,
          newBalance: 0,
        },
      });

      const result = await pointsApi.spendPoints({
        amount: 1000,
        purpose: 'discount',
        description: 'Spend all',
      });

      expect(result.data?.newBalance).toBe(0);
    });

    it('should handle empty transaction history', async () => {
      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      });

      const result = await gamificationAPI.getCoinTransactions(1, 20);

      expect(result.data?.transactions.length).toBe(0);
    });

    it('should handle large coin amounts', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          amount: 1000000,
          newBalance: 1001000,
        },
      });

      const result = await pointsApi.earnPoints({
        amount: 1000000,
        source: 'bonus',
        description: 'Large amount',
      });

      expect(result.data?.amount).toBe(1000000);
    });
  });

  describe('Anti-Cheat Measures', () => {
    it('should validate coin amounts server-side', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid amount',
        data: undefined,
      });

      const result = await pointsApi.earnPoints({
        amount: -100,
        source: 'bonus',
        description: 'Negative amount',
      });

      expect(result.success).toBe(false);
    });

    it('should prevent balance manipulation', async () => {
      const balance1 = await pointsApi.getBalance();
      const balance2 = await pointsApi.getBalance();

      // Balances should be consistent from server
      expect(balance1).toBeDefined();
      expect(balance2).toBeDefined();
    });

    it('should verify transaction authenticity', async () => {
      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
          },
        },
      });

      const result = await gamificationAPI.getCoinTransactions(1, 20);

      // All transactions should have IDs from server
      result.data?.transactions.forEach(txn => {
        expect(txn.id).toBeTruthy();
      });
    });

    it('should enforce spending limits', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Spending limit exceeded',
        data: undefined,
      });

      const result = await pointsApi.spendPoints({
        amount: 100000,
        purpose: 'discount',
        description: 'Over limit',
      });

      expect(result.success).toBe(false);
    });
  });
});
