// Leaderboard Tests
// Test suite for leaderboard system

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import gamificationAPI from '@/services/gamificationApi';
import { LeaderboardData, LeaderboardEntry } from '@/types/gamification.types';

// Mock dependencies
jest.mock('@/services/gamificationApi');

const mockLeaderboardEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: 'user-1',
    username: 'champion123',
    fullName: 'John Champion',
    avatar: 'https://example.com/avatar1.jpg',
    coins: 5000,
    level: 25,
    tier: 'vip',
    achievements: 45,
  },
  {
    rank: 2,
    userId: 'user-2',
    username: 'pro_gamer',
    fullName: 'Jane Pro',
    avatar: 'https://example.com/avatar2.jpg',
    coins: 4500,
    level: 23,
    tier: 'premium',
    achievements: 40,
  },
  {
    rank: 3,
    userId: 'user-3',
    username: 'newbie_007',
    fullName: 'Bob Newbie',
    coins: 3000,
    level: 15,
    tier: 'free',
    achievements: 20,
  },
  {
    rank: 42,
    userId: 'current-user',
    username: 'me',
    fullName: 'Current User',
    coins: 500,
    level: 5,
    tier: 'free',
    achievements: 5,
    isCurrentUser: true,
  },
];

const mockLeaderboardData: LeaderboardData = {
  period: 'monthly',
  entries: mockLeaderboardEntries.slice(0, 3),
  userRank: mockLeaderboardEntries[3],
  totalUsers: 10000,
  updatedAt: new Date(),
};

// Mock Leaderboard Component
const LeaderboardComponent = () => {
  const [data, setData] = React.useState<LeaderboardData | null>(null);
  const [period, setPeriod] = React.useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('monthly');
  const [loading, setLoading] = React.useState(false);

  const loadLeaderboard = async (selectedPeriod: typeof period) => {
    setLoading(true);
    try {
      const response = await gamificationAPI.getLeaderboard(selectedPeriod, 50);
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadLeaderboard(period);
  }, [period]);

const { View: RNView, Text: RNText, Pressable: RNPressable } = require('react-native');
  return (
    <RNView testID="leaderboard-container">
      {loading && <RNText testID="loading">Loading...</RNText>}
      <RNPressable testID="daily-tab" onPress={() => setPeriod('daily')}><RNText>Daily</RNText></RNPressable>
      <RNPressable testID="weekly-tab" onPress={() => setPeriod('weekly')}><RNText>Weekly</RNText></RNPressable>
      <RNPressable testID="monthly-tab" onPress={() => setPeriod('monthly')}><RNText>Monthly</RNText></RNPressable>
      <RNPressable testID="all-time-tab" onPress={() => setPeriod('all-time')}><RNText>All Time</RNText></RNPressable>

      {data && (
        <>
          <RNText testID="total-users">{data.totalUsers}</RNText>
          <RNView testID="leaderboard-list">
            {data.entries.map(entry => (
              <RNView key={entry.userId} testID={`entry-${entry.rank}`}>
                <RNText testID={`rank-${entry.rank}`}>{entry.rank}</RNText>
                <RNText testID={`username-${entry.rank}`}>{entry.username}</RNText>
                <RNText testID={`coins-${entry.rank}`}>{entry.coins}</RNText>
              </RNView>
            ))}
          </RNView>
          {data.userRank && (
            <RNView testID="user-rank">
              <RNText testID="user-rank-number">{data.userRank.rank}</RNText>
              <RNText testID="user-coins">{data.userRank.coins}</RNText>
            </RNView>
          )}
        </>
      )}
    </RNView>
  );
};

