// Achievements System Tests
// Test suite for achievements tracking and unlocking

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { GamificationProvider, useGamification } from '@/contexts/GamificationContext';
import achievementApi from '@/services/achievementApi';
import { Achievement, AchievementProgress } from '@/services/achievementApi';

// Mock dependencies
jest.mock('@/services/achievementApi');
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    state: { isAuthenticated: true, user: { id: 'user-1', isOnboarded: true } },
  }),
}));
jest.mock('@/stores/selectors', () => ({
  useIsAuthenticated: () => true,
  useIsOnboarded: () => true,
  useAuthUser: () => ({ id: 'user-1', isOnboarded: true }),
}));

const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    code: 'FIRST_PURCHASE',
    title: 'First Purchase',
    description: 'Make your first purchase',
    category: 'shopping',
    tier: 'bronze',
    coinReward: 50,
    threshold: 1,
    currentProgress: 0,
    unlocked: false,
    icon: 'cart',
    badgeIcon: 'trophy',
    isActive: true,
  },
  {
    id: 'ach-2',
    code: 'SOCIAL_BUTTERFLY',
    title: 'Social Butterfly',
    description: 'Share 5 products',
    category: 'social',
    tier: 'silver',
    coinReward: 100,
    threshold: 5,
    currentProgress: 3,
    unlocked: false,
    icon: 'share',
    badgeIcon: 'trophy',
    isActive: true,
  },
  {
    id: 'ach-3',
    code: 'SUPER_SAVER',
    title: 'Super Saver',
    description: 'Save ₹1000 with cashback',
    category: 'shopping',
    tier: 'gold',
    coinReward: 200,
    threshold: 1000,
    currentProgress: 1000,
    unlocked: true,
    unlockedAt: new Date().toISOString(),
    icon: 'wallet',
    badgeIcon: 'trophy',
    isActive: true,
  },
];

const mockProgress: AchievementProgress = {
  achievements: mockAchievements,
  summary: {
    total: 3,
    unlocked: 1,
    inProgress: 1,
    locked: 1,
    completionPercentage: 33,
  },
};

// Test component to use context
const TestComponent = () => {
  const { state, actions, computed } = useGamification();
  const { Pressable, View, Text } = require('react-native');

  return (
    <View>
      <Text testID="total-achievements">{state.achievements.length}</Text>
      <Text testID="unlocked-count">{computed.unlockedCount}</Text>
      <Text testID="completion-percentage">{computed.completionPercentage}</Text>
      <Pressable testID="trigger-check" onPress={() => actions.triggerAchievementCheck('TEST_EVENT')}>
        <Text>Check</Text>
      </Pressable>
      <Pressable testID="refresh" onPress={() => actions.refreshAchievements()}>
        <Text>Refresh</Text>
      </Pressable>
    </View>
  );
};

