import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Wallet Settings Page
// Toggle auto-topup, low balance alerts, configure thresholds

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { SectionListSkeleton } from '@/components/skeletons';
import walletApi from '@/services/walletApi';
import { useRawWalletData, useWalletLoading, useRefreshWallet } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface WalletSettings {
  autoTopup: boolean;
  autoTopupThreshold: number;
  autoTopupAmount: number;
  lowBalanceAlert: boolean;
  lowBalanceThreshold: number;
}

const DEFAULTS: WalletSettings = {
  autoTopup: false,
  autoTopupThreshold: 100,
  autoTopupAmount: 500,
  lowBalanceAlert: true,
  lowBalanceThreshold: 50,
};

function WalletSettingsPage() {
  const router = useRouter();
  const rawBackendData = useRawWalletData();
  const walletLoading = useWalletLoading();
  const refreshWallet = useRefreshWallet();
  const [settings, setSettings] = useState<WalletSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Populate settings from WalletContext rawBackendData
  useEffect(() => {
    if (rawBackendData) {
      const s = rawBackendData.settings;
      if (s) {
        setSettings({
          autoTopup: s.autoTopup ?? DEFAULTS.autoTopup,
          autoTopupThreshold: s.autoTopupThreshold ?? DEFAULTS.autoTopupThreshold,
          autoTopupAmount: s.autoTopupAmount ?? DEFAULTS.autoTopupAmount,
          lowBalanceAlert: s.lowBalanceAlert ?? DEFAULTS.lowBalanceAlert,
          lowBalanceThreshold: s.lowBalanceThreshold ?? DEFAULTS.lowBalanceThreshold,
        });
      }
      setLoading(false);
    } else if (!walletLoading) {
      // No data and not loading — trigger a refresh
      refreshWallet().finally(() => setLoading(false));
    }
  }, [rawBackendData, walletLoading]);

  const updateField = <K extends keyof WalletSettings>(key: K, value: WalletSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await walletApi.updateSettings(settings);
      if (mountedRef.current && res?.success) {
        platformAlertSimple('Saved', 'Wallet settings updated');
        setDirty(false);
      }
    } catch {
      if (mountedRef.current) platformAlertSimple('Error', 'Failed to save settings. Try again.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <SectionListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
      <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Auto Top-up Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="refresh-circle" size={22} color={colors.successScale[400]} />
            </View>
            <View style={styles.sectionHeaderText}>
              <ThemedText style={styles.sectionTitle}>Auto Top-up</ThemedText>
              <ThemedText style={styles.sectionDescription}>
                Automatically add funds when balance is low
              </ThemedText>
            </View>
            <Switch
              value={settings.autoTopup}
              onValueChange={v => updateField('autoTopup', v)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary[600] + '80' }}
              thumbColor={settings.autoTopup ? Colors.primary[600] : '#f4f3f4'}
            />
          </View>

          {settings.autoTopup && (
            <View style={styles.sectionBody}>
              <SettingInput
                label="Trigger when balance below"
                value={String(settings.autoTopupThreshold)}
                onChangeText={v => updateField('autoTopupThreshold', Number(v) || 0)}
                suffix={BRAND.CURRENCY_CODE}
              />
              <SettingInput
                label="Top-up amount"
                value={String(settings.autoTopupAmount)}
                onChangeText={v => updateField('autoTopupAmount', Number(v) || 0)}
                suffix={BRAND.CURRENCY_CODE}
              />
            </View>
          )}
        </View>

        {/* Low Balance Alert Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="notifications" size={22} color={colors.warningScale[400]} />
            </View>
            <View style={styles.sectionHeaderText}>
              <ThemedText style={styles.sectionTitle}>Low Balance Alert</ThemedText>
              <ThemedText style={styles.sectionDescription}>
                Get notified when your balance is running low
              </ThemedText>
            </View>
            <Switch
              value={settings.lowBalanceAlert}
              onValueChange={v => updateField('lowBalanceAlert', v)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary[600] + '80' }}
              thumbColor={settings.lowBalanceAlert ? Colors.primary[600] : '#f4f3f4'}
            />
          </View>

          {settings.lowBalanceAlert && (
            <View style={styles.sectionBody}>
              <SettingInput
                label="Alert when balance below"
                value={String(settings.lowBalanceThreshold)}
                onChangeText={v => updateField('lowBalanceThreshold', Number(v) || 0)}
                suffix={BRAND.CURRENCY_CODE}
              />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary[600]} />
          <ThemedText style={styles.infoText}>
            Auto top-up requires a linked payment method. You can manage payment methods in the main wallet screen.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Save Button */}
      {dirty && (
        <View style={styles.footer}>
          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={[Colors.primary[600], Colors.secondary[700]]} style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Wallet Settings</ThemedText>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
  );
}

function SettingInput({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  suffix?: string;
}) {
  return (
    <View style={styles.inputRow}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          selectTextOnFocus
        />
        {suffix && <ThemedText style={styles.inputSuffix}>{suffix}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  sectionDescription: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    padding: Spacing.base,
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 120,
  },
  input: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    padding: 0,
  },
  inputSuffix: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary[600] + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  saveButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  saveButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(WalletSettingsPage, 'WalletSettings');
