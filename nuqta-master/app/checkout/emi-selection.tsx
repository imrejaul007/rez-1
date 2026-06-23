import { withErrorBoundary } from '@/utils/withErrorBoundary';
// EMI Selection Screen
// Choose EMI plan during checkout

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface EMIOption {
  tenure: number;
  emi: number;
  interest: number;
  total: number;
  isNoCost: boolean;
}

interface Bank {
  id: string;
  name: string;
  logo: string;
  noCostTenures: number[];
  processingFee: string;
}

const getDefaultBanks = (currencySymbol: string): Bank[] => [
  { id: '1', name: 'HDFC Bank', logo: '🏦', noCostTenures: [3, 6], processingFee: `${currencySymbol}199` },
  { id: '2', name: 'ICICI Bank', logo: '🏛️', noCostTenures: [3, 6, 9], processingFee: `${currencySymbol}299` },
  { id: '3', name: 'SBI Card', logo: '🏦', noCostTenures: [3], processingFee: `${currencySymbol}199` },
  { id: '4', name: 'Axis Bank', logo: '🏛️', noCostTenures: [3, 6, 12], processingFee: `${currencySymbol}249` },
  { id: '5', name: 'Kotak Bank', logo: '🏦', noCostTenures: [3, 6], processingFee: `${currencySymbol}199` },
  { id: '6', name: 'AMEX', logo: '💳', noCostTenures: [3], processingFee: `${currencySymbol}499` },
];

function EMISelectionPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const amount = parseInt(params.amount as string) || 50000;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [banks, setBanks] = useState<Bank[]>(getDefaultBanks(currencySymbol));
  const [loadingBanks, setLoadingBanks] = useState(true);

  useEffect(() => {
    const fetchEMIBanks = async () => {
      try {
        const response = await apiClient.get<{ banks: Bank[] }>(`/payments/emi-options?amount=${amount}`);
        if (response.data?.banks?.length) {
          setBanks(response.data.banks);
        }
      } catch {
        // Fallback to hardcoded list — already set as default
      } finally {
        if (!isMounted()) return;
        setLoadingBanks(false);
      }
    };
    fetchEMIBanks();
  }, [amount]);

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedTenure, setSelectedTenure] = useState<number | null>(null);

  const calculateEMI = (tenure: number, bank: Bank): EMIOption => {
    const isNoCost = bank.noCostTenures.includes(tenure);
    const interestRate = isNoCost ? 0 : 14;
    const monthlyRate = interestRate / 12 / 100;

    let emi: number;
    let total: number;
    let interest: number;

    if (isNoCost) {
      emi = amount / tenure;
      total = amount;
      interest = 0;
    } else {
      emi = amount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
      total = emi * tenure;
      interest = total - amount;
    }

    return {
      tenure,
      emi: Math.round(emi),
      interest: Math.round(interest),
      total: Math.round(total),
      isNoCost,
    };
  };

  const tenureOptions = [3, 6, 9, 12, 18, 24];

  const handleContinue = () => {
    if (selectedBank && selectedTenure) {
      // In real app, pass EMI details to payment
      router.push('/payment' as any);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Select EMI Plan</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.amountCard}>
          <ThemedText style={styles.amountLabel}>Order Amount</ThemedText>
          <ThemedText style={styles.amountValue}>{currencySymbol}{amount.toLocaleString()}</ThemedText>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Bank */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepNumber}>1</ThemedText>
            </View>
            <ThemedText style={styles.sectionTitle}>Select Your Bank</ThemedText>
          </View>

          <View style={styles.banksGrid}>
            {banks.map(bank => (
              <Pressable
                key={bank.id}
                style={[
                  styles.bankCard,
                  selectedBank?.id === bank.id && styles.bankCardSelected,
                ]}
                onPress={() => {
                  setSelectedBank(bank);
                  setSelectedTenure(null);
                }}
              >
                <ThemedText style={styles.bankLogo}>{bank.logo}</ThemedText>
                <ThemedText style={styles.bankName}>{bank.name}</ThemedText>
                {bank.noCostTenures.length > 0 && (
                  <View style={styles.noCostIndicator}>
                    <ThemedText style={styles.noCostIndicatorText}>
                      No Cost: {bank.noCostTenures.join(', ')}mo
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Step 2: Select Tenure */}
        {selectedBank && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}>
                <ThemedText style={styles.stepNumber}>2</ThemedText>
              </View>
              <ThemedText style={styles.sectionTitle}>Choose Tenure</ThemedText>
            </View>

            <View style={styles.tenureGrid}>
              {tenureOptions.map(tenure => {
                const option = calculateEMI(tenure, selectedBank);
                return (
                  <Pressable
                    key={tenure}
                    style={[
                      styles.tenureCard,
                      selectedTenure === tenure && styles.tenureCardSelected,
                    ]}
                    onPress={() => setSelectedTenure(tenure)}
                  >
                    {option.isNoCost && (
                      <View style={styles.noCostBadge}>
                        <ThemedText style={styles.noCostBadgeText}>No Cost</ThemedText>
                      </View>
                    )}
                    <ThemedText style={[
                      styles.tenureMonths,
                      selectedTenure === tenure && styles.tenureMonthsSelected,
                    ]}>
                      {tenure} Months
                    </ThemedText>
                    <ThemedText style={[
                      styles.tenureEMI,
                      selectedTenure === tenure && styles.tenureEMISelected,
                    ]}>
                      {currencySymbol}{option.emi.toLocaleString()}/mo
                    </ThemedText>
                    {!option.isNoCost && (
                      <ThemedText style={styles.tenureInterest}>
                        Interest: {currencySymbol}{option.interest.toLocaleString()}
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Summary */}
        {selectedBank && selectedTenure && (
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryTitle}>EMI Summary</ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Bank</ThemedText>
              <ThemedText style={styles.summaryValue}>{selectedBank.name}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Tenure</ThemedText>
              <ThemedText style={styles.summaryValue}>{selectedTenure} Months</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Monthly EMI</ThemedText>
              <ThemedText style={styles.summaryValueHighlight}>
                {currencySymbol}{calculateEMI(selectedTenure, selectedBank).emi.toLocaleString()}
              </ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Interest</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {calculateEMI(selectedTenure, selectedBank).isNoCost
                  ? 'No Interest'
                  : `${currencySymbol}${calculateEMI(selectedTenure, selectedBank).interest.toLocaleString()}`}
              </ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Processing Fee</ThemedText>
              <ThemedText style={styles.summaryValue}>{selectedBank.processingFee}</ThemedText>
            </View>

            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <ThemedText style={styles.summaryTotalLabel}>Total Amount</ThemedText>
              <ThemedText style={styles.summaryTotalValue}>
                {currencySymbol}{(calculateEMI(selectedTenure, selectedBank).total +
                  parseInt(selectedBank.processingFee.replace(/[^0-9]/g, ''))).toLocaleString()}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
          <ThemedText style={styles.termsText}>
            EMI will be charged to your credit card. Full payment will be made to the merchant.
            EMI conversion is subject to bank approval.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          {selectedBank && selectedTenure ? (
            <>
              <ThemedText style={styles.footerLabel}>Pay in EMI</ThemedText>
              <ThemedText style={styles.footerValue}>
                {currencySymbol}{calculateEMI(selectedTenure, selectedBank).emi.toLocaleString()}/mo × {selectedTenure}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.footerHint}>Select bank and tenure to continue</ThemedText>
          )}
        </View>
        <Pressable
          style={[
            styles.continueButton,
            (!selectedBank || !selectedTenure) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedBank || !selectedTenure}
        >
          <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
        </Pressable>
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
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  amountCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
  },
  amountLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  amountValue: {
    ...Typography.h1,
    color: colors.background.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    ...Typography.label,
    color: colors.background.primary,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bankCard: {
    width: '31%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  bankCardSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  bankLogo: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  bankName: {
    ...Typography.caption,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  noCostIndicator: {
    marginTop: Spacing.xs,
  },
  noCostIndicatorText: {
    ...Typography.caption,
    color: Colors.success,
    fontSize: 9,
  },
  tenureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tenureCard: {
    width: '31%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    ...Shadows.subtle,
  },
  tenureCardSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  noCostBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  noCostBadgeText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontSize: 8,
    fontWeight: '700',
  },
  tenureMonths: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  tenureMonthsSelected: {
    color: Colors.primary[600],
  },
  tenureEMI: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  tenureEMISelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  tenureInterest: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  summaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  summaryTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  summaryValue: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  summaryValueHighlight: {
    ...Typography.h4,
    color: Colors.primary[600],
  },
  summaryTotal: {
    borderBottomWidth: 0,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  summaryTotalLabel: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  summaryTotalValue: {
    ...Typography.h3,
    color: Colors.primary[600],
  },
  termsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing['3xl'],
  },
  termsText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  footerValue: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  footerHint: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  continueButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(EMISelectionPage, 'CheckoutEmiSelection');
