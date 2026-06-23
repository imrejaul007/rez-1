import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userSettingsApi from '@/services/userSettingsApi';

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

interface NotificationStoreState {
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

const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: 'notification_settings',
  LAST_SYNC: 'notification_last_sync',
};

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

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  updateSettings: async (updates: Partial<NotificationSettings>): Promise<boolean> => {
    try {
      const { settings } = get();
      if (!settings) return false;

      const newSettings = { ...settings, ...updates };
      set({ settings: newSettings });

      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(newSettings));

      try {
        const response = await userSettingsApi.updateNotificationPreferences(newSettings);
        if (response.success) {
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
          return true;
        }
        return false;
      } catch (_err) {
        return false;
      }
    } catch (_err) {
      set({ error: 'Failed to update settings' });
      return false;
    }
  },

  refreshSettings: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      try {
        const response = await userSettingsApi.getUserSettings();
        if (response.success && response.data?.notifications) {
          set({ settings: response.data.notifications });
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(response.data.notifications));
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        } else {
          await loadFromStorage();
        }
      } catch (_err) {
        await loadFromStorage();
      }
    } catch (_err) {
      set({ error: 'Failed to load notification settings' });
      await loadFromStorage();
    } finally {
      set({ isLoading: false });
    }

    async function loadFromStorage() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
        set({ settings: stored ? JSON.parse(stored) : defaultSettings });
      } catch (_e) {
        set({ settings: defaultSettings });
      }
    }
  },

  canSendPushNotification: (type: keyof NotificationSettings['push']): boolean => {
    const { settings } = get();
    if (!settings) return false;
    return settings.push.enabled && settings.push[type];
  },

  canSendEmailNotification: (type: keyof NotificationSettings['email']): boolean => {
    const { settings } = get();
    if (!settings) return false;
    return settings.email.enabled && settings.email[type];
  },

  canSendSMSNotification: (type: keyof NotificationSettings['sms']): boolean => {
    const { settings } = get();
    if (!settings) return false;
    return settings.sms.enabled && settings.sms[type];
  },

  canShowInAppNotification: (): boolean => {
    const { settings } = get();
    if (!settings) return false;
    return settings.inApp.enabled;
  },
}));
