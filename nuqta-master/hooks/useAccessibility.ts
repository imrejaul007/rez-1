/**
 * useAccessibility Hook
 *
 * Hook for managing accessibility features:
 * - Screen reader detection
 * - Focus management
 * - Announcements
 * - Accessibility preferences
 *
 * Usage:
 * ```typescript
 * const { isScreenReaderEnabled, announce, setFocus } = useAccessibility();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import {
  announceForAccessibility,
  setAccessibilityFocus,
  FocusManager,
  isScreenReaderEnabled as checkScreenReader,
} from '@/utils/accessibilityUtils';

interface UseAccessibilityOptions {
  /**
   * Whether to enable automatic focus management
   */
  enableFocusManagement?: boolean;

  /**
   * Whether to announce screen changes
   */
  announceScreenChanges?: boolean;

  /**
   * Screen name for announcements
   */
  screenName?: string;
}

interface UseAccessibilityReturn {
  /**
   * Whether screen reader is enabled
   */
  isScreenReaderEnabled: boolean;

  /**
   * Whether accessibility features should be enabled
   */
  isAccessibilityEnabled: boolean;

  /**
   * Announce message to screen reader
   */
  announce: (message: string, delay?: number) => void;

  /**
   * Set focus to element
   */
  setFocus: (reactTag: number) => void;

  /**
   * Push focus to history stack
   */
  pushFocus: (reactTag: number) => void;

  /**
   * Return to previous focus
   */
  popFocus: () => void;

  /**
   * Whether reduce motion is enabled
   */
  isReduceMotionEnabled: boolean;

  /**
   * Whether reduce transparency is enabled
   */
  isReduceTransparencyEnabled: boolean;
}

