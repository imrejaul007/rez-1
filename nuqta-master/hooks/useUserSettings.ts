// useUserSettings Hook
// Manages comprehensive user settings across 8 categories

import { useState, useEffect, useCallback } from 'react';
import userSettingsApi, {
  UserSettings,
  GeneralSettings,
  NotificationPreferences,
  PrivacySettings,
  SecuritySettings,
  DeliveryPreferences,
  PaymentPreferences,
  AppPreferences,
} from '@/services/userSettingsApi';

interface UseUserSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateGeneralSettings: (data: Partial<GeneralSettings>) => Promise<UserSettings | null>;
  updateNotifications: (data: Partial<NotificationPreferences>) => Promise<UserSettings | null>;
  updatePrivacy: (data: Partial<PrivacySettings>) => Promise<UserSettings | null>;
  updateSecurity: (data: Partial<SecuritySettings>) => Promise<UserSettings | null>;
  updateDelivery: (data: Partial<DeliveryPreferences>) => Promise<UserSettings | null>;
  updatePayment: (data: Partial<PaymentPreferences>) => Promise<UserSettings | null>;
  updateAppPreferences: (data: Partial<AppPreferences>) => Promise<UserSettings | null>;
  resetSettings: () => Promise<UserSettings | null>;
  clearError: () => void;
}

export const useUserSettings = (autoFetch: boolean = true): UseUserSettingsReturn => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userSettingsApi.getUserSettings();

      if (response.success && response.data) {
        setSettings(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch settings');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch user settings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateGeneralSettings = useCallback(
    async (data: Partial<GeneralSettings>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updateGeneralSettings(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update general settings');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update general settings';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const updateNotifications = useCallback(
    async (data: Partial<NotificationPreferences>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updateNotificationPreferences(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update notification preferences');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update notification preferences';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const updatePrivacy = useCallback(
    async (data: Partial<PrivacySettings>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updatePrivacySettings(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update privacy settings');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update privacy settings';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const updateSecurity = useCallback(
    async (data: Partial<SecuritySettings>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updateSecuritySettings(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update security settings');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update security settings';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const updateDelivery = useCallback(
    async (data: Partial<DeliveryPreferences>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updateDeliveryPreferences(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update delivery preferences');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update delivery preferences';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const updatePayment = useCallback(
    async (data: Partial<PaymentPreferences>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updatePaymentPreferences(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update payment preferences');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update payment preferences';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const updateAppPreferences = useCallback(
    async (data: Partial<AppPreferences>): Promise<UserSettings | null> => {
      setError(null);

      try {
        const response = await userSettingsApi.updateAppPreferences(data);

        if (response.success && response.data) {
          setSettings(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update app preferences');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update app preferences';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const resetSettings = useCallback(async (): Promise<UserSettings | null> => {
    setError(null);

    try {
      const response = await userSettingsApi.resetSettings();

      if (response.success && response.data) {
        setSettings(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to reset settings');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset settings';
      setError(errorMessage);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSettings();
    }
  }, [autoFetch, fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    updateGeneralSettings,
    updateNotifications,
    updatePrivacy,
    updateSecurity,
    updateDelivery,
    updatePayment,
    updateAppPreferences,
    resetSettings,
    clearError,
  };
};

export default useUserSettings;
