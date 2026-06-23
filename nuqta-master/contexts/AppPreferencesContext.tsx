// @ts-nocheck
// Global App Preferences Context
// Manages app preferences and applies them globally across the app

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Deferred: expo-haptics is heavy native module
let _haptics: typeof import('expo-haptics') | null = null;
const getHaptics = async () => {
  if (!_haptics) _haptics = await import('expo-haptics');
  return _haptics;
};
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import userSettingsApi from '@/services/userSettingsApi';

// App Preferences Interface
export interface AppPreferences {
  startupScreen: 'HOME' | 'EXPLORE' | 'LAST_VIEWED';
  defaultView: 'CARD' | 'LIST' | 'GRID';
  autoRefresh: boolean;
  offlineMode: boolean;
  dataSaver: boolean;
  highQualityImages: boolean;
  animations: boolean;
  sounds: boolean;
  hapticFeedback: boolean;
}

// Context Interface
interface AppPreferencesContextType {
  preferences: AppPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<AppPreferences>) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
  triggerHapticFeedback: (type?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  playSound: (type?: 'success' | 'error' | 'notification' | 'click') => void;
  shouldAnimate: () => boolean;
  shouldPlaySounds: () => boolean;
  shouldUseHaptics: () => boolean;
}

// Default Preferences
const defaultPreferences: AppPreferences = {
  startupScreen: 'HOME',
  defaultView: 'CARD',
  autoRefresh: true,
  offlineMode: false,
  dataSaver: false,
  highQualityImages: true,
  animations: true,
  sounds: true,
  hapticFeedback: true,
};

// Create Context
const AppPreferencesContext = createContext<AppPreferencesContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  APP_PREFERENCES: 'app_preferences',
  LAST_SYNC: 'app_preferences_last_sync',
};

// Provider Component
interface AppPreferencesProviderProps {
  children: ReactNode;
}

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _appPreferencesLoaded = false;

