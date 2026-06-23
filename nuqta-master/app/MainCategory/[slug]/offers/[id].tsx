import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Offer Detail Page
 * /MainCategory/[slug]/offers/[id]
 * Shows full details of a bank offer, deal, or promo code (theme-driven)
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Clipboard,
} from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

function OffersDetailPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [offer, setOffer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setIsLoading(true);
        // Try bank offer first, then general offer
        const bankRes = await apiClient.get<any>(`/offers/bank/${id}`).catch(() => null);
        if (bankRes?.success && bankRes.data) {
          setOffer({ ...bankRes.data, _type: 'bank' });
          return;
        }
        const offerRes = await apiClient.get<any>(`/offers/${id}`).catch(() => null);
        if (offerRes?.success && offerRes.data) {
          setOffer(offerRes.data);
        }
      } catch (err) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };
    if (id) fetchOffer();
  }, [id]);

  const handleCopyCode = (code: string) => {
    try {
      Clipboard.setString(code);
      platformAlertSimple('Copied!', `Code ${code} copied to clipboard`);
    } catch {}
  };

  const handleApplyOffer = async () => {
    const promoCode = offer.promoCode || offer.couponCode || offer.code;
    if (promoCode) {
      handleCopyCode(promoCode);
      return;
    }

    try {
      setIsRedeeming(true);
      const res = await apiClient.post<any>(`/offers/${id}/redeem`);
      if (res.success) {
        platformAlertConfirm('Offer Applied!', res.data?.message || 'Your offer has been applied. Use it on your next purchase!', () => router.canGoBack() ? router.back() : router.replace('/(tabs)'), 'OK');
      } else {
        platformAlertSimple('Cannot Apply', res.message || 'This offer may have expired or reached its usage limit.');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Failed to apply offer. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Offer Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={SHARED_COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Offer not found</Text>
          <Text style={styles.emptySubtitle}>This offer may have expired or been removed</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBankOffer = offer._type === 'bank' || offer.bankName;
  const promoCode = offer.promoCode || offer.couponCode || offer.code;
  const discount = offer.discountPercentage || offer.cashbackPercentage || offer.discountValue;
  const title = offer.offerTitle || offer.bankName || offer.title || 'Special Offer';
  const description = offer.offerDescription || offer.description || '';
  const terms = offer.termsDetailed || offer.terms || [];
  const validUntil = offer.validUntil || offer.validTo || offer.expiresAt;
  const applicableStores = offer.applicableStores || offer.stores || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Offer Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={isBankOffer ? ['#1D4ED8', '#1E40AF'] : [theme.primaryColor, theme.primaryColorDark]}
          style={styles.hero}
        >
          <Text style={styles.heroIcon}>{isBankOffer ? '\u{1F4B3}' : '\u{1F4A1}'}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          {discount > 0 && offer.maxDiscount > 0 ? (
            <>
              <Text style={styles.heroDiscount}>
                Save up to {currencySymbol}{offer.maxDiscount.toLocaleString()}
              </Text>
              <Text style={styles.heroMax}>{discount}% OFF</Text>
            </>
          ) : discount > 0 ? (
            <Text style={styles.heroDiscount}>
              {offer.discountType === 'percentage' || offer.discountPercentage
                ? `${discount}% OFF` : `${currencySymbol}${discount} OFF`}
            </Text>
          ) : null}
        </LinearGradient>

        {/* Promo Code */}
        {promoCode && (
          <View style={styles.promoSection}>
            <Text style={styles.promoLabel}>Promo Code</Text>
            <View style={styles.promoRow}>
              <View style={styles.promoCodeBox}>
                <Text style={styles.promoCode}>{promoCode}</Text>
              </View>
              <Pressable style={styles.copyBtn} onPress={() => handleCopyCode(promoCode)}>
                <Ionicons name="copy-outline" size={16} color={SHARED_COLORS.white} />
                <Text style={styles.copyBtnText}>COPY</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionLabel}>Details</Text>
          {description ? <Text style={styles.descriptionText}>{description}</Text> : null}

          <View style={styles.detailsGrid}>
            {offer.minTransactionAmount > 0 && (
              <View style={styles.detailItem}>
                <Ionicons name="cart-outline" size={18} color={theme.primaryColor} />
                <Text style={styles.detailLabel}>Min. Order</Text>
                <Text style={styles.detailValue}>{currencySymbol}{offer.minTransactionAmount}</Text>
              </View>
            )}
            {validUntil && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={18} color={theme.primaryColor} />
                <Text style={styles.detailLabel}>Valid Till</Text>
                <Text style={styles.detailValue}>{new Date(validUntil).toLocaleDateString()}</Text>
              </View>
            )}
            {offer.cardType && (
              <View style={styles.detailItem}>
                <Ionicons name="card-outline" size={18} color={theme.primaryColor} />
                <Text style={styles.detailLabel}>Card Type</Text>
                <Text style={styles.detailValue}>{offer.cardType.toUpperCase()}</Text>
              </View>
            )}
            {offer.usageLimitPerUser > 0 && (
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={18} color={theme.primaryColor} />
                <Text style={styles.detailLabel}>Usage Limit</Text>
                <Text style={styles.detailValue}>{offer.usageLimitPerUser}x per user</Text>
              </View>
            )}
          </View>
        </View>

        {/* Terms & Conditions */}
        {(Array.isArray(terms) ? terms : [terms]).filter(Boolean).length > 0 && (
          <View style={styles.termsSection}>
            <Text style={styles.sectionLabel}>Terms & Conditions</Text>
            {(Array.isArray(terms) ? terms : [terms]).filter(Boolean).map((term: string, i: number) => (
              <View key={i} style={styles.termItem}>
                <Text style={styles.termBullet}>{'\u2022'}</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Applicable Stores */}
        {applicableStores.length > 0 && (
          <View style={styles.storesSection}>
            <Text style={styles.sectionLabel}>Available At</Text>
            {applicableStores.map((store: any, i: number) => {
              const storeName = typeof store === 'string' ? store : (store.name || store.storeName || '');
              const storeId = typeof store === 'string' ? null : (store._id || store.id);
              if (!storeName) return null;
              return (
                <Pressable
                  key={storeId || i}
                  style={styles.storeCard}
                  onPress={() => {
                    if (storeId) {
                      router.push(`/MainStorePage?storeId=${storeId}` as any);
                    }
                  }}
                  disabled={!storeId}
                >
                  <Ionicons name="storefront-outline" size={20} color={theme.primaryColor} />
                  <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
                  {storeId && <Ionicons name="chevron-forward" size={18} color={SHARED_COLORS.textSecondary} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Single store fallback */}
        {applicableStores.length === 0 && offer.store?.name && (
          <Pressable
            style={styles.singleStoreCard}
            onPress={() => router.push(`/MainStorePage?storeId=${offer.store?.id || offer.store?._id}` as any)}
          >
            <Ionicons name="laptop-outline" size={24} color={theme.primaryColor} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeLabel}>Available at</Text>
              <Text style={styles.singleStoreName}>{offer.store.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={SHARED_COLORS.textSecondary} />
          </Pressable>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {(() => {
        const isExpired = validUntil && new Date(validUntil) < new Date();
        return (
          <View style={styles.bottomCTA}>
            {promoCode ? (
              <Pressable
                style={styles.applyBtn}
                onPress={() => handleCopyCode(promoCode)}
              >
                <Ionicons name="copy-outline" size={18} color={SHARED_COLORS.white} />
                <Text style={styles.applyBtnText}>Copy Code</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.applyBtn, (isExpired || isRedeeming) && styles.applyBtnDisabled]}
                onPress={handleApplyOffer}
                disabled={isExpired || isRedeeming}
              >
                {isRedeeming ? (
                  <ActivityIndicator size="small" color={SHARED_COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="gift-outline" size={18} color={SHARED_COLORS.white} />
                    <Text style={styles.applyBtnText}>
                      {isExpired ? 'Offer Expired' : offer.maxDiscount > 0
                        ? `Save up to ${currencySymbol}${offer.maxDiscount.toLocaleString()}`
                        : discount > 0 ? `Get ${discount}% Off Now` : 'Apply Offer'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.base },
  emptySubtitle: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, marginTop: Spacing.xs },
  content: { paddingBottom: 120 },
  hero: { padding: Spacing['2xl'], alignItems: 'center' },
  heroIcon: { fontSize: 48, marginBottom: Spacing.md },
  heroTitle: { fontSize: 22, fontWeight: '700', color: Colors.text.inverse, textAlign: 'center', marginBottom: Spacing.sm },
  heroDiscount: { ...Typography.h1, fontWeight: '800', color: Colors.text.inverse },
  heroMax: { ...Typography.body, color: 'rgba(255,255,255,0.8)', marginTop: Spacing.xs },
  promoSection: { margin: Spacing.base, padding: Spacing.base, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg },
  promoLabel: { ...Typography.body, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.md },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  promoCodeBox: {
    flex: 1, borderWidth: 2, borderColor: Colors.info, borderStyle: 'dashed',
    borderRadius: BorderRadius.sm, paddingVertical: Spacing.md, alignItems: 'center',
  },
  promoCode: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.info, borderRadius: BorderRadius.sm,
  },
  copyBtnText: { ...Typography.bodySmall, fontSize: 13, fontWeight: '600', color: Colors.text.inverse },
  detailsSection: { marginHorizontal: Spacing.base, marginBottom: Spacing.base, padding: Spacing.base, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg },
  sectionLabel: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.md },
  descriptionText: { ...Typography.body, color: Colors.text.tertiary, lineHeight: 20, marginBottom: Spacing.base },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  detailItem: {
    width: '47%' as any, padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.infoScale[50], alignItems: 'center', gap: Spacing.xs,
  },
  detailLabel: { ...Typography.caption, color: Colors.text.tertiary },
  detailValue: { ...Typography.body, fontWeight: '600', color: Colors.text.primary },
  termsSection: { marginHorizontal: Spacing.base, marginBottom: Spacing.base, padding: Spacing.base, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg },
  termItem: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  termBullet: { ...Typography.body, color: Colors.text.tertiary },
  termText: { flex: 1, ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, lineHeight: 18 },
  storesSection: { marginHorizontal: Spacing.base, marginBottom: Spacing.base, padding: Spacing.base, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg },
  storeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  storeName: { flex: 1, ...Typography.body, fontWeight: '500', color: Colors.text.primary },
  singleStoreCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.base, marginBottom: Spacing.base, padding: Spacing.base, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
  },
  storeLabel: { ...Typography.caption, color: Colors.text.tertiary },
  singleStoreName: { ...Typography.body, fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  bottomCTA: {
    padding: Spacing.base, paddingBottom: Spacing['2xl'], backgroundColor: Colors.background.primary,
    borderTopWidth: 1, borderTopColor: Colors.border.default,
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.base, borderRadius: 14, backgroundColor: Colors.info,
  },
  applyBtnDisabled: { backgroundColor: Colors.text.tertiary },
  applyBtnText: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.inverse },
});

export default withErrorBoundary(OffersDetailPage, 'MainCategorySlugOffersId');
