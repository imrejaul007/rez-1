/**
 * ErrorBoundary — backward-compatible re-export of FeatureErrorBoundary.
 *
 * All new code should import FeatureErrorBoundary directly:
 *   import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
 *
 * This file exists so existing consumers that do
 *   import { ErrorBoundary } from '@/components/ErrorBoundary';
 * continue to work without changes.
 */

import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';

export { FeatureErrorBoundary as ErrorBoundary };
export default FeatureErrorBoundary;
