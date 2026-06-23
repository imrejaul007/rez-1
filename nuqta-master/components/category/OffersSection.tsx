/**
 * OffersSection Component
 * Displays category-specific offers from the real API
 * Used in FoodDiningCategoryPage and other category pages with offers tabs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface OffersSectionProps {
  categorySlug: string;
  categoryId?: string;
  title?: string;
  onSeeAll?: () => void;
  filterTags?: string[];
}

const COLORS = {
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

const BANK_GRADIENTS: Record<string, string[]> = {
  HDFC: ['#004C8F', '#002E5D'],
  SBI: ['#22336B', '#141D3B'],
  ICICI: ['#F58220', '#C15A00'],
  AXIS: ['#800020', '#5A0016'],
  KOTAK: ['#ED232A', '#B01B20'],
  DEFAULT: [colors.infoScale[400], '#1D4ED8'],
};

function getBankGradient(bankName: string): string[] {
  const key = Object.keys(BANK_GRADIENTS).find(k =>
    bankName?.toUpperCase().includes(k)
  );
  return key ? BANK_GRADIENTS[key] : BANK_GRADIENTS.DEFAULT;
}

function OffersSection({ categorySlug, categoryId, title, onSeeAll, filterTags }: OffersSectionProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [bankOffers, setBankOffers] = useState<any[]>([]);
  const [todaysDeals, setTodaysDeals] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  const fetchOffers = useCallback(async () => {
    try {
      setIsLoading(true);

      const [bankRes, dealsRes, couponsRes] = await Promise.all([
        apiClient.get<any>('/offers/bank-offers', { category: categorySlug, limit: 10 }).catch(() => null),
        apiClient.get<any>('/offers/flash-sales', { category: categorySlug, limit: 6 }).catch(() => null),
        apiClient.get<any>('/coupons/my-coupons', { category: categorySlug, limit: 6 }).catch(() => null),
      ]);

      // Bank offers
      if (bankRes?.success && bankRes.data) {
        const offers = bankRes.data?.offers || (Array.isArray(bankRes.data) ? bankRes.data : []);
        if (!isMounted()) return;
        setBankOffers(offers);
      }

      // Today's deals (flash sales / BOGO / free delivery)
      if (dealsRes?.success && dealsRes.data) {
        const deals = Array.isArray(dealsRes.data) ? dealsRes.data : (dealsRes.data?.offers || []);
        setTodaysDeals(deals.slice(0, 4));
      }

      // Coupons / promo codes
      if (couponsRes?.success && couponsRes.data) {
        const couponList = Array.isArray(couponsRes.data) ? couponsRes.data : (couponsRes.data?.coupons || []);
        setCoupons(couponList.filter((c: any) => c.status === 'active' || c.isActive !== false).slice(0, 4));
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleCopyCode = async (code: string) => {
    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(code);
      platformAlertSimple('Copied!', `Promo code ${code} copied to clipboard`);
    } catch {
      // Clipboard may not be available on all platforms
    }
  };

  const handleOfferPress = (offer: any) => {
    const id = offer._id || offer.id;
    if (id) {
      router.push(`/MainCategory/${categorySlug}/offers/${id}` as any);
    }
  };

  const getDealDisplay = (deal: any) => {
    if (deal.bogoType || deal.type === 'bogo') {
      return { title: 'BOGO', subtitle: 'Buy 1 Get 1 Free', icon: '🎁', color: colors.warningScale[400] };
    }
    if (deal.isFreeDelivery) {
      return { title: 'Free Delivery', subtitle: `Orders above ${currencySymbol}199`, icon: '🚚', color: colors.infoScale[400] };
    }
    if (deal.cashbackPercentage && deal.cashbackPercentage >= 20) {
      return { title: `${deal.cashbackPercentage}% Cashback`, subtitle: deal.title || 'On eligible orders', icon: '💰', color: colors.brand.purpleLight };
    }
    const discount = deal.cashbackPercentage || deal.discountPercentage || deal.discountValue || 0;
    return {
      title: discount > 0 ? `Flat ${discount}% Off` : (deal.title || 'Special Deal'),
      subtitle: deal.subtitle || deal.description || 'Limited time offer',
      icon: '🎉',
      color: colors.brand.pink,
    };
  };

  const getCouponExpiry = (coupon: any) => {
    const endDate = coupon.validTo || coupon.validUntil || coupon.expiresAt;
    if (!endDate) return '';
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 1) return 'Expires today';
    if (days <= 7) return `Expires in ${days} days`;
    return `Valid till ${new Date(endDate).toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryGold} />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </View>
    );
  }

  const hasContent = bankOffers.length > 0 || todaysDeals.length > 0 || coupons.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="pricetag-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No offers available right now</Text>
        <Text style={styles.emptySubtitle}>Check back later for deals and discounts</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bank Offers Section */}
      {bankOffers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={20} color={colors.infoScale[400]} />
            <Text style={styles.sectionTitle}>Bank Offers</Text>
            <Pressable onPress={() => router.push(`/MainCategory/${categorySlug}/offers?tab=bank` as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankOffersList}>
            {bankOffers.map((offer, index) => (
              <Pressable
                key={offer._id || index}
                style={styles.bankOfferCard}
                onPress={() => handleOfferPress(offer)}
              >
                <LinearGradient
                  colors={getBankGradient(offer.bankName || offer.bank || '') as any}
                  style={styles.bankOfferGradient}
                >
                  <View style={styles.bankOfferContent}>
                    <Text style={styles.bankOfferIcon}>
                      {offer.cardType === 'upi' ? '📱' : offer.cardType === 'wallet' ? '👛' : '💳'}
                    </Text>
                    <View style={styles.bankOfferText}>
                      <Text style={styles.bankOfferTitle} numberOfLines={1}>
                        {offer.bankName || offer.offerTitle || 'Bank Offer'}
                      </Text>
                      <Text style={styles.bankOfferDiscount}>
                        {offer.discountPercentage
                          ? `Up to ${offer.discountPercentage}% Off`
                          : offer.offerDescription || 'Special Discount'}
                      </Text>
                      {offer.maxDiscount > 0 && (
                        <Text style={styles.bankOfferMax}>
                          Max {currencySymbol}{offer.maxDiscount}
                        </Text>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Today's Deals Section */}
      {todaysDeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🏷️</Text>
            <Text style={styles.sectionTitle}>Today's Deals</Text>
            <Pressable onPress={() => router.push(`/MainCategory/${categorySlug}/offers?tab=deals` as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.dealsGrid}>
            {todaysDeals.map((deal, index) => {
              const display = getDealDisplay(deal);
              return (
                <Pressable
                  key={deal._id || index}
                  style={styles.dealCard}
                  onPress={() => handleOfferPress(deal)}
                >
                  <View style={[styles.dealIcon, { backgroundColor: display.color + '20' }]}>
                    <Text style={styles.dealIconText}>{display.icon}</Text>
                  </View>
                  <Text style={styles.dealTitle} numberOfLines={1}>{display.title}</Text>
                  <Text style={styles.dealSubtitle} numberOfLines={1}>{display.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Promo Codes Section */}
      {coupons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="ticket-outline" size={20} color={colors.brand.purpleLight} />
            <Text style={styles.sectionTitle}>Promo Codes</Text>
            <Pressable onPress={() => router.push(`/MainCategory/${categorySlug}/offers?tab=promos` as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.promoList}>
            {coupons.map((coupon, index) => {
              const code = coupon.couponCode || coupon.code || '';
              const discountText = coupon.discountType === 'PERCENTAGE' || coupon.discountType === 'percentage'
                ? `${coupon.discountValue}% OFF`
                : `${currencySymbol}${coupon.discountValue} OFF`;
              const desc = coupon.title || coupon.description || '';
              const expiry = getCouponExpiry(coupon);

              return (
                <View key={coupon._id || index} style={styles.promoCard}>
                  <View style={styles.promoLeft}>
                    <Text style={styles.promoDiscount}>{discountText}</Text>
                    {desc ? <Text style={styles.promoDescription} numberOfLines={1}>{desc}</Text> : null}
                    {coupon.minOrderValue > 0 && (
                      <Text style={styles.promoMinOrder}>Min. order {currencySymbol}{coupon.minOrderValue}</Text>
                    )}
                    {expiry ? <Text style={styles.promoExpiry}>{expiry}</Text> : null}
                  </View>
                  <View style={styles.promoRight}>
                    <View style={styles.promoCodeBox}>
                      <Text style={styles.promoCode}>{code}</Text>
                    </View>
                    <Pressable style={styles.copyButton} onPress={() => handleCopyCode(code)}>
                      <Text style={styles.copyButtonText}>COPY</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: colors.warningScale[400], fontWeight: '600' },
  bankOffersList: { gap: 12, paddingRight: 16 },
  bankOfferCard: { width: 220, borderRadius: 12, overflow: 'hidden' },
  bankOfferGradient: { padding: 16 },
  bankOfferContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankOfferIcon: { fontSize: 28 },
  bankOfferText: { flex: 1 },
  bankOfferTitle: { fontSize: 14, fontWeight: '600', color: COLORS.white, marginBottom: 4 },
  bankOfferDiscount: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  bankOfferMax: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dealCard: {
    width: '47%' as any, padding: 16, borderRadius: 16,
    backgroundColor: COLORS.white, alignItems: 'center',
  },
  dealIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  dealIconText: { fontSize: 24 },
  dealTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  dealSubtitle: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  promoList: { gap: 12 },
  promoCard: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12,
    padding: 16, borderLeftWidth: 4, borderLeftColor: colors.brand.purpleLight,
  },
  promoLeft: { flex: 1 },
  promoDiscount: { fontSize: 18, fontWeight: '700', color: colors.brand.purpleLight, marginBottom: 4 },
  promoDescription: { fontSize: 13, color: COLORS.textPrimary, marginBottom: 2 },
  promoMinOrder: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  promoExpiry: { fontSize: 11, color: COLORS.textSecondary },
  promoRight: { alignItems: 'flex-end', justifyContent: 'center' },
  promoCodeBox: {
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8,
  },
  promoCode: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: 1 },
  copyButton: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: colors.brand.purpleLight, borderRadius: 6,
  },
  copyButtonText: { fontSize: 11, fontWeight: '600', color: COLORS.white },
});

export default React.memo(OffersSection);
