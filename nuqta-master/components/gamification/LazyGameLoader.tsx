// @ts-nocheck
// Lazy Game Loader - Performance Optimization Component
// Dynamically loads game components only when needed

import React, { Suspense, lazy, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface LazyGameLoaderProps {
  gamePath: string;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

// Preload cache for lazy components
const componentCache = new Map<string, ComponentType<any>>();

// Game component paths mapping
const GAME_PATHS = {
  'spin-wheel': () => import('./SpinWheelGame'),
  'scratch-card': () => import('./ScratchCardGame'),
  'quiz': () => import('./QuizGame'),
} as const;

type GameType = keyof typeof GAME_PATHS;

/**
 * Default loading fallback
 */
const DefaultLoader = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color={colors.brand.purpleLight} />
    <ThemedText style={styles.loaderText}>Loading game...</ThemedText>
  </View>
);

/**
 * Error boundary for lazy loaded components
 */
class LazyGameErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorTitle}>Failed to load game</ThemedText>
          <ThemedText style={styles.errorText}>
            {this.state.error?.message || 'Unknown error'}
          </ThemedText>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Lazy Game Loader Component
 * Dynamically loads game components with caching and error handling
 */
function LazyGameLoader({
  gamePath,
  fallback,
  onError
}: LazyGameLoaderProps) {
  // Get or create lazy component
  const getLazyComponent = (path: GameType) => {
    if (componentCache.has(path)) {
      return componentCache.get(path)!;
    }

    const lazyComponent = lazy(GAME_PATHS[path]);
    componentCache.set(path, lazyComponent);
    return lazyComponent;
  };

  const LazyComponent = getLazyComponent(gamePath as GameType);

  return (
    <LazyGameErrorBoundary onError={onError}>
      <Suspense fallback={fallback || <DefaultLoader />}>
        <LazyComponent />
      </Suspense>
    </LazyGameErrorBoundary>
  );
}

/**
 * Preload game component
 * Call this to preload games before user navigates to them
 */
export const preloadGame = (gamePath: GameType) => {
  if (!componentCache.has(gamePath)) {
    const lazyComponent = lazy(GAME_PATHS[gamePath]);
    componentCache.set(gamePath, lazyComponent);

    // Trigger the import to start loading
    GAME_PATHS[gamePath]().catch(err => {
    });
  }
};

/**
 * Preload all games
 * Call this on app startup or when user is likely to play games
 */
export const preloadAllGames = () => {
  Object.keys(GAME_PATHS).forEach(game => {
    preloadGame(game as GameType);
  });
};

/**
 * Clear game cache
 * Useful for memory management
 */
export const clearGameCache = () => {
  componentCache.clear();
};

/**
 * Get cache stats
 */
export const getGameCacheStats = () => {
  return {
    cachedGames: Array.from(componentCache.keys()),
    cacheSize: componentCache.size,
  };
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.neutral[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
});

export default React.memo(LazyGameLoader);
