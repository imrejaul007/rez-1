import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Charity Redemption Page
 * Donate coins to charitable causes
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { Colors } from '@/constants/DesignSystem';
import { usePriveSection } from '@/hooks/usePriveSection';
import priveApi, { Voucher } from '@/services/priveApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { useRefreshWallet, useGetCurrencySymbol } from '@/stores/selectors';
import { CHARITIES, Charity, DONATION_AMOUNTS } from '@/constants/priveCatalog';
import { coinToFiatValue } from '@/constants/priveConversion';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const generateIdempotencyKey = () => `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

function CharityScreen() {
  const router = useRouter();
  const { userData, refresh } = usePriveSection();
  const refreshWallet = useRefreshWallet();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const availableCoins = userData?.totalCoins || 0;

  // Fetch catalog from backend, fallback to constants
  const [charities, setCharities] = useState<Charity[]>(CHARITIES);
  const [donationAmounts, setDonationAmounts] = useState<number[]>(DONATION_AMOUNTS);
  const [conversionRate, setConversionRate] = useState(0.15);
  const isMounted = useIsMounted();
  useEffect(() => {
    (async () => {
      try {
        const [catalogRes, configRes] = await Promise.all([
          priveApi.getCatalog(),
          priveApi.getRedeemConfig(),
        ]);
        if (catalogRes.success && catalogRes.data) {
          if (catalogRes.data.charities) setCharities(catalogRes.data.charities as unknown as Charity[]);
          if (catalogRes.data.donationAmounts) setDonationAmounts(catalogRes.data.donationAmounts);
        }
        if (configRes.success && configRes.data?.conversionRates?.charity) {
          if (!isMounted()) return;
          setConversionRate(configRes.data.conversionRates.charity);
        }
      } catch {
        // fallback
      }
    })();
  }, []);

  const computeValue = (coins: number) => Math.floor(coins * conversionRate);

  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const handleSelectCharity = (charity: Charity) => {
    setSelectedCharity(charity);
  };

  const handleSelectAmount = (amount: number) => {
    if (availableCoins >= amount) {
      setSelectedAmount(amount);
    }
  };

  const handleDonate = async () => {
    if (!selectedCharity || !selectedAmount) return;

    platformAlertConfirm(
      'Confirm Donation',
      `Donate ${selectedAmount.toLocaleString()} coins (${currencySymbol}${getDonationValue(selectedAmount)}) to ${selectedCharity.name}?`,
      async () => {
        setIsRedeeming(true);
        try {
          const response = await priveApi.redeemCoins({
            coinAmount: selectedAmount,
            type: 'charity',
            category: selectedCharity.id,
            partnerName: selectedCharity.name,
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
            platformAlertSimple('Error', 'Failed to process donation. Please try again.');
          }
        } catch (error: any) {
          platformAlertSimple('Error', error.message || 'Failed to process donation');
        } finally {
          if (!isMounted()) return;
          setIsRedeeming(false);
        }
      },
      'Donate'
    );
  };

  const getDonationValue = (coins: number): number => {
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
          <Text style={styles.headerTitle}>Donate</Text>
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
          {/* Hero */}
          <View style={styles.heroCard}>
            <Text style={styles.heroIcon}>💝</Text>
            <Text style={styles.heroTitle}>Make a Difference</Text>
            <Text style={styles.heroText}>
              Your coins can help change lives. Charity donations get a 50% bonus conversion rate!
            </Text>
          </View>

          {/* Charity Selection */}
          <Text style={styles.sectionTitle}>Choose a Cause</Text>
          <View style={styles.charityGrid}>
            {charities.map((charity) => {
              const isSelected = selectedCharity?.id === charity.id;

              return (
                <Pressable
                  key={charity.id}
                  style={[styles.charityCard, isSelected && styles.charityCardSelected]}
                  onPress={() => handleSelectCharity(charity)}
                >
                  <Text style={styles.charityIcon}>{charity.icon}</Text>
                  <Text style={styles.charityName}>{charity.name}</Text>
                  <Text style={styles.charityCategory}>{charity.category}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount Selection */}
          {selectedCharity && (
            <>
              <Text style={styles.sectionTitle}>Select Donation Amount</Text>
              <View style={styles.amountsRow}>
                {donationAmounts.map((amount) => {
                  const canAfford = availableCoins >= amount;
                  const isSelected = selectedAmount === amount;

                  return (
                    <Pressable
                      key={amount}
                      style={[
                        styles.amountChip,
                        isSelected && styles.amountChipSelected,
                        !canAfford && styles.amountChipDisabled,
                      ]}
                      onPress={() => handleSelectAmount(amount)}
                      disabled={!canAfford}
                    >
                      <Text style={[
                        styles.amountChipText,
                        isSelected && styles.amountChipTextSelected,
                        !canAfford && styles.amountChipTextDisabled,
                      ]}>
                        {amount}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedAmount && (
                <View style={styles.donationSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Coins:</Text>
                    <Text style={styles.summaryValue}>{selectedAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Donation Value:</Text>
                    <Text style={styles.summaryValueGold}>{currencySymbol}{getDonationValue(selectedAmount)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>To:</Text>
                    <Text style={styles.summaryValue}>{selectedCharity.name}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Donate Button */}
          {selectedCharity && selectedAmount && (
            <Pressable
              style={[styles.donateButton, isRedeeming && styles.donateButtonDisabled]}
              onPress={handleDonate}
              disabled={isRedeeming}
            >
              {isRedeeming ? (
                <ActivityIndicator color={PRIVE_COLORS.background.primary} />
              ) : (
                <>
                  <Text style={styles.donateButtonEmoji}>💝</Text>
                  <Text style={styles.donateButtonText}>
                    Donate {currencySymbol}{getDonationValue(selectedAmount)}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📧</Text>
            <Text style={styles.infoText}>
              You will receive a tax receipt via email within 7 days of your donation.
              Thank you for your generosity!
            </Text>
          </View>
        </ScrollView>

        {/* Success Modal */}
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
                <Text style={styles.successEmoji}>🙏</Text>
              </View>
              <Text style={styles.modalTitle}>Thank You!</Text>
              <Text style={styles.modalSubtitle}>
                Your donation has been processed
              </Text>

              {generatedVoucher && (
                <>
                  <View style={styles.donationConfirm}>
                    <Text style={styles.confirmLabel}>Amount Donated</Text>
                    <Text style={styles.confirmValue}>{currencySymbol}{generatedVoucher.value}</Text>
                    <Text style={styles.confirmCharity}>{generatedVoucher.category}</Text>
                  </View>

                  <View style={styles.receiptInfo}>
                    <Text style={styles.receiptTitle}>Receipt Reference</Text>
                    <Text style={styles.receiptCode}>{generatedVoucher.code}</Text>
                    <Text style={styles.receiptNote}>
                      Tax receipt will be sent to your registered email
                    </Text>
                  </View>
                </>
              )}

              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setShowVoucherModal(false);
                  setSelectedCharity(null);
                  setSelectedAmount(null);
                  setGeneratedVoucher(null);
                }}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </Pressable>

              <Pressable
                style={styles.donateAgainButton}
                onPress={() => {
                  setShowVoucherModal(false);
                  setSelectedAmount(null);
                  setGeneratedVoucher(null);
                }}
              >
                <Text style={styles.donateAgainText}>Donate Again</Text>
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
  heroCard: {
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: PRIVE_SPACING.md,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  heroText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  charityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.xl,
  },
  charityCard: {
    width: '48%',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  charityCardSelected: {
    borderColor: PRIVE_COLORS.gold.primary,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
  },
  charityIcon: {
    fontSize: 32,
    marginBottom: PRIVE_SPACING.sm,
  },
  charityName: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  charityCategory: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
  amountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.lg,
  },
  amountChip: {
    paddingHorizontal: PRIVE_SPACING.lg,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.lg,
    backgroundColor: PRIVE_COLORS.background.card,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  amountChipSelected: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  amountChipDisabled: {
    opacity: 0.5,
  },
  amountChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  amountChipTextSelected: {
    color: PRIVE_COLORS.background.primary,
  },
  amountChipTextDisabled: {
    color: PRIVE_COLORS.text.tertiary,
  },
  donationSummary: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: PRIVE_SPACING.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: PRIVE_COLORS.text.primary,
  },
  summaryValueGold: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  donateButton: {
    backgroundColor: '#E91E63',
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.lg,
  },
  donateButtonDisabled: {
    opacity: 0.7,
  },
  donateButtonEmoji: {
    fontSize: 20,
  },
  donateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
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
    backgroundColor: 'rgba(233, 30, 99, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  successEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xl,
  },
  donationConfirm: {
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.lg,
  },
  confirmLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xs,
  },
  confirmValue: {
    fontSize: 32,
    fontWeight: '300',
    color: '#E91E63',
    marginBottom: PRIVE_SPACING.xs,
  },
  confirmCharity: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
  },
  receiptInfo: {
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xl,
  },
  receiptTitle: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xs,
  },
  receiptCode: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
    letterSpacing: 1,
  },
  receiptNote: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#E91E63',
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
    color: Colors.text.inverse,
  },
  donateAgainButton: {
    padding: PRIVE_SPACING.md,
  },
  donateAgainText: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
  },
});

export default withErrorBoundary(CharityScreen, 'PriveRedeemCharity');
