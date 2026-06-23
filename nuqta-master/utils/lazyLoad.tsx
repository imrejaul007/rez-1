/**
 * Lazy Loading Utilities
 *
 * Provides robust lazy loading with error boundaries, retry logic,
 * loading states, and preload functionality for optimal performance.
 */

import React, { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { errorReporter } from './errorReporter';
import { colors } from '@/constants/theme';

// ============================================================================
// Types
// ============================================================================

export interface LazyLoadOptions {
  /** Fallback component to show while loading */
  fallback?: ReactNode;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retry attempts (ms) */
  retryDelay?: number;
  /** Component name for error reporting */
  componentName?: string;
  /** Enable preloading capability */
  enablePreload?: boolean;
}

interface RetryState {
  hasError: boolean;
  retryCount: number;
}

// ============================================================================
// Default Components
// ============================================================================

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.brand.purpleLight} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

/**
 * Error fallback component with retry button
 */
const ErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  componentName?: string;
}> = ({ error, retry, componentName }) => (
  <View style={styles.container}>
    <Text style={styles.errorTitle}>Failed to Load Component</Text>
    {componentName && (
      <Text style={styles.errorComponent}>{componentName}</Text>
    )}
    <Text style={styles.errorMessage}>{error.message}</Text>
    <View style={styles.retryButton}>
      <Text style={styles.retryText} onPress={retry}>
        Retry
      </Text>
    </View>
  </View>
);

// ============================================================================
// Error Boundary for Lazy Components
// ============================================================================

class LazyErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
    onError?: (error: Error) => void;
    maxRetries?: number;
    retryDelay?: number;
    componentName?: string;
  },
  RetryState
> {
  state: RetryState = {
    hasError: false,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<RetryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, componentName } = this.props;

    // Report error
    errorReporter.captureError(error, {
      context: 'LazyLoadError',
      component: componentName || 'UnknownLazyComponent',
      metadata: {
        retryCount: this.state.retryCount,
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom error handler
    if (onError) {
      onError(error);
    }

  }

  retry = () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {

      setTimeout(() => {
        this.setState({
          hasError: false,
          retryCount: retryCount + 1,
        });
      }, retryDelay);
    } else {
    }
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback(new Error('Component failed to load'), this.retry);
      }
      return (
        <ErrorFallback
          error={new Error('Component failed to load')}
          retry={this.retry}
          componentName={componentName}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Lazy Load Functions
// ============================================================================

/**
 * Enhanced lazy loading with error handling and retry logic
 *
 * @example
 * ```tsx
 * const MyComponent = lazyLoad(() => import('./MyComponent'), {
 *   componentName: 'MyComponent',
 *   maxRetries: 3,
 * });
 * ```
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentPropsWithoutRef<T>> {
  const {
    fallback,
    maxRetries = 3,
    retryDelay = 1000,
    componentName = 'LazyComponent',
    enablePreload = true,
  } = options;

  // Create lazy component
  const LazyComponent = lazy(() =>
    retryImport(importFn, maxRetries, retryDelay, componentName)
  );

  // Preload function
  if (enablePreload) {
    (LazyComponent as any).preload = () => {
      return importFn().catch(() => {});
    };
  }

  // Return wrapped component
  const WrappedComponent: React.FC<any> = (props) => (
    <LazyErrorBoundary
      maxRetries={maxRetries}
      retryDelay={retryDelay}
      componentName={componentName}
      fallback={(error, retry) =>
        fallback || <ErrorFallback error={error} retry={retry} componentName={componentName} />
      }
    >
      <Suspense fallback={fallback || <DefaultLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );

  WrappedComponent.displayName = `LazyLoad(${componentName})`;

  return WrappedComponent;
}

/**
 * Retry import with exponential backoff
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  maxRetries: number,
  retryDelay: number,
  componentName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to load ${componentName} after ${maxRetries} attempts`);
}

// ============================================================================
// Lazy Load with Custom Loading
// ============================================================================

/**
 * Lazy load with custom loading component
 *
 * @example
 * ```tsx
 * const MyComponent = lazyLoadWithLoader(
 *   () => import('./MyComponent'),
 *   <CustomLoader />,
 *   { componentName: 'MyComponent' }
 * );
 * ```
 */
export function lazyLoadWithLoader<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  loader: ReactNode,
  options: Omit<LazyLoadOptions, 'fallback'> = {}
): React.ComponentType<React.ComponentPropsWithoutRef<T>> {
  return lazyLoad(importFn, {
    ...options,
    fallback: loader,
  });
}

// ============================================================================
// Preload Utilities
// ============================================================================

/**
 * Preload a lazy component
 *
 * @example
 * ```tsx
 * const MyComponent = lazyLoad(() => import('./MyComponent'));
 *
 * // Preload on hover
 * <button onMouseEnter={() => preloadComponent(MyComponent)}>
 *   Open Modal
 * </button>
 * ```
 */
export function preloadComponent(component: any): Promise<void> | void {
  if (component && typeof component.preload === 'function') {
    return component.preload();
  }
}

/**
 * Preload multiple components
 */
export async function preloadComponents(components: any[]): Promise<void> {
  const promises = components
    .filter(c => c && typeof c.preload === 'function')
    .map(c => c.preload());

  await Promise.all(promises);
}

// ============================================================================
// Platform-Specific Lazy Loading
// ============================================================================

/**
 * Lazy load with platform-specific implementations
 *
 * @example
 * ```tsx
 * const Map = lazyLoadPlatform({
 *   web: () => import('./MapWeb'),
 *   native: () => import('./MapNative'),
 * });
 * ```
 */
export function lazyLoadPlatform<T extends ComponentType<any>>(platformImports: {
  web?: () => Promise<{ default: T }>;
  native?: () => Promise<{ default: T }>;
  ios?: () => Promise<{ default: T }>;
  android?: () => Promise<{ default: T }>;
  default: () => Promise<{ default: T }>;
}, options: LazyLoadOptions = {}): React.ComponentType<React.ComponentPropsWithoutRef<T>> {
  let importFn: () => Promise<{ default: T }>;

  if (Platform.OS === 'web' && platformImports.web) {
    importFn = platformImports.web;
  } else if (Platform.OS === 'ios' && platformImports.ios) {
    importFn = platformImports.ios;
  } else if (Platform.OS === 'android' && platformImports.android) {
    importFn = platformImports.android;
  } else if (Platform.OS !== 'web' && platformImports.native) {
    importFn = platformImports.native;
  } else {
    importFn = platformImports.default;
  }

  return lazyLoad(importFn, options);
}

// ============================================================================
// Conditional Lazy Loading
// ============================================================================

/**
 * Lazy load based on a condition
 * Used for feature flags or authentication
 *
 * @example
 * ```tsx
 * const AdminPanel = lazyLoadIf(
 *   () => userIsAdmin,
 *   () => import('./AdminPanel'),
 *   { componentName: 'AdminPanel' }
 * );
 * ```
 */
export function lazyLoadIf<T extends ComponentType<any>>(
  condition: () => boolean,
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentPropsWithoutRef<T>> {
  const LazyComponent = lazyLoad(importFn, options);

  const ConditionalComponent: React.FC<any> = (props) => {
    if (!condition()) {
      return null;
    }
    return <LazyComponent {...props} />;
  };

  ConditionalComponent.displayName = `LazyLoadIf(${options.componentName || 'Component'})`;

  return ConditionalComponent;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorComponent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ============================================================================
// Exports
// ============================================================================

export default {
  lazyLoad,
  lazyLoadWithLoader,
  lazyLoadPlatform,
  lazyLoadIf,
  preloadComponent,
  preloadComponents,
};