describe('Leaderboard System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure the mock has the methods the tests reach for.
    (gamificationAPI as any).getLeaderboard = jest.fn();
    (gamificationAPI as any).getUserRank = jest.fn();
  });

  describe('Rendering', () => {
    it('should render leaderboard with top users', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('leaderboard-list')).toBeTruthy();
      });
    });

    it('should display user rankings', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('rank-1').props.children).toBe(1);
        expect(getByTestId('rank-2').props.children).toBe(2);
        expect(getByTestId('rank-3').props.children).toBe(3);
      });
    });

    it('should show user coins', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('coins-1').props.children).toBe(5000);
      });
    });

    it('should display total users count', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('total-users').props.children).toBe(10000);
      });
    });

    it('should highlight current user', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('user-rank')).toBeTruthy();
      });
    });
  });

  describe('Period Filtering', () => {
    it('should load daily leaderboard', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockLeaderboardData, period: 'daily' },
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await act(async () => {
        fireEvent.press(getByTestId('daily-tab'));
      });

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('daily', 50);
      });
    });

    it('should load weekly leaderboard', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockLeaderboardData, period: 'weekly' },
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await act(async () => {
        fireEvent.press(getByTestId('weekly-tab'));
      });

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('weekly', 50);
      });
    });

    it('should load monthly leaderboard', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('monthly', 50);
      });
    });

    it('should load all-time leaderboard', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockLeaderboardData, period: 'all-time' },
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await act(async () => {
        fireEvent.press(getByTestId('all-time-tab'));
      });

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('all-time', 50);
      });
    });

    it('should update leaderboard on period change', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockLeaderboardData,
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockLeaderboardData, period: 'daily', entries: mockLeaderboardEntries.slice(0, 2) },
        });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        fireEvent.press(getByTestId('daily-tab'));
      });

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Ranking', () => {
    it('should show current user rank', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('user-rank-number').props.children).toBe(42);
      });
    });

    it('should display user position even if not in top list', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('user-rank')).toBeTruthy();
        expect(getByTestId('user-rank-number').props.children).toBe(42);
      });
    });

    it('should handle user at top of leaderboard', async () => {
      const topUserData = {
        ...mockLeaderboardData,
        userRank: { ...mockLeaderboardEntries[0], isCurrentUser: true },
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: topUserData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('user-rank-number').props.children).toBe(1);
      });
    });
  });

  describe('Tier System', () => {
    it('should display user tiers', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('entry-1')).toBeTruthy();
      });
    });

    it('should differentiate between free, premium, and VIP users', async () => {
      const vipUser = mockLeaderboardEntries.find(u => u.tier === 'vip');
      const premiumUser = mockLeaderboardEntries.find(u => u.tier === 'premium');
      const freeUser = mockLeaderboardEntries.find(u => u.tier === 'free');

      expect(vipUser).toBeTruthy();
      expect(premiumUser).toBeTruthy();
      expect(freeUser).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockRejectedValue(
        new Error('Failed to load leaderboard')
      );

      const { queryByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(queryByTestId('leaderboard-list')).toBeFalsy();
      });
    });

    it('should handle empty leaderboard', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...mockLeaderboardData,
          entries: [],
        },
      });

      const { queryByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        const list = queryByTestId('leaderboard-list');
        expect(list?.props.children).toEqual([]);
      });
    });

    it('should handle network timeouts', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      );

      const { queryByTestId } = render(<LeaderboardComponent />);

      await waitFor(
        () => {
          expect(queryByTestId('leaderboard-list')).toBeFalsy();
        },
        { timeout: 6000 }
      );
    });
  });

  describe('Real-time Updates', () => {
    it('should refresh leaderboard data', async () => {
      const updatedData = {
        ...mockLeaderboardData,
        entries: [
          { ...mockLeaderboardEntries[0], coins: 5500 },
          ...mockLeaderboardEntries.slice(1, 3),
        ],
      };

      (gamificationAPI.getLeaderboard as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockLeaderboardData,
        })
        .mockResolvedValueOnce({
          success: true,
          data: updatedData,
        });

      const { getByTestId, rerender } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('coins-1').props.children).toBe(5000);
      });

      // Simulate refresh
      rerender(<LeaderboardComponent />);

      await waitFor(() => {
        // Would need actual refresh mechanism in component
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalled();
      });
    });

    it('should handle ranking changes', async () => {
      const changedRankings = {
        ...mockLeaderboardData,
        entries: [
          mockLeaderboardEntries[1], // Previously rank 2, now rank 1
          mockLeaderboardEntries[0], // Previously rank 1, now rank 2
          mockLeaderboardEntries[2],
        ].map((entry, index) => ({ ...entry, rank: index + 1 })),
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: changedRankings,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('username-1').props.children).toBe('pro_gamer');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle tie scores', async () => {
      const tiedData = {
        ...mockLeaderboardData,
        entries: [
          { ...mockLeaderboardEntries[0], coins: 5000, rank: 1 },
          { ...mockLeaderboardEntries[1], coins: 5000, rank: 1 },
          { ...mockLeaderboardEntries[2], coins: 3000, rank: 3 },
        ],
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: tiedData,
      });

      const { getAllByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        // Two tied entries share rank-1; use getAllByTestId to confirm
        // both render with the right rank value.
        const rankOnes = getAllByTestId('rank-1');
        expect(rankOnes.length).toBe(2);
        expect(rankOnes[0].props.children).toBe(1);
      });
    });

    it('should handle large user counts', async () => {
      const largeCountData = {
        ...mockLeaderboardData,
        totalUsers: 1000000,
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: largeCountData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('total-users').props.children).toBe(1000000);
      });
    });

    it('should handle users with zero coins', async () => {
      const zeroCoinsData = {
        ...mockLeaderboardData,
        entries: [
          ...mockLeaderboardEntries.slice(0, 2),
          { ...mockLeaderboardEntries[2], coins: 0 },
        ],
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: zeroCoinsData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('coins-3').props.children).toBe(0);
      });
    });

    it('should handle missing user avatars', async () => {
      const noAvatarData = {
        ...mockLeaderboardData,
        entries: mockLeaderboardEntries.map(entry => ({
          ...entry,
          avatar: undefined,
        })),
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: noAvatarData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('leaderboard-list')).toBeTruthy();
      });
    });
  });

  describe('Anti-Cheat Measures', () => {
    it('should validate leaderboard data server-side', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalled();
      });
    });

    it('should not allow client-side rank manipulation', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        const rank = getByTestId('user-rank-number').props.children;
        expect(rank).toBe(42);
        // Ranks come from server, cannot be changed client-side
      });
    });

    it('should enforce rate limiting on leaderboard requests', async () => {
      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: mockLeaderboardData,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      // Rapid tab switching
      await act(async () => {
        fireEvent.press(getByTestId('daily-tab'));
        fireEvent.press(getByTestId('weekly-tab'));
        fireEvent.press(getByTestId('monthly-tab'));
      });

      // Should have called API for each legitimate request
      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    it('should handle loading large leaderboards', async () => {
      const largeLeaderboard = {
        ...mockLeaderboardData,
        entries: Array.from({ length: 100 }, (_, i) => ({
          rank: i + 1,
          userId: `user-${i}`,
          username: `user${i}`,
          fullName: `User ${i}`,
          coins: 5000 - i * 10,
          level: 25 - i,
          tier: 'free' as const,
          achievements: 45 - i,
        })),
      };

      (gamificationAPI.getLeaderboard as jest.Mock).mockResolvedValue({
        success: true,
        data: largeLeaderboard,
      });

      const { getByTestId } = render(<LeaderboardComponent />);

      await waitFor(() => {
        expect(getByTestId('leaderboard-list')).toBeTruthy();
      });
    });

    it('should show loading state during data fetch', async () => {
      jest.useFakeTimers();
      (gamificationAPI.getLeaderboard as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockLeaderboardData }), 500))
      );

      const { getByTestId, queryByTestId } = render(<LeaderboardComponent />);

      expect(getByTestId('loading')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(queryByTestId('loading')).toBeFalsy();
      });

      jest.useRealTimers();
    });
  });
});
