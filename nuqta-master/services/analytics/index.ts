// @ts-nocheck
/**
 * Analytics Service - Main Export
 *
 * Central export point for all analytics functionality
 */

// Main service
export { analytics, AnalyticsService } from './AnalyticsService';

// Types
export * from './types';

// Event catalog
export { ANALYTICS_EVENTS, EVENT_SCHEMAS } from './events';

// Providers
export { BaseAnalyticsProvider } from './providers/BaseProvider';
export { CustomAnalyticsProvider } from './providers/CustomProvider';

// Utilities
export { ecommerceFunnel, EcommerceFunnelTracker } from '../../utils/ecommerceFunnel';
export { consentManager, AnalyticsConsentManager } from '../../utils/analyticsConsent';
export { eventValidator, EventValidator } from '../../utils/eventValidator';
export { analyticsQueue, AnalyticsQueue } from '../../utils/analyticsQueue';
export { analyticsDebugger, AnalyticsDebugger } from '../../utils/analyticsDebugger';

// Hooks
export { useComprehensiveAnalytics } from '../../hooks/useComprehensiveAnalytics';
export { useScreenTracking } from '../../hooks/useScreenTracking';

// Components
export { AnalyticsView } from '../../components/analytics/AnalyticsView';
export { TrackableButton } from '../../components/analytics/TrackableButton';
export { TrackableTouchable } from '../../components/analytics/TrackableTouchable';
