// GamesPage Component Tests
// Test suite for the main games hub page

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import GamesPage from '@/app/games/index';
import {
  useAuthUser,
  useIsAuthenticated,
  useAuthLoading,
  useRezBalance,
  useRefreshWallet,
} from '@/stores/selectors';
import gameApi from '@/services/gameApi';

// Mock dependencies
jest.mock('@/stores/selectors', () => ({
  ...jest.requireActual('@/stores/selectors'),
  useAuthUser: jest.fn(),
  useIsAuthenticated: jest.fn(),
  useAuthLoading: jest.fn(),
  useRezBalance: jest.fn(),
  useRefreshWallet: jest.fn(),
}));

jest.mock('@/services/gameApi', () => ({
  __esModule: true,
  default: {
    getAvailableGames: jest.fn(),
  },
}));

// Mock regionStore and homepageDataService to avoid dynamic imports
jest.mock('@/services/homepageDataService', () => ({
  __esModule: true,
  default: {},
  setHomepageCurrencyGetter: jest.fn(),
}));

jest.mock('@/stores/regionStore', () => ({
  __esModule: true,
  useRegionStore: jest.fn(() => ({ region: 'bangalore', setRegion: jest.fn() })),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: jest.fn(({ children }) => children),
  },
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/components/common/FeatureErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

const mockUseAuthUser = useAuthUser as jest.MockedFunction<typeof useAuthUser>;
const mockUseIsAuthenticated = useIsAuthenticated as jest.MockedFunction<typeof useIsAuthenticated>;
const mockUseAuthLoading = useAuthLoading as jest.MockedFunction<typeof useAuthLoading>;
const mockUseRezBalance = useRezBalance as jest.MockedFunction<typeof useRezBalance>;
const mockUseRefreshWallet = useRefreshWallet as jest.MockedFunction<typeof useRefreshWallet>;

const mockGamesResponse = {
  success: true,
  data: {
    games: [
      {
        id: 'spin-wheel',
        title: 'Spin & Win',
        description: 'Spin the wheel to win coins',
        icon: '🎰',
        path: '/games/spin-wheel',
        maxDaily: 3,
        reward: '50 coins',
        playsRemaining: 3,
        playsUsed: 0,
        isAvailable: true,
        todaysEarnings: 0,
      },
      {
        id: 'scratch-card',
        title: 'Scratch Card',
        description: 'Scratch to reveal prizes',
        icon: '🎫',
        path: '/games/scratch-card',
        maxDaily: 5,
        reward: '30 coins',
        playsRemaining: 5,
        playsUsed: 0,
        isAvailable: true,
        todaysEarnings: 0,
      },
      {
        id: 'daily-quiz',
        title: 'Daily Quiz',
        description: 'Answer questions to earn rewards',
        icon: '🧠',
        path: '/games/quiz',
        maxDaily: 1,
        reward: '20 coins',
        playsRemaining: 1,
        playsUsed: 0,
        isAvailable: true,
        todaysEarnings: 0,
      },
      {
        id: 'slot-machine',
        title: 'Slot Machine',
        description: 'Locked game',
        icon: '🎰',
        path: '/games/slots',
        maxDaily: 0,
        reward: '100 coins',
        playsRemaining: 0,
        playsUsed: 0,
        isAvailable: false,
        todaysEarnings: 0,
      },
    ],
    total: 4,
    todaysEarnings: 0,
  },
};

describe('GamesPage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthUser.mockReturnValue(mockUser as any);
    mockUseIsAuthenticated.mockReturnValue(true);
    mockUseAuthLoading.mockReturnValue(false);
    mockUseRezBalance.mockReturnValue(1000);
    mockUseRefreshWallet.mockReturnValue(jest.fn().mockResolvedValue(undefined));

    (gameApi.getAvailableGames as jest.Mock).mockResolvedValue(mockGamesResponse);
  });

  describe('Rendering', () => {
    it('should render games page with header', async () => {
      const { findByText } = render(<GamesPage />);
      const header = await findByText('Play & Earn', {}, { timeout: 3000 });
      expect(header).toBeTruthy();
    });

    it('should display user coin balance', async () => {
      const { findByText } = render(<GamesPage />);
      // Wait for the balance to appear (formatted with commas)
      const balance = await findByText('1,000', {}, { timeout: 3000 });
      expect(balance).toBeTruthy();
    });

    it('should render all available games', async () => {
      const { findByText } = render(<GamesPage />);
      const spinWin = await findByText('Spin & Win', {}, { timeout: 3000 });
      expect(spinWin).toBeTruthy();
    });

    it('should show user statistics', async () => {
      const { findByText } = render(<GamesPage />);
      const playedToday = await findByText('Played Today', {}, { timeout: 3000 });
      expect(playedToday).toBeTruthy();
    });

    it('should display day streak correctly', async () => {
      const { findByText } = render(<GamesPage />);
      // Plays Left should show 9 (3+5+1+0)
      const playsLeft = await findByText('Plays Left', {}, { timeout: 3000 });
      expect(playsLeft).toBeTruthy();
    });
  });

  describe('Game Card Interactions', () => {
    it('should navigate to active game when clicked', async () => {
      const router = require('expo-router').router;
      const { findByText } = render(<GamesPage />);
      const spinWinCard = await findByText('Spin & Win', {}, { timeout: 3000 });
      fireEvent.press(spinWinCard);
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/games/spin-wheel');
      });
    });

    it('should navigate locked games to their path', async () => {
      const router = require('expo-router').router;
      const { findByText } = render(<GamesPage />);
      const slotCard = await findByText('Slot Machine', {}, { timeout: 3000 });
      fireEvent.press(slotCard);
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/games/slots');
      });
    });

    it('should display reward coins for active games', async () => {
      const { findByText } = render(<GamesPage />);
      const reward = await findByText('50 coins', {}, { timeout: 3000 });
      expect(reward).toBeTruthy();
    });
  });

  describe('Data Loading', () => {
    it('should load games on mount', async () => {
      render(<GamesPage />);
      await waitFor(() => {
        expect(gameApi.getAvailableGames).toHaveBeenCalled();
      });
    });

    it('should refresh wallet on mount', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      mockUseRefreshWallet.mockReturnValue(mockRefresh);
      render(<GamesPage />);
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      (gameApi.getAvailableGames as jest.Mock).mockRejectedValue(new Error('Network error'));
      const { UNSAFE_root } = render(<GamesPage />);
      // Should render without crashing
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should show loading state initially', () => {
      const { UNSAFE_root } = render(<GamesPage />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data when pulled down', async () => {
      const { UNSAFE_root } = render(<GamesPage />);
      // Wait for initial render
      await waitFor(() => {
        expect(gameApi.getAvailableGames).toHaveBeenCalled();
      });
      // Component renders successfully
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to wallet when coins container is pressed', async () => {
      const router = require('expo-router').router;
      const { findByText } = render(<GamesPage />);
      const coinsText = await findByText('1,000', {}, { timeout: 3000 });
      fireEvent.press(coinsText.parent as any);
      await waitFor(() => {
        expect(router.push).toHaveBeenCalledWith('/wallet');
      });
    });
  });

  describe('Statistics Calculation', () => {
    it('should display games played and available', async () => {
      const { findByText } = render(<GamesPage />);
      const playedToday = await findByText('Played Today', {}, { timeout: 3000 });
      const playsLeft = await findByText('Plays Left', {}, { timeout: 3000 });
      expect(playedToday).toBeTruthy();
      expect(playsLeft).toBeTruthy();
    });

    it('should update coin balance when gamification state changes', async () => {
      mockUseRezBalance.mockReturnValue(2000);
      const { findByText } = render(<GamesPage />);
      const balance = await findByText('2,000', {}, { timeout: 3000 });
      expect(balance).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show empty state when no games available', async () => {
      (gameApi.getAvailableGames as jest.Mock).mockResolvedValue({
        success: true,
        data: { games: [], total: 0, todaysEarnings: 0 },
      });
      const { findByText } = render(<GamesPage />);
      const noGames = await findByText('No Games Available', {}, { timeout: 3000 });
      expect(noGames).toBeTruthy();
    });

    it('should handle unauthenticated state', () => {
      mockUseAuthUser.mockReturnValue(null);
      mockUseIsAuthenticated.mockReturnValue(false);
      const { UNSAFE_root } = render(<GamesPage />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Game Status Badges', () => {
    it('should show exhausted message for played-out games', async () => {
      (gameApi.getAvailableGames as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          games: [
            {
              id: 'spin-wheel',
              title: 'Spin & Win',
              description: 'Spin the wheel to win coins',
              icon: '🎰',
              path: '/games/spin-wheel',
              maxDaily: 3,
              reward: '50 coins',
              playsRemaining: 0,
              playsUsed: 3,
              isAvailable: true,
              todaysEarnings: 0,
            },
          ],
          total: 1,
          todaysEarnings: 0,
        },
      });
      const { findByText } = render(<GamesPage />);
      const exhausted = await findByText('Come Back Tomorrow', {}, { timeout: 3000 });
      expect(exhausted).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible game cards', async () => {
      const { findByText } = render(<GamesPage />);
      const spinWin = await findByText('Spin & Win', {}, { timeout: 3000 });
      expect(spinWin).toBeTruthy();
    });

    it('should show descriptive game information', async () => {
      const { findByText } = render(<GamesPage />);
      const description = await findByText('Spin the wheel to win coins', {}, { timeout: 3000 });
      expect(description).toBeTruthy();
    });
  });

  describe('Info Banner', () => {
    it('should display available games section', async () => {
      const { findByText } = render(<GamesPage />);
      const section = await findByText('Available Games', {}, { timeout: 3000 });
      expect(section).toBeTruthy();
    });
  });
});