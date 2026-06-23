/**
 * Accessibility Utilities
 *
 * Collection of utilities for improving app accessibility:
 * - Screen reader support
 * - Focus management
 * - Touch target validation
 * - ARIA label generation
 * - Accessibility announcements
 *
 * Follows WCAG 2.1 AA guidelines
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Minimum touch target size (44x44 points) per Apple HIG and Material Design
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Accessibility roles for different component types
 */
export enum A11yRole {
  BUTTON = 'button',
  LINK = 'link',
  HEADER = 'header',
  IMAGE = 'image',
  IMAGE_BUTTON = 'imagebutton',
  SEARCH = 'search',
  TEXT = 'text',
  ADJUSTABLE = 'adjustable',
  MENU = 'menu',
  MENU_ITEM = 'menuitem',
  TAB = 'tab',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  SWITCH = 'switch',
  ALERT = 'alert',
  PROGRESS = 'progressbar',
  TIMER = 'timer',
}

/**
 * Accessibility states for interactive elements
 */
export interface A11yState {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  busy?: boolean;
  expanded?: boolean;
}

/**
 * Touch target size validation
 */
export const validateTouchTarget = (width: number, height: number): {
  isValid: boolean;
  suggestion?: string;
} => {
  if (width >= MIN_TOUCH_TARGET_SIZE && height >= MIN_TOUCH_TARGET_SIZE) {
    return { isValid: true };
  }

  return {
    isValid: false,
    suggestion: `Touch target should be at least ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}. Current: ${width}x${height}`,
  };
};

/**
 * Generate accessibility label for screen readers
 * Combines label, value, hint into readable format
 */
export const generateA11yLabel = (options: {
  label: string;
  value?: string | number;
  hint?: string;
  role?: A11yRole;
}): string => {
  const { label, value, hint, role } = options;
  let parts: string[] = [label];

  if (value !== undefined && value !== null) {
    parts.push(String(value));
  }

  if (hint) {
    parts.push(hint);
  }

  // Add role description for screen readers
  if (role) {
    const roleDescriptions: Record<string, string> = {
      [A11yRole.BUTTON]: 'Button',
      [A11yRole.LINK]: 'Link',
      [A11yRole.CHECKBOX]: 'Checkbox',
      [A11yRole.SWITCH]: 'Switch',
      [A11yRole.TAB]: 'Tab',
    };

    if (roleDescriptions[role]) {
      parts.push(roleDescriptions[role]);
    }
  }

  return parts.join(', ');
};

/**
 * Generate hint text for interactive elements
 */
export const generateA11yHint = (action: string, result?: string): string => {
  if (result) {
    return `${action} to ${result}`;
  }
  return action;
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    return false;
  }
};

/**
 * Announce message to screen reader
 * Useful for dynamic content updates
 */
export const announceForAccessibility = (message: string): void => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.announceForAccessibility(message);
  }
};

/**
 * Announce with delay (for sequential announcements)
 */
export const announceWithDelay = (message: string, delay: number = 500): void => {
  setTimeout(() => {
    announceForAccessibility(message);
  }, delay);
};

/**
 * Set focus to element
 */
export const setAccessibilityFocus = (reactTag: number): void => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
};

/**
 * Format price for screen readers
 * "$99.99" -> "99 dollars and 99 cents"
 */
export const formatPriceForA11y = (price: number, currency: string = 'USD'): string => {
  const dollars = Math.floor(price);
  const cents = Math.round((price - dollars) * 100);

  if (cents === 0) {
    return `${dollars} ${currency === 'USD' ? 'dollars' : currency}`;
  }

  return `${dollars} ${currency === 'USD' ? 'dollars' : currency} and ${cents} cents`;
};

/**
 * Format percentage for screen readers
 * "50%" -> "50 percent"
 */
export const formatPercentageForA11y = (percentage: number): string => {
  return `${percentage} percent`;
};

/**
 * Format date for screen readers
 * More readable format than ISO string
 */
export const formatDateForA11y = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString('en-US', options);
};

/**
 * Format time for screen readers
 */
export const formatTimeForA11y = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };

  return date.toLocaleTimeString('en-US', options);
};

/**
 * Format rating for screen readers
 * "4.5" -> "4.5 out of 5 stars"
 */
export const formatRatingForA11y = (rating: number, maxRating: number = 5): string => {
  return `${rating} out of ${maxRating} stars`;
};

/**
 * Generate loading announcement
 */
export const announceLoading = (resource?: string): void => {
  const message = resource ? `Loading ${resource}` : 'Loading';
  announceForAccessibility(message);
};

/**
 * Generate success announcement
 */
export const announceSuccess = (action: string): void => {
  announceForAccessibility(`${action} successful`);
};

/**
 * Generate error announcement
 */
export const announceError = (error: string): void => {
  announceForAccessibility(`Error: ${error}`);
};

/**
 * Generate list count announcement
 * "10 items" or "1 item"
 */
export const announceListCount = (count: number, itemType: string = 'item'): void => {
  const plural = count === 1 ? itemType : `${itemType}s`;
  announceForAccessibility(`${count} ${plural}`);
};

