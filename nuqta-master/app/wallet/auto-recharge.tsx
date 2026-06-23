// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Auto Recharge Settings Page
// Configure automatic balance recharge when balance drops below threshold

import React, { useState, useEffect, useCallback } from 'react';
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
import CachedImage from '@/components/ui/CachedImage';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { SectionListSkeleton } from '@/components/skeletons';
import {
  useIsAuthenticated,
  useAuthLoading,
  useRawWalletData,
  useWalletLoading,
  useRefreshWallet,
  useRezBalance,
} from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import walletApi from '@/services/walletApi';
import paymentMethodApi, { PaymentMethod, PaymentMethodType } from '@/services/paymentMethodApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';

const nuqtaCoinImage = BRAND.COIN_IMAGE;

interface AutoRechargeSettings {
  autoTopup: boolean;
  autoTopupThreshold: number;
  autoTopupAmount: number;
  maxMonthlyAutoRecharge: number;
  preferredPaymentMethodId: string;
}

const DEFAULTS: AutoRechargeSettings = {
  autoTopup: false,
  autoTopupThreshold: 100,
  autoTopupAmount: 500,
  maxMonthlyAutoRecharge: 5000,
  preferredPaymentMethodId: '',
};

const PRESET_THRESHOLDS = [50, 100, 200, 500];
const PRESET_AMOUNTS = [100, 200, 500, 1000];
const PRESET_MONTHLY_LIMITS = [1000, 2000, 5000, 10000];

function AutoRechargePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const isMounted = useIsMounted();
  const rawBackendData = useRawWalletData();
  const walletLoading = useWalletLoading();
  const refreshWallet = useRefreshWallet();
  const rezBalance = useRezBalance();

  const [settings, setSettings] = useState<AutoRechargeSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    setPaymentMethodsLoading(true);
    try {
      const res = await paymentMethodApi.getUserPaymentMethods();
      if (isMounted() && res.success && res.data) {
        setPaymentMethods(res.data.filter((pm: PaymentMethod) => pm.isActive));
      }
    } catch {
      // Silently fail — payment methods are optional
    } finally {
      if (isMounted()) setPaymentMethodsLoading(false);
    }
  }, [isMounted]);

  // Populate settings from WalletContext rawBackendData
  useEffect(() => {
    if (rawBackendData) {
      const s = rawBackendData.settings;
      if (s) {
        setSettings({
          autoTopup: s.autoTopup ?? DEFAULTS.autoTopup,
          autoTopupThreshold: s.autoTopupThreshold ?? DEFAULTS.autoTopupThreshold,
          autoTopupAmount: s.autoTopupAmount ?? DEFAULTS.autoTopupAmount,
          maxMonthlyAutoRecharge: s.maxMonthlyAutoRecharge ?? DEFAULTS.maxMonthlyAutoRecharge,
          preferredPaymentMethodId: s.preferredPaymentMethodId ?? DEFAULTS.preferredPaymentMethodId,
        });
      }
      setLoading(false);
    } else if (!walletLoading) {
      refreshWallet().finally(() => {
        if (isMounted()) setLoading(false);
      });
    }
  }, [rawBackendData, walletLoading]);

  // Fetch payment methods on mount
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const updateField = <K extends keyof AutoRechargeSettings>(key: K, value: AutoRechargeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validate
    if (settings.autoTopup) {
      if (settings.autoTopupThreshold <= 0) {
        platformAlertSimple('Invalid Threshold', 'Threshold must be greater than 0.');
        return;
      }
      if (settings.autoTopupAmount <= 0) {
        platformAlertSimple('Invalid Amount', 'Recharge amount must be greater than 0.');
        return;
      }
      if (settings.autoTopupAmount < settings.autoTopupThreshold) {
        platformAlertSimple('Invalid Amount', 'Recharge amount should be at least equal to the threshold.');
        return;
      }
      if (settings.maxMonthlyAutoRecharge > 0 && settings.autoTopupAmount > settings.maxMonthlyAutoRecharge) {
        platformAlertSimple('Invalid Limit', 'Recharge amount cannot exceed the monthly limit.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await walletApi.updateSettings({
        autoTopup: settings.autoTopup,
        autoTopupThreshold: settings.autoTopupThreshold,
        autoTopupAmount: settings.autoTopupAmount,
        maxMonthlyAutoRecharge: settings.maxMonthlyAutoRecharge,
        preferredPaymentMethodId: settings.preferredPaymentMethodId,
      });
      if (isMounted() && res?.success) {
        platformAlertSimple('Saved', 'Auto-recharge settings updated.');
        setDirty(false);
      } else if (isMounted()) {
        platformAlertSimple('Error', 'Failed to save settings.');
      }
    } catch {
      if (isMounted()) platformAlertSimple('Error', 'Failed to save settings. Try again.');
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const getPaymentMethodLabel = (pm: PaymentMethod): string => {
    if (pm.type === PaymentMethodType.CARD) {
      const card = pm.card;
      return card?.nickname || `${card?.brand || 'Card'} ****${card?.lastFourDigits || ''}`;
    }
    if (pm.type === PaymentMethodType.UPI) {
      return pm.upi?.nickname || pm.upi?.vpa || 'UPI';
    }
    if (pm.type === PaymentMethodType.BANK_ACCOUNT) {
      return pm.bankAccount?.nickname || pm.bankAccount?.bankName || 'Bank Account';
    }
    return 'Payment Method';
  };

  const getPaymentMethodIcon = (pm: PaymentMethod): string => {
    if (pm.type === PaymentMethodType.CARD) return 'card';
    if (pm.type === PaymentMethodType.UPI) return 'phone-portrait';
    if (pm.type === PaymentMethodType.BANK_ACCOUNT) return 'business';
    return 'wallet';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <Header onBack={handleBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Current Balance Preview */}
        <View style={styles.balanceCard}>
          <CachedImage source={nuqtaCoinImage} style={styles.coinImage} />
          <View style={styles.balanceInfo}>
            <ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
            <ThemedText style={styles.balanceValue}>
              {rezBalance.toLocaleString()} {BRAND.CURRENCY_CODE}
            </ThemedText>
          </View>
          {settings.autoTopup && (
            <View style={styles.activeBadge}>
              <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
            </View>
          )}
        </View>

        {/* Enable/Disable Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="refresh-circle" size={22} color={colors.successScale[400]} />
            </View>
            <View style={styles.sectionHeaderText}>
              <ThemedText style={styles.sectionTitle}>Auto Recharge</ThemedText>
              <ThemedText style={styles.sectionDescription}>
                Automatically add funds when your balance drops below a threshold
              </ThemedText>
            </View>
            <Switch
              value={settings.autoTopup}
              onValueChange={v => updateField('autoTopup', v)}
              trackColor={{ false: Colors.gray[300], true: Colors.nileBlue + '80' }}
              thumbColor={settings.autoTopup ? Colors.nileBlue : '#f4f3f4'}
            />
          </View>
        </View>

        {settings.autoTopup && (
          <>
            {/* Threshold Section */}
            <View style={styles.section}>
              <View style={styles.sectionBody}>
                <ThemedText style={styles.fieldLabel}>Recharge when balance falls below</ThemedText>
                <View style={styles.amountInputContainer}>
                  <ThemedText style={styles.currencyPrefix}>{BRAND.CURRENCY_CODE}</ThemedText>
                  <TextInput
                    style={styles.amountInput}
                    value={String(settings.autoTopupThreshold)}
                    onChangeText={v => updateField('autoTopupThreshold', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>

                {/* Preset threshold chips */}
                <View style={styles.presetRow}>
                  {PRESET_THRESHOLDS.map(val => (
                    <Pressable
                      key={val}
                      style={[
                        styles.presetChip,
                        settings.autoTopupThreshold === val && styles.presetChipSelected,
                      ]}
                      onPress={() => updateField('autoTopupThreshold', val)}
                    >
                      <ThemedText style={[
                        styles.presetChipText,
                        settings.autoTopupThreshold === val && styles.presetChipTextSelected,
                      ]}>
                        {BRAND.CURRENCY_CODE} {val}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Recharge Amount Section */}
            <View style={styles.section}>
              <View style={styles.sectionBody}>
                <ThemedText style={styles.fieldLabel}>Recharge amount</ThemedText>
                <View style={styles.amountInputContainer}>
                  <ThemedText style={styles.currencyPrefix}>{BRAND.CURRENCY_CODE}</ThemedText>
                  <TextInput
                    style={styles.amountInput}
                    value={String(settings.autoTopupAmount)}
                    onChangeText={v => updateField('autoTopupAmount', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>

                {/* Preset amount chips */}
                <View style={styles.presetRow}>
                  {PRESET_AMOUNTS.map(val => (
                    <Pressable
                      key={val}
                      style={[
                        styles.presetChip,
                        settings.autoTopupAmount === val && styles.presetChipSelected,
                      ]}
                      onPress={() => updateField('autoTopupAmount', val)}
                    >
                      <ThemedText style={[
                        styles.presetChipText,
                        settings.autoTopupAmount === val && styles.presetChipTextSelected,
                      ]}>
                        {BRAND.CURRENCY_CODE} {val}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.section}>
              <View style={styles.sectionBody}>
                <ThemedText style={styles.fieldLabel}>Payment Method</ThemedText>
                {paymentMethodsLoading ? (
                  <ActivityIndicator size="small" color={Colors.nileBlue} style={{ marginVertical: Spacing.md }} />
                ) : paymentMethods.length === 0 ? (
                  <Pressable
                    style={styles.addPaymentButton}
                    onPress={() => router.push('/account/payment-methods')}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.nileBlue} />
                    <ThemedText style={styles.addPaymentText}>Add a payment method</ThemedText>
                    <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
                  </Pressable>
                ) : (
                  <View style={styles.paymentMethodList}>
                    {paymentMethods.map(pm => {
                      const isSelected = settings.preferredPaymentMethodId === pm.id;
                      return (
                        <Pressable
                          key={pm.id}
                          style={[
                            styles.paymentMethodItem,
                            isSelected && styles.paymentMethodItemSelected,
                          ]}
                          onPress={() => updateField('preferredPaymentMethodId', pm.id)}
                        >
                          <View style={[
                            styles.paymentMethodIconContainer,
                            isSelected && styles.paymentMethodIconContainerSelected,
                          ]}>
                            <Ionicons
                              name={getPaymentMethodIcon(pm) as any}
                              size={18}
                              color={isSelected ? Colors.nileBlue : Colors.text.tertiary}
                            />
                          </View>
                          <View style={styles.paymentMethodInfo}>
                            <ThemedText style={[
                              styles.paymentMethodName,
                              isSelected && styles.paymentMethodNameSelected,
                            ]}>
                              {getPaymentMethodLabel(pm)}
                            </ThemedText>
                            <ThemedText style={styles.paymentMethodType}>
                              {pm.type === PaymentMethodType.CARD ? 'Card' :
                               pm.type === PaymentMethodType.UPI ? 'UPI' : 'Bank Account'}
                              {pm.isDefault ? ' (Default)' : ''}
                            </ThemedText>
                          </View>
                          <View style={[
                            styles.radioOuter,
                            isSelected && styles.radioOuterSelected,
                          ]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Maximum Monthly Auto-Recharge Limit */}
            <View style={styles.section}>
              <View style={styles.sectionBody}>
                <ThemedText style={styles.fieldLabel}>Maximum monthly auto-recharge limit</ThemedText>
                <ThemedText style={styles.fieldHint}>
                  Auto-recharge will pause once this total is reached in a calendar month
                </ThemedText>
                <View style={styles.amountInputContainer}>
                  <ThemedText style={styles.currencyPrefix}>{BRAND.CURRENCY_CODE}</ThemedText>
                  <TextInput
                    style={styles.amountInput}
                    value={String(settings.maxMonthlyAutoRecharge)}
                    onChangeText={v => updateField('maxMonthlyAutoRecharge', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>

                {/* Preset monthly limit chips */}
                <View style={styles.presetRow}>
                  {PRESET_MONTHLY_LIMITS.map(val => (
                    <Pressable
                      key={val}
                      style={[
                        styles.presetChip,
                        settings.maxMonthlyAutoRecharge === val && styles.presetChipSelected,
                      ]}
                      onPress={() => updateField('maxMonthlyAutoRecharge', val)}
                    >
                      <ThemedText style={[
                        styles.presetChipText,
                        settings.maxMonthlyAutoRecharge === val && styles.presetChipTextSelected,
                      ]}>
                        {BRAND.CURRENCY_CODE} {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Summary Preview */}
            <View style={styles.summaryCard}>
              <Ionicons name="flash" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.summaryText}>
                When your balance falls below{' '}
                <ThemedText style={styles.summaryBold}>
                  {settings.autoTopupThreshold.toLocaleString()} {BRAND.CURRENCY_CODE}
                </ThemedText>
                , we'll automatically add{' '}
                <ThemedText style={styles.summaryBold}>
                  {settings.autoTopupAmount.toLocaleString()} {BRAND.CURRENCY_CODE}
                </ThemedText>
                {' '}to your wallet, up to{' '}
                <ThemedText style={styles.summaryBold}>
                  {settings.maxMonthlyAutoRecharge.toLocaleString()} {BRAND.CURRENCY_CODE}
                </ThemedText>
                {' '}per month.
              </ThemedText>
            </View>
          </>
        )}

        {/* How Auto-Recharge Works */}
        <View style={styles.howItWorksCard}>
          <View style={styles.howItWorksHeader}>
            <Ionicons name="bulb" size={20} color={Colors.nileBlue} />
            <ThemedText style={styles.howItWorksTitle}>How Auto-Recharge Works</ThemedText>
          </View>
          <View style={styles.howItWorksSteps}>
            {[
              { step: '1', text: 'Set a minimum balance threshold and recharge amount' },
              { step: '2', text: 'When your balance drops below the threshold through purchases, we detect it automatically' },
              { step: '3', text: 'Your linked payment method is charged for the recharge amount' },
              { step: '4', text: 'Funds are instantly added to your wallet — no manual action needed' },
            ].map(item => (
              <View key={item.step} style={styles.howItWorksStep}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{item.step}</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>{item.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.nileBlue} />
          <ThemedText style={styles.infoText}>
            Auto-recharge requires a linked payment method. You can manage payment methods in your account settings.
            Top-ups will only occur when your balance naturally drops below the threshold through purchases.
            The monthly limit resets on the 1st of each month.
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
    <LinearGradient colors={[Colors.nileBlue, Colors.secondary[500]]} style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Auto Recharge</ThemedText>
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

  // Balance card
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  coinImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  balanceValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.success + '20',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
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
    padding: Spacing.base,
    gap: Spacing.md,
  },

  // Field labels & inputs
  fieldLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  fieldHint: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  currencyPrefix: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    padding: 0,
  },

  // Preset chips
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  presetChip: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
  },
  presetChipSelected: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  presetChipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  presetChipTextSelected: {
    color: Colors.text.inverse,
  },

  // Payment method selector
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.nileBlue + '30',
    borderStyle: 'dashed',
  },
  addPaymentText: {
    flex: 1,
    ...Typography.body,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  paymentMethodList: {
    gap: Spacing.sm,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  paymentMethodItemSelected: {
    borderColor: Colors.nileBlue,
    backgroundColor: Colors.nileBlue + '08',
  },
  paymentMethodIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodIconContainerSelected: {
    backgroundColor: Colors.nileBlue + '20',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  paymentMethodNameSelected: {
    color: Colors.nileBlue,
  },
  paymentMethodType: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.nileBlue,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.nileBlue,
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.nileBlue + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.nileBlue + '20',
  },
  summaryText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  summaryBold: {
    fontWeight: '700',
    color: Colors.nileBlue,
  },

  // How it works
  howItWorksCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  howItWorksTitle: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  howItWorksSteps: {
    gap: Spacing.md,
  },
  howItWorksStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  stepText: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    lineHeight: 20,
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

export default withErrorBoundary(AutoRechargePage, 'AutoRecharge');
