import React, { createContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from '@/components/common/Toast';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const idCounter = useRef(0);

  // Track currentToast in a ref so callbacks stay stable
  const currentToastRef = useRef(currentToast);
  currentToastRef.current = currentToast;

  // Process next toast in queue
  const processQueue = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length > 0 && !currentToastRef.current) {
        const [next, ...rest] = prevQueue;
        setCurrentToast(next);
        return rest;
      }
      return prevQueue;
    });
  }, []);

  // Handle toast dismissal
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDismiss = useCallback(() => {
    setCurrentToast(null);
    // Process next toast after a small delay
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      setQueue((prevQueue) => {
        if (prevQueue.length > 0) {
          const [next, ...rest] = prevQueue;
          setCurrentToast(next);
          return rest;
        }
        return prevQueue;
      });
    }, 300); // Small delay for smooth transition
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // Main showToast function — uses ref to avoid re-creating on every toast change
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number = 3000) => {
      const newToast: ToastItem = {
        id: `toast-${++idCounter.current}`,
        message,
        type,
        duration,
      };

      if (!currentToastRef.current) {
        // No toast showing, show immediately
        setCurrentToast(newToast);
      } else {
        // Queue the toast
        setQueue((prevQueue) => [...prevQueue, newToast]);
      }
    },
    []
  );

  // Convenience methods
  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'success', duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'error', duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'info', duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'warning', duration);
    },
    [showToast]
  );

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    setCurrentToast(null);
    setQueue([]);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismissAll,
  }), [showToast, showSuccess, showError, showInfo, showWarning, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && (
        <View style={styles.toastContainer}>
          <Toast
            message={currentToast.message}
            type={currentToast.type}
            duration={currentToast.duration}
            onDismiss={handleDismiss}
          />
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    pointerEvents: 'box-none', // Allow touches to pass through except on toast itself
  },
});
