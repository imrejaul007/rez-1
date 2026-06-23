import React from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from './Toast';
import { useToastStore } from '@/stores/toastStore';

export interface ToastConfig {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
}

/**
 * Imperative showToast — works without any React context.
 * Used by many files that import { showToast } from '@/components/common/ToastManager'.
 */
export function showToast(config: Omit<ToastConfig, 'id'>) {
  useToastStore.getState().showToast(
    config.message,
    config.type || 'info',
    config.duration,
  );
}

/**
 * ToastManager — renders the current toast from the Zustand toastStore.
 * No provider needed. Place this component once in the tree (e.g., ThemedNavigation).
 */
export default function ToastManager() {
  const currentToast = useToastStore((s) => s.currentToast);
  const onDismiss = useToastStore((s) => s._onDismiss);

  if (!currentToast) return null;

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Toast
        key={currentToast.id}
        message={currentToast.message}
        type={currentToast.type}
        duration={currentToast.duration}
        actions={currentToast.actions}
        onDismiss={onDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
