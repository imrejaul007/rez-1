import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Daily/Monthly Spend Limits Page
// Configure and monitor spending limits

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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { SectionListSkeleton } from '@/components/skeletons';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import apiClient from '@/services/apiClient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';

interface SpendLimits {
  dailySpendLimit: number;
  monthlySpendLimit: number;
  limitsEnabled: boolean;
}

interface SpendProgress {
  dailySpent: number;
  monthlySpent: number;
}

const DEFAULTS: SpendLimits = {
  dailySpendLimit: 5000,
  monthlySpendLimit: 50000,
  limitsEnabled: false,
};

function LimitsPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const isMounted = useIsMounted();

  const [limits, setLimits] = useState<SpendLimits>(DEFAULTS);
  const [progress, setProgress] = useState<SpendProgress>({ dailySpent: 0, monthlySpent: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(false);

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  const fetchLimits = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get<{
        limits: SpendLimits;
        progress: SpendProgress;
      }>('/wallet/limits');
      if (!isMounted()) return;
      if (res.success && res.data) {
        setLimits({
          dailySpendLimit: res.data.limits?.dailySpendLimit ?? DEFAULTS.dailySpendLimit,
          monthlySpendLimit: res.data.limits?.monthlySpendLimit ?? DEFAULTS.monthlySpendLimit,
          limitsEnabled: res.data.limits?.limitsEnabled ?? DEFAULTS.limitsEnabled,
        });
        setProgress({
          dailySpent: res.data.progress?.dailySpent ?? 0,
          monthlySpent: res.data.progress?.monthlySpent ?? 0,
        });
      }
    } catch {
      if (isMounted()) setError(true);
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const updateField = <K extends keyof SpendLimits>(key: K, value: SpendLimits[K]) => {
    setLimits(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validate
    if (limits.limitsEnabled) {
      if (limits.dailySpendLimit <= 0) {
        platformAlertSimple('Invalid Limit', 'Daily spend limit must be greater than 0.');
        return;
      }
      if (limits.monthlySpendLimit <= 0) {
        platformAlertSimple('Invalid Limit', 'Monthly spend limit must be greater than 0.');
        return;
      }
      if (limits.dailySpendLimit > limits.monthlySpendLimit) {
        platformAlertSimple('Invalid Limit', 'Daily limit cannot exceed monthly limit.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await apiClient.put('/wallet/limits', {
        dailySpendLimit: limits.dailySpendLimit,
        monthlySpendLimit: limits.monthlySpendLimit,
        limitsEnabled: limits.limitsEnabled,
      });
      if (isMounted() && res?.success) {
        platformAlertSimple('Saved', 'Spending limits updated successfully.');
        setDirty(false);
      } else if (isMounted()) {
        platformAlertSimple('Error', res?.message || 'Failed to save limits.');
      }
    } catch {
      if (isMounted()) platformAlertSimple('Error', 'Failed to save limits. Try again.');
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  const getProgressPercentage = (spent: number, limit: number): number => {
    if (limit <= 0) return 0;
    return Math.min((spent / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return Colors.error;
    if (percentage >= 70) return Colors.warning;
    return Colors.success;
  };

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <Header onBack={handleBack} />
        <SectionListSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <Header onBack={handleBack} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          </View>
          <ThemedText style={styles.errorTitle}>Failed to load limits</ThemedText>
          <ThemedText style={styles.errorSubtitle}>Please check your connection and try again.</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchLimits}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const dailyPct = getProgressPercentage(progress.dailySpent, limits.dailySpendLimit);
  const monthlyPct = getProgressPercentage(progress.monthlySpent, limits.monthlySpendLimit);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <Header onBack={handleBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Enable/Disable Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: Colors.nileBlue + '20' }]}>
              <Ionicons name="shield-checkmark" size={22} color={Colors.nileBlue} />
            </View>
            <View style={styles.sectionHeaderText}>
              <ThemedText style={styles.sectionTitle}>Spending Limits</ThemedText>
              <ThemedText style={styles.sectionDescription}>
                Set daily and monthly spending caps
              </ThemedText>
            </View>
            <Switch
              value={limits.limitsEnabled}
              onValueChange={v => updateField('limitsEnabled', v)}
              trackColor={{ false: Colors.gray[300], true: Colors.nileBlue + '80' }}
              thumbColor={limits.limitsEnabled ? Colors.nileBlue : '#f4f3f4'}
            />
          </View>
        </View>

        {limits.limitsEnabled && (
          <>
            {/* Daily Limit */}
            <View style={styles.section}>
              <View style={styles.limitHeader}>
                <View style={[styles.limitIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="today" size={20} color={colors.warningScale[400]} />
                </View>
                <ThemedText style={styles.limitTitle}>Daily Spend Limit</ThemedText>
              </View>

              <View style={styles.sectionBody}>
                <View style={styles.inputRow}>
                  <ThemedText style={styles.inputLabel}>Maximum per day</ThemedText>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={String(limits.dailySpendLimit)}
                      onChangeText={v => updateField('dailySpendLimit', Number(v.replace(/[^0-9]/g, '')) || 0)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <ThemedText style={styles.inputSuffix}>{BRAND.CURRENCY_CODE}</ThemedText>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <ThemedText style={styles.progressLabel}>Today's spending</ThemedText>
                    <ThemedText style={[styles.progressValue, { color: getProgressColor(dailyPct) }]}>
                      {progress.dailySpent.toLocaleString()} / {limits.dailySpendLimit.toLocaleString()} {BRAND.CURRENCY_CODE}
                    </ThemedText>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${dailyPct}%`,
                          backgroundColor: getProgressColor(dailyPct),
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.progressHint}>
                    {dailyPct >= 90
                      ? 'Almost at your daily limit!'
                      : `${(100 - dailyPct).toFixed(0)}% remaining`}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Monthly Limit */}
            <View style={styles.section}>
              <View style={styles.limitHeader}>
                <View style={[styles.limitIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="calendar" size={20} color={colors.successScale[400]} />
                </View>
                <ThemedText style={styles.limitTitle}>Monthly Spend Limit</ThemedText>
              </View>

              <View style={styles.sectionBody}>
                <View style={styles.inputRow}>
                  <ThemedText style={styles.inputLabel}>Maximum per month</ThemedText>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={String(limits.monthlySpendLimit)}
                      onChangeText={v => updateField('monthlySpendLimit', Number(v.replace(/[^0-9]/g, '')) || 0)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <ThemedText style={styles.inputSuffix}>{BRAND.CURRENCY_CODE}</ThemedText>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <ThemedText style={styles.progressLabel}>This month's spending</ThemedText>
                    <ThemedText style={[styles.progressValue, { color: getProgressColor(monthlyPct) }]}>
                      {progress.monthlySpent.toLocaleString()} / {limits.monthlySpendLimit.toLocaleString()} {BRAND.CURRENCY_CODE}
                    </ThemedText>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${monthlyPct}%`,
                          backgroundColor: getProgressColor(monthlyPct),
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.progressHint}>
                    {monthlyPct >= 90
                      ? 'Almost at your monthly limit!'
                      : `${(100 - monthlyPct).toFixed(0)}% remaining`}
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.nileBlue} />
          <ThemedText style={styles.infoText}>
            Spending limits help you control your expenses. When a limit is reached, you'll be notified
            before completing any further transactions for that period.
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
              <ThemedText style={styles.saveButtonText}>Save Limits</ThemedText>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={[Colors.nileBlue, Colors.secondary[500]]} style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Spend Limits</ThemedText>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
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
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  errorSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },

  // Sections
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

  // Limit card header
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    paddingBottom: 0,
    gap: Spacing.md,
  },
  limitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitTitle: {
    ...Typography.label,
    color: Colors.text.primary,
  },

  // Input
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
    minWidth: 130,
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

  // Progress bars
  progressContainer: {
    gap: Spacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  progressValue: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressHint: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontSize: 11,
  },

  // Info
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.nileBlue + '10',
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

  // Footer
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
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  saveButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(LimitsPage, 'WalletLimits');