export function AppPreferencesProvider({ children }: AppPreferencesProviderProps) {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for state used inside stable callbacks (avoids re-creating callbacks on every state change)
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;
  const userRef = useRef(user);
  userRef.current = user;

  // Load from local storage
  const loadFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.APP_PREFERENCES);
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        setPreferences(defaultPreferences);
      }
    } catch (err) {
      setPreferences(defaultPreferences);
    }
  }, []);

  // Load preferences from storage or backend
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isAuthenticatedRef.current && userRef.current) {
        // Load from backend
        const response = await userSettingsApi.getUserSettings();
        if (response.success && response.data) {
          setPreferences(response.data.preferences || defaultPreferences);

          // Save to local storage
          await AsyncStorage.setItem(STORAGE_KEYS.APP_PREFERENCES, JSON.stringify(response.data.preferences || defaultPreferences));
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        } else {
          // Fallback to local storage
          await loadFromStorage();
        }
      } else {
        // Load from local storage
        await loadFromStorage();
      }
    } catch (err) {
      setError('Failed to load app preferences');
      await loadFromStorage();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromStorage]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<AppPreferences>): Promise<boolean> => {
    try {
      const currentPrefs = preferencesRef.current;
      if (!currentPrefs) return false;

      const newPreferences = { ...currentPrefs, ...updates };
      setPreferences(newPreferences);

      // Save to local storage immediately
      await AsyncStorage.setItem(STORAGE_KEYS.APP_PREFERENCES, JSON.stringify(newPreferences));

      // Sync with backend if authenticated
      if (isAuthenticatedRef.current && userRef.current) {
        try {
          const response = await userSettingsApi.updateAppPreferences(newPreferences);
          if (response.success) {
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
            return true;
          } else {
            return false;
          }
        } catch (err) {
          return false;
        }
      }

      return true;
    } catch (err) {
      setError('Failed to update app preferences');
      return false;
    }
  }, []);

  // Refresh preferences from backend
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  // Trigger haptic feedback based on preferences
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (!preferencesRef.current?.hapticFeedback) return;

    getHaptics().then(Haptics => {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          break;
      }
    }).catch(() => {});
  }, []);

  // Play sound based on preferences
  const playSound = useCallback((type: 'success' | 'error' | 'notification' | 'click' = 'click') => {
    if (!preferencesRef.current?.sounds) return;

    try {
      // In a real app, you would use expo-av or react-native-sound
      // For now, we'll just log the sound type
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Check if animations should be enabled
  const shouldAnimate = useCallback((): boolean => {
    return preferencesRef.current?.animations || false;
  }, []);

  // Check if sounds should be played
  const shouldPlaySounds = useCallback((): boolean => {
    return preferencesRef.current?.sounds || false;
  }, []);

  // Check if haptic feedback should be used
  const shouldUseHaptics = useCallback((): boolean => {
    return preferencesRef.current?.hapticFeedback || false;
  }, []);

  // Load preferences on mount and when auth state changes
  // Skip API calls during onboarding to prevent thundering herd on Android
  useEffect(() => {
    if (!isAuthenticated || !user?.isOnboarded) return;
    if (_appPreferencesLoaded) return; // Module-level dedup
    _appPreferencesLoaded = true;
    loadPreferences();
  }, [isAuthenticated, user]);

  // Reset module-level flag on logout
  useEffect(() => {
    if (!isAuthenticated) _appPreferencesLoaded = false;
  }, [isAuthenticated]);

  // Auto-sync with backend every 5 minutes, pausing when app is backgrounded
  useEffect(() => {
    if (!isAuthenticated || !user?.isOnboarded) return;

    let isMounted = true;
    const appStateRef = { current: AppState.currentState };
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId) return; // already running
      intervalId = setInterval(async () => {
        if (!isMounted || appStateRef.current !== 'active') return;
        try {
          const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
          if (lastSync && isMounted) {
            const lastSyncTime = new Date(lastSync).getTime();
            const now = new Date().getTime();
            const fiveMinutes = 5 * 60 * 1000;

            if (now - lastSyncTime > fiveMinutes) {
              await refreshPreferences();
            }
          }
        } catch (err) {
          // silently handle
        }
      }, 5 * 60 * 1000);
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Only poll while app is in the foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        startInterval();
      } else {
        stopInterval();
      }
    });

    startInterval();

    return () => {
      isMounted = false;
      stopInterval();
      subscription.remove();
    };
  }, [isAuthenticated, user]);

  const value = useMemo<AppPreferencesContextType>(() => ({
    preferences,
    isLoading,
    error,
    updatePreferences,
    refreshPreferences,
    triggerHapticFeedback,
    playSound,
    shouldAnimate,
    shouldPlaySounds,
    shouldUseHaptics,
  }), [
    preferences, isLoading, error,
    updatePreferences, refreshPreferences, triggerHapticFeedback, playSound,
    shouldAnimate, shouldPlaySounds, shouldUseHaptics,
  ]);

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

const APP_PREFS_DEFAULTS: AppPreferencesContextType = {
  preferences: null,
  isLoading: false,
  error: null,
  updatePreferences: async () => false,
  refreshPreferences: async () => {},
  triggerHapticFeedback: () => {},
  playSound: () => {},
  shouldAnimate: () => true,
  shouldPlaySounds: () => false,
  shouldUseHaptics: () => false,
};

// Hook to use app preferences context
// Now backed by Zustand store — works with or without AppPreferencesProvider in tree.
export function useAppPreferences(): AppPreferencesContextType {
  const context = useContext(AppPreferencesContext);
  const store = __useAppPreferencesStore();
  if (context) return context;
  return store as unknown as AppPreferencesContextType;
}

// Lazy import to avoid circular deps
let __useAppPreferencesStore: () => any;
try {
  const { useAppPreferencesStore } = require('@/stores/appPreferencesStore');
  __useAppPreferencesStore = useAppPreferencesStore;
} catch {
  __useAppPreferencesStore = () => APP_PREFS_DEFAULTS;
}
