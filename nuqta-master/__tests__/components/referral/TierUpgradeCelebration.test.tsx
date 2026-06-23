/**
 * TierUpgradeCelebration Component Tests
 *
 * Tests for the full-screen celebration animation when user advances to new referral tier
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock useGetCurrencySymbol
jest.mock('@/stores/selectors', () => ({
  useGetCurrencySymbol: jest.fn(() => () => 'Rs. '),
}));

// Mock react-native-reanimated with shared value tracking
const sharedValueCalls: any[] = [];
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  const withSpringMock = jest.fn((v) => v);
  const withTimingMock = jest.fn((v) => v);
  const withSequenceMock = jest.fn((v) => v);
  const interpolateMock = jest.fn(() => 0);
  const useSharedValueMock = jest.fn((v) => {
    const sv = { value: v };
    sharedValueCalls.push(sv);
    return sv;
  });
  const useAnimatedStyleMock = jest.fn((cb) => {
    try {
      return cb();
    } catch {
      return {};
    }
  });
  return {
    ...Reanimated,
    useSharedValue: useSharedValueMock,
    useAnimatedStyle: useAnimatedStyleMock,
    withSpring: withSpringMock,
    withTiming: withTimingMock,
    withSequence: withSequenceMock,
    interpolate: interpolateMock,
    __mockWithSpring: withSpringMock,
    __mockWithTiming: withTimingMock,
  };
});

import TierUpgradeCelebration from '@/components/referral/TierUpgradeCelebration';
import { REFERRAL_TIERS } from '@/types/referral.types';

describe('TierUpgradeCelebration', () => {
  const mockOnClose = jest.fn();

  const defaultProps = {
    visible: true,
    newTier: 'PRO',
    tierData: REFERRAL_TIERS.PRO,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sharedValueCalls.length = 0;
  });

  it('renders without throwing', () => {
    expect(() => render(<TierUpgradeCelebration {...defaultProps} />)).not.toThrow();
  });

  it('renders celebration UI when visible=true', () => {
    const { getByText } = render(<TierUpgradeCelebration {...defaultProps} />);
    expect(getByText('CONGRATULATIONS!')).toBeTruthy();
    expect(getByText(/Pro/)).toBeTruthy();
    expect(getByText("You've unlocked a new tier!")).toBeTruthy();
    expect(getByText('New Benefits Unlocked:')).toBeTruthy();
  });

  it('renders nothing when visible=false', () => {
    const { queryByText } = render(
      <TierUpgradeCelebration {...defaultProps} visible={false} />
    );
    expect(queryByText('CONGRATULATIONS!')).toBeNull();
    expect(queryByText(/Pro/)).toBeNull();
  });

  it('calls onDismiss after button press', () => {
    const { getByText } = render(<TierUpgradeCelebration {...defaultProps} />);
    const continueButton = getByText('Continue');
    fireEvent.press(continueButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays new tier name from prop', () => {
    const { getByText } = render(
      <TierUpgradeCelebration
        {...defaultProps}
        newTier="ELITE"
        tierData={REFERRAL_TIERS.ELITE}
      />
    );
    expect(getByText(/Elite/)).toBeTruthy();
  });

  it('triggers confetti animation on mount', () => {
    // Clear any earlier shared value calls
    sharedValueCalls.length = 0;
    render(<TierUpgradeCelebration {...defaultProps} />);

    // Confetti creates 30 particles plus scale and fade = 32 shared values.
    // Verify that at least 30 confetti shared values were created
    // (plus the 2 for scale/fade)
    expect(sharedValueCalls.length).toBeGreaterThanOrEqual(30);

    // Verify withTiming was called multiple times for confetti particles
    const reanimatedMock = require('react-native-reanimated');
    // onMount visible=true → scale + fade + confetti withTiming animations
    expect(reanimatedMock.__mockWithTiming).toHaveBeenCalled();
    expect(reanimatedMock.__mockWithSpring).toHaveBeenCalled();
  });
});