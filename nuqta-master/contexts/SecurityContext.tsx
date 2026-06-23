// Global Security Context
// Manages security settings and applies them globally across the app

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '@/utils/safeJson';
// Import with fallback for when expo-local-authentication is not available
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (_error) {
  // silently handle
}
import { platformAlertSimple } from '@/utils/platformAlert';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import userSettingsApi from '@/services/userSettingsApi';

// Security Settings Interface
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

// Privacy Settings Interface
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

// Context Interface
interface SecurityContextType {
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

// Default Settings
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

// Create Context
const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  SECURITY_SETTINGS: 'security_settings',
  PRIVACY_SETTINGS: 'privacy_settings',
  LAST_SYNC: 'security_last_sync',
};

// Provider Component
interface SecurityProviderProps {
  children: ReactNode;
}

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _securitySettingsLoaded = false;

export function SecurityProvider({ children }: SecurityProviderProps) {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);

  // Refs for state used inside stable callbacks (avoids re-creating callbacks on every state change)
  const securitySettingsRef = useRef(securitySettings);
  securitySettingsRef.current = securitySettings;
  const privacySettingsRef = useRef(privacySettings);
  privacySettingsRef.current = privacySettings;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;
  const userRef = useRef(user);
  userRef.current = user;
  const biometricAvailableRef = useRef(biometricAvailable);
  biometricAvailableRef.current = biometricAvailable;
  const biometricEnrolledRef = useRef(biometricEnrolled);
  biometricEnrolledRef.current = biometricEnrolled;

  // Check biometric availability
  const checkBiometricAvailability = useCallback(async () => {
    try {
      if (!LocalAuthentication) {
        setBiometricAvailable(false);
        setBiometricEnrolled(false);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setBiometricAvailable(hasHardware);
      setBiometricEnrolled(isEnrolled);

      // Update available methods
      const availableMethods: ('FINGERPRINT' | 'FACE_ID' | 'VOICE')[] = [];
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        availableMethods.push('FINGERPRINT');
      }
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        availableMethods.push('FACE_ID');
      }
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.VOICE)) {
        availableMethods.push('VOICE');
      }

      // Update settings with available methods
      const currentSettings = securitySettingsRef.current;
      if (currentSettings) {
        setSecuritySettings({
          ...currentSettings,
          biometric: {
            ...currentSettings.biometric,
            availableMethods,
          },
        });
      }
    } catch (error) {
      setBiometricAvailable(false);
      setBiometricEnrolled(false);
    }
  }, []);

  // Load from local storage
  const loadFromStorage = useCallback(async () => {
    try {
      const [securityStored, privacyStored] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS),
      ]);

      if (securityStored) {
        setSecuritySettings(safeJsonParse(securityStored, defaultSecuritySettings));
      } else {
        setSecuritySettings(defaultSecuritySettings);
      }

      if (privacyStored) {
        setPrivacySettings(safeJsonParse(privacyStored, defaultPrivacySettings));
      } else {
        setPrivacySettings(defaultPrivacySettings);
      }
    } catch (err) {
      setSecuritySettings(defaultSecuritySettings);
      setPrivacySettings(defaultPrivacySettings);
    }
  }, []);

  // Load settings from storage or backend
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isAuthenticatedRef.current && userRef.current) {
        // Load from backend
        const response = await userSettingsApi.getUserSettings();
        if (response.success && response.data) {
          setSecuritySettings(response.data.security || defaultSecuritySettings);
          setPrivacySettings(response.data.privacy || defaultPrivacySettings);

          // Save to local storage
          await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(response.data.security || defaultSecuritySettings));
          await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(response.data.privacy || defaultPrivacySettings));
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        } else {
          // Fallback to local storage
          await loadFromStorage();
        }
      } else {
        // Load from local storage
        await loadFromStorage();
      }

      // Check biometric availability
      await checkBiometricAvailability();
    } catch (err) {
      setError('Failed to load security settings');
      await loadFromStorage();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromStorage, checkBiometricAvailability]);

  // Update security settings
  const updateSecuritySettings = useCallback(async (updates: Partial<SecuritySettings>): Promise<boolean> => {
    try {
      const currentSettings = securitySettingsRef.current;
      if (!currentSettings) return false;

      const newSettings = { ...currentSettings, ...updates };
      setSecuritySettings(newSettings);

      // Save to local storage immediately
      await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(newSettings));

      // Sync with backend if authenticated
      if (isAuthenticatedRef.current && userRef.current) {
        try {
          const response = await userSettingsApi.updateSecuritySettings(newSettings);
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
      setError('Failed to update security settings');
      return false;
    }
  }, []);

  // Update privacy settings
  const updatePrivacySettings = useCallback(async (updates: Partial<PrivacySettings>): Promise<boolean> => {
    try {
      const currentSettings = privacySettingsRef.current;
      if (!currentSettings) return false;

      const newSettings = { ...currentSettings, ...updates };
      setPrivacySettings(newSettings);

      // Save to local storage immediately
      await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(newSettings));

      // Sync with backend if authenticated
      if (isAuthenticatedRef.current && userRef.current) {
        try {
          const response = await userSettingsApi.updatePrivacySettings(newSettings);
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
      setError('Failed to update privacy settings');
      return false;
    }
  }, []);

  // Refresh settings from backend
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  // Authenticate with biometric
  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      if (!LocalAuthentication) {
        platformAlertSimple('Biometric Authentication', 'Biometric authentication is not available on this device.');
        return false;
      }

      if (!biometricAvailableRef.current || !biometricEnrolledRef.current) {
        platformAlertSimple('Biometric Authentication', 'Biometric authentication is not available or not enrolled.');
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (error) {
      platformAlertSimple('Authentication Failed', 'Biometric authentication failed. Please try again.');
      return false;
    }
  }, []);

  // Enable two-factor authentication
  const enableTwoFactorAuth = useCallback(async (method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP'): Promise<boolean> => {
    try {
      const response = await userSettingsApi.enableTwoFactorAuth(method);

      if (response.success) {
        // Update local state
        await updateSecuritySettings({
          twoFactorAuth: {
            enabled: true,
            method,
            backupCodes: response.data.backupCodes,
            lastUpdated: new Date().toISOString(),
          },
        });

        platformAlertSimple(
          'Two-Factor Authentication Enabled',
          `Two-factor authentication has been enabled using ${method}. Please save your backup codes: ${response.data.backupCodes.join(', ')}`
        );
        return true;
      } else {
        platformAlertSimple('Error', 'Failed to enable two-factor authentication.');
        return false;
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to enable two-factor authentication.');
      return false;
    }
  }, [updateSecuritySettings]);

  // Disable two-factor authentication
  const disableTwoFactorAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await userSettingsApi.disableTwoFactorAuth();

      if (response.success) {
        // Update local state
        await updateSecuritySettings({
          twoFactorAuth: {
            enabled: false,
            method: '2FA_SMS',
            backupCodes: [],
          },
        });

        platformAlertSimple('Two-Factor Authentication Disabled', 'Two-factor authentication has been disabled.');
        return true;
      } else {
        platformAlertSimple('Error', 'Failed to disable two-factor authentication.');
        return false;
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to disable two-factor authentication.');
      return false;
    }
  }, [updateSecuritySettings]);

  // Generate backup codes
  const generateBackupCodes = useCallback((): string[] => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }, []);

  // Check if profile is visible based on privacy settings
  const isProfileVisible = useCallback((visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'): boolean => {
    const currentPrivacy = privacySettingsRef.current;
    if (!currentPrivacy) return false;
    return currentPrivacy.profileVisibility === visibility;
  }, []);

  // Load settings on mount and when auth state changes
  // Skip during onboarding to prevent thundering herd of API calls on Android
  useEffect(() => {
    if (!isAuthenticated || !user?.isOnboarded) return;
    if (_securitySettingsLoaded) return; // Module-level dedup
    _securitySettingsLoaded = true;
    loadSettings();
  }, [isAuthenticated, user]);

  // Reset module-level flag on logout
  useEffect(() => {
    if (!isAuthenticated) _securitySettingsLoaded = false;
  }, [isAuthenticated]);

  // Auto-sync with backend every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !user?.isOnboarded) return;

    const interval = setInterval(async () => {
      try {
        const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        if (lastSync) {
          const lastSyncTime = new Date(lastSync).getTime();
          const now = new Date().getTime();
          const fiveMinutes = 5 * 60 * 1000;

          if (now - lastSyncTime > fiveMinutes) {
            await refreshSettings();
          }
        }
      } catch (err) {
        // silently handle
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const value = useMemo<SecurityContextType>(() => ({
    securitySettings,
    privacySettings,
    isLoading,
    error,
    biometricAvailable,
    biometricEnrolled,
    updateSecuritySettings,
    updatePrivacySettings,
    refreshSettings,
    authenticateWithBiometric,
    enableTwoFactorAuth,
    disableTwoFactorAuth,
    generateBackupCodes,
    isProfileVisible,
  }), [
    securitySettings, privacySettings, isLoading, error, biometricAvailable, biometricEnrolled,
    updateSecuritySettings, updatePrivacySettings, refreshSettings, authenticateWithBiometric,
    enableTwoFactorAuth, disableTwoFactorAuth, generateBackupCodes, isProfileVisible,
  ]);

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

// Hook to use security context
// Safe defaults when provider hasn't loaded yet (deferred loading)
const SECURITY_DEFAULTS: SecurityContextType = {
  securitySettings: null,
  privacySettings: null,
  isLoading: false,
  error: null,
  biometricAvailable: false,
  biometricEnrolled: false,
  updateSecuritySettings: async () => false,
  updatePrivacySettings: async () => false,
  refreshSettings: async () => {},
  authenticateWithBiometric: async () => false,
  enableTwoFactorAuth: async () => false,
  disableTwoFactorAuth: async () => false,
  generateBackupCodes: () => [],
  isProfileVisible: () => false,
};

// Lazy import to avoid circular deps
let __useSecurityStore: () => any;
try {
  const { useSecurityStore } = require('@/stores/securityStore');
  __useSecurityStore = useSecurityStore;
} catch {
  __useSecurityStore = () => SECURITY_DEFAULTS;
}

// Now backed by Zustand store -- works with or without SecurityProvider in tree.
export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  const store = __useSecurityStore();
  if (context) return context;
  return store as unknown as SecurityContextType;
}
