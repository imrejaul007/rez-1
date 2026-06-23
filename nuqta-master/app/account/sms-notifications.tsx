import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { FormPageSkeleton } from '@/components/skeletons';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../../services/notificationService';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

interface SMSNotifications {
  enabled: boolean;
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  paymentConfirmations: boolean;
  securityAlerts: boolean;
  otpMessages: boolean;
}

function SMSNotificationsScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SMSNotifications | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadSettings();
  }, [isAuthenticated, authLoading]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotificationSettings();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setSettings(response.data.sms);
      } else {
        if (!isMounted()) return;
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      if (!isMounted()) return;
      setSettings(getDefaultSettings());
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const getDefaultSettings = (): SMSNotifications => ({
    enabled: true,
    orderUpdates: true,
    deliveryAlerts: true,
    paymentConfirmations: true,
    securityAlerts: true,
    otpMessages: true,
  });

  const updateSettings = async (updates: Partial<SMSNotifications>) => {
    if (!settings) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      setSaving(true);
      const response = await notificationService.updateSMSSettings(newSettings);

      if (!response.success) {
        platformAlertSimple('Error', 'Failed to update SMS notification settings. Please try again.');
        if (!isMounted()) return;
        setSettings(settings);
      } else {
        if (!isMounted()) return;
        setShowSuccessMessage(true);
        successTimeoutRef.current = setTimeout(() => {
          if (isMounted()) setShowSuccessMessage(false);
        }, 2000);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to update SMS notification settings. Please check your connection and try again.');
      if (!isMounted()) return;
      setSettings(settings);
    } finally {
      if (!isMounted()) return;
      setSaving(false);
    }
  };

  const renderSettingItem = (
    title: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    disabled?: boolean
  ) => (
    <View style={styles.settingItem}>
      <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
        {title}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || saving}
        accessibilityLabel={`${title}${value ? ', enabled' : ', disabled'}${disabled ? ', unavailable' : ''}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled: disabled || saving }}
        accessibilityHint={disabled ? 'Enable SMS notifications first' : `Toggle to ${value ? 'disable' : 'enable'} ${title.toLowerCase()}`}
        trackColor={{ false: Colors.border.default, true: Colors.info }}
        thumbColor={value ? colors.background.primary : Colors.background.secondary}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <FormPageSkeleton />
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.errorContainer}>
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
        >
          Failed to load settings
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={loadSettings}
          accessibilityLabel="Retry loading SMS notification settings"
          accessibilityRole="button"
          accessibilityHint="Double tap to try loading settings again"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Navigate to notification settings"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">SMS Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbox" size={24} color={Colors.info} />
            <Text style={styles.sectionTitle}>SMS Notification Settings</Text>
          </View>

          {renderSettingItem(
            'Enable SMS Notifications',
            settings.enabled,
            (value) => updateSettings({ enabled: value })
          )}

          {renderSettingItem(
            'Order Updates',
            settings.orderUpdates,
            (value) => updateSettings({ orderUpdates: value }),
            !settings.enabled
          )}

          {renderSettingItem(
            'Delivery Alerts',
            settings.deliveryAlerts,
            (value) => updateSettings({ deliveryAlerts: value }),
            !settings.enabled
          )}

          {renderSettingItem(
            'Payment Confirmations',
            settings.paymentConfirmations,
            (value) => updateSettings({ paymentConfirmations: value }),
            !settings.enabled
          )}

          {renderSettingItem(
            'Security Alerts',
            settings.securityAlerts,
            (value) => updateSettings({ securityAlerts: value }),
            !settings.enabled
          )}

          {renderSettingItem(
            'OTP Messages',
            settings.otpMessages,
            (value) => updateSettings({ otpMessages: value }),
            !settings.enabled
          )}
        </View>
      </ScrollView>

      {/* Saving Indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={Colors.text.inverse} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <View style={styles.successIndicator}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.text.inverse} />
          <Text style={styles.successText}>Settings saved!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settingTitle: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    flex: 1,
  },
  disabledText: {
    color: Colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing['2xl'],
  },
  errorText: {
    ...Typography.h4,
    color: Colors.error,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.info,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  savingIndicator: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: Colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  savingText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  successIndicator: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  successText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});

export default withErrorBoundary(SMSNotificationsScreen, 'AccountSmsNotifications');
