import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userSettingsApi from '@/services/userSettingsApi';

// Import with fallback for when expo-local-authentication is not available
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (_error) {
  // silently handle
}

export interface SecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP';
    backupCodes: string[];
    lastUpdated?: string;
  };
  biometric: {
    fingerprintEnabled: boolean;
    faceIdEnabled: boolean;
    voiceEnabled: boolean;
    availableMethods: ('FINGERPRINT' | 'FACE_ID' | 'VOICE')[];
  };
  sessionManagement: {
    autoLogoutTime: number;
    allowMultipleSessions: boolean;
    rememberMe: boolean;
  };
  loginAlerts: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  showActivity: boolean;
  showPurchaseHistory: boolean;
  allowMessaging: boolean;
  allowFriendRequests: boolean;
  dataSharing: {
    shareWithPartners: boolean;
    shareForMarketing: boolean;
    shareForRecommendations: boolean;
    shareForAnalytics: boolean;
    sharePurchaseData: boolean;
  };
  analytics: {
    allowUsageTracking: boolean;
    allowCrashReporting: boolean;
    allowPerformanceTracking: boolean;
    allowLocationTracking: boolean;
  };
}

interface SecurityStoreState {
  securitySettings: SecuritySettings | null;
  privacySettings: PrivacySettings | null;
  isLoading: boolean;
  error: string | null;
  biometricAvailable: boolean;
  biometricEnrolled: boolean;
  updateSecuritySettings: (updates: Partial<SecuritySettings>) => Promise<boolean>;
  updatePrivacySettings: (updates: Partial<PrivacySettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  enableTwoFactorAuth: (method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP') => Promise<boolean>;
  disableTwoFactorAuth: () => Promise<boolean>;
  generateBackupCodes: () => string[];
  isProfileVisible: (visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE') => boolean;
}

const STORAGE_KEYS = {
  SECURITY_SETTINGS: 'security_settings',
  PRIVACY_SETTINGS: 'privacy_settings',
  LAST_SYNC: 'security_last_sync',
};

const defaultSecuritySettings: SecuritySettings = {
  twoFactorAuth: {
    enabled: false,
    method: '2FA_SMS',
    backupCodes: [],
  },
  biometric: {
    fingerprintEnabled: false,
    faceIdEnabled: false,
    voiceEnabled: false,
    availableMethods: [],
  },
  sessionManagement: {
    autoLogoutTime: 30,
    allowMultipleSessions: true,
    rememberMe: true,
  },
  loginAlerts: true,
};

const defaultPrivacySettings: PrivacySettings = {
  profileVisibility: 'FRIENDS',
  showActivity: false,
  showPurchaseHistory: false,
  allowMessaging: true,
  allowFriendRequests: true,
  dataSharing: {
    shareWithPartners: false,
    shareForMarketing: false,
    shareForRecommendations: true,
    shareForAnalytics: false,
    sharePurchaseData: false,
  },
  analytics: {
    allowUsageTracking: true,
    allowCrashReporting: true,
    allowPerformanceTracking: true,
    allowLocationTracking: false,
  },
};

export const useSecurityStore = create<SecurityStoreState>((set, get) => ({
  securitySettings: null,
  privacySettings: null,
  isLoading: false,
  error: null,
  biometricAvailable: false,
  biometricEnrolled: false,

  updateSecuritySettings: async (updates: Partial<SecuritySettings>): Promise<boolean> => {
    try {
      const currentSettings = get().securitySettings;
      if (!currentSettings) return false;

      const newSettings = { ...currentSettings, ...updates };
      set({ securitySettings: newSettings });

      await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(newSettings));

      try {
        const response = await userSettingsApi.updateSecuritySettings(newSettings);
        if (response.success) {
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
          return true;
        }
        return false;
      } catch (_err) {
        return false;
      }
    } catch (_err) {
      set({ error: 'Failed to update security settings' });
      return false;
    }
  },

  updatePrivacySettings: async (updates: Partial<PrivacySettings>): Promise<boolean> => {
    try {
      const currentSettings = get().privacySettings;
      if (!currentSettings) return false;

      const newSettings = { ...currentSettings, ...updates };
      set({ privacySettings: newSettings });

      await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(newSettings));

      try {
        const response = await userSettingsApi.updatePrivacySettings(newSettings);
        if (response.success) {
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
          return true;
        }
        return false;
      } catch (_err) {
        return false;
      }
    } catch (_err) {
      set({ error: 'Failed to update privacy settings' });
      return false;
    }
  },

  refreshSettings: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      try {
        const response = await userSettingsApi.getUserSettings();
        if (response.success && response.data) {
          set({
            securitySettings: response.data.security || defaultSecuritySettings,
            privacySettings: response.data.privacy || defaultPrivacySettings,
          });

          await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(response.data.security || defaultSecuritySettings));
          await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(response.data.privacy || defaultPrivacySettings));
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        } else {
          // Fallback to local storage
          await loadFromStorage();
        }
      } catch (_err) {
        await loadFromStorage();
      }

      // Check biometric availability
      if (LocalAuthentication) {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          set({ biometricAvailable: hasHardware, biometricEnrolled: isEnrolled });
        } catch (_e) {
          // silently handle
        }
      }
    } catch (_err) {
      set({ error: 'Failed to load security settings' });
      await loadFromStorage();
    } finally {
      set({ isLoading: false });
    }

    async function loadFromStorage() {
      try {
        const [securityStored, privacyStored] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS),
        ]);
        set({
          securitySettings: securityStored ? JSON.parse(securityStored) : defaultSecuritySettings,
          privacySettings: privacyStored ? JSON.parse(privacyStored) : defaultPrivacySettings,
        });
      } catch (_e) {
        set({
          securitySettings: defaultSecuritySettings,
          privacySettings: defaultPrivacySettings,
        });
      }
    }
  },

  authenticateWithBiometric: async (): Promise<boolean> => {
    try {
      if (!LocalAuthentication) return false;
      const { biometricAvailable, biometricEnrolled } = get();
      if (!biometricAvailable || !biometricEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (_error) {
      return false;
    }
  },

  enableTwoFactorAuth: async (method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP'): Promise<boolean> => {
    try {
      const response = await userSettingsApi.enableTwoFactorAuth(method);
      if (response.success) {
        await get().updateSecuritySettings({
          twoFactorAuth: {
            enabled: true,
            method,
            backupCodes: response.data.backupCodes,
            lastUpdated: new Date().toISOString(),
          },
        });
        return true;
      }
      return false;
    } catch (_error) {
      return false;
    }
  },

  disableTwoFactorAuth: async (): Promise<boolean> => {
    try {
      const response = await userSettingsApi.disableTwoFactorAuth();
      if (response.success) {
        await get().updateSecuritySettings({
          twoFactorAuth: {
            enabled: false,
            method: '2FA_SMS',
            backupCodes: [],
          },
        });
        return true;
      }
      return false;
    } catch (_error) {
      return false;
    }
  },

  generateBackupCodes: (): string[] => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  },

  isProfileVisible: (visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'): boolean => {
    const { privacySettings } = get();
    if (!privacySettings) return false;
    return privacySettings.profileVisibility === visibility;
  },
}));
