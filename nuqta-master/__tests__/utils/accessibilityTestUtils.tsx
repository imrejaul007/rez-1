/**
 * Accessibility Testing Utilities
 *
 * Comprehensive testing utilities for accessibility validation:
 * - Screen reader simulation helpers
 * - Accessibility prop validators
 * - Role/state/label checkers
 * - WCAG 2.1 Level AA compliance validators
 * - Component accessibility test wrappers
 *
 * @module __tests__/utils/accessibilityTestUtils
 */

import React from 'react';
import { render, RenderOptions, RenderAPI } from '@testing-library/react-native';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MIN_TOUCH_TARGET_SIZE, A11yRole } from '@/utils/accessibilityUtils';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface A11yTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface TouchTargetValidation {
  isValid: boolean;
  width?: number;
  height?: number;
  suggestion?: string;
}

export interface ContrastTestResult {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  recommendation?: string;
}

export interface WCAGValidationOptions {
  checkRoles?: boolean;
  checkLabels?: boolean;
  checkStates?: boolean;
  checkTouchTargets?: boolean;
  checkContrast?: boolean;
  checkHeadings?: boolean;
  checkForms?: boolean;
}

// ============================================
// SCREEN READER SIMULATION
// ============================================

/**
 * Simulates screen reader announcement
 * Validates that announcements are properly formatted
 */
export const simulateScreenReaderAnnouncement = (message: string): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if message is empty
  if (!message || message.trim() === '') {
    errors.push('Screen reader announcement is empty');
  }

  // Check if message is too long (>250 characters)
  if (message.length > 250) {
    warnings.push(`Announcement is very long (${message.length} chars). Consider shortening.`);
  }

  // Check for technical jargon or abbreviations
  const technicalTerms = ['div', 'span', 'btn', 'img', 'src', 'href'];
  technicalTerms.forEach((term) => {
    if (message.toLowerCase().includes(term)) {
      warnings.push(`Announcement contains technical term: "${term}"`);
    }
  });

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Simulates VoiceOver/TalkBack reading order
 * Returns array of elements in reading order
 */
export const getReadingOrder = (container: any): string[] => {
  const readingOrder: string[] = [];

  const traverse = (element: any) => {
    if (!element) return;

    // Skip if hidden from accessibility
    if (
      element.props?.accessible === false ||
      element.props?.accessibilityElementsHidden === true ||
      element.props?.importantForAccessibility === 'no-hide-descendants'
    ) {
      return;
    }

    // Add accessible element
    if (element.props?.accessible !== false) {
      const label =
        element.props?.accessibilityLabel ||
        getChildrenAsString(element.props?.children) ||
        '';

      if (label) {
        readingOrder.push(label);
      }
    }

    // Recursively traverse children
    if (element.props?.children) {
      React.Children.forEach(element.props.children, traverse);
    }
  };

  traverse(container);
  return readingOrder;
};

/**
 * Safely convert React children to a string for accessibility reading order.
 * Handles arrays (joined with comma), single elements, strings, and numbers.
 */