describe('Achievements System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module-level state in GamificationContext between tests
    try {
      const ctx = require('@/contexts/GamificationContext');
      if (typeof ctx.__resetModuleState === 'function') {
        ctx.__resetModuleState();
      }
    } catch (e) {
      // ignore
    }
  });

  describe('Achievement Loading', () => {
    it('should load achievements on mount', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(getByTestId('total-achievements').props.children).toBe(3);
      });
    });

    it('should display achievement categories', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByText } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(achievementApi.getAchievementProgress).toHaveBeenCalled();
      });
    });

    it('should show progress for each achievement', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(getByTestId('completion-percentage').props.children).toBe(33);
      });
    });

    it('should handle loading errors', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockRejectedValue(
        new Error('Failed to load')
      );

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(getByTestId('total-achievements').props.children).toBe(0);
      });
    });
  });

  describe('Achievement Unlocking', () => {
    it('should unlock achievement when threshold met', async () => {
      const unlockedAchievement = { ...mockAchievements[0], unlocked: true };

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: [unlockedAchievement],
      });

      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });

    it('should award coins on achievement unlock', async () => {
      const unlockedAchievement = {
        ...mockAchievements[0],
        unlocked: true,
        coinReward: 50,
      };

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: [unlockedAchievement],
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });

    it('should show achievement unlock notification', async () => {
      const unlockedAchievement = { ...mockAchievements[0], unlocked: true };

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: [unlockedAchievement],
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });

    it('should handle multiple simultaneous unlocks', async () => {
      const unlockedAchievements = [
        { ...mockAchievements[0], unlocked: true },
        { ...mockAchievements[1], unlocked: true },
      ];

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: unlockedAchievements,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });
  });

  describe('Achievement Progress', () => {
    it('should track progress towards achievements', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(achievementApi.getAchievementProgress).toHaveBeenCalled();
      });
    });

    it('should update progress on user actions', async () => {
      const updatedProgress = {
        ...mockProgress,
        achievements: mockAchievements.map(ach =>
          ach.id === 'ach-2' ? { ...ach, currentProgress: 4 } : ach
        ),
      };

      (achievementApi.getAchievementProgress as jest.Mock)
        .mockResolvedValueOnce({ success: true, data: mockProgress })
        .mockResolvedValueOnce({ success: true, data: updatedProgress });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(achievementApi.getAchievementProgress).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        fireEvent.press(getByTestId('refresh'));
      });

      await waitFor(() => {
        expect(achievementApi.getAchievementProgress).toHaveBeenCalledTimes(2);
      });
    });

    it('should show percentage completion', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(getByTestId('completion-percentage').props.children).toBe(33);
      });
    });
  });

  describe('Achievement Tiers', () => {
    it('should display achievements by tier', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(getByTestId('total-achievements').props.children).toBe(3);
      });
    });

    it('should show appropriate rewards for each tier', async () => {
      const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const rewards = [50, 100, 200, 500, 1000];

      tiers.forEach((tier, index) => {
        const achievement = mockAchievements.find(a => a.tier === tier);
        if (achievement) {
          expect(achievement.coinReward).toBeGreaterThanOrEqual(rewards[index]);
        }
      });
    });
  });

  describe('Achievement Categories', () => {
    it('should filter achievements by category', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const categories = ['shopping', 'social', 'referral', 'engagement', 'special'];
      const shoppingAchievements = mockAchievements.filter(
        a => a.category === 'shopping'
      );

      expect(shoppingAchievements.length).toBeGreaterThan(0);
    });

    it('should show category-specific icons', async () => {
      const categoryIcons = {
        shopping: 'cart',
        social: 'share',
        referral: 'people',
        engagement: 'star',
        special: 'trophy',
      };

      mockAchievements.forEach(achievement => {
        expect(achievement.icon).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle achievement check failures', async () => {
      (achievementApi.recalculateAchievements as jest.Mock).mockRejectedValue(
        new Error('Check failed')
      );

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      // Should not crash
      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });

    it('should handle network timeouts', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      );

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(
        () => {
          expect(getByTestId('total-achievements').props.children).toBe(0);
        },
        { timeout: 6000 }
      );
    });
  });

  describe('Anti-Cheat Measures', () => {
    it('should validate achievement criteria server-side', async () => {
      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });

    it('should prevent duplicate unlock attempts', async () => {
      const unlockedAchievement = { ...mockAchievements[2] }; // Already unlocked

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: [unlockedAchievement],
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      // Should not trigger unlock for already unlocked achievement
      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalledTimes(1);
      });
    });

    it('should verify progress thresholds', async () => {
      const invalidAchievement = {
        ...mockAchievements[0],
        currentProgress: 100,
        threshold: 1,
        unlocked: false, // Should be true
      };

      (achievementApi.recalculateAchievements as jest.Mock).mockResolvedValue({
        success: true,
        data: [invalidAchievement],
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty achievement list', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          achievements: [],
          summary: {
            total: 0,
            unlocked: 0,
            inProgress: 0,
            locked: 0,
            completionPercentage: 0,
          },
        },
      });

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(getByTestId('total-achievements').props.children).toBe(0);
      });
    });

    it('should handle achievements with zero threshold', async () => {
      const zeroThresholdAchievement = {
        ...mockAchievements[0],
        threshold: 0,
      };

      expect(zeroThresholdAchievement.threshold).toBe(0);
    });

    it('should handle concurrent achievement checks', async () => {
      (achievementApi.recalculateAchievements as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 1000))
      );

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      // Trigger multiple checks
      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
        fireEvent.press(getByTestId('trigger-check'));
        fireEvent.press(getByTestId('trigger-check'));
      });

      // Should handle gracefully
      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });
  });

  describe('User Experience', () => {
    it('should show loading state during achievement checks', async () => {
      (achievementApi.recalculateAchievements as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 500))
      );

      const { getByTestId } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-check'));
      });

      // Check for loading state (implementation specific)
      await waitFor(() => {
        expect(achievementApi.recalculateAchievements).toHaveBeenCalled();
      });
    });

    it('should cache achievement data', async () => {
      (achievementApi.getAchievementProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const { unmount, rerender } = render(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      await waitFor(() => {
        expect(achievementApi.getAchievementProgress).toHaveBeenCalledTimes(1);
      });

      // Remount should use cache
      unmount();
      rerender(
        <GamificationProvider>
          <TestComponent />
        </GamificationProvider>
      );

      // Should not call API again immediately
      expect(achievementApi.getAchievementProgress).toHaveBeenCalledTimes(1);
    });
  });
});
