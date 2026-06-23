/**
 * HOC that wraps a page component in FeatureErrorBoundary.
 * Isolates crashes to individual screens — navigation and tabs keep working.
 *
 * Usage:
 *   function MyPage() { ... }
 *   export default withErrorBoundary(MyPage, 'My Page');
 */
import React from 'react';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { useRouter } from 'expo-router';
import { errorReporter } from '@/utils/errorReporter';

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string
) {
  function ErrorBoundaryWrapper(props: P) {
    const router = useRouter();

    return (
      <FeatureErrorBoundary
        featureName={featureName}
        onError={(error, errorInfo) => {
          errorReporter.captureError(error, {
            context: `ErrorBoundary.${featureName}`,
            component: featureName,
          }, 'error');
        }}
        onSecondaryAction={() => {
          try {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          } catch {
            // Navigation may fail during error recovery
          }
        }}
        secondaryActionLabel="Go Back"
      >
        <WrappedComponent {...props} />
      </FeatureErrorBoundary>
    );
  }

  ErrorBoundaryWrapper.displayName = `withErrorBoundary(${featureName})`;
  return ErrorBoundaryWrapper;
}
