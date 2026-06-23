import { useState, useEffect } from 'react';
import { remoteFeatureConfig } from '@/services/remoteFeatureConfig';

/**
 * Hook to check if a feature flag is enabled.
 * Reads from the remoteFeatureConfig singleton (initialized on app launch).
 * Fail-open: returns true if the flag is unknown or config hasn't loaded yet.
 *
 * @example
 * const isSpinWheelEnabled = useFeatureFlag('games.spin_wheel');
 * if (!isSpinWheelEnabled) return <FeatureDisabledView />;
 */
export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(() => remoteFeatureConfig.isEnabled(key));

  useEffect(() => {
    // If already loaded, sync immediately
    if (remoteFeatureConfig.isLoaded) {
      setEnabled(remoteFeatureConfig.isEnabled(key));
      return;
    }

    // Poll until loaded (flags fetched from backend), then stop
    const interval = setInterval(() => {
      if (remoteFeatureConfig.isLoaded) {
        setEnabled(remoteFeatureConfig.isEnabled(key));
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [key]);

  return enabled;
}

/**
 * Hook to get the configJson for a feature flag.
 *
 * @example
 * const config = useFeatureConfig<{ maxSpins: number }>('games.spin_wheel');
 */
export function useFeatureConfig<T = Record<string, any>>(key: string): T | null {
  return remoteFeatureConfig.getConfig<T>(key);
}
