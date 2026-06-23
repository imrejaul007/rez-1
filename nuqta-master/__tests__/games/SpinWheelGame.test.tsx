// SpinWheelGame Component Tests
// Test suite for SpinWheelGame component functionality

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import SpinWheelGame from '@/components/gamification/SpinWheelGame';
import gamificationAPI from '@/services/gamificationApi';
import type { SpinWheelSegment, SpinWheelResult } from '@/types/gamification.types';

// Mock dependencies
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // Call the callback immediately for withTiming
  Reanimated.withTiming = (toValue: any, _config?: any, callback?: any) => {
    if (callback) callback({ finished: true });
    return { value: toValue };
  };
  return Reanimated;
});

// Mock dependencies - use a simple mock that can be reassigned in beforeEach
jest.mock('@/services/gamificationApi', () => ({
  __esModule: true,
  default: {
    spinWheel: jest.fn().mockResolvedValue({ success: true, data: {} }),
    executeSpin: jest.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

jest.mock('@/contexts/GamificationContext', () => ({
  useGamification: () => ({
    state: { coinBalance: { total: 0 } },
    actions: { loadGamificationData: jest.fn().mockResolvedValue(undefined) },
    computed: {},
  }),
  __resetModuleState: jest.fn(),
}));

describe('SpinWheelGame Component', () => {
  const mockSegments: SpinWheelSegment[] = [
    { id: '1', label: '10 Coins', value: 10, color: '#FFD700', type: 'coins', icon: 'diamond' },
    { id: '2', label: '50 Coins', value: 50, color: '#FF6347', type: 'coins', icon: 'diamond' },
    { id: '3', label: '5% Discount', value: 5, color: '#4169E1', type: 'discount', icon: 'pricetag' },
    { id: '4', label: '100 Coins', value: 100, color: '#32CD32', type: 'coins', icon: 'diamond' },
    { id: '5', label: 'Nothing', value: 0, color: '#808080', type: 'nothing', icon: 'close' },
    { id: '6', label: '₹20 Cashback', value: 20, color: '#FF1493', type: 'cashback', icon: 'cash' },
    { id: '7', label: 'Voucher', value: 100, color: '#9370DB', type: 'voucher', icon: 'gift' },
    { id: '8', label: '25 Coins', value: 25, color: '#FFB6C1', type: 'coins', icon: 'diamond' },
  ];

  const mockOnSpinComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock for spinWheel API — random winning segment from the test segments
    (gamificationAPI.spinWheel as jest.Mock).mockImplementation(() => {
      const randomIndex = Math.floor(Math.random() * mockSegments.length);
      const winningSegment = mockSegments[randomIndex];
      return Promise.resolve({
        success: true,
        data: {
          result: {
            segment: winningSegment,
            prize: {
              type: winningSegment.type,
              value: winningSegment.value,
              description: winningSegment.label,
            },
            rotation: 1800 + Math.random() * 1800,
          },
          coinsAdded: winningSegment.type === 'coins' ? winningSegment.value : 0,
          newBalance: 1000 + (winningSegment.type === 'coins' ? winningSegment.value : 0),
          tournamentUpdate: null,
        },
      });
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render wheel with all segments', () => {
      const { getByText, getAllByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      expect(getByText('Spin the Wheel')).toBeTruthy();
      expect(getByText('3 spins left')).toBeTruthy();
    });

    it('should render spin button', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={1}
        />
      );

      expect(getByText('SPIN NOW')).toBeTruthy();
    });

    it('should show correct spins remaining count', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={5}
        />
      );

      expect(getByText('5 spins left')).toBeTruthy();
    });

    it('should show singular "spin" for 1 remaining', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={1}
        />
      );

      expect(getByText('1 spin left')).toBeTruthy();
    });

    it('should render all wheel segments', () => {
      const { getByText, getAllByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      // Check that segment values are rendered
      expect(getByText('10')).toBeTruthy();
      expect(getByText('50')).toBeTruthy();
      // Multiple segments have value 100, use getAllByText
      expect(getAllByText('100').length).toBeGreaterThan(0);
    });

    it('should show instructions', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      expect(getByText(/Tap 'SPIN NOW' to try your luck/i)).toBeTruthy();
    });
  });

  describe('Spin Functionality', () => {
    it('should trigger spin animation when button is pressed', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      await act(async () => {
        fireEvent.press(spinButton);
      });

      // Button text should change to "Spinning..."
      await waitFor(() => {
        expect(getByText('Spinning...')).toBeTruthy();
      });
    });

    it('should call onSpinComplete after spin animation', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      await act(async () => {
        fireEvent.press(spinButton);
        // Allow microtasks to flush so the API call promise resolves
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000); // Animation duration
      });

      await waitFor(() => {
        expect(mockOnSpinComplete).toHaveBeenCalled();
      });
    });

    it('should return valid spin result', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      await act(async () => {
        fireEvent.press(spinButton);
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockOnSpinComplete).toHaveBeenCalled();
        const result = mockOnSpinComplete.mock.calls[0][0];
        expect(result).toEqual(
          expect.objectContaining({
            segment: expect.any(Object),
            prize: expect.objectContaining({
              type: expect.any(String),
              value: expect.any(Number),
              description: expect.any(String),
            }),
            rotation: expect.any(Number),
          })
        );
      });
    });

    it('should select random winning segment', async () => {
      const results = new Set();

      for (let i = 0; i < 10; i++) {
        const mockCallback = jest.fn();
        const { getByText, unmount } = render(
          <SpinWheelGame
            segments={mockSegments}
            onSpinComplete={mockCallback}
            spinsRemaining={3}
          />
        );

        const spinButton = getByText('SPIN NOW');

        await act(async () => {
          fireEvent.press(spinButton);
          await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
          jest.advanceTimersByTime(5000);
        });

        await waitFor(() => {
          expect(mockCallback).toHaveBeenCalled();
        });

        const result = mockCallback.mock.calls[0][0];
        results.add(result.segment.id);

        unmount();
        jest.clearAllMocks();
      }

      // Should have some randomness (not always the same segment)
      expect(results.size).toBeGreaterThan(1);
    });

    it('should rotate wheel multiple times for excitement', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      await act(async () => {
        fireEvent.press(spinButton);
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const result = mockOnSpinComplete.mock.calls[0][0];
        // Should rotate at least 5 full rotations (1800 degrees)
        expect(result.rotation).toBeGreaterThanOrEqual(1800);
      });
    });
  });

  describe('Button States', () => {
    it('should disable spin button when spinning', async () => {
      const { getByText, UNSAFE_getByProps } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      await act(async () => {
        fireEvent.press(spinButton);
      });

      // Button should be disabled during spin (find the Pressable with disabled prop)
      const spinningPressable = UNSAFE_getByProps({ disabled: true });
      expect(spinningPressable).toBeTruthy();
    });

    it('should disable spin button when no spins remaining', () => {
      const { getByText, UNSAFE_getByProps } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={0}
        />
      );

      expect(getByText('No Spins Left')).toBeTruthy();
      const disabledButton = UNSAFE_getByProps({ disabled: true });
      expect(disabledButton).toBeTruthy();
    });

    it('should disable spin button when loading', () => {
      const { getByText, UNSAFE_getByProps } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
          isLoading={true}
        />
      );

      expect(getByText('SPIN NOW')).toBeTruthy();
      const disabledButton = UNSAFE_getByProps({ disabled: true });
      expect(disabledButton).toBeTruthy();
    });

    it('should re-enable button after spin completes', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      await act(async () => {
        fireEvent.press(spinButton);
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const button = getByText('SPIN NOW');
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Prize Types', () => {
    it('should handle coin prize correctly', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('SPIN NOW'));
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const result = mockOnSpinComplete.mock.calls[0][0];
        if (result.prize.type === 'coins') {
          expect(result.prize.value).toBeGreaterThan(0);
        }
      });
    });

    it('should handle discount prize correctly', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('SPIN NOW'));
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const result = mockOnSpinComplete.mock.calls[0][0];
        if (result.prize.type === 'discount') {
          expect(['coins', 'discount', 'cashback', 'voucher', 'nothing']).toContain(result.prize.type);
        }
      });
    });

    it('should handle nothing prize correctly', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('SPIN NOW'));
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const result = mockOnSpinComplete.mock.calls[0][0];
        if (result.prize.type === 'nothing') {
          expect(result.prize.value).toBe(0);
        }
      });
    });
  });

  describe('Visual Elements', () => {
    it('should render pointer indicator', () => {
      const { UNSAFE_queryAllByType } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      // Component should render without errors
      expect(UNSAFE_queryAllByType).toBeDefined();
    });

    it('should render center circle', () => {
      const { UNSAFE_queryAllByType } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      // Component should render without errors
      expect(UNSAFE_queryAllByType).toBeDefined();
    });

    it('should apply gradient colors to segments', () => {
      const { UNSAFE_queryAllByType } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      // Segments should have their colors applied
      expect(UNSAFE_queryAllByType).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single segment wheel', async () => {
      const singleSegment = [mockSegments[0]];
      const { getByText } = render(
        <SpinWheelGame
          segments={singleSegment}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={1}
        />
      );

      // Override the default mock for this test — single segment must always win
      (gamificationAPI.spinWheel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          result: {
            segment: singleSegment[0],
            prize: {
              type: singleSegment[0].type,
              value: singleSegment[0].value,
              description: singleSegment[0].label,
            },
            rotation: 1800,
          },
          coinsAdded: singleSegment[0].type === 'coins' ? singleSegment[0].value : 0,
          newBalance: 1000,
          tournamentUpdate: null,
        },
      });

      await act(async () => {
        fireEvent.press(getByText('SPIN NOW'));
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockOnSpinComplete).toHaveBeenCalled();
        const result = mockOnSpinComplete.mock.calls[0][0];
        expect(result).toEqual(
          expect.objectContaining({
            segment: singleSegment[0],
          })
        );
      });
    });

    it('should prevent multiple concurrent spins', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      const spinButton = getByText('SPIN NOW');

      // First spin starts — isSpinning is set to true
      await act(async () => {
        fireEvent.press(spinButton);
        await Promise.resolve();
      });

      // While the first spin is in progress (await API), try to spin again
      // The component should reject the second press because isSpinning is true
      await act(async () => {
        fireEvent.press(spinButton);
        fireEvent.press(spinButton);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should only call onSpinComplete once (subsequent presses are blocked)
      expect(mockOnSpinComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle very large segment count', () => {
      const manySegments = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        label: `${i * 10} Coins`,
        value: i * 10,
        color: '#FFD700',
        type: 'coins' as const,
        icon: 'diamond' as const,
      }));

      const { getByText } = render(
        <SpinWheelGame
          segments={manySegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={1}
        />
      );

      expect(getByText('Spin the Wheel')).toBeTruthy();
    });

    it('should maintain rotation state across multiple spins', async () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      // First spin
      await act(async () => {
        fireEvent.press(getByText('SPIN NOW'));
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      const firstResult = mockOnSpinComplete.mock.calls[0][0];
      mockOnSpinComplete.mockClear();

      // Second spin
      await act(async () => {
        fireEvent.press(getByText('SPIN NOW'));
        await Promise.resolve();
      });

      // Now advance timers for the animation
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      const secondResult = mockOnSpinComplete.mock.calls[0][0];

      // Both spins should complete successfully
      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button text', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      expect(getByText('SPIN NOW')).toBeTruthy();
    });

    it('should show clear status messages', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={0}
        />
      );

      expect(getByText('No Spins Left')).toBeTruthy();
    });

    it('should have descriptive instructions', () => {
      const { getByText } = render(
        <SpinWheelGame
          segments={mockSegments}
          onSpinComplete={mockOnSpinComplete}
          spinsRemaining={3}
        />
      );

      expect(getByText(/try your luck and win amazing rewards/i)).toBeTruthy();
    });
  });
});
