import React, { useContext } from 'react';
import { PriveContext } from '@/contexts/PriveContext';

interface PriveFeatureGateProps {
  /** Feature flag name to check (from programConfig.featureFlags) */
  feature?: string;
  /** Minimum tier required: 'entry' | 'signature' | 'elite' */
  minTier?: string;
  /** Override: current user's tier (falls back to context) */
  currentTier?: string;
  /** Override: feature flags record (falls back to context) */
  featureFlags?: Record<string, boolean>;
  /** Content to show when gate passes */
  children: React.ReactNode;
  /** Optional fallback when gate blocks */
  fallback?: React.ReactNode;
}

const TIER_RANK: Record<string, number> = {
  none: 0,
  entry: 1,
  signature: 2,
  elite: 3,
};

export const PriveFeatureGate: React.FC<PriveFeatureGateProps> = ({
  feature,
  minTier,
  currentTier,
  featureFlags,
  children,
  fallback = null,
}) => {
  // Read from PriveContext when available, props take precedence as overrides
  const ctx = useContext(PriveContext);
  const resolvedTier = currentTier ?? ctx?.tier ?? 'none';
  const resolvedFlags = featureFlags ?? ctx?.programConfig?.featureFlags ?? {};

  // Check feature flag
  if (feature && resolvedFlags[feature] === false) {
    return <>{fallback}</>;
  }

  // Check tier requirement
  if (minTier) {
    const currentRank = TIER_RANK[resolvedTier] || 0;
    const requiredRank = TIER_RANK[minTier] || 0;
    if (currentRank < requiredRank) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default React.memo(PriveFeatureGate);