export const useAccessibility = (
  options: UseAccessibilityOptions = {}
): UseAccessibilityReturn => {
  const {
    enableFocusManagement = true,
    announceScreenChanges = true,
    screenName,
  } = options;

  // State
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [isReduceTransparencyEnabled, setIsReduceTransparencyEnabled] = useState(false);

  // Refs
  const screenReaderListenerRef = useRef<any>(null);
  const reduceMotionListenerRef = useRef<any>(null);
  const reduceTransparencyListenerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const announceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check screen reader status
   */
  const checkAccessibilityStatus = useCallback(async () => {
    try {
      const screenReaderEnabled = await checkScreenReader();

      if (mountedRef.current) {
        setIsScreenReaderEnabled(screenReaderEnabled);
      }

      // Check reduce motion (iOS only)
      if (Platform.OS === 'ios' && AccessibilityInfo.isReduceMotionEnabled) {
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        if (mountedRef.current) {
          setIsReduceMotionEnabled(reduceMotion);
        }
      }

      // Check reduce transparency (iOS only)
      if (Platform.OS === 'ios' && AccessibilityInfo.isReduceTransparencyEnabled) {
        const reduceTransparency = await AccessibilityInfo.isReduceTransparencyEnabled();
        if (mountedRef.current) {
          setIsReduceTransparencyEnabled(reduceTransparency);
        }
      }
    } catch (_error) {
      // silently handle
    }
  }, []);

  /**
   * Setup accessibility listeners
   */
  useEffect(() => {
    // Initial check
    checkAccessibilityStatus();

    // Listen for screen reader changes
    screenReaderListenerRef.current =
      AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        (enabled: boolean) => {
          if (mountedRef.current) {
            setIsScreenReaderEnabled(enabled);
          }
        }
      );

    // Listen for reduce motion changes (iOS only)
    if (Platform.OS === 'ios' && AccessibilityInfo.addEventListener) {
      reduceMotionListenerRef.current =
        AccessibilityInfo.addEventListener(
          'reduceMotionChanged',
          (enabled: boolean) => {
            if (mountedRef.current) {
              setIsReduceMotionEnabled(enabled);
            }
          }
        );

      reduceTransparencyListenerRef.current =
        AccessibilityInfo.addEventListener(
          'reduceTransparencyChanged',
          (enabled: boolean) => {
            if (mountedRef.current) {
              setIsReduceTransparencyEnabled(enabled);
            }
          }
        );
    }

    // Cleanup
    return () => {
      mountedRef.current = false;

      if (screenReaderListenerRef.current) {
        screenReaderListenerRef.current.remove();
      }

      if (reduceMotionListenerRef.current) {
        reduceMotionListenerRef.current.remove();
      }

      if (reduceTransparencyListenerRef.current) {
        reduceTransparencyListenerRef.current.remove();
      }

      // Clear announce timeout
      if (announceTimeoutRef.current) {
        clearTimeout(announceTimeoutRef.current);
        announceTimeoutRef.current = null;
      }
    };
  }, [checkAccessibilityStatus]);

  /**
   * Announce screen change
   */
  useEffect(() => {
    if (announceScreenChanges && screenName && isScreenReaderEnabled) {
      // Delay to ensure screen is ready
      const timer = setTimeout(() => {
        announceForAccessibility(`Navigated to ${screenName}`);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [announceScreenChanges, screenName, isScreenReaderEnabled]);

  /**
   * Announce message with optional delay
   */
  const announce = useCallback((message: string, delay: number = 0) => {
    // Clear any existing announce timeout
    if (announceTimeoutRef.current) {
      clearTimeout(announceTimeoutRef.current);
      announceTimeoutRef.current = null;
    }

    if (delay > 0) {
      announceTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          announceForAccessibility(message);
        }
        announceTimeoutRef.current = null;
      }, delay);
    } else {
      announceForAccessibility(message);
    }
  }, []);

  /**
   * Set focus to element
   */
  const setFocus = useCallback((reactTag: number) => {
    if (enableFocusManagement) {
      setAccessibilityFocus(reactTag);
    }
  }, [enableFocusManagement]);

  /**
   * Push focus to history
   */
  const pushFocus = useCallback((reactTag: number) => {
    if (enableFocusManagement) {
      FocusManager.pushFocus(reactTag);
    }
  }, [enableFocusManagement]);

  /**
   * Pop focus from history
   */
  const popFocus = useCallback(() => {
    if (enableFocusManagement) {
      FocusManager.popFocus();
    }
  }, [enableFocusManagement]);

  /**
   * Determine if accessibility features should be enabled
   */
  const isAccessibilityEnabled =
    isScreenReaderEnabled ||
    isReduceMotionEnabled ||
    isReduceTransparencyEnabled;

  return {
    isScreenReaderEnabled,
    isAccessibilityEnabled,
    announce,
    setFocus,
    pushFocus,
    popFocus,
    isReduceMotionEnabled,
    isReduceTransparencyEnabled,
  };
};

/**
 * useReducedMotion Hook
 *
 * Simplified hook for checking reduce motion preference
 */
export const useReducedMotion = (): boolean => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const checkReducedMotion = async () => {
      if (Platform.OS === 'ios' && AccessibilityInfo.isReduceMotionEnabled) {
        try {
          const enabled = await AccessibilityInfo.isReduceMotionEnabled();
          setIsReducedMotion(enabled);
        } catch (_error) {
          // silently handle
        }
      }
    };

    checkReducedMotion();

    // Listen for changes
    let listener: any;
    if (Platform.OS === 'ios' && AccessibilityInfo.addEventListener) {
      listener = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setIsReducedMotion
      );
    }

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  return isReducedMotion;
};

/**
 * useAnnouncement Hook
 *
 * Hook for managing accessibility announcements with debouncing
 */
export const useAnnouncement = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, delay: number = 0) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      announceForAccessibility(message);
      timeoutRef.current = null;
    }, delay);
  }, []);

  const announceSuccess = useCallback((action: string) => {
    announce(`${action} successful`);
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`);
  }, [announce]);

  const announceLoading = useCallback((resource?: string) => {
    const message = resource ? `Loading ${resource}` : 'Loading';
    announce(message);
  }, [announce]);

  return {
    announce,
    announceSuccess,
    announceError,
    announceLoading,
  };
};

export default useAccessibility;
