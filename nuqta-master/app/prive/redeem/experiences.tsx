import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Experiences Redemption Page
 * Redeem coins for exclusive experiences
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { usePriveSection } from '@/hooks/usePriveSection';
import priveApi, { Voucher } from '@/services/priveApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { useRefreshWallet, useGetCurrencySymbol } from '@/stores/selectors';
import { EXPERIENCES, Experience } from '@/constants/priveCatalog';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const generateIdempotencyKey = () => `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

function ExperiencesScreen() {
  const router = useRouter();
  const { userData, refresh } = usePriveSection();
  const refreshWallet = useRefreshWallet();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const availableCoins = userData?.totalCoins || 0;

  // Fetch catalog from backend, fallback to constants
  const [experiences, setExperiences] = useState<Experience[]>(EXPERIENCES);
  const isMounted = useIsMounted();
  useEffect(() => {
    (async () => {
      try {
        const res = await priveApi.getCatalog();
        if (res.success && res.data?.experiences) {
          setExperiences(res.data.experiences as unknown as Experience[]);
        }
      } catch {
        // fallback
      }
    })();
  }, []);

  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const handleSelectExperience = (exp: Experience) => {
    if (availableCoins >= exp.coinCost) {
      setSelectedExperience(exp);
    }
  };

  const handleRedeem = async () => {
    if (!selectedExperience) return;

    platformAlertConfirm(
      'Confirm Redemption',
      `Redeem ${selectedExperience.coinCost.toLocaleString()} coins for "${selectedExperience.name}"?`,
      async () => {
        setIsRedeeming(true);
        try {
          const response = await priveApi.redeemCoins({
            coinAmount: selectedExperience.coinCost,
            type: 'experience',
            category: selectedExperience.id,
            partnerName: selectedExperience.name,
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
          <Text style={styles.headerTitle}>Experiences</Text>
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
          <Text style={styles.sectionTitle}>Exclusive Experiences</Text>
          <Text style={styles.sectionSubtitle}>
            Premium experiences curated for Prive members
          </Text>

          {experiences.map((exp) => {
            const canAfford = availableCoins >= exp.coinCost;
            const isSelected = selectedExperience?.id === exp.id;

            return (
              <Pressable
                key={exp.id}
                style={[
                  styles.expCard,
                  isSelected && styles.expCardSelected,
                  !canAfford && styles.expCardDisabled,
                ]}
                onPress={() => handleSelectExperience(exp)}
                disabled={!canAfford}
              >
                <View style={styles.expHeader}>
                  <Text style={styles.expIcon}>{exp.icon}</Text>
                  <View style={styles.expTitleSection}>
                    <Text style={[styles.expName, !canAfford && styles.expNameDisabled]}>
                      {exp.name}
                    </Text>
                    <Text style={styles.expDesc}>{exp.description}</Text>
                  </View>
                </View>

                <View style={styles.expHighlights}>
                  {exp.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightItem}>
                      <Text style={styles.highlightDot}>•</Text>
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.expFooter}>
                  <View>
                    <Text style={[styles.expCoins, !canAfford && styles.expCoinsDisabled]}>
                      {exp.coinCost.toLocaleString()} coins
                    </Text>
                    <Text style={styles.expValue}>Worth {currencySymbol}{exp.value}</Text>
                  </View>
                  {canAfford ? (
                    isSelected ? (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark" size={16} color={PRIVE_COLORS.gold.primary} />
                      </View>
                    ) : (
                      <Text style={styles.selectText}>Select</Text>
                    )
                  ) : (
                    <Text style={styles.needMore}>
                      Need {(exp.coinCost - availableCoins).toLocaleString()} more
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Redeem Button */}
          {selectedExperience && (
            <Pressable
              style={[styles.redeemButton, isRedeeming && styles.redeemButtonDisabled]}
              onPress={handleRedeem}
              disabled={isRedeeming}
            >
              {isRedeeming ? (
                <ActivityIndicator color={PRIVE_COLORS.background.primary} />
              ) : (
                <Text style={styles.redeemButtonText}>
                  Redeem {selectedExperience.name}
                </Text>
              )}
            </Pressable>
          )}

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>✨</Text>
            <Text style={styles.infoText}>
              Experience vouchers include a 20% premium conversion rate.
              Valid for 90 days. Book via our concierge.
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
                <Text style={styles.successEmoji}>✨</Text>
              </View>
              <Text style={styles.modalTitle}>Experience Booked!</Text>

              {generatedVoucher && (
                <>
                  <View style={styles.voucherCodeBox}>
                    <Text style={styles.voucherCode}>{generatedVoucher.code}</Text>
                  </View>
                  <Text style={styles.voucherCategory}>{generatedVoucher.category}</Text>
                  <Text style={styles.voucherValue}>Value: {currencySymbol}{generatedVoucher.value}</Text>
                  <Text style={styles.voucherExpiry}>Valid for: {generatedVoucher.expiresIn}</Text>

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
                  setSelectedExperience(null);
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.xl,
  },
  expCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  expCardSelected: {
    borderColor: PRIVE_COLORS.gold.primary,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
  },
  expCardDisabled: {
    opacity: 0.6,
  },
  expHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.md,
  },
  expIcon: {
    fontSize: 32,
  },
  expTitleSection: {
    flex: 1,
  },
  expName: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  expNameDisabled: {
    color: PRIVE_COLORS.text.tertiary,
  },
  expDesc: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
  },
  expHighlights: {
    marginBottom: PRIVE_SPACING.md,
    paddingLeft: PRIVE_SPACING.sm,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    marginBottom: 4,
  },
  highlightDot: {
    fontSize: 10,
    color: PRIVE_COLORS.gold.primary,
  },
  highlightText: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
  },
  expFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: PRIVE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white08,
  },
  expCoins: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  expCoinsDisabled: {
    color: PRIVE_COLORS.text.tertiary,
  },
  expValue: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 13,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '500',
  },
  needMore: {
    fontSize: 11,
    color: PRIVE_COLORS.status.warning,
  },
  redeemButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    alignItems: 'center',
    marginVertical: PRIVE_SPACING.lg,
  },
  redeemButtonDisabled: {
    opacity: 0.7,
  },
  redeemButtonText: {
    fontSize: 16,
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
  voucherCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
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

export default withErrorBoundary(ExperiencesScreen, 'PriveRedeemExperiences');
