import { colors } from '@/constants/theme';
import React, { Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface LazyComponentProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

/**
 * LazyComponent - Reusable lazy loading wrapper
 *
 * Wraps any component in React Suspense with a fallback loading state.
 * This enables code splitting and reduces initial bundle size.
 *
 * @example
 * ```tsx
 * const LazyModal = lazy(() => import('./AboutModal'));
 *
 * <LazyComponent
 *   component={LazyModal}
 *   props={{ visible: true, onClose: handleClose }}
 * />
 * ```
 */
export default function LazyComponent({
  component: Component,
  fallback,
  props = {}
}: LazyComponentProps) {
  const defaultFallback = (
    <View style={styles.fallbackContainer}>
      <ActivityIndicator size="large" color={colors.brand.indigo} />
    </View>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <Component {...props} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});
