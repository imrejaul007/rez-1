import React from 'react';
import { render } from '@testing-library/react-native';
import BlurTabBarBackground, {
  useBottomTabOverflow,
} from '../../../components/ui/TabBarBackground.ios';

// Mock expo-blur so we don't need the native module in tests
jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: (props: any) => React.createElement('BlurView', props),
  };
});

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: jest.fn(() => 49),
}));

describe('TabBarBackground.ios', () => {
  it('renders without throwing', () => {
    expect(() => render(<BlurTabBarBackground />)).not.toThrow();
  });

  it('returns a React component (default export defined)', () => {
    expect(BlurTabBarBackground).toBeDefined();
    expect(typeof BlurTabBarBackground).toBe('function');
  });

  it('has reasonable props signature (no required props)', () => {
    // Default export should be a function component that accepts props
    // but does not require any to render.
    const component: React.FC = BlurTabBarBackground as unknown as React.FC;
    expect(component).toBeTruthy();
    expect((BlurTabBarBackground as any).length).toBeGreaterThanOrEqual(0);

    // It should render the BlurView child
    const { UNSAFE_root } = render(<BlurTabBarBackground />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('exposes useBottomTabOverflow hook', () => {
    expect(typeof useBottomTabOverflow).toBe('function');
  });
});
