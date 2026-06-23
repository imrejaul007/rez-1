import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Bill Pay Redemption Page
 * Redeem coins for bill payments
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { usePriveSection } from '@/hooks/usePriveSection';
import priveApi, { Voucher } from '@/services/priveApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { useRefreshWallet, useGetCurrencySymbol } from '@/stores/selectors';
import { coinToFiatValue } from '@/constants/priveConversion';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const generateIdempotencyKey = () => `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

function BillPayScreen() {
  const router = useRouter();
  const { userData, refresh } = usePriveSection();
  const refreshWallet = useRefreshWallet();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const availableCoins = userData?.totalCoins || 0;

  // Fetch conversion rate from backend, fallback to constant
  const [conversionRate, setConversionRate] = useState(0.10);
  const isMounted = useIsMounted();
  useEffect(() => {
    (async () => {
      try {
        const res = await priveApi.getRedeemConfig();
        if (res.success && res.data?.conversionRates?.bill_pay) {
          setConversionRate(res.data.conversionRates.bill_pay);
        }
      } catch {
        // fallback
      }
    })();
  }, []);

  const computeValue = (coins: number) => Math.floor(coins * conversionRate);

  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericText);
    if (numericText) {
      setSelectedAmount(parseInt(numericText, 10));
    } else {
      setSelectedAmount(null);
    }
  };

  const handleRedeem = async () => {
    if (!selectedAmount || selectedAmount < 100) {
      platformAlertSimple('Invalid Amount', 'Minimum 100 coins required for bill pay redemption.');
      return;
    }

    if (availableCoins < selectedAmount) {
      platformAlertSimple('Insufficient Coins', 'You don\'t have enough coins for this redemption.');
      return;
    }

    platformAlertConfirm(
      'Confirm Redemption',
      `Redeem ${selectedAmount.toLocaleString()} coins for a bill pay voucher worth ${currencySymbol}${getVoucherValue(selectedAmount)}?`,
      async () => {
        setIsRedeeming(true);
        try {
          const response = await priveApi.redeemCoins({
            coinAmount: selectedAmount,
            type: 'bill_pay',
            category: 'Bill Payment',
            idempotencyKey: generateIdempotencyKey(),
            coinType: 'prive',
          });

          if (response.success && response.data) {
            if (!isMounted()) return;
            setGeneratedVoucher(response.data.voucher);
            if (!isMounted()) return;
            setShowVoucherModal(true);
            refresh();
            refreshWallet().catch(() => {});
          } else {
            platformAlertSimple('Error', 'Failed to redeem coins. Please try again.');
          }
        } catch (error: any) {
          platformAlertSimple('Error', error.message || 'Failed to redeem coins');
        } finally {
          if (!isMounted()) return;
          setIsRedeeming(false);
        }
      }
    );
  };

  const getVoucherValue = (coins: number): number => {
    return computeValue(coins);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Bill Pay</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Balance */}
        <View style={styles.balanceBar}>
          <Text style={styles.balanceLabel}>Available:</Text>
          <Text style={styles.balanceAmount}>{availableCoins.toLocaleString()} coins</Text>
        </View>

        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
          {/* How it works */}
          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>How Bill Pay Works</Text>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>Select coin amount to convert</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>Get a voucher code instantly</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepText}>Apply at checkout to reduce bill</Text>
            </View>
          </View>

          {/* Quick Amounts */}
          <Text style={styles.sectionTitle}>Quick Select</Text>
          <View style={styles.amountsGrid}>
            {QUICK_AMOUNTS.map((amount) => {
              const canAfford = availableCoins >= amount;
              const isSelected = selectedAmount === amount && !customAmount;

              return (
                <Pressable
                  key={amount}
                  style={[
                    styles.amountOption,
                    isSelected && styles.amountOptionSelected,
                    !canAfford && styles.amountOptionDisabled,
                  ]}
                  onPress={() => canAfford && handleSelectAmount(amount)}
                  disabled={!canAfford}
                >
                  <Text style={[styles.amountCoins, !canAfford && styles.amountCoinsDisabled]}>
                    {amount.toLocaleString()}
                  </Text>
                  <Text style={styles.amountLabel}>coins</Text>
                  <Text style={styles.amountValue}>= {currencySymbol}{getVoucherValue(amount)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom Amount */}
          <Text style={styles.sectionTitle}>Or Enter Custom Amount</Text>
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={handleCustomAmount}
              placeholder="Enter coins (min 100)"
              placeholderTextColor={PRIVE_COLORS.text.disabled}
              keyboardType="numeric"
              maxLength={6}
            />
            {customAmount && (
              <Text style={styles.customValue}>
                = {currencySymbol}{getVoucherValue(parseInt(customAmount || '0', 10))}
              </Text>
            )}
          </View>

          {/* Redeem Button */}
          {selectedAmount && selectedAmount >= 100 && (
            <Pressable
              style={[styles.redeemButton, isRedeeming && styles.redeemButtonDisabled]}
              onPress={handleRedeem}
              disabled={isRedeeming || availableCoins < selectedAmount}
            >
              {isRedeeming ? (
                <ActivityIndicator color={PRIVE_COLORS.background.primary} />
              ) : (
                <Text style={styles.redeemButtonText}>
                  Redeem {selectedAmount.toLocaleString()} Coins for {currencySymbol}{getVoucherValue(selectedAmount)}
                </Text>
              )}
            </Pressable>
          )}

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Bill pay vouchers are valid for 30 days. Use them at any participating store
              to reduce your bill amount.
            </Text>
          </View>
        </ScrollView>

        {/* Voucher Success Modal */}
        <Modal
          visible={showVoucherModal}
          animationType="slide"
          transparent={true}
          statusBarTranslucent
          onRequestClose={() => setShowVoucherModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>🧾</Text>
              </View>
              <Text style={styles.modalTitle}>Voucher Ready!</Text>

              {generatedVoucher && (
                <>
                  <View style={styles.voucherCodeBox}>
                    <Text style={styles.voucherCode}>{generatedVoucher.code}</Text>
                  </View>
                  <Text style={styles.voucherValue}>
                    Value: {currencySymbol}{generatedVoucher.value}
                  </Text>
                  <Text style={styles.voucherExpiry}>
                    Valid for: {generatedVoucher.expiresIn}
                  </Text>

                  <View style={styles.voucherTerms}>
                    <Text style={styles.termsTitle}>How to use:</Text>
                    <Text style={styles.termsText}>{generatedVoucher.howToUse}</Text>
                  </View>
                </>
              )}

              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setShowVoucherModal(false);
                  setSelectedAmount(null);
                  setCustomAmount('');
                  setGeneratedVoucher(null);
                }}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </Pressable>

              <Pressable
                style={styles.viewVouchersButton}
                onPress={() => {
                  setShowVoucherModal(false);
                  router.push('/prive/vouchers' as any);
                }}
              >
                <Text style={styles.viewVouchersText}>View All Vouchers</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    gap: PRIVE_SPACING.sm,
  },
  balanceLabel: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingTop: PRIVE_SPACING.xl,
  },
  howItWorks: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.sm,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  stepText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.xl,
  },
  amountOption: {
    width: '31%',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  amountOptionSelected: {
    borderColor: PRIVE_COLORS.gold.primary,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
  },
  amountOptionDisabled: {
    opacity: 0.5,
  },
  amountCoins: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  amountCoinsDisabled: {
    color: PRIVE_COLORS.text.tertiary,
  },
  amountLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
  amountValue: {
    fontSize: 11,
    color: PRIVE_COLORS.gold.primary,
    marginTop: 4,
  },
  customInputContainer: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.xl,
  },
  customInput: {
    fontSize: 18,
    color: PRIVE_COLORS.text.primary,
    textAlign: 'center',
  },
  customValue: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
    textAlign: 'center',
    marginTop: PRIVE_SPACING.sm,
  },
  redeemButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  redeemButtonDisabled: {
    opacity: 0.7,
  },
  redeemButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.xxl,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: PRIVE_SPACING.xl,
  },
  modalContent: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xxl,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  successEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xl,
  },
  voucherCodeBox: {
    backgroundColor: PRIVE_COLORS.background.primary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  voucherCode: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    letterSpacing: 2,
  },
  voucherValue: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: PRIVE_SPACING.xs,
  },
  voucherExpiry: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.lg,
  },
  voucherTerms: {
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.md,
    width: '100%',
    marginBottom: PRIVE_SPACING.xl,
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  termsText: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    lineHeight: 16,
  },
  modalButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
    paddingVertical: PRIVE_SPACING.md,
    paddingHorizontal: PRIVE_SPACING.xxl,
    width: '100%',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.md,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },
  viewVouchersButton: {
    padding: PRIVE_SPACING.md,
  },
  viewVouchersText: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
  },
});

export default withErrorBoundary(BillPayScreen, 'PriveRedeemBillPay');
