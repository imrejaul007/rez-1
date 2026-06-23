// Global Notification Context
// Manages notification settings and applies them globally across the app

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import userSettingsApi from '@/services/userSettingsApi';

// Notification Settings Interface
export interface NotificationSettings {
  push: {
    enabled: boolean;
    orderUpdates: boolean;
    promotions: boolean;
    recommendations: boolean;
    priceAlerts: boolean;
    deliveryUpdates: boolean;
    paymentUpdates: boolean;
    securityAlerts: boolean;
    chatMessages: boolean;
  };
  email: {
    enabled: boolean;
    newsletters: boolean;
    orderReceipts: boolean;
    weeklyDigest: boolean;
    promotions: boolean;
    securityAlerts: boolean;
    accountUpdates: boolean;
  };
  sms: {
    enabled: boolean;
    orderUpdates: boolean;
    deliveryAlerts: boolean;
    paymentConfirmations: boolean;
    securityAlerts: boolean;
    otpMessages: boolean;
  };
  inApp: {
    enabled: boolean;
    showBadges: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    bannerStyle: 'BANNER' | 'ALERT' | 'SILENT';
  };
}

// Context Interface
interface NotificationContextType {
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  canSendPushNotification: (type: keyof NotificationSettings['push']) => boolean;
  canSendEmailNotification: (type: keyof NotificationSettings['email']) => boolean;
  canSendSMSNotification: (type: keyof NotificationSettings['sms']) => boolean;
  canShowInAppNotification: () => boolean;
}

// Default Settings
const defaultSettings: NotificationSettings = {
  push: {
    enabled: true,
    orderUpdates: true,
    promotions: false,
    recommendations: true,
    priceAlerts: true,
    deliveryUpdates: true,
    paymentUpdates: true,
    securityAlerts: true,
    chatMessages: true,
  },
  email: {
    enabled: true,
    newsletters: false,
    orderReceipts: true,
    weeklyDigest: true,
    promotions: false,
    securityAlerts: true,
    accountUpdates: true,
  },
  sms: {
    enabled: true,
    orderUpdates: true,
    deliveryAlerts: true,
    paymentConfirmations: true,
    securityAlerts: true,
    otpMessages: true,
  },
  inApp: {
    enabled: true,
    showBadges: true,
    soundEnabled: true,
    vibrationEnabled: true,
    bannerStyle: 'BANNER',
  },
};

// Create Context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: 'notification_settings',
  LAST_SYNC: 'notification_last_sync',
};

// Provider Component
interface NotificationProviderProps {
  children: ReactNode;
}

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _notificationSettingsLoaded = false;

export function NotificationProvider({ children }: NotificationProviderProps) {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from storage or backend
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isAuthenticated && user) {
        // Load from backend
        const response = await userSettingsApi.getUserSettings();
        if (response.success && response.data?.notifications) {
          setSettings(response.data.notifications);
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(response.data.notifications));
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
      setError('Failed to load notification settings');
      await loadFromStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Load from local storage
  const loadFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (stored) {
        setSettings(JSON.parse(stored));
      } else {
        setSettings(defaultSettings);
      }
    } catch (err) {
      setSettings(defaultSettings);
    }
  };

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>): Promise<boolean> => {
    try {
      if (!settings) return false;

      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);

      // Save to local storage immediately
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(newSettings));

      // Sync with backend if authenticated
      if (isAuthenticated && user) {
        try {
          const response = await userSettingsApi.updateNotificationPreferences(newSettings);
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
      setError('Failed to update settings');
      return false;
    }
  }, [settings, isAuthenticated, user]);

  // Refresh settings from backend
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, []);

  // Check if push notification can be sent
  const canSendPushNotification = useCallback((type: keyof NotificationSettings['push']): boolean => {
    if (!settings) return false;
    return settings.push.enabled && settings.push[type];
  }, [settings]);

  // Check if email notification can be sent
  const canSendEmailNotification = useCallback((type: keyof NotificationSettings['email']): boolean => {
    if (!settings) return false;
    return settings.email.enabled && settings.email[type];
  }, [settings]);

  // Check if SMS notification can be sent
  const canSendSMSNotification = useCallback((type: keyof NotificationSettings['sms']): boolean => {
    if (!settings) return false;
    return settings.sms.enabled && settings.sms[type];
  }, [settings]);

  // Check if in-app notification can be shown
  const canShowInAppNotification = useCallback((): boolean => {
    if (!settings) return false;
    return settings.inApp.enabled;
  }, [settings]);

  // Configure notification handler based on settings
  useEffect(() => {
    if (settings) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: settings.inApp.enabled && settings.inApp.bannerStyle !== 'SILENT',
            shouldPlaySound: settings.inApp.soundEnabled,
            shouldSetBadge: settings.inApp.showBadges,
            shouldShowBanner: settings.inApp.enabled && settings.inApp.bannerStyle === 'BANNER',
            shouldShowList: settings.inApp.enabled,
          }),
        });
      } catch (e) {
        // silently handle
      }
    }
  }, [settings]);

  // Load settings on mount and when auth state changes
  // Skip API calls during onboarding to prevent thundering herd on Android
  useEffect(() => {
    if (!isAuthenticated || !user?.isOnboarded) return;
    if (_notificationSettingsLoaded) return; // Module-level dedup
    _notificationSettingsLoaded = true;
    loadSettings();
  }, [isAuthenticated, user]);

  // Reset module-level flag on logout
  useEffect(() => {
    if (!isAuthenticated) _notificationSettingsLoaded = false;
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
              await refreshSettings();
            }
          }
        } catch (err) {
          // Silently ignore sync errors
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
  }, [isAuthenticated, user, refreshSettings]);

  // OPTIMIZED: Memoize context value to prevent unnecessary re-renders
  const value: NotificationContextType = useMemo(() => ({
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings,
    canSendPushNotification,
    canSendEmailNotification,
    canSendSMSNotification,
    canShowInAppNotification,
  }), [
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings,
    canSendPushNotification,
    canSendEmailNotification,
    canSendSMSNotification,
    canShowInAppNotification,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
// Safe defaults when provider hasn't loaded yet (deferred loading)
const NOTIFICATION_DEFAULTS: NotificationContextType = {
  settings: null,
  isLoading: false,
  error: null,
  updateSettings: async () => false,
  refreshSettings: async () => {},
  canSendPushNotification: () => false,
  canSendEmailNotification: () => false,
  canSendSMSNotification: () => false,
  canShowInAppNotification: () => false,
};

// Lazy import to avoid circular deps
let __useNotificationStore: () => any;
try {
  const { useNotificationStore } = require('@/stores/notificationStore');
  __useNotificationStore = useNotificationStore;
} catch {
  __useNotificationStore = () => NOTIFICATION_DEFAULTS;
}

// Now backed by Zustand store -- works with or without NotificationProvider in tree.
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  const store = __useNotificationStore();
  if (context) return context;
  return store as unknown as NotificationContextType;
}
