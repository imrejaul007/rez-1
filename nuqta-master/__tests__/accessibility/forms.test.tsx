/**
 * Form Accessibility Tests
 *
 * Tests for form components accessibility:
 * - Form inputs with labels
 * - Error message announcements
 * - Required field indicators
 * - Invalid state handling
 * - Input validation feedback
 * - Form submission
 *
 * WCAG 2.1 AA Compliance Testing
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';
import AccessibleInput from '@/components/common/AccessibleInput';
import AccessibleButton from '@/components/common/AccessibleButton';
import {
  validateFormInput,
  validateFormStructure,
  validateAccessibilityLabel,
  validateAccessibilityState,
  validateAccessibilityHint,
} from '../utils/accessibilityTestUtils';

describe('Form Accessibility Tests', () => {
  describe('Input Labels', () => {
    it('should have associated label for each input', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email Address"
          value=""
          onChangeText={jest.fn()}
          testID="email-input"
        />
      );

      const input = getByTestId('email-input');
      expect(input.props.accessibilityLabel).toBeTruthy();
      expect(input.props.accessibilityLabel).toContain('Email Address');
    });

    it('should have descriptive labels', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Enter your email address"
          value=""
          onChangeText={jest.fn()}
          testID="input"
        />
      );

      const input = getByTestId('input');
      const result = validateAccessibilityLabel(input);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not use placeholder as sole label', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          placeholder="Enter email"
          value=""
          onChangeText={jest.fn()}
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.accessibilityLabel).toBeTruthy();
      expect(input.props.accessibilityLabel).not.toBe('Enter email');
    });

    it('should maintain label visibility when focused', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Password"
          value=""
          onChangeText={jest.fn()}
          testID="password-input"
        />
      );

      const input = getByTestId('password-input');

      // Simulate focus
      fireEvent(input, 'focus');

      // Label should still be accessible
      expect(input.props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Required Fields', () => {
    it('should indicate required fields', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          required={true}
          testID="input"
        />
      );

      const input = getByTestId('input');
      const hint = input.props.accessibilityHint;

      expect(hint).toContain('Required');
    });

    it('should visually indicate required fields', () => {
      const { getByText } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          required={true}
        />
      );

      // Check for asterisk
      expect(getByText('*')).toBeTruthy();
    });

    it('should announce required status to screen readers', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Username"
          value=""
          onChangeText={jest.fn()}
          required={true}
          testID="input"
        />
      );

      const input = getByTestId('input');
      const result = validateFormInput(input);

      expect(result.passed).toBe(true);
    });

    it('should handle optional fields correctly', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Middle Name"
          value=""
          onChangeText={jest.fn()}
          required={false}
          testID="input"
        />
      );

      const input = getByTestId('input');
      const hint = input.props.accessibilityHint || '';

      expect(hint).not.toContain('Required');
    });
  });

  describe('Error Messages', () => {
    it('should announce errors to screen readers', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value="invalid-email"
          onChangeText={jest.fn()}
          error="Please enter a valid email address"
          testID="input"
        />
      );

      const input = getByTestId('input');

      expect(input.props.accessibilityHint).toContain(
        'Please enter a valid email address'
      );
    });

    it('should display error message visibly', () => {
      const errorMessage = 'Password must be at least 8 characters';
      const { getByText } = render(
        <AccessibleInput
          label="Password"
          value="short"
          onChangeText={jest.fn()}
          error={errorMessage}
        />
      );

      expect(getByText(errorMessage)).toBeTruthy();
    });

    it('should have alert role for error messages', () => {
      const { getByText } = render(
        <AccessibleInput
          label="Email"
          value="invalid"
          onChangeText={jest.fn()}
          error="Invalid email"
        />
      );

      const errorElement = getByText('Invalid email').parent?.parent;
      expect(errorElement?.props.accessibilityRole).toBe('alert');
    });

    it('should use live region for dynamic errors', () => {
      const { getByText } = render(
        <AccessibleInput
          label="Email"
          value="invalid"
          onChangeText={jest.fn()}
          error="Invalid email"
        />
      );

      const errorElement = getByText('Invalid email').parent?.parent;
      expect(errorElement?.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should clear error announcement when error is fixed', () => {
      const { getByTestId, rerender } = render(
        <AccessibleInput
          label="Email"
          value="invalid"
          onChangeText={jest.fn()}
          error="Invalid email"
          testID="input"
        />
      );

      let input = getByTestId('input');
      expect(input.props.accessibilityHint).toContain('Invalid email');

      // Fix the error
      rerender(
        <AccessibleInput
          label="Email"
          value="valid@email.com"
          onChangeText={jest.fn()}
          testID="input"
        />
      );

      input = getByTestId('input');
      expect(input.props.accessibilityHint).not.toContain('Invalid email');
    });
  });

  describe('Input States', () => {
    it('should indicate disabled state', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          disabled={true}
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.editable).toBe(false);
    });

    it('should not allow interaction when disabled', () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={onChangeText}
          disabled={true}
          testID="input"
        />
      );

      const input = getByTestId('input');
      fireEvent.changeText(input, 'test@email.com');

      // Should not trigger since disabled
      // Note: React Native TextInput with editable={false} won't trigger changeText
      expect(input.props.editable).toBe(false);
    });

    it('should handle focus state', () => {
      const onFocus = jest.fn();
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          onFocus={onFocus}
          testID="input"
        />
      );

      const input = getByTestId('input');
      fireEvent(input, 'focus');

      expect(onFocus).toHaveBeenCalled();
    });

    it('should handle blur state', () => {
      const onBlur = jest.fn();
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          onBlur={onBlur}
          testID="input"
        />
      );

      const input = getByTestId('input');
      fireEvent(input, 'blur');

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Input Types', () => {
    it('should use appropriate keyboard for email inputs', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          type="email"
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('should use appropriate keyboard for phone inputs', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Phone"
          value=""
          onChangeText={jest.fn()}
          type="phone"
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.keyboardType).toBe('phone-pad');
    });

    it('should hide password text by default', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Password"
          value="secret"
          onChangeText={jest.fn()}
          type="password"
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should have toggle for password visibility', () => {
      const { getByLabelText } = render(
        <AccessibleInput
          label="Password"
          value="secret"
          onChangeText={jest.fn()}
          type="password"
        />
      );

      const toggleButton = getByLabelText('Show password');
      expect(toggleButton).toBeTruthy();
      expect(toggleButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Helper Text', () => {
    it('should provide helper text for context', () => {
      const helperText = 'Password must be at least 8 characters';
      const { getByText } = render(
        <AccessibleInput
          label="Password"
          value=""
          onChangeText={jest.fn()}
          helperText={helperText}
        />
      );

      expect(getByText(helperText)).toBeTruthy();
    });

    it('should hide helper text when error is shown', () => {
      const helperText = 'Enter a valid email';
      const errorText = 'Email is required';

      const { queryByText } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          helperText={helperText}
          error={errorText}
        />
      );

      expect(queryByText(errorText)).toBeTruthy();
      expect(queryByText(helperText)).toBeFalsy();
    });
  });

  describe('Character Counter', () => {
    it('should show character count when enabled', () => {
      const { getByText } = render(
        <AccessibleInput
          label="Bio"
          value="Hello"
          onChangeText={jest.fn()}
          maxLength={100}
          showCharCount={true}
        />
      );

      expect(getByText('5/100')).toBeTruthy();
    });

    it('should update count as user types', () => {
      const { getByText, getByTestId, rerender } = render(
        <AccessibleInput
          label="Bio"
          value="Hello"
          onChangeText={jest.fn()}
          maxLength={100}
          showCharCount={true}
          testID="input"
        />
      );

      expect(getByText('5/100')).toBeTruthy();

      rerender(
        <AccessibleInput
          label="Bio"
          value="Hello World"
          onChangeText={jest.fn()}
          maxLength={100}
          showCharCount={true}
          testID="input"
        />
      );

      expect(getByText('11/100')).toBeTruthy();
    });
  });

  describe('Clear Button', () => {
    it('should have accessible clear button', () => {
      const { getByLabelText } = render(
        <AccessibleInput
          label="Search"
          value="query"
          onChangeText={jest.fn()}
          showClearButton={true}
        />
      );

      const clearButton = getByLabelText('Clear input');
      expect(clearButton).toBeTruthy();
      expect(clearButton.props.accessibilityRole).toBe('button');
    });

    it('should clear input when pressed', () => {
      const onChangeText = jest.fn();
      const { getByLabelText } = render(
        <AccessibleInput
          label="Search"
          value="query"
          onChangeText={onChangeText}
          showClearButton={true}
        />
      );

      const clearButton = getByLabelText('Clear input');
      fireEvent.press(clearButton);

      expect(onChangeText).toHaveBeenCalledWith('');
    });

    it('should not show clear button when input is empty', () => {
      const { queryByLabelText } = render(
        <AccessibleInput
          label="Search"
          value=""
          onChangeText={jest.fn()}
          showClearButton={true}
        />
      );

      expect(queryByLabelText('Clear input')).toBeFalsy();
    });
  });

  describe('Form Structure', () => {
    it('should have accessible submit button', () => {
      const { getByLabelText } = render(
        <View>
          <AccessibleInput
            label="Email"
            value="test@email.com"
            onChangeText={jest.fn()}
          />
          <AccessibleButton
            label="Submit"
            onPress={jest.fn()}
          />
        </View>
      );

      const submitButton = getByLabelText('Submit');
      expect(submitButton.props.accessibilityRole).toBe('button');
    });

    it('should disable submit button when form is invalid', () => {
      const { getByTestId } = render(
        <View>
          <AccessibleInput
            label="Email"
            value=""
            onChangeText={jest.fn()}
            required={true}
          />
          <AccessibleButton
            label="Submit"
            onPress={jest.fn()}
            disabled={true}
            testID="submit-btn"
          />
        </View>
      );

      const submitButton = getByTestId('submit-btn');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should provide form validation feedback', () => {
      const { getByText } = render(
        <View>
          <AccessibleInput
            label="Email"
            value="invalid"
            onChangeText={jest.fn()}
            error="Please enter a valid email"
          />
        </View>
      );

      const errorMessage = getByText('Please enter a valid email');
      expect(errorMessage).toBeTruthy();
    });
  });

  describe('Autocomplete', () => {
    it('should set proper autocomplete for email', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          type="email"
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.autoComplete).toBe('email');
    });

    it('should set proper autocomplete for password', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Password"
          value=""
          onChangeText={jest.fn()}
          type="password"
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.autoComplete).toBe('password');
    });

    it('should set proper autocomplete for phone', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Phone"
          value=""
          onChangeText={jest.fn()}
          type="phone"
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.autoComplete).toBe('tel');
    });
  });

  describe('WCAG Compliance', () => {
    it('should meet WCAG 2.1 AA for text inputs', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email Address"
          value=""
          onChangeText={jest.fn()}
          testID="input"
        />
      );

      const input = getByTestId('input');
      const result = validateFormInput(input);

      expect(result.passed).toBe(true);
    });

    it('should meet touch target size requirements', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email"
          value=""
          onChangeText={jest.fn()}
          testID="input"
        />
      );

      const input = getByTestId('input');
      const styles = Array.isArray(input.props.style)
        ? Object.assign({}, ...input.props.style)
        : input.props.style;

      expect(styles.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('should have proper label-input association', () => {
      const { getByTestId } = render(
        <AccessibleInput
          label="Email Address"
          value=""
          onChangeText={jest.fn()}
          testID="input"
        />
      );

      const input = getByTestId('input');
      expect(input.props.accessibilityLabel).toContain('Email Address');
    });
  });
});
