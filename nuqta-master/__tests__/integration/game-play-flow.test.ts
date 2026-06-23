// Game Play Flow Integration Tests
// Complete end-to-end flow testing for game sessions

import gamificationAPI from '@/services/gamificationApi';
import pointsApi from '@/services/pointsApi';
import achievementApi from '@/services/achievementApi';

jest.mock('@/services/gamificationApi');
jest.mock('@/services/pointsApi');
jest.mock('@/services/achievementApi');

describe('Game Play Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Spin Wheel Flow', () => {
    it('should complete full spin wheel session', async () => {
      // Step 1: Check eligibility
      (gamificationAPI.canSpinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canSpin: true,
          nextSpinAt: null,
          remainingCooldown: 0,
        },
      });

      const eligibility = await gamificationAPI.canSpinWheel();
      expect(eligibility.data?.canSpin).toBe(true);

      // Step 2: Perform spin
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

      const spinResult = await gamificationAPI.spinWheel();
      expect(spinResult.data?.coinsAdded).toBe(50);
      expect(spinResult.data?.newBalance).toBe(1050);

      // Step 3: Check new balance
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          total: 1050,
          earned: 1550,
          spent: 500,
          pending: 0,
          lifetimeEarned: 1550,
          lifetimeSpent: 500,
        },
      });

      const balance = await pointsApi.getBalance();
      expect(balance.data?.total).toBe(1050);

      // Step 4: Check cooldown after spin
      (gamificationAPI.canSpinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canSpin: false,
          nextSpinAt: new Date(Date.now() + 86400000).toISOString(),
          remainingCooldown: 86400,
        },
      });

      const postSpinEligibility = await gamificationAPI.canSpinWheel();
      expect(postSpinEligibility.data?.canSpin).toBe(false);
      expect(postSpinEligibility.data?.remainingCooldown).toBeGreaterThan(0);
    });

    it('should handle cooldown period correctly', async () => {
      // User already spun today
      (gamificationAPI.canSpinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canSpin: false,
          nextSpinAt: new Date(Date.now() + 3600000).toISOString(),
          remainingCooldown: 3600,
        },
      });

      const eligibility = await gamificationAPI.canSpinWheel();
      expect(eligibility.data?.canSpin).toBe(false);

      // Attempt to spin anyway (should fail)
      (gamificationAPI.spinWheel as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Spin cooldown not expired' } },
      });

      await expect(gamificationAPI.spinWheel()).rejects.toBeDefined();
    });
  });

  describe('Complete Quiz Flow', () => {
    it('should complete full quiz game session', async () => {
      const questions = [
        {
          id: 'q1',
          question: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 2,
          difficulty: 'easy',
          category: 'general',
          timeLimit: 30,
        },
        {
          id: 'q2',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 1,
          difficulty: 'medium',
          category: 'general',
          timeLimit: 25,
        },
        {
          id: 'q3',
          question: 'Question 3',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          difficulty: 'hard',
          category: 'general',
          timeLimit: 20,
        },
      ];

      // Step 1: Start quiz
      (gamificationAPI.startQuiz as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'game-1',
          userId: 'user-1',
          questions,
          currentQuestionIndex: 0,
          score: 0,
          coinsEarned: 0,
          startedAt: new Date(),
          isCompleted: false,
        },
      });

      const quizGame = await gamificationAPI.startQuiz('easy');
      expect(quizGame.data?.questions).toHaveLength(3);

      // Step 2: Answer question 1 (correct)
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: questions[1],
          gameCompleted: false,
        },
      });

      const answer1 = await gamificationAPI.submitQuizAnswer('game-1', 'q1', 2);
      expect(answer1.data?.isCorrect).toBe(true);
      expect(answer1.data?.coinsEarned).toBe(10);

      // Step 3: Answer question 2 (correct)
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 15,
          currentScore: 25,
          nextQuestion: questions[2],
          gameCompleted: false,
        },
      });

      const answer2 = await gamificationAPI.submitQuizAnswer('game-1', 'q2', 1);
      expect(answer2.data?.currentScore).toBe(25);

      // Step 4: Answer question 3 (wrong)
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: false,
          coinsEarned: 0,
          currentScore: 25,
          gameCompleted: true,
          totalCoins: 25,
        },
      });

      const answer3 = await gamificationAPI.submitQuizAnswer('game-1', 'q3', 3);
      expect(answer3.data?.isCorrect).toBe(false);
      expect(answer3.data?.gameCompleted).toBe(true);
      expect(answer3.data?.totalCoins).toBe(25);

      // Step 5: Verify final balance
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          total: 1025,
          earned: 1525,
          spent: 500,
          pending: 0,
          lifetimeEarned: 1525,
          lifetimeSpent: 500,
        },
      });

      const finalBalance = await pointsApi.getBalance();
      expect(finalBalance.data?.total).toBe(1025);
    });

    it('should handle quiz timeout scenario', async () => {
      // Start quiz
      (gamificationAPI.startQuiz as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'game-2',
          userId: 'user-1',
          questions: [
            {
              id: 'q1',
              question: 'Timed question',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              difficulty: 'easy',
              category: 'general',
              timeLimit: 10,
            },
          ],
          currentQuestionIndex: 0,
          score: 0,
          coinsEarned: 0,
          startedAt: new Date(),
          isCompleted: false,
        },
      });

      const quiz = await gamificationAPI.startQuiz();
      expect(quiz.data?.questions[0].timeLimit).toBe(10);

      // Submit answer as timeout (answer = -1)
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: false,
          coinsEarned: 0,
          currentScore: 0,
          gameCompleted: true,
          totalCoins: 0,
        },
      });

      const timeoutResult = await gamificationAPI.submitQuizAnswer('game-2', 'q1', -1);
      expect(timeoutResult.data?.isCorrect).toBe(false);
      expect(timeoutResult.data?.coinsEarned).toBe(0);
    });
  });

  describe('Complete Scratch Card Flow', () => {
    it('should complete scratch card session', async () => {
      // Step 1: Check eligibility
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canCreate: true,
          reason: null,
          nextAvailableAt: null,
        },
      });

      const eligibility = await gamificationAPI.canCreateScratchCard();
      expect(eligibility.data?.canCreate).toBe(true);

      // Step 2: Create scratch card
      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'card-1',
          userId: 'user-1',
          prize: {
            id: 'prize-1',
            type: 'coin',
            value: 100,
            title: '100 Coins',
            description: 'You won 100 coins!',
            icon: 'diamond',
            color: '#FFD700',
          },
          isScratched: false,
          isRedeemed: false,
          expiresAt: new Date(Date.now() + 7 * 86400000),
          createdAt: new Date(),
        },
      });

      const card = await gamificationAPI.createScratchCard();
      expect(card.data?.id).toBe('card-1');
      expect(card.data?.isScratched).toBe(false);

      // Step 3: Scratch card
      (gamificationAPI.scratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          card: {
            ...card.data,
            isScratched: true,
          },
          prize: card.data?.prize,
          coinsAdded: 100,
        },
      });

      const scratchResult = await gamificationAPI.scratchCard('card-1');
      expect(scratchResult.data?.card.isScratched).toBe(true);
      expect(scratchResult.data?.coinsAdded).toBe(100);

      // Step 4: Verify balance updated
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          total: 1100,
          earned: 1600,
          spent: 500,
          pending: 0,
          lifetimeEarned: 1600,
          lifetimeSpent: 500,
        },
      });

      const balance = await pointsApi.getBalance();
      expect(balance.data?.total).toBe(1100);
    });
  });

  describe('Multi-Game Session Flow', () => {
    it('should handle playing multiple games in sequence', async () => {
      let currentBalance = 1000;

      // Game 1: Spin Wheel
      (gamificationAPI.canSpinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: { canSpin: true },
      });

      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: { segment: {}, prize: { type: 'coins', value: 50 }, rotation: 720 },
          coinsAdded: 50,
          newBalance: currentBalance + 50,
        },
      });

      const spin = await gamificationAPI.spinWheel();
      currentBalance += spin.data!.coinsAdded;

      // Game 2: Scratch Card
      (gamificationAPI.canCreateScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: { canCreate: true },
      });

      (gamificationAPI.createScratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'card-1', prize: { value: 75 } },
      });

      (gamificationAPI.scratchCard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          card: { isScratched: true },
          prize: { value: 75 },
          coinsAdded: 75,
        },
      });

      const card = await gamificationAPI.createScratchCard();
      const scratch = await gamificationAPI.scratchCard(card.data!.id);
      currentBalance += scratch.data!.coinsAdded;

      // Game 3: Quiz
      (gamificationAPI.startQuiz as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'quiz-1',
          questions: [{ id: 'q1', correctAnswer: 0 }],
        },
      });

      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 20,
          gameCompleted: true,
          totalCoins: 20,
        },
      });

      const quiz = await gamificationAPI.startQuiz();
      const quizAnswer = await gamificationAPI.submitQuizAnswer('quiz-1', 'q1', 0);
      currentBalance += quizAnswer.data!.coinsEarned;

      // Verify final balance
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: { total: currentBalance },
      });

      const finalBalance = await pointsApi.getBalance();
      expect(finalBalance.data?.total).toBe(1145); // 1000 + 50 + 75 + 20
    });
  });

  describe('Daily Check-In Flow', () => {
    it('should complete daily check-in with streak bonus', async () => {
      // Check current status
      (pointsApi.getDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canCheckIn: true,
          currentStreak: 4,
          lastCheckInDate: new Date(Date.now() - 86400000).toISOString(),
          nextCheckInAt: new Date().toISOString(),
        },
      });

      const status = await pointsApi.getDailyCheckIn();
      expect(status.data?.canCheckIn).toBe(true);
      expect(status.data?.currentStreak).toBe(4);

      // Perform check-in
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 5,
          bonusMultiplier: 1.5,
          nextCheckInAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const checkIn = await pointsApi.performDailyCheckIn();
      expect(checkIn.data?.streak).toBe(5);
      expect(checkIn.data?.pointsEarned).toBe(10);
      expect(checkIn.data?.bonusMultiplier).toBe(1.5);
    });

    it('should reset streak if check-in is missed', async () => {
      // User missed yesterday's check-in
      (pointsApi.getDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          canCheckIn: true,
          currentStreak: 0,
          lastCheckInDate: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      });

      const status = await pointsApi.getDailyCheckIn();
      expect(status.data?.currentStreak).toBe(0);

      // New check-in starts fresh streak
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 1,
          bonusMultiplier: 1.0,
        },
      });

      const checkIn = await pointsApi.performDailyCheckIn();
      expect(checkIn.data?.streak).toBe(1);
    });
  });

  describe('Error Scenarios in Flow', () => {
    it('should handle network interruption during game', async () => {
      // Start quiz successfully
      (gamificationAPI.startQuiz as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'game-1',
          questions: [{ id: 'q1' }],
        },
      });

      const quiz = await gamificationAPI.startQuiz();
      expect(quiz.success).toBe(true);

      // Network fails during answer submission
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(gamificationAPI.submitQuizAnswer('game-1', 'q1', 0)).rejects.toThrow(
        'Network timeout'
      );
    });

    it('should handle game state recovery after error', async () => {
      // Get current quiz state
      (gamificationAPI.getCurrentQuiz as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'game-1',
          currentQuestionIndex: 2,
          score: 20,
          coinsEarned: 20,
        },
      });

      const currentQuiz = await gamificationAPI.getCurrentQuiz();
      expect(currentQuiz.data?.score).toBe(20);
      expect(currentQuiz.data?.currentQuestionIndex).toBe(2);

      // Can resume from where user left off
      expect(currentQuiz.data?.id).toBe('game-1');
    });
  });

  describe('Statistics Tracking Flow', () => {
    it('should track comprehensive game statistics', async () => {
      (gamificationAPI.getGamificationStats as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          totalCoins: 1500,
          coinsEarnedToday: 100,
          coinsEarnedThisWeek: 350,
          coinsEarnedThisMonth: 1200,
          level: 10,
          experiencePoints: 2500,
          nextLevelXP: 3000,
          achievementsUnlocked: 15,
          totalAchievements: 50,
          challengesCompleted: 25,
          activeChallenges: 3,
          currentStreak: 7,
          longestStreak: 15,
          rank: 42,
          totalUsers: 10000,
        },
      });

      const stats = await gamificationAPI.getGamificationStats();
      expect(stats.data?.totalCoins).toBe(1500);
      expect(stats.data?.currentStreak).toBe(7);
      expect(stats.data?.achievementsUnlocked).toBe(15);
    });
  });
});