/**
 * Check color contrast ratio
 * Returns true if contrast ratio meets WCAG AA standards (4.5:1)
 */
export const checkColorContrast = (
  foreground: string,
  background: string
): {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
} => {
  // Convert hex to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];

    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  };

  // Calculate relative luminance
  const getLuminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map((val) => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Calculate contrast ratio
  const l1 = getLuminance(hexToRgb(foreground));
  const l2 = getLuminance(hexToRgb(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    meetsAA: ratio >= 4.5, // WCAG AA
    meetsAAA: ratio >= 7, // WCAG AAA
  };
};

/**
 * Validate form input with accessibility announcement
 */
export const announceValidationError = (fieldName: string, error: string): void => {
  announceForAccessibility(`${fieldName}: ${error}`);
};

/**
 * Announce navigation change
 */
export const announceNavigationChange = (screenName: string): void => {
  announceWithDelay(`Navigated to ${screenName}`, 300);
};

/**
 * Generate button props with full accessibility support
 */
export const getAccessibleButtonProps = (options: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress?: () => void;
}): any => {
  const { label, hint, disabled } = options;

  return {
    accessible: true,
    accessibilityRole: A11yRole.BUTTON,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      disabled: disabled || false,
    },
    // Ensure minimum touch target
    style: {
      minWidth: MIN_TOUCH_TARGET_SIZE,
      minHeight: MIN_TOUCH_TARGET_SIZE,
    },
  };
};

/**
 * Generate image props with accessibility
 */
export const getAccessibleImageProps = (altText: string, isDecorative: boolean = false): any => {
  if (isDecorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    };
  }

  return {
    accessible: true,
    accessibilityRole: A11yRole.IMAGE,
    accessibilityLabel: altText,
  };
};

/**
 * Generate input props with accessibility
 */
export const getAccessibleInputProps = (options: {
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}): any => {
  const { label, value, placeholder, required, error } = options;

  let hint = placeholder;
  if (required) {
    hint = hint ? `${hint}. Required` : 'Required';
  }
  if (error) {
    hint = `${hint}. ${error}`;
  }

  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityValue: value ? { text: value } : undefined,
    accessibilityHint: hint,
    accessibilityState: {
      disabled: false,
    },
  };
};

/**
 * Group elements for screen readers
 */
export const getAccessibleGroupProps = (label: string): any => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'none',
  };
};

/**
 * Hide element from screen readers (decorative elements)
 */
export const hideFromScreenReader = (): any => {
  return {
    accessible: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const,
  };
};

/**
 * Debounce accessibility announcements
 * Prevents rapid-fire announcements
 */
let announcementTimeout: NodeJS.Timeout | null = null;

export const debouncedAnnounce = (message: string, delay: number = 500): void => {
  if (announcementTimeout) {
    clearTimeout(announcementTimeout);
  }

  announcementTimeout = setTimeout(() => {
    announceForAccessibility(message);
    announcementTimeout = null;
  }, delay);
};

/**
 * Focus management utilities
 */
export const FocusManager = {
  // Track focus history
  focusHistory: [] as number[],

  // Push to focus history
  pushFocus(reactTag: number): void {
    this.focusHistory.push(reactTag);
    setAccessibilityFocus(reactTag);
  },

  // Pop from focus history (return to previous focus)
  popFocus(): void {
    this.focusHistory.pop(); // Remove current
    const previous = this.focusHistory[this.focusHistory.length - 1];

    if (previous) {
      setAccessibilityFocus(previous);
    }
  },

  // Clear focus history
  clearHistory(): void {
    this.focusHistory = [];
  },
};

/**
 * ARIA-style live regions for dynamic content
 */
export enum LiveRegionPriority {
  POLITE = 'polite',
  ASSERTIVE = 'assertive',
  OFF = 'none',
}

export const getLiveRegionProps = (priority: LiveRegionPriority): any => {
  return Platform.select({
    ios: {
      accessibilityLiveRegion: priority,
    },
    android: {
      accessibilityLiveRegion: priority,
    },
    default: {},
  });
};

/**
 * Export all utilities
 */
export default {
  MIN_TOUCH_TARGET_SIZE,
  A11yRole,
  validateTouchTarget,
  generateA11yLabel,
  generateA11yHint,
  isScreenReaderEnabled,
  announceForAccessibility,
  announceWithDelay,
  setAccessibilityFocus,
  formatPriceForA11y,
  formatPercentageForA11y,
  formatDateForA11y,
  formatTimeForA11y,
  formatRatingForA11y,
  announceLoading,
  announceSuccess,
  announceError,
  announceListCount,
  checkColorContrast,
  announceValidationError,
  announceNavigationChange,
  getAccessibleButtonProps,
  getAccessibleImageProps,
  getAccessibleInputProps,
  getAccessibleGroupProps,
  hideFromScreenReader,
  debouncedAnnounce,
  FocusManager,
  LiveRegionPriority,
  getLiveRegionProps,
};
