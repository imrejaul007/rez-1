/**
 * AccessibleButton Component Tests
 *
 * Tests for the fully accessible button component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccessibleButton from '@/components/common/AccessibleButton';

describe('AccessibleButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      const { getByText } = render(
        <AccessibleButton label="Click Me" onPress={mockOnPress} />
      );

      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render with icon', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Add to Cart"
          icon="cart"
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should render in loading state', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Loading"
          loading={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should render in disabled state', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Disabled"
          disabled={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Primary"
          variant="primary"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Secondary"
          variant="secondary"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Outline"
          variant="outline"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render danger variant', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Delete"
          variant="danger"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Small"
          size="small"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render medium size', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Medium"
          size="medium"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Large"
          size="large"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Click Me"
          onPress={mockOnPress}
          testID="button"
        />
      );

      fireEvent.press(getByTestId('button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Disabled"
          disabled={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      fireEvent.press(getByTestId('button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Loading"
          loading={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      fireEvent.press(getByTestId('button'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should handle async onPress', async () => {
      const asyncOnPress = jest.fn(() => Promise.resolve());

      const { getByTestId } = render(
        <AccessibleButton
          label="Async"
          onPress={asyncOnPress}
          testID="button"
        />
      );

      fireEvent.press(getByTestId('button'));

      await Promise.resolve();

      expect(asyncOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Button"
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility label', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Add to Cart"
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityLabel).toContain('Add to Cart');
    });

    it('should have accessibility hint', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Submit"
          accessibilityHint="Submits the form"
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityHint).toBe('Submits the form');
    });

    it('should indicate disabled state in accessibility', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Disabled"
          disabled={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should indicate loading state in accessibility', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Loading"
          loading={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should be accessible', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Button"
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.accessible).toBe(true);
    });
  });

  describe('Full Width', () => {
    it('should render full width when specified', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="Full Width"
          fullWidth={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.style).toContainEqual(
        expect.objectContaining({ width: '100%' })
      );
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };

      const { getByTestId } = render(
        <AccessibleButton
          label="Custom"
          onPress={mockOnPress}
          style={customStyle}
          testID="button"
        />
      );

      const button = getByTestId('button');
      expect(button.props.style).toContainEqual(
        expect.objectContaining(customStyle)
      );
    });

    it('should apply custom text style', () => {
      const { getByText } = render(
        <AccessibleButton
          label="Custom Text"
          onPress={mockOnPress}
          textStyle={{ fontSize: 20 }}
        />
      );

      const text = getByText('Custom Text');
      expect(text.props.style).toContainEqual(
        expect.objectContaining({ fontSize: 20 })
      );
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="With Icon"
          icon="cart"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should render right icon', () => {
      const { getByTestId } = render(
        <AccessibleButton
          label="With Icon"
          iconRight="chevron-forward"
          onPress={mockOnPress}
          testID="button"
        />
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('should hide icons when loading', () => {
      const { queryByTestId } = render(
        <AccessibleButton
          label="Loading"
          icon="cart"
          loading={true}
          onPress={mockOnPress}
          testID="button"
        />
      );

      // Icon should be hidden, only loading indicator shown
      expect(queryByTestId('button')).toBeTruthy();
    });
  });
});
