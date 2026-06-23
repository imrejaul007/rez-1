import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Store EMI Info Page
// EMI options for store purchases

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface EMIPlan {
  tenure: number;
  emi: string;
  interest: string;
  totalAmount: string;
  isNoCost: boolean;
}

interface Bank {
  id: string;
  name: string;
  logo: string;
  noCostTenures: number[];
}

const PARTNER_BANKS: Bank[] = [
  { id: '1', name: 'HDFC Bank', logo: '🏦', noCostTenures: [3, 6] },
  { id: '2', name: 'ICICI Bank', logo: '🏛️', noCostTenures: [3, 6, 9] },
  { id: '3', name: 'SBI', logo: '🏦', noCostTenures: [3] },
  { id: '4', name: 'Axis Bank', logo: '🏛️', noCostTenures: [3, 6, 12] },
  { id: '5', name: 'Kotak', logo: '🏦', noCostTenures: [3, 6] },
];

function StoreEMIInfoPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [amount, setAmount] = useState('50000');
  const [selectedTenure, setSelectedTenure] = useState(6);

  const amountValue = parseInt(amount.replace(/,/g, '')) || 0;

  const calculateEMI = (tenure: number): EMIPlan => {
    const isNoCost = PARTNER_BANKS.some(b => b.noCostTenures.includes(tenure));
    const interestRate = isNoCost ? 0 : 14; // 14% annual for non-no-cost
    const monthlyRate = interestRate / 12 / 100;

    let emi: number;
    let totalAmount: number;
    let interest: number;

    if (isNoCost) {
      emi = amountValue / tenure;
      totalAmount = amountValue;
      interest = 0;
    } else {
      emi = amountValue * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
      totalAmount = emi * tenure;
      interest = totalAmount - amountValue;
    }

    return {
      tenure,
      emi: `${currencySymbol}${Math.round(emi).toLocaleString()}`,
      interest: `${currencySymbol}${Math.round(interest).toLocaleString()}`,
      totalAmount: `${currencySymbol}${Math.round(totalAmount).toLocaleString()}`,
      isNoCost,
    };
  };

  const emiPlans: EMIPlan[] = [3, 6, 9, 12, 18, 24].map(t => calculateEMI(t));

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
          <ThemedText style={styles.headerTitle}>EMI Options</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.heroSection}>
          <Ionicons name="card" size={40} color={colors.background.primary} />
          <ThemedText style={styles.heroTitle}>Easy EMI</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Split your payment into easy monthly installments
          </ThemedText>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Input */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Purchase Amount</ThemedText>
          <View style={styles.amountInputContainer}>
            <ThemedText style={styles.currencySymbol}>{currencySymbol}</ThemedText>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="Enter amount"
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>

        {/* EMI Plans */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Choose EMI Tenure</ThemedText>
          <View style={styles.emiPlansGrid}>
            {emiPlans.map(plan => (
              <Pressable
                key={plan.tenure}
                style={[
                  styles.emiPlanCard,
                  selectedTenure === plan.tenure && styles.emiPlanCardSelected,
                ]}
                onPress={() => setSelectedTenure(plan.tenure)}
              >
                {plan.isNoCost && (
                  <View style={styles.noCostBadge}>
                    <ThemedText style={styles.noCostText}>No Cost</ThemedText>
                  </View>
                )}
                <ThemedText style={[
                  styles.emiTenure,
                  selectedTenure === plan.tenure && styles.emiTenureSelected,
                ]}>
                  {plan.tenure} Months
                </ThemedText>
                <ThemedText style={[
                  styles.emiAmount,
                  selectedTenure === plan.tenure && styles.emiAmountSelected,
                ]}>
                  {plan.emi}/mo
                </ThemedText>
                {!plan.isNoCost && (
                  <ThemedText style={styles.emiInterest}>
                    Interest: {plan.interest}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Selected Plan Details */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>EMI Breakdown</ThemedText>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Principal Amount</ThemedText>
              <ThemedText style={styles.breakdownValue}>{currencySymbol}{amountValue.toLocaleString()}</ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Tenure</ThemedText>
              <ThemedText style={styles.breakdownValue}>{selectedTenure} Months</ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Monthly EMI</ThemedText>
              <ThemedText style={[styles.breakdownValue, styles.emiHighlight]}>
                {calculateEMI(selectedTenure).emi}
              </ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Interest</ThemedText>
              <ThemedText style={styles.breakdownValue}>
                {calculateEMI(selectedTenure).interest}
              </ThemedText>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <ThemedText style={styles.breakdownTotalLabel}>Total Payable</ThemedText>
              <ThemedText style={styles.breakdownTotalValue}>
                {calculateEMI(selectedTenure).totalAmount}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Partner Banks */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Partner Banks</ThemedText>
          <View style={styles.banksGrid}>
            {PARTNER_BANKS.map(bank => (
              <View key={bank.id} style={styles.bankCard}>
                <ThemedText style={styles.bankLogo}>{bank.logo}</ThemedText>
                <ThemedText style={styles.bankName}>{bank.name}</ThemedText>
                <ThemedText style={styles.bankNoCost}>
                  No Cost: {bank.noCostTenures.join(', ')} mo
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsCard}>
          <ThemedText style={styles.termsTitle}>Terms & Conditions</ThemedText>
          <View style={styles.termsList}>
            <View style={styles.termItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <ThemedText style={styles.termText}>
                No Cost EMI available on select bank cards
              </ThemedText>
            </View>
            <View style={styles.termItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <ThemedText style={styles.termText}>
                Processing fee may apply as per bank policy
              </ThemedText>
            </View>
            <View style={styles.termItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <ThemedText style={styles.termText}>
                EMI conversion available post-purchase
              </ThemedText>
            </View>
            <View style={styles.termItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <ThemedText style={styles.termText}>
                Minimum purchase of {currencySymbol}3,000 required for EMI
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.proceedButton}
          onPress={() => router.push('/checkout/emi-selection' as any)}
        >
          <ThemedText style={styles.proceedButtonText}>
            Proceed with {calculateEMI(selectedTenure).emi}/mo EMI
          </ThemedText>
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
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  heroTitle: {
    ...Typography.h2,
    color: colors.background.primary,
    marginTop: Spacing.md,
  },
  heroSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  currencySymbol: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...Typography.h2,
    color: Colors.text.primary,
  },
  emiPlansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emiPlanCard: {
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
  emiPlanCardSelected: {
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
  noCostText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontSize: 8,
    fontWeight: '700',
  },
  emiTenure: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  emiTenureSelected: {
    color: Colors.primary[600],
  },
  emiAmount: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  emiAmountSelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  emiInterest: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  breakdownCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  breakdownLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  breakdownValue: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  emiHighlight: {
    color: Colors.primary[600],
    fontSize: 18,
  },
  breakdownTotal: {
    borderBottomWidth: 0,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  breakdownTotalLabel: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  breakdownTotalValue: {
    ...Typography.h3,
    color: Colors.primary[600],
  },
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bankCard: {
    width: '31%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  bankLogo: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  bankName: {
    ...Typography.caption,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  bankNoCost: {
    ...Typography.caption,
    color: Colors.success,
    fontSize: 9,
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  termsTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  termsList: {
    gap: Spacing.sm,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  termText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  proceedButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  proceedButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(StoreEMIInfoPage, 'StoreEmiInfo');
