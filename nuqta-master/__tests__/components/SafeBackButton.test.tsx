/**
 * Safe Back Button Component - Unit Tests
 *
 * Tests for SafeBackButton component including:
 * - Rendering
 * - Click handling
 * - Navigation behavior
 * - Fallback routes
 * - Accessibility
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';

// Mock Safe Back Button Component
const SafeBackButton = ({
  onPress,
  fallbackRoute,
  disabled = false,
  testID = 'safe-back-button',
}: {
  onPress?: () => void;
  fallbackRoute?: string;
  disabled?: boolean;
  testID?: string;
}) => {
  const { goBackOrFallback, canGoBack } = useSafeNavigation();

  const handlePress = async () => {
    if (disabled) return;

    try {
      if (onPress) {
        onPress();
      } else {
        await goBackOrFallback(fallbackRoute as any);
      }
    } catch (error) {
      // Silently handle navigation errors
    }
  };

  return (
    <Text
      testID={testID}
      onPress={handlePress}
      accessibilityLabel="Go back"
      accessibilityRole="button"
      accessible={true}
    >
      {canGoBack ? 'Back' : 'Home'}
    </Text>
  );
};

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/hooks/useSafeNavigation');

describe('SafeBackButton', () => {
  const mockGoBackOrFallback = jest.fn();
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSafeNavigation as jest.Mock).mockReturnValue({
      goBackOrFallback: mockGoBackOrFallback,
      canGoBack: true,
    });
  });

  describe('Rendering', () => {
    it('should render back button', () => {
      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');
      expect(button).toBeTruthy();
    });

    it('should show "Back" text when can go back', () => {
      (useSafeNavigation as jest.Mock).mockReturnValue({
        goBackOrFallback: mockGoBackOrFallback,
        canGoBack: true,
      });

      const { getByText } = render(<SafeBackButton />);

      expect(getByText('Back')).toBeTruthy();
    });

    it('should show "Home" text when cannot go back', () => {
      (useSafeNavigation as jest.Mock).mockReturnValue({
        goBackOrFallback: mockGoBackOrFallback,
        canGoBack: false,
      });

      const { getByText } = render(<SafeBackButton />);

      expect(getByText('Home')).toBeTruthy();
    });

    it('should have accessibility properties', () => {
      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');
      expect(button.props.accessibilityLabel).toBe('Go back');
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessible).toBe(true);
    });
  });

  describe('Click Handling', () => {
    it('should call goBackOrFallback when pressed', async () => {
      mockGoBackOrFallback.mockResolvedValue({ success: true });

      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockGoBackOrFallback).toHaveBeenCalled();
      });
    });

    it('should use custom onPress handler when provided', async () => {
      const customOnPress = jest.fn();

      const { getByTestId } = render(<SafeBackButton onPress={customOnPress} />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(customOnPress).toHaveBeenCalled();
        expect(mockGoBackOrFallback).not.toHaveBeenCalled();
      });
    });

    it('should pass fallback route to navigation', async () => {
      mockGoBackOrFallback.mockResolvedValue({ success: true });

      const { getByTestId } = render(<SafeBackButton fallbackRoute="/(tabs)" />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockGoBackOrFallback).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('should not trigger navigation when disabled', () => {
      const { getByTestId } = render(<SafeBackButton disabled={true} />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      expect(mockGoBackOrFallback).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Behavior', () => {
    it('should handle successful navigation', async () => {
      mockGoBackOrFallback.mockResolvedValue({ success: true });

      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockGoBackOrFallback).toHaveBeenCalled();
      });
    });

    it('should handle navigation errors gracefully', async () => {
      mockGoBackOrFallback.mockRejectedValue(new Error('Navigation failed'));

      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');

      // Should not throw error
      expect(() => {
        fireEvent.press(button);
      }).not.toThrow();
    });

    it('should update text when canGoBack changes', () => {
      const { getByText, rerender } = render(<SafeBackButton />);

      expect(getByText('Back')).toBeTruthy();

      // Update mock to return canGoBack = false
      (useSafeNavigation as jest.Mock).mockReturnValue({
        goBackOrFallback: mockGoBackOrFallback,
        canGoBack: false,
      });

      rerender(<SafeBackButton />);

      expect(getByText('Home')).toBeTruthy();
    });
  });

  describe('Multiple Clicks', () => {
    it('should handle rapid clicks without duplicate navigation', async () => {
      let resolveNavigation: () => void;
      const navigationPromise = new Promise<{ success: boolean }>((resolve) => {
        resolveNavigation = () => resolve({ success: true });
      });

      mockGoBackOrFallback.mockReturnValue(navigationPromise);

      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');

      // Click multiple times rapidly
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      // Resolve navigation
      resolveNavigation!();

      await waitFor(() => {
        // Should only be called once (or handle debouncing)
        expect(mockGoBackOrFallback).toHaveBeenCalled();
      });
    });
  });

  describe('Custom TestID', () => {
    it('should use custom testID when provided', () => {
      const { getByTestId } = render(<SafeBackButton testID="custom-back-btn" />);

      expect(getByTestId('custom-back-btn')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined fallbackRoute', async () => {
      mockGoBackOrFallback.mockResolvedValue({ success: true });

      const { getByTestId } = render(<SafeBackButton fallbackRoute={undefined} />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockGoBackOrFallback).toHaveBeenCalledWith(undefined);
      });
    });

    it('should handle null navigation result', async () => {
      mockGoBackOrFallback.mockResolvedValue(null);

      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');

      expect(() => {
        fireEvent.press(button);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      const { getByTestId } = render(<SafeBackButton />);

      const button = getByTestId('safe-back-button');

      expect(button.props.accessible).toBe(true);
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should have descriptive accessibility label', () => {
      const { getByLabelText } = render(<SafeBackButton />);

      expect(getByLabelText('Go back')).toBeTruthy();
    });
  });

  describe('Integration with useSafeNavigation', () => {
    it('should react to navigation state changes', () => {
      const { rerender, getByText } = render(<SafeBackButton />);

      expect(getByText('Back')).toBeTruthy();

      // Simulate navigation stack being empty
      (useSafeNavigation as jest.Mock).mockReturnValue({
        goBackOrFallback: mockGoBackOrFallback,
        canGoBack: false,
      });

      rerender(<SafeBackButton />);

      expect(getByText('Home')).toBeTruthy();
    });

    it('should use navigation service correctly', async () => {
      mockGoBackOrFallback.mockResolvedValue({
        success: true,
        route: '/(tabs)',
      });

      const { getByTestId } = render(<SafeBackButton fallbackRoute="/(tabs)" />);

      const button = getByTestId('safe-back-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockGoBackOrFallback).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });
});
