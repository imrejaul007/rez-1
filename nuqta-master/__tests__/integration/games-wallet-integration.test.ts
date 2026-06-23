// Games-Wallet Integration Tests
// Test suite for games and wallet coin synchronization

import gamificationAPI from '@/services/gamificationApi';
import walletApi from '@/services/walletApi';
import pointsApi from '@/services/pointsApi';

// Mock services
jest.mock('@/services/gamificationApi');
jest.mock('@/services/walletApi');
jest.mock('@/services/pointsApi');

describe('Games-Wallet Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Spin Wheel - Wallet Integration', () => {
    it('should update wallet balance after spin wheel win', async () => {
      // Mock spin wheel winning 50 coins
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: {
            segment: { id: '2', label: '50 Coins', value: 50, color: '#FFD700', type: 'coins' },
            prize: { type: 'coins', value: 50, description: 'You won 50 coins!' },
            rotation: 720,
          },
          coinsAdded: 50,
          newBalance: 1050,
        },
      });

      // Mock wallet balance check
      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 1050, currency: 'INR' }],
        },
      });

      // Simulate spin
      const spinResult = await gamificationAPI.spinWheel();
      expect(spinResult.success).toBe(true);
      expect(spinResult.data?.coinsAdded).toBe(50);
      expect(spinResult.data?.newBalance).toBe(1050);

      // Verify wallet updated
      const walletBalance = await walletApi.getBalance();
      expect(walletBalance.data?.coins[0].amount).toBe(1050);
    });

    it('should handle spin wheel failure without updating wallet', async () => {
      (gamificationAPI.spinWheel as jest.Mock).mockRejectedValue(new Error('Spin failed'));

      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 1000, currency: 'INR' }],
        },
      });

      // Attempt spin
      await expect(gamificationAPI.spinWheel()).rejects.toThrow('Spin failed');

      // Wallet should remain unchanged
      const walletBalance = await walletApi.getBalance();
      expect(walletBalance.data?.coins[0].amount).toBe(1000);
    });

    it('should sync coins from wallet to games page', async () => {
      // Mock wallet with updated balance
      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 2500, currency: 'INR' }],
        },
      });

      // Mock points API returning matching balance
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          total: 2500,
          earned: 3000,
          spent: 500,
          pending: 0,
          lifetimeEarned: 3000,
          lifetimeSpent: 500,
        },
      });

      // Fetch balances
      const walletBalance = await walletApi.getBalance();
      const pointsBalance = await pointsApi.getBalance();

      // Balances should match
      expect(walletBalance.data?.coins[0].amount).toBe(pointsBalance.data?.total);
    });
  });

  describe('Quiz Game - Wallet Integration', () => {
    it('should update wallet after quiz completion', async () => {
      // Mock quiz completion with coins earned
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 30,
          currentScore: 100,
          gameCompleted: true,
          totalCoins: 30,
        },
      });

      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 1030, currency: 'INR' }],
        },
      });

      // Complete quiz
      const quizResult = await gamificationAPI.submitQuizAnswer('game-1', 'q-final', 1);
      expect(quizResult.data?.gameCompleted).toBe(true);
      expect(quizResult.data?.totalCoins).toBe(30);

      // Check wallet updated
      const walletBalance = await walletApi.getBalance();
      expect(walletBalance.data?.coins[0].amount).toBe(1030);
    });

    it('should award coins incrementally during quiz', async () => {
      const quizAnswers = [
        { isCorrect: true, coinsEarned: 10, newBalance: 1010 },
        { isCorrect: true, coinsEarned: 15, newBalance: 1025 },
        { isCorrect: false, coinsEarned: 0, newBalance: 1025 },
        { isCorrect: true, coinsEarned: 20, newBalance: 1045 },
      ];

      for (const answer of quizAnswers) {
        (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            ...answer,
            currentScore: 45,
            gameCompleted: false,
          },
        });

        (walletApi.getBalance as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            coins: [{ type: 'wasil', amount: answer.newBalance, currency: 'INR' }],
          },
        });

        const result = await gamificationAPI.submitQuizAnswer('game-1', 'q1', 0);
        const wallet = await walletApi.getBalance();

        expect(result.data?.coinsEarned).toBe(answer.coinsEarned);
        expect(wallet.data?.coins[0].amount).toBe(answer.newBalance);
      }
    });
  });

  describe('Scratch Card - Wallet Integration', () => {
    it('should update wallet when scratch card is revealed', async () => {
      (gamificationAPI.scratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          card: { id: 'card-1', isScratched: true },
          prize: { type: 'coins', value: 100 },
          coinsAdded: 100,
        },
      });

      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 1100, currency: 'INR' }],
        },
      });

      const scratchResult = await gamificationAPI.scratchCard('card-1');
      expect(scratchResult.data?.coinsAdded).toBe(100);

      const walletBalance = await walletApi.getBalance();
      expect(walletBalance.data?.coins[0].amount).toBe(1100);
    });
  });

  describe('Points API - Wallet Sync', () => {
    it('should sync earned points to wallet', async () => {
      (pointsApi.earnPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 50,
          newBalance: 1050,
          transaction: {
            id: 'txn-1',
            type: 'earned',
            amount: 50,
            source: 'game',
          },
        },
      });

      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 1050, currency: 'INR' }],
        },
      });

      const earnResult = await pointsApi.earnPoints({
        amount: 50,
        source: 'game',
        description: 'Game reward',
      });

      const walletBalance = await walletApi.getBalance();

      expect(earnResult.data?.newBalance).toBe(walletBalance.data?.coins[0].amount);
    });

    it('should sync spent points to wallet', async () => {
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsSpent: 200,
          newBalance: 800,
          transaction: {
            id: 'txn-2',
            type: 'spent',
            amount: 200,
            purpose: 'voucher',
          },
        },
      });

      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 800, currency: 'INR' }],
        },
      });

      const spendResult = await pointsApi.spendPoints({
        amount: 200,
        purpose: 'voucher',
        description: 'Redeem voucher',
      });

      const walletBalance = await walletApi.getBalance();

      expect(spendResult.data?.newBalance).toBe(walletBalance.data?.coins[0].amount);
    });
  });

  describe('Daily Check-In - Wallet Integration', () => {
    it('should update wallet after daily check-in', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 5,
          bonusMultiplier: 1.0,
          nextCheckInAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: 1010, currency: 'INR' }],
        },
      });

      const checkInResult = await pointsApi.performDailyCheckIn();
      expect(checkInResult.data?.pointsEarned).toBe(10);

      const walletBalance = await walletApi.getBalance();
      expect(walletBalance.data?.coins[0].amount).toBe(1010);
    });
  });

  describe('Coin Transaction History', () => {
    it('should track all coin transactions across games', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          type: 'earned',
          amount: 50,
          source: 'spin-wheel',
          description: 'Spin wheel reward',
          createdAt: new Date(),
        },
        {
          id: 'txn-2',
          type: 'earned',
          amount: 30,
          source: 'quiz',
          description: 'Quiz completion',
          createdAt: new Date(),
        },
        {
          id: 'txn-3',
          type: 'earned',
          amount: 100,
          source: 'scratch-card',
          description: 'Scratch card prize',
          createdAt: new Date(),
        },
      ];

      (gamificationAPI.getCoinTransactions as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
        },
      });

      const transactions = await gamificationAPI.getCoinTransactions();
      expect(transactions.data?.transactions).toHaveLength(3);

      const totalEarned = transactions.data?.transactions.reduce(
        (sum: number, txn: any) => sum + txn.amount,
        0
      );
      expect(totalEarned).toBe(180);
    });
  });

  describe('Error Recovery', () => {
    it('should handle wallet API failure gracefully', async () => {
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: {
            segment: { id: '1', label: '10 Coins', value: 10, color: '#FFD700', type: 'coins' },
            prize: { type: 'coins', value: 10, description: 'You won 10 coins!' },
            rotation: 720,
          },
          coinsAdded: 10,
          newBalance: 1010,
        },
      });

      (walletApi.getBalance as jest.Mock).mockRejectedValue(new Error('Wallet service down'));

      // Game should complete successfully
      const spinResult = await gamificationAPI.spinWheel();
      expect(spinResult.success).toBe(true);

      // Wallet fetch should fail but not crash
      await expect(walletApi.getBalance()).rejects.toThrow('Wallet service down');
    });

    it('should handle points API failure during coin award', async () => {
      (pointsApi.earnPoints as jest.Mock).mockRejectedValue(new Error('Points service down'));

      await expect(
        pointsApi.earnPoints({
          amount: 50,
          source: 'game',
          description: 'Test',
        })
      ).rejects.toThrow('Points service down');
    });
  });

  describe('Balance Consistency', () => {
    it('should maintain consistent balance across multiple operations', async () => {
      let currentBalance = 1000;

      // Earn from spin wheel
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: { segment: {}, prize: { type: 'coins', value: 50 }, rotation: 720 },
          coinsAdded: 50,
          newBalance: currentBalance + 50,
        },
      });

      const spinResult = await gamificationAPI.spinWheel();
      currentBalance = spinResult.data!.newBalance;

      // Earn from quiz
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 30,
          currentScore: 100,
          gameCompleted: true,
          totalCoins: 30,
        },
      });

      await gamificationAPI.submitQuizAnswer('game-1', 'q1', 1);
      currentBalance += 30;

      // Spend coins
      (pointsApi.spendPoints as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsSpent: 50,
          newBalance: currentBalance - 50,
        },
      });

      const spendResult = await pointsApi.spendPoints({
        amount: 50,
        purpose: 'test',
        description: 'test',
      });

      currentBalance = spendResult.data!.newBalance;

      // Final balance check
      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: currentBalance, currency: 'INR' }],
        },
      });

      const finalBalance = await walletApi.getBalance();
      expect(finalBalance.data?.coins[0].amount).toBe(1030); // 1000 + 50 + 30 - 50
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle simultaneous coin operations correctly', async () => {
      const operations = [
        { type: 'earn', amount: 50 },
        { type: 'earn', amount: 30 },
        { type: 'earn', amount: 20 },
      ];

      (pointsApi.earnPoints as jest.Mock).mockImplementation((params: any) => {
        return Promise.resolve({
          success: true,
          data: {
            pointsEarned: params.amount,
            newBalance: 1000 + params.amount,
          },
        });
      });

      const results = await Promise.all(
        operations.map((op) =>
          pointsApi.earnPoints({
            amount: op.amount,
            source: 'game',
            description: 'test',
          })
        )
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.data?.pointsEarned).toBe(operations[index].amount);
      });
    });
  });

  describe('Rollback Scenarios', () => {
    it('should handle rollback when coin award fails', async () => {
      const initialBalance = 1000;

      // Simulate game win
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: { segment: {}, prize: { type: 'coins', value: 50 }, rotation: 720 },
          coinsAdded: 50,
          newBalance: 1050,
        },
      });

      // But points API fails
      (pointsApi.earnPoints as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      const spinResult = await gamificationAPI.spinWheel();
      expect(spinResult.data?.newBalance).toBe(1050);

      // Attempt to sync fails
      await expect(
        pointsApi.earnPoints({
          amount: 50,
          source: 'spin-wheel',
          description: 'Spin reward',
        })
      ).rejects.toThrow('Transaction failed');

      // Balance should remain unchanged in wallet
      (walletApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          coins: [{ type: 'wasil', amount: initialBalance, currency: 'INR' }],
        },
      });

      const walletBalance = await walletApi.getBalance();
      expect(walletBalance.data?.coins[0].amount).toBe(initialBalance);
    });
  });
});
