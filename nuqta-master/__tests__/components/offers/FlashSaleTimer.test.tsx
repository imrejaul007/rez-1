/**
 * FlashSaleTimer Component - Unit Tests
 *
 * Tests for the FlashSaleTimer component including:
 * - Basic rendering
 * - Countdown display in HH:MM:SS format
 * - onExpire callback when timer reaches zero
 * - Expired state UI
 * - Countdown updates every second
 * - Compact mode rendering
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import FlashSaleTimer from '@/components/offers/FlashSaleTimer';

// Mock the LinearGradient (already mocked in jest.setup.js, but explicit here for clarity)
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

describe('FlashSaleTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without throwing', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in the future
    expect(() => render(<FlashSaleTimer endTime={futureDate} />)).not.toThrow();
  });

  it('renders countdown in HH:MM:SS format from endTime prop', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000); // 02:30:45
    const { getByText } = render(<FlashSaleTimer endTime={futureDate} />);

    // The component pads numbers to 2 digits, so expect "02", "30", "45"
    expect(getByText('02')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
    expect(getByText('45')).toBeTruthy();
    expect(getByText('HR')).toBeTruthy();
    expect(getByText('MIN')).toBeTruthy();
    expect(getByText('SEC')).toBeTruthy();
  });

  it('fires onExpire once when timer reaches zero', () => {
    const onExpire = jest.fn();
    // End time 1 second in the future: first tick at t=0 (diff>0), tick at t=1000ms expires (1 call)
    const endTime = new Date(Date.now() + 1000);

    render(<FlashSaleTimer endTime={endTime} onExpire={onExpire} />);

    // Advance just enough to trigger exactly one expiration tick
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('renders expired state UI when endTime is in the past', () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in the past
    const { getByText, queryByText } = render(<FlashSaleTimer endTime={pastDate} />);

    expect(getByText('Sale Ended')).toBeTruthy();
    // Ensure normal countdown labels are not present
    expect(queryByText('HR')).toBeNull();
    expect(queryByText('MIN')).toBeNull();
    expect(queryByText('SEC')).toBeNull();
  });

  it('updates countdown every second (advance 1s and verify)', () => {
    const endTime = new Date(Date.now() + 10 * 1000); // 10 seconds
    const { getByText } = render(<FlashSaleTimer endTime={endTime} />);

    // Initial render: should show "10" seconds (padded to "10")
    expect(getByText('10')).toBeTruthy();

    // Advance 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Now should show "09"
    expect(getByText('09')).toBeTruthy();

    // Advance another 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Now should show "07"
    expect(getByText('07')).toBeTruthy();
  });

  it('compact mode renders smaller layout', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000);
    const { queryByText, getByText } = render(
      <FlashSaleTimer endTime={futureDate} compact={true} />
    );

    // In compact mode, the unit labels (HR, MIN, SEC) are not rendered
    expect(queryByText('HR')).toBeNull();
    expect(queryByText('MIN')).toBeNull();
    expect(queryByText('SEC')).toBeNull();

    // But the numbers still render
    expect(getByText('02')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
    expect(getByText('45')).toBeTruthy();
  });
});