const getChildrenAsString = (children: any): string => {
  if (children == null || children === false) return '';
  if (Array.isArray(children)) {
    return children
      .map((child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return String(child);
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  // Skip React elements - those are handled by recursive traversal
  return '';
};

// ============================================
// ACCESSIBILITY PROP VALIDATORS
// ============================================

/**
 * Validates that an element has proper accessibility role
 */
export const validateAccessibilityRole = (
  element: any,
  expectedRole?: string
): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const role = element.props?.accessibilityRole;

  if (!role) {
    errors.push('Missing accessibilityRole');
  } else if (expectedRole && role !== expectedRole) {
    errors.push(`Expected role "${expectedRole}", got "${role}"`);
  }

  // Validate role is in valid set
  const validRoles = Object.values(A11yRole);
  if (role && !validRoles.includes(role as A11yRole)) {
    warnings.push(`Role "${role}" may not be recognized by all screen readers`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates that an element has proper accessibility label
 */
export const validateAccessibilityLabel = (
  element: any,
  options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  }
): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = element.props?.accessibilityLabel;
  const { required = true, minLength = 1, maxLength = 150 } = options || {};

  if (required && !label) {
    errors.push('Missing accessibilityLabel');
  }

  if (label) {
    if (label.length < minLength) {
      warnings.push(`Label is too short (${label.length} chars)`);
    }

    if (label.length > maxLength) {
      warnings.push(`Label is too long (${label.length} chars). Consider shortening.`);
    }

    // Check for placeholder text patterns
    if (label.toLowerCase().includes('lorem ipsum') || label === 'Label') {
      warnings.push('Label appears to be placeholder text');
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates accessibility state
 */
export const validateAccessibilityState = (
  element: any,
  expectedState?: Partial<{
    disabled: boolean;
    selected: boolean;
    checked: boolean | 'mixed';
    busy: boolean;
    expanded: boolean;
  }>
): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const state = element.props?.accessibilityState || {};

  if (expectedState) {
    Object.entries(expectedState).forEach(([key, value]) => {
      if (state[key] !== value) {
        errors.push(`Expected ${key} to be ${value}, got ${state[key]}`);
      }
    });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates accessibility hint
 */
export const validateAccessibilityHint = (
  element: any,
  options?: {
    shouldExist?: boolean;
    maxLength?: number;
  }
): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const hint = element.props?.accessibilityHint;
  const { shouldExist = false, maxLength = 100 } = options || {};

  if (shouldExist && !hint) {
    warnings.push('Consider adding accessibilityHint for better context');
  }

  if (hint && hint.length > maxLength) {
    warnings.push(`Hint is too long (${hint.length} chars)`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// TOUCH TARGET VALIDATION
// ============================================

/**
 * Validates minimum touch target size (44x44)
 */
export const validateTouchTargetSize = (element: any): TouchTargetValidation => {
  const style = element.props?.style || {};

  // Handle array of styles
  const flatStyle = Array.isArray(style)
    ? Object.assign({}, ...style)
    : style;

  const width = flatStyle.width || flatStyle.minWidth || 0;
  const height = flatStyle.height || flatStyle.minHeight || 0;

  const isValid =
    width >= MIN_TOUCH_TARGET_SIZE &&
    height >= MIN_TOUCH_TARGET_SIZE;

  return {
    isValid,
    width: typeof width === 'number' ? width : undefined,
    height: typeof height === 'number' ? height : undefined,
    suggestion: !isValid
      ? `Touch target should be at least ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}px`
      : undefined,
  };
};

/**
 * Validates interactive element has proper touch target
 */
export const validateInteractiveTouchTarget = (element: any): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const role = element.props?.accessibilityRole;
  const interactiveRoles = [
    A11yRole.BUTTON,
    A11yRole.LINK,
    A11yRole.CHECKBOX,
    A11yRole.RADIO,
    A11yRole.SWITCH,
  ];

  if (interactiveRoles.includes(role as A11yRole)) {
    const validation = validateTouchTargetSize(element);

    if (!validation.isValid) {
      errors.push(
        validation.suggestion || 'Touch target too small'
      );
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// COLOR CONTRAST VALIDATION
// ============================================

/**
 * Extract color from style object
 */
const extractColor = (style: any, property: 'color' | 'backgroundColor'): string | null => {
  if (!style) return null;

  const flatStyle = Array.isArray(style)
    ? Object.assign({}, ...style)
    : style;

  return flatStyle[property] || null;
};

/**
 * Calculate contrast ratio between two hex colors
 */
export const calculateContrastRatio = (
  foreground: string,
  background: string
): ContrastTestResult => {
  // Convert hex to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  // Calculate relative luminance
  const getLuminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map((val) => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  try {
    const l1 = getLuminance(hexToRgb(foreground));
    const l2 = getLuminance(hexToRgb(background));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    const meetsAA = ratio >= 4.5;
    const meetsAAA = ratio >= 7;

    return {
      ratio: parseFloat(ratio.toFixed(2)),
      meetsAA,
      meetsAAA,
      recommendation: !meetsAA
        ? `Contrast ratio ${ratio.toFixed(2)}:1 does not meet WCAG AA (4.5:1). Consider using darker/lighter colors.`
        : undefined,
    };
  } catch (error) {
    return {
      ratio: 0,
      meetsAA: false,
      meetsAAA: false,
      recommendation: 'Could not calculate contrast ratio',
    };
  }
};

/**
 * Validates text element has sufficient color contrast
 */
export const validateTextContrast = (element: any): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const color = extractColor(element.props?.style, 'color');
  const backgroundColor = extractColor(element.props?.style, 'backgroundColor');

  if (!color || !backgroundColor) {
    warnings.push('Could not determine text or background color for contrast check');
    return { passed: true, errors, warnings };
  }

  const result = calculateContrastRatio(color, backgroundColor);

  if (!result.meetsAA) {
    errors.push(result.recommendation || 'Insufficient color contrast');
  } else if (!result.meetsAAA) {
    warnings.push(`Meets AA (${result.ratio}:1) but not AAA standards`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validates form input accessibility
 */
export const validateFormInput = (element: any): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for label
  const labelResult = validateAccessibilityLabel(element);
  errors.push(...labelResult.errors);
  warnings.push(...labelResult.warnings);

  // Check for proper role (if text input)
  if (element.type?.displayName === 'TextInput' || element.type === TextInput) {
    // TextInput doesn't need explicit role, but should have proper labels
    if (!element.props?.accessibilityLabel && !element.props?.placeholder) {
      errors.push('TextInput should have either accessibilityLabel or placeholder');
    }
  }

  // Check for error state
  const error = element.props?.error;
  if (error) {
    // Verify error is announced
    if (!element.props?.accessibilityHint?.includes(error)) {
      warnings.push('Error message should be included in accessibilityHint');
    }
  }

  // Check for required indicator
  const required = element.props?.required;
  if (required) {
    const hint = element.props?.accessibilityHint || '';
    if (!hint.toLowerCase().includes('required')) {
      warnings.push('Required field should include "required" in accessibilityHint');
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates form has proper structure
 */
export const validateFormStructure = (form: RenderAPI): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for submit button
  const buttons = form.queryAllByRole('button');
  const hasSubmitButton = buttons.some(
    (btn) =>
      btn.props?.accessibilityLabel?.toLowerCase().includes('submit') ||
      btn.props?.children?.toString().toLowerCase().includes('submit')
  );

  if (!hasSubmitButton) {
    warnings.push('Form should have a clear submit button');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// LIST VALIDATION
// ============================================

/**
 * Validates list accessibility
 */
export const validateListAccessibility = (
  list: any,
  options?: {
    itemCount?: number;
    hasEmptyState?: boolean;
  }
): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { itemCount, hasEmptyState = false } = options || {};

  // Check for proper list structure
  if (!list.props?.accessible) {
    warnings.push('List container should be accessible');
  }

  // Check for list label
  if (!list.props?.accessibilityLabel && itemCount !== undefined) {
    warnings.push(`Consider adding list label with item count (e.g., "${itemCount} items")`);
  }

  // Check for empty state handling
  if (itemCount === 0 && !hasEmptyState) {
    warnings.push('List should have accessible empty state message');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// MODAL/DIALOG VALIDATION
// ============================================

/**
 * Validates modal accessibility
 */
export const validateModalAccessibility = (modal: any): A11yTestResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for proper role
  const roleResult = validateAccessibilityRole(modal, 'none');
  if (roleResult.errors.length > 0) {
    warnings.push('Modal should have proper accessibility role');
  }

  // Check for close button
  const closeButton = modal.props?.children?.find?.(
    (child: any) =>
      child?.props?.accessibilityLabel?.toLowerCase().includes('close') ||
      child?.props?.accessibilityHint?.toLowerCase().includes('close')
  );

  if (!closeButton) {
    warnings.push('Modal should have accessible close button');
  }

  // Check for title/heading
  if (!modal.props?.accessibilityLabel) {
    warnings.push('Modal should have descriptive accessibilityLabel');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// COMPREHENSIVE WCAG VALIDATION
// ============================================

/**
 * Comprehensive WCAG 2.1 AA validation
 */
export const validateWCAGCompliance = (
  element: any,
  options: WCAGValidationOptions = {}
): A11yTestResult => {
  const {
    checkRoles = true,
    checkLabels = true,
    checkStates = true,
    checkTouchTargets = true,
    checkContrast = true,
  } = options;

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Role validation
  if (checkRoles && element.props?.accessibilityRole) {
    const result = validateAccessibilityRole(element);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Label validation
  if (checkLabels) {
    const result = validateAccessibilityLabel(element, { required: false });
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Touch target validation
  if (checkTouchTargets) {
    const result = validateInteractiveTouchTarget(element);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Contrast validation (for text elements)
  if (checkContrast && element.type === Text) {
    const result = validateTextContrast(element);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    passed: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};

// ============================================
// TEST WRAPPERS
// ============================================

/**
 * Renders component with accessibility testing wrapper
 */
export const renderWithA11y = (
  component: React.ReactElement,
  options?: RenderOptions
): RenderAPI & {
  a11yAudit: () => A11yTestResult;
} => {
  const rendered = render(component, options);

  return {
    ...rendered,
    a11yAudit: () => {
      // Run comprehensive audit
      const errors: string[] = [];
      const warnings: string[] = [];

      // TODO: Implement full audit
      // This would traverse all rendered elements and validate

      return {
        passed: errors.length === 0,
        errors,
        warnings,
      };
    },
  };
};

/**
 * Custom matchers for Jest
 */
export const customA11yMatchers = {
  toBeAccessible(element: any) {
    const result = validateWCAGCompliance(element);

    return {
      pass: result.passed,
      message: () =>
        result.passed
          ? 'Element is accessible'
          : `Element has accessibility issues:\n${result.errors.join('\n')}`,
    };
  },

  toHaveAccessibilityRole(element: any, expectedRole: string) {
    const result = validateAccessibilityRole(element, expectedRole);

    return {
      pass: result.passed,
      message: () =>
        result.passed
          ? `Element has role "${expectedRole}"`
          : `Expected role "${expectedRole}": ${result.errors.join(', ')}`,
    };
  },

  toHaveAccessibilityLabel(element: any, expectedLabel?: string) {
    const actualLabel = element.props?.accessibilityLabel;
    const hasLabel = !!actualLabel;
    const matchesExpected = !expectedLabel || actualLabel === expectedLabel;

    return {
      pass: hasLabel && matchesExpected,
      message: () =>
        hasLabel && matchesExpected
          ? `Element has accessibility label "${actualLabel}"`
          : expectedLabel
          ? `Expected label "${expectedLabel}", got "${actualLabel}"`
          : 'Element is missing accessibility label',
    };
  },

  toMeetTouchTargetSize(element: any) {
    const result = validateTouchTargetSize(element);

    return {
      pass: result.isValid,
      message: () =>
        result.isValid
          ? 'Touch target meets minimum size requirements'
          : result.suggestion || 'Touch target too small',
    };
  },
};

// ============================================
// EXPORTS
// ============================================

export default {
  simulateScreenReaderAnnouncement,
  getReadingOrder,
  validateAccessibilityRole,
  validateAccessibilityLabel,
  validateAccessibilityState,
  validateAccessibilityHint,
  validateTouchTargetSize,
  validateInteractiveTouchTarget,
  calculateContrastRatio,
  validateTextContrast,
  validateFormInput,
  validateFormStructure,
  validateListAccessibility,
  validateModalAccessibility,
  validateWCAGCompliance,
  renderWithA11y,
  customA11yMatchers,
};
