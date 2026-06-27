// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Bank Offer Detail Page
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import realOffersApi from '@/services/realOffersApi';
import { useIsAuthenticated } from '@/stores/selectors';
import logger from '@/utils/logger';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

function BankOfferDetailScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useIsAuthenticated();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchOffer();
  }, [id]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      // Use the bank offers API to get the specific offer
      const response = await realOffersApi.getBankOffers({ limit: 50 });
      if (response.success && response.data) {
        const found = response.data.find((o: any) => (o._id || o.id) === id);
        if (found) {
          setOffer(found);
        } else {
          setError('Bank offer not found');
        }
      }
    } catch (err: any) {
      logger.error('[BankOfferDetail] Error:', err);
      if (!isMounted()) return;
      setError(err.message || 'Failed to load offer');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this bank offer: ${offer?.offerTitle || offer?.bankName} - ${offer?.discountPercentage}% discount!`,
      });
    } catch (err) {
      logger.error('[BankOfferDetail] Share error:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.info} />
      </SafeAreaView>
    );
  }

  if (error || !offer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <ThemedText style={styles.errorText}>{error || 'Offer not found'}</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isExpired = offer.validUntil && new Date(offer.validUntil) < new Date();
  const daysLeft = offer.validUntil
    ? Math.max(0, Math.ceil((new Date(offer.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Bank Offer</ThemedText>
        <Pressable style={styles.headerBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Bank Logo & Info */}
        <LinearGradient
          colors={['#1E40AF', colors.infoScale[400]]}
          style={styles.bannerGradient}
        >
          {offer.bankLogo ? (
            <CachedImage source={offer.bankLogo} style={styles.bankLogo} contentFit="contain" />
          ) : (
            <View style={styles.bankLogoPlaceholder}>
              <Ionicons name="card" size={40} color={Colors.text.inverse} />
            </View>
          )}
          <ThemedText style={styles.bankName}>{offer.bankName}</ThemedText>
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{offer.discountPercentage}% OFF</ThemedText>
          </View>
        </LinearGradient>

        {/* Offer Title */}
        <View style={styles.section}>
          <ThemedText style={styles.offerTitle}>{offer.offerTitle}</ThemedText>
          {offer.offerDescription && (
            <ThemedText style={styles.offerDesc}>{offer.offerDescription}</ThemedText>
          )}
        </View>

        {/* Card Type & Status */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: colors.tint.blue }]}>
            <Ionicons name="card-outline" size={14} color={Colors.info} />
            <ThemedText style={[styles.chipText, { color: colors.infoScale[400] }]}>
              {offer.cardType === 'all' ? 'All Cards' : `${offer.cardType?.charAt(0).toUpperCase()}${offer.cardType?.slice(1)} Card`}
            </ThemedText>
          </View>
          {offer.cardNetwork && (
            <View style={[styles.chip, { backgroundColor: colors.tint.pink }]}>
              <ThemedText style={[styles.chipText, { color: Colors.brand.purple }]}>{offer.cardNetwork}</ThemedText>
            </View>
          )}
          {isExpired ? (
            <View style={[styles.chip, { backgroundColor: colors.errorScale[100] }]}>
              <ThemedText style={[styles.chipText, { color: Colors.error }]}>Expired</ThemedText>
            </View>
          ) : daysLeft !== null && daysLeft <= 7 ? (
            <View style={[styles.chip, { backgroundColor: colors.tint.amberLight }]}>
              <ThemedText style={[styles.chipText, { color: Colors.warning }]}>{daysLeft} days left</ThemedText>
            </View>
          ) : null}
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <ThemedText style={styles.detailLabel}>Max Discount</ThemedText>
            <ThemedText style={styles.detailValue}>{offer.maxDiscount}</ThemedText>
          </View>
          <View style={styles.detailCard}>
            <ThemedText style={styles.detailLabel}>Min Transaction</ThemedText>
            <ThemedText style={styles.detailValue}>{offer.minTransactionAmount}</ThemedText>
          </View>
          {offer.usageLimitPerUser && (
            <View style={styles.detailCard}>
              <ThemedText style={styles.detailLabel}>Per User Limit</ThemedText>
              <ThemedText style={styles.detailValue}>{offer.usageLimitPerUser}</ThemedText>
            </View>
          )}
          {offer.totalUsageLimit && (
            <View style={styles.detailCard}>
              <ThemedText style={styles.detailLabel}>Total Uses Left</ThemedText>
              <ThemedText style={styles.detailValue}>{offer.totalUsageLimit - (offer.usageCount || 0)}</ThemedText>
            </View>
          )}
        </View>

        {/* Promo Code */}
        {offer.promoCode && (
          <View style={styles.promoSection}>
            <ThemedText style={styles.promoLabel}>Promo Code</ThemedText>
            <View style={styles.promoBox}>
              <ThemedText style={styles.promoCode}>{offer.promoCode}</ThemedText>
            </View>
          </View>
        )}

        {/* Validity */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Validity</ThemedText>
          <View style={styles.validityRow}>
            <View style={styles.validityItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
              <ThemedText style={styles.validityText}>
                From: {offer.validFrom ? new Date(offer.validFrom).toLocaleDateString() : 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.validityItem}>
              <Ionicons name="calendar" size={16} color={Colors.text.tertiary} />
              <ThemedText style={styles.validityText}>
                Until: {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : 'N/A'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Terms */}
        {offer.terms && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Terms & Conditions</ThemedText>
            <ThemedText style={styles.termsText}>{offer.terms}</ThemedText>
            {offer.termsDetailed?.map((term: string, i: number) => (
              <View key={i} style={styles.termItem}>
                <ThemedText style={styles.termBullet}>*</ThemedText>
                <ThemedText style={styles.termText}>{term}</ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {!isExpired && (
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.ctaButton}
            onPress={() => {
              if (offer.promoCode) {
                platformAlertSimple('Promo Code', `Use code: ${offer.promoCode} at checkout to avail this offer.`);
              } else {
                platformAlertSimple('Bank Offer', 'This offer will be automatically applied when you pay with an eligible card.');
              }
            }}
          >
            <LinearGradient colors={['#1E40AF', colors.infoScale[400]]} style={styles.ctaGradient}>
              <Ionicons name="card" size={20} color={Colors.text.inverse} />
              <ThemedText style={styles.ctaText}>Apply Offer</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary, gap: Spacing.md },
  errorText: { ...Typography.bodyLarge, color: Colors.text.tertiary },
  backButton: { paddingHorizontal: Spacing.lg, paddingVertical: 10, backgroundColor: Colors.info, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  backButtonText: { color: Colors.text.inverse, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  headerBtn: { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...Typography.h4, fontWeight: '600' },
  scroll: { flex: 1 },
  bannerGradient: { marginHorizontal: Spacing.base, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.base },
  bankLogo: { width: 80, height: 80, borderRadius: BorderRadius.lg, backgroundColor: Colors.background.primary, marginBottom: Spacing.md },
  bankLogoPlaceholder: { width: 80, height: 80, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  bankName: { fontSize: 22, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.sm },
  discountBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.base, paddingVertical: 6, borderRadius: BorderRadius.xl },
  discountText: { color: Colors.text.inverse, ...Typography.h4, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  offerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.xs },
  offerDesc: { ...Typography.body, color: Colors.text.tertiary, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.base },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.md, gap: Spacing.xs },
  chipText: { ...Typography.bodySmall, fontWeight: '600' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.base },
  detailCard: { flex: 1, minWidth: (width - 48) / 2, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.border.default },
  detailLabel: { ...Typography.bodySmall, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  detailValue: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary },
  promoSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  promoLabel: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, marginBottom: 6 },
  promoBox: { backgroundColor: Colors.warningScale[50], borderWidth: 1, borderColor: colors.warningScale[200], borderRadius: 10, padding: 14, alignItems: 'center', borderStyle: 'dashed' },
  promoCode: { ...Typography.h3, fontWeight: '700', color: Colors.warning, letterSpacing: 2 },
  sectionTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.sm },
  validityRow: { gap: Spacing.sm },
  validityItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  validityText: { ...Typography.body, color: Colors.text.tertiary },
  termsText: { ...Typography.body, color: Colors.text.tertiary, lineHeight: 20, marginBottom: Spacing.sm },
  termItem: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xs },
  termBullet: { color: Colors.text.tertiary, ...Typography.body },
  termText: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, flex: 1, lineHeight: 18 },
  bottomBar: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.background.primary, borderTopWidth: 1, borderTopColor: Colors.border.default },
  ctaButton: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: Spacing.sm },
  ctaText: { color: Colors.text.inverse, ...Typography.bodyLarge, fontWeight: '700' },
});

export default withErrorBoundary(BankOfferDetailScreen, 'BankOffersId');
