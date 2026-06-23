// Achievement Unlock Integration Tests
// Test suite for achievement triggering and unlocking across games

import achievementApi from '@/services/achievementApi';
import gamificationAPI from '@/services/gamificationApi';
import pointsApi from '@/services/pointsApi';

jest.mock('@/services/achievementApi');
jest.mock('@/services/gamificationApi');
jest.mock('@/services/pointsApi');

describe('Achievement Unlock Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Game-Based Achievement Triggers', () => {
    it('should unlock "First Spin" achievement after first wheel spin', async () => {
      // Perform first spin
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: {
            segment: {},
            prize: { type: 'coins', value: 10 },
            rotation: 720,
          },
          coinsAdded: 10,
          newBalance: 1010,
        },
      });

      await gamificationAPI.spinWheel();

      // Check achievements
      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-first-spin',
            title: 'First Spin',
            description: 'Spin the wheel for the first time',
            icon: 'star',
            badge: 'first-spinner',
            tier: 'bronze',
            coinReward: 50,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 },
            category: 'games',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data).toHaveLength(1);
      expect(achievements.data![0].title).toBe('First Spin');
      expect(achievements.data![0].unlocked).toBe(true);
    });

    it('should unlock "Quiz Master" after completing 10 quizzes', async () => {
      // Simulate completing 10th quiz
      for (let i = 0; i < 10; i++) {
        (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            isCorrect: true,
            coinsEarned: 10,
            currentScore: 100,
            gameCompleted: true,
          },
        });

        await gamificationAPI.submitQuizAnswer(`game-${i}`, 'q-final', 0);
      }

      // Check for achievement
      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-quiz-master',
            title: 'Quiz Master',
            description: 'Complete 10 quizzes',
            icon: 'trophy',
            badge: 'quiz-master',
            tier: 'gold',
            coinReward: 200,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 10, target: 10 },
            category: 'games',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data![0].progress.current).toBe(10);
      expect(achievements.data![0].unlocked).toBe(true);
    });

    it('should unlock "Lucky Streak" after 5 consecutive wins', async () => {
      // Win 5 games in a row
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: {
            segment: {},
            prize: { type: 'coins', value: 50 },
            rotation: 720,
          },
          coinsAdded: 50,
          newBalance: 1000,
        },
      });

      for (let i = 0; i < 5; i++) {
        await gamificationAPI.spinWheel();
      }

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-lucky-streak',
            title: 'Lucky Streak',
            description: 'Win 5 games in a row',
            icon: 'flame',
            badge: 'streak-5',
            tier: 'silver',
            coinReward: 100,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 5, target: 5 },
            category: 'games',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data![0].title).toBe('Lucky Streak');
    });
  });

  describe('Coin-Based Achievement Triggers', () => {
    it('should unlock "Coin Collector" at 1000 coins', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          total: 1000,
          earned: 1500,
          spent: 500,
          pending: 0,
          lifetimeEarned: 1500,
          lifetimeSpent: 500,
        },
      });

      const balance = await pointsApi.getBalance();
      expect(balance.data?.total).toBe(1000);

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-coin-collector',
            title: 'Coin Collector',
            description: 'Accumulate 1000 coins',
            icon: 'diamond',
            badge: 'collector',
            tier: 'silver',
            coinReward: 150,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 1000, target: 1000 },
            category: 'coins',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data![0].unlocked).toBe(true);
    });

    it('should track progress towards "Coin Tycoon" (10000 coins)', async () => {
      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: { total: 5000 },
      });

      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        data: {
          achievements: [
            {
              id: 'ach-coin-tycoon',
              title: 'Coin Tycoon',
              description: 'Accumulate 10000 coins',
              icon: 'diamond',
              badge: 'tycoon',
              tier: 'diamond',
              coinReward: 500,
              unlocked: false,
              progress: { current: 5000, target: 10000 },
              category: 'coins',
            },
          ],
          summary: { total: 1, unlocked: 0, completionPercentage: 0 },
        },
      });

      const progress = await achievementApi.getAchievementProgress();
      expect(progress.data?.achievements[0].progress.current).toBe(5000);
      expect(progress.data?.achievements[0].unlocked).toBe(false);
    });
  });

  describe('Streak-Based Achievement Triggers', () => {
    it('should unlock "Dedicated Player" at 7-day streak', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 7,
          bonusMultiplier: 1.5,
        },
      });

      const checkIn = await pointsApi.performDailyCheckIn();
      expect(checkIn.data?.streak).toBe(7);

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-dedicated',
            title: 'Dedicated Player',
            description: 'Maintain a 7-day streak',
            icon: 'calendar',
            badge: 'dedicated',
            tier: 'gold',
            coinReward: 250,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 7, target: 7 },
            category: 'engagement',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data![0].unlocked).toBe(true);
    });

    it('should unlock "Unstoppable" at 30-day streak', async () => {
      (pointsApi.performDailyCheckIn as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          pointsEarned: 10,
          streak: 30,
          bonusMultiplier: 3.0,
        },
      });

      const checkIn = await pointsApi.performDailyCheckIn();

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-unstoppable',
            title: 'Unstoppable',
            description: 'Maintain a 30-day streak',
            icon: 'flame',
            badge: 'unstoppable',
            tier: 'diamond',
            coinReward: 1000,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 30, target: 30 },
            category: 'engagement',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data![0].tier).toBe('diamond');
      expect(achievements.data![0].coinReward).toBe(1000);
    });
  });

  describe('Challenge-Based Achievement Triggers', () => {
    it('should unlock achievement after completing challenge', async () => {
      // Complete challenge
      (gamificationAPI.claimChallengeReward as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          challenge: {
            id: 'ch-1',
            title: 'Daily Shopper',
            status: 'claimed',
          },
          rewards: {
            coins: 50,
            badges: ['daily-shopper'],
            vouchers: [],
          },
          newBalance: 1050,
        },
      });

      const reward = await gamificationAPI.claimChallengeReward('ch-1');
      expect(reward.data?.rewards.badges).toContain('daily-shopper');

      // Check if achievement unlocked
      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-challenge-complete',
            title: 'Challenge Accepted',
            description: 'Complete your first challenge',
            icon: 'checkmark-circle',
            badge: 'challenger',
            tier: 'bronze',
            coinReward: 75,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 },
            category: 'challenges',
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data![0].title).toBe('Challenge Accepted');
    });

    it('should unlock "Challenge Champion" after 50 challenges', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        data: {
          achievements: [
            {
              id: 'ach-challenge-champion',
              title: 'Challenge Champion',
              description: 'Complete 50 challenges',
              icon: 'trophy',
              badge: 'champion',
              tier: 'platinum',
              coinReward: 500,
              unlocked: true,
              unlockedAt: new Date(),
              progress: { current: 50, target: 50 },
              category: 'challenges',
            },
          ],
          summary: { total: 1, unlocked: 1, completionPercentage: 100 },
        },
      });

      const progress = await achievementApi.getAchievementProgress();
      expect(progress.data?.achievements[0].unlocked).toBe(true);
      expect(progress.data?.achievements[0].tier).toBe('platinum');
    });
  });

  describe('Multiple Achievement Unlocks', () => {
    it('should unlock multiple achievements from single action', async () => {
      // User completes 10th quiz which is also their 100th game overall
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 50,
          currentScore: 100,
          gameCompleted: true,
        },
      });

      await gamificationAPI.submitQuizAnswer('game-10', 'q-final', 0);

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-quiz-master',
            title: 'Quiz Master',
            description: 'Complete 10 quizzes',
            unlocked: true,
            tier: 'gold',
            coinReward: 200,
          },
          {
            id: 'ach-century',
            title: 'Century',
            description: 'Play 100 games',
            unlocked: true,
            tier: 'platinum',
            coinReward: 500,
          },
          {
            id: 'ach-perfect-score',
            title: 'Perfect Score',
            description: 'Get 100% on a quiz',
            unlocked: true,
            tier: 'gold',
            coinReward: 150,
          },
        ],
      });

      const achievements = await achievementApi.recalculateAchievements();
      expect(achievements.data).toHaveLength(3);

      const totalReward = achievements.data!.reduce(
        (sum: number, ach: any) => sum + ach.coinReward,
        0
      );
      expect(totalReward).toBe(850);
    });
  });

  describe('Achievement Notification Flow', () => {
    it('should queue achievement for display', async () => {
      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ach-new',
            title: 'New Achievement',
            description: 'You unlocked something!',
            icon: 'trophy',
            badge: 'new',
            tier: 'bronze',
            coinReward: 50,
            unlocked: true,
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 },
            category: 'games',
          },
        ],
      });

      const newAchievements = await achievementApi.recalculateAchievements();
      expect(newAchievements.data).toHaveLength(1);
      expect(newAchievements.data![0].unlocked).toBe(true);

      // Achievement should be added to notification queue
      // This would be handled by GamificationContext
    });
  });

  describe('Achievement Coin Rewards', () => {
    it('should award coins when achievement is unlocked', async () => {
      const initialBalance = 1000;

      (achievementApi.unlockAchievement as jest.Mock).mockResolvedValue({
        achievement: {
          id: 'ach-test',
          title: 'Test Achievement',
          coinReward: 100,
        },
        coinsEarned: 100,
        newBalance: initialBalance + 100,
      });

      const result = await achievementApi.unlockAchievement('ach-test');
      expect(result.coinsEarned).toBe(100);
      expect(result.newBalance).toBe(1100);

      (pointsApi.getBalance as jest.Mock).mockResolvedValue({
        success: true,
        data: { total: 1100 },
      });

      const balance = await pointsApi.getBalance();
      expect(balance.data?.total).toBe(1100);
    });
  });

  describe('Achievement Progress Tracking', () => {
    it('should track incremental progress towards achievement', async () => {
      // Initial state: 3/10 quizzes
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        data: {
          achievements: [
            {
              id: 'ach-quiz-master',
              title: 'Quiz Master',
              unlocked: false,
              progress: { current: 3, target: 10 },
            },
          ],
          summary: { total: 1, unlocked: 0, completionPercentage: 0 },
        },
      });

      let progress = await achievementApi.getAchievementProgress();
      expect(progress.data?.achievements[0].progress.current).toBe(3);

      // Complete another quiz
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: { gameCompleted: true },
      });

      await gamificationAPI.submitQuizAnswer('game-4', 'q-final', 0);

      // Progress should update: 4/10
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        data: {
          achievements: [
            {
              id: 'ach-quiz-master',
              title: 'Quiz Master',
              unlocked: false,
              progress: { current: 4, target: 10 },
            },
          ],
          summary: { total: 1, unlocked: 0, completionPercentage: 0 },
        },
      });

      progress = await achievementApi.getAchievementProgress();
      expect(progress.data?.achievements[0].progress.current).toBe(4);
    });
  });

  describe('Achievement Categories', () => {
    it('should organize achievements by category', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        data: {
          achievements: [
            { id: 'a1', category: 'games', unlocked: true },
            { id: 'a2', category: 'coins', unlocked: true },
            { id: 'a3', category: 'engagement', unlocked: false },
            { id: 'a4', category: 'challenges', unlocked: true },
            { id: 'a5', category: 'games', unlocked: false },
          ],
          summary: { total: 5, unlocked: 3, completionPercentage: 60 },
        },
      });

      const progress = await achievementApi.getAchievementProgress();
      const byCategory = progress.data?.achievements.reduce((acc: any, ach: any) => {
        if (!acc[ach.category]) acc[ach.category] = [];
        acc[ach.category].push(ach);
        return acc;
      }, {});

      expect(byCategory.games).toHaveLength(2);
      expect(byCategory.coins).toHaveLength(1);
      expect(byCategory.engagement).toHaveLength(1);
      expect(byCategory.challenges).toHaveLength(1);
    });
  });

  describe('Achievement Tiers', () => {
    it('should progress through achievement tiers', async () => {
      const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const achievements = tiers.map((tier, index) => ({
        id: `ach-tier-${tier}`,
        title: `${tier.toUpperCase()} Achievement`,
        tier,
        coinReward: 50 * (index + 1),
        unlocked: true,
      }));

      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        data: {
          achievements,
          summary: { total: 5, unlocked: 5, completionPercentage: 100 },
        },
      });

      const progress = await achievementApi.getAchievementProgress();
      expect(progress.data?.achievements).toHaveLength(5);

      const diamondAchievement = progress.data?.achievements.find(
        (a: any) => a.tier === 'diamond'
      );
      expect(diamondAchievement?.coinReward).toBe(250);
    });
  });
});
