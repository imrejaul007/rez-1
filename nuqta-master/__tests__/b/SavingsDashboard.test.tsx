import React from 'react';
import { render } from '@testing-library/react-native';
import SavingsDashboard from '@/components/b/savings/SavingsDashboard';
import SavingsHistoryItem from '@/components/b/savings/SavingsHistoryItem';
import SavingsGoalCard from '@/components/b/savings/SavingsGoalCard';
import {
  useSavingsDashboard,
  useSavingsGoals,
  useSavingsRecommendations,
  useSavingsLoading,
  useSavingsError,
  useSavingsActions,
} from '@/stores/selectors';

jest.mock('@/stores/selectors', () => ({
  useSavingsDashboard: jest.fn(),
  useSavingsGoals: jest.fn(),
  useSavingsRecommendations: jest.fn(),
  useSavingsLoading: jest.fn(),
  useSavingsError: jest.fn(),
  useSavingsActions: jest.fn(),
}));

jest.mock('@/hooks/b/useFeatureFlag', () => ({
  useFeatureFlag: jest.fn(() => ({ isEnabled: true, value: true, setFeatureFlag: jest.fn() })),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children ?? null,
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((v: number) => v),
    withRepeat: jest.fn((v: number) => v),
    interpolate: jest.fn(() => 0),
  };
});

const mockDashboard = {
  totalSavedPaise: 1234500,
  thisMonthSavedPaise: 250000,
  thisMonthTargetPaise: 500000,
  goalsCount: 2,
  streak: {
    currentStreakDays: 5,
    longestStreakDays: 10,
    lastActivityDate: new Date().toISOString().split('T')[0],
    isAtRisk: false,
    nextMilestoneDays: 7,
  },
  lastCalculatedAt: new Date().toISOString(),
  recentActivity: [
    {
      id: 'sv_1',
      date: new Date().toISOString(),
      source: 'cashback' as const,
      amountPaise: 12500,
      description: 'Cashback test',
      storeName: 'Test Store',
    },
  ],
};

describe('SavingsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSavingsActions as jest.Mock).mockReturnValue({ fetchDashboard: jest.fn() });
    (useSavingsError as jest.Mock).mockReturnValue(null);
  });

  it('exports a valid SavingsHistoryItem component default', () => {
    expect(SavingsHistoryItem).toBeTruthy();
    expect(SavingsGoalCard).toBeTruthy();
    expect(typeof SavingsHistoryItem).toBe(typeof SavingsGoalCard);
    expect((SavingsHistoryItem as any).$$typeof).toBeTruthy();
  });

  it('renders skeleton while loading without dashboard', () => {
    (useSavingsDashboard as jest.Mock).mockReturnValue(null);
    (useSavingsGoals as jest.Mock).mockReturnValue([]);
    (useSavingsRecommendations as jest.Mock).mockReturnValue([]);
    (useSavingsLoading as jest.Mock).mockReturnValue(true);

    const { getByLabelText } = render(<SavingsDashboard />);
    expect(getByLabelText('Loading savings')).toBeTruthy();
  });

  it('renders dashboard content when data is available', () => {
    (useSavingsDashboard as jest.Mock).mockReturnValue(mockDashboard);
    (useSavingsGoals as jest.Mock).mockReturnValue([
      {
        id: 'g1',
        userId: 'u1',
        name: 'Trip',
        targetAmountPaise: 100000,
        targetPaise: 100000,
        savedAmountPaise: 50000,
        savedPaise: 50000,
        deadline: '2026-12-31T00:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCompleted: false,
      },
    ]);
    (useSavingsRecommendations as jest.Mock).mockReturnValue([
      {
        id: 'r1',
        type: 'cashback_boost' as const,
        title: 'Boost',
        description: 'Save more',
        potentialSavingsPaise: 50000,
      },
    ]);
    (useSavingsLoading as jest.Mock).mockReturnValue(false);

    const { getByText } = render(<SavingsDashboard />);
    expect(getByText('Total saved')).toBeTruthy();
    expect(getByText('Your goals')).toBeTruthy();
    expect(getByText('Recommendations')).toBeTruthy();
    expect(getByText('Cashback test')).toBeTruthy();
  });
});
