/**
 * useErrorToast — lightweight global toast helper.
 *
 * Mounts a single Toast at the top of the screen; other components
 * can call `useErrorToastStore().showError(message)` to show a toast
 * without managing state.
 *
 * Uses the existing `@/components/ui/Toast` component (no new deps).
 *
 * Usage:
 *   1) Mount <ErrorToastHost /> once near the root (e.g., in app/_layout.tsx).
 *   2) In any component:
 *        const { showError } = useErrorToast();
 *        showError('Network error');
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Toast from '@/components/ui/Toast';
import { announceForAccessibility } from '@/utils/accessibilityUtils';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
  show: (message: string, type?: ToastType, duration?: number) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',
  duration: 4000,
  show: (message, type = 'info', duration = 4000) =>
    set({ visible: true, message, type, duration }),
  hide: () => set({ visible: false }),
}));

/**
 * Hook for showing toasts from anywhere in the app.
 */
export function useErrorToast() {
  const show = useToastStore((s) => s.show);
  const hide = useToastStore((s) => s.hide);

  const showError = useCallback(
    (message: string, duration?: number) => {
      show(message, 'error', duration ?? 4000);
      // Announce to screen reader users
      try {
        announceForAccessibility(`Error: ${message}`);
      } catch {
        // fail silently on unsupported platforms
      }
    },
    [show]
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      show(message, 'success', duration ?? 3000);
    },
    [show]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      show(message, 'info', duration ?? 3000);
    },
    [show]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      show(message, 'warning', duration ?? 4000);
    },
    [show]
  );

  return { showError, showSuccess, showInfo, showWarning, hide };
}

/**
 * Mount this once near the app root to render the toast.
 * Should be placed inside a screen so it can overlay above other content.
 */
export function ErrorToastHost() {
  const visible = useToastStore((s) => s.visible);
  const message = useToastStore((s) => s.message);
  const type = useToastStore((s) => s.type);
  const duration = useToastStore((s) => s.duration);
  const hide = useToastStore((s) => s.hide);

  // Auto-dismiss on web (where reanimated transitions can stall)
  useEffect(() => {
    if (Platform.OS === 'web' && visible && duration > 0) {
      const t = setTimeout(hide, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, hide]);

  if (!visible) return null;
  return (
    <Toast
      key={`${type}-${message}-${Date.now()}`}
      message={message}
      type={type}
      duration={duration}
      onDismiss={hide}
    />
  );
}

export default useErrorToast;
