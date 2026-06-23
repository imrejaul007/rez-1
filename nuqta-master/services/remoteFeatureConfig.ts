import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'remote_feature_flags';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface FlagEntry {
  enabled: boolean;
  config: Record<string, any>;
}

interface FlagResponse {
  flags: Record<string, FlagEntry>;
  fetchedAt: string;
}

/**
 * Remote Feature Config — fetches feature flags from backend on launch.
 *
 * - Caches in AsyncStorage for offline / fast cold-start
 * - Fail-open: features are enabled by default if flags can't be fetched
 * - Auto-refreshes every 5 minutes
 *
 * @example
 * import { remoteFeatureConfig } from '@/services/remoteFeatureConfig';
 *
 * // On app launch (call once)
 * await remoteFeatureConfig.initialize();
 *
 * // In components
 * if (remoteFeatureConfig.isEnabled('spinWheel')) { ... }
 *
 * // Get feature config
 * const config = remoteFeatureConfig.getConfig<{ maxSpins: number }>('spinWheel');
 */
class RemoteFeatureConfig {
  private flags: Record<string, FlagEntry> = {};
  private loaded = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Fetch flags from backend and cache locally.
   * Falls back to AsyncStorage cache if API fails.
   */
  async initialize(): Promise<void> {
    // Load from AsyncStorage first (instant, no network)
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: FlagResponse = JSON.parse(cached);
        this.flags = parsed.flags || {};
        this.loaded = true;
      }
    } catch {
      // Ignore storage errors
    }

    // Then fetch fresh from API (non-blocking if cache loaded)
    await this.refresh();

    // Set up periodic refresh
    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    }
  }

  /**
   * Check if a feature is enabled. Defaults to true (fail-open).
   */
  isEnabled(key: string): boolean {
    const flag = this.flags[key];
    if (!flag) return true; // Unknown flag → enabled (fail-open)
    return flag.enabled;
  }

  /**
   * Get the configJson for a feature flag.
   */
  getConfig<T = Record<string, any>>(key: string): T | null {
    const flag = this.flags[key];
    if (!flag || !flag.config) return null;
    return flag.config as T;
  }

  /**
   * Get all flags (for debugging / admin views).
   */
  getAllFlags(): Record<string, FlagEntry> {
    return { ...this.flags };
  }

  /**
   * Whether flags have been loaded at least once.
   */
  get isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Re-fetch flags from the backend.
   */
  async refresh(): Promise<void> {
    try {
      const response = await apiClient.get<FlagResponse>('/config/feature-flags');
      if (response.success && response.data?.flags) {
        this.flags = response.data.flags;
        this.loaded = true;

        // Persist to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.data)).catch((err) => {
          if (__DEV__) console.warn('[FeatureConfig] Failed to persist flags:', err);
        });
      }
    } catch (error) {
      // Non-blocking — use cached flags
      if (typeof logger !== 'undefined' && logger?.warn) {
        logger.warn('[RemoteFeatureConfig] Failed to fetch flags, using cache');
      }
    }
  }

  /**
   * Clean up the refresh timer (call on app unmount if needed).
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const remoteFeatureConfig = new RemoteFeatureConfig();
export default remoteFeatureConfig;
