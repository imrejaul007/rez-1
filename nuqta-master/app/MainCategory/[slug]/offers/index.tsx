// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Offers Page
 * /MainCategory/[slug]/offers
 * Shows bank offers, today's deals, and promo codes with tab navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator, ScrollView, Clipboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const TABS = [
  { id: 'all', label: 'All Deals', icon: 'grid-outline' },
  { id: 'gadgets', label: 'Store Offers', icon: 'phone-portrait-outline' },
  { id: 'accessories', label: 'Exclusive', icon: 'headset-outline' },
];

const BANK_GRADIENTS: Record<string, string[]> = {
  HDFC: ['#004C8F', '#002E5D'], SBI: ['#22336B', '#141D3B'],
  ICICI: ['#F58220', '#C15A00'], AXIS: ['#800020', '#5A0016'],
  KOTAK: ['#ED232A', '#B01B20'], DEFAULT: [colors.infoScale[400], '#1D4ED8'],
};

function getBankGradient(bankName: string): string[] {
  const key = Object.keys(BANK_GRADIENTS).find(k => bankName?.toUpperCase().includes(k));
  return key ? BANK_GRADIENTS[key] : BANK_GRADIENTS.DEFAULT;
}

function OffersIndexPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const params = useLocalSearchParams<{ tab?: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [activeTab, setActiveTab] = useState(params.tab || 'all');
  const [bankOffers, setBankOffers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bankRes, dealsRes, couponsRes] = await Promise.all([
        apiClient.get<any>('/offers/bank-offers', { limit: 20 }).catch(() => null),
        apiClient.get<any>('/offers/flash-sales', { limit: 20 }).catch(() => null),
        apiClient.get<any>('/coupons', { category: slug }).catch(() => null),
      ]);

      if (bankRes?.success && bankRes.data) {
        const offers = bankRes.data?.offers || (Array.isArray(bankRes.data) ? bankRes.data : []);
        if (!isMounted()) return;
        setBankOffers(offers);
      }
      if (dealsRes?.success && dealsRes.data) {
        const d = Array.isArray(dealsRes.data) ? dealsRes.data : (dealsRes.data?.offers || []);
        if (!isMounted()) return;
        setDeals(d);
      }
      if (couponsRes?.success && couponsRes.data) {
        const c = Array.isArray(couponsRes.data) ? couponsRes.data : (couponsRes.data?.coupons || []);
        if (!isMounted()) return;
        setCoupons(c.filter((cp: any) => cp.status === 'active' || cp.isActive !== false));
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffers();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleCopyCode = (code: string) => {
    try {
      Clipboard.setString(code);
      platformAlertSimple('Copied!', `Promo code ${code} copied to clipboard`);
    } catch {}
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

  const getFilteredData = () => {
    const allItems = [...bankOffers, ...deals, ...coupons];
    if (activeTab === 'all') return allItems;
    if (activeTab === 'gadgets') {
      return allItems.filter((item: any) =>
        item.subcategory === 'gadgets' || item.tags?.includes('gadgets') ||
        item.title?.toLowerCase().includes('gadget') || item.description?.toLowerCase().includes('gadget') ||
        item.title?.toLowerCase().includes('phone') || item.title?.toLowerCase().includes('laptop') ||
        item.title?.toLowerCase().includes('tablet')
      );
    }
    if (activeTab === 'accessories') {
      return allItems.filter((item: any) =>
        item.subcategory === 'accessories' || item.tags?.includes('accessories') ||
        item.title?.toLowerCase().includes('accessor') || item.description?.toLowerCase().includes('accessor') ||
        item.title?.toLowerCase().includes('case') || item.title?.toLowerCase().includes('charger') ||
        item.title?.toLowerCase().includes('cable')
      );
    }
    return allItems;
  };

  const renderBankOffer = (offer: any) => (
    <Pressable
      style={styles.bankCard}
      onPress={() => router.push(`/MainCategory/' + slug + '/offers/${offer._id}` as any)}
    >
      <LinearGradient colors={getBankGradient(offer.bankName || '') as any} style={styles.bankGradient}>
        <View style={styles.bankContent}>
          <Text style={styles.bankIcon}>
            {offer.cardType === 'upi' ? '\u{1F4F1}' : offer.cardType === 'wallet' ? '\u{1F45B}' : '\u{1F4B3}'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bankName}>{offer.bankName || 'Bank Offer'}</Text>
            <Text style={styles.bankDiscount}>
              {offer.discountPercentage ? `Up to ${offer.discountPercentage}% Off` : offer.offerDescription || 'Special Discount'}
            </Text>
            {offer.maxDiscount > 0 && (
              <Text style={styles.bankMax}>Max discount: {currencySymbol}{offer.maxDiscount}</Text>
            )}
            {offer.minTransactionAmount > 0 && (
              <Text style={styles.bankMin}>Min order: {currencySymbol}{offer.minTransactionAmount}</Text>
            )}
          </View>
        </View>
        {offer.promoCode && (
          <View style={styles.bankPromoRow}>
            <Text style={styles.bankPromoCode}>Code: {offer.promoCode}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );

  const renderDeal = (deal: any) => {
    const discount = deal.cashbackPercentage || deal.discountPercentage || 0;
    const storeName = deal.store?.name || deal.brandName || '';
    const validity = deal.validUntil || deal.validTo || deal.expiresAt;
    const icon = discount >= 30 ? '\u{1F4AB}' : discount >= 20 ? '\u{2728}' : '\u{1F4A1}';
    const title = discount > 0 ? `${discount}% Off` : (deal.title || 'Special Deal');

    return (
      <Pressable
        style={styles.dealCard}
        onPress={() => router.push(`/MainCategory/' + slug + '/offers/${deal._id}` as any)}
      >
        <Text style={styles.dealIcon}>{icon}</Text>
        <Text style={styles.dealTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.dealSubtitle} numberOfLines={2}>
          {deal.subtitle || deal.description || 'Limited time offer'}
        </Text>
        {storeName ? (
          <Text style={styles.dealStore} numberOfLines={1}>{storeName}</Text>
        ) : null}
        {validity && (
          <Text style={styles.dealValidity}>
            Valid till {new Date(validity).toLocaleDateString()}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderCoupon = (coupon: any) => {
    const code = coupon.couponCode || coupon.code || '';
    const discountText = coupon.discountType === 'PERCENTAGE' || coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% OFF` : `${currencySymbol}${coupon.discountValue} OFF`;
    const expiry = getCouponExpiry(coupon);

    return (
      <View style={styles.couponCard}>
        <View style={styles.couponLeft}>
          <Text style={styles.couponDiscount}>{discountText}</Text>
          {coupon.title && <Text style={styles.couponTitle} numberOfLines={1}>{coupon.title}</Text>}
          {coupon.description && <Text style={styles.couponDesc} numberOfLines={1}>{coupon.description}</Text>}
          {coupon.minOrderValue > 0 && (
            <Text style={styles.couponMin}>Min. order {currencySymbol}{coupon.minOrderValue}</Text>
          )}
          {expiry ? <Text style={styles.couponExpiry}>{expiry}</Text> : null}
        </View>
        <View style={styles.couponRight}>
          <View style={styles.couponCodeBox}>
            <Text style={styles.couponCode}>{code}</Text>
          </View>
          <Pressable style={styles.copyBtn} onPress={() => handleCopyCode(code)}>
            <Text style={styles.copyBtnText}>COPY</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.bankName || item.cardType) return renderBankOffer(item);
    if (item.couponCode || item.code) return renderCoupon(item);
    return renderDeal(item);
  }, [currencySymbol, router, slug]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Electronics Offers</Text>
          <Text style={styles.headerSubtitle}>
            {bankOffers.length + deals.length + coupons.length} offers available
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.id ? SHARED_COLORS.white : SHARED_COLORS.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={getFilteredData()}
          keyExtractor={(item, index) => item._id || item.id || `${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
          estimatedItemSize={120}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === 'gadgets' ? 'phone-portrait-outline' : activeTab === 'accessories' ? 'headset-outline' : 'pricetag-outline'}
                size={48}
                color={SHARED_COLORS.textSecondary}
              />
              <Text style={styles.emptyTitle}>
                No {activeTab === 'all' ? 'offers' : activeTab === 'gadgets' ? 'gadget offers' : 'accessory offers'} right now
              </Text>
              <Text style={styles.emptySubtitle}>Check back later for new offers</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.warmGray },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.background.primary, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral[900] },
  headerSubtitle: { fontSize: 12, color: colors.neutral[500] },
  tabsContainer: { backgroundColor: colors.background.primary, paddingBottom: 8 },
  tabs: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.neutral[100],
  },
  tabActive: { backgroundColor: colors.infoScale[400] },
  tabLabel: { fontSize: 13, fontWeight: '500', color: colors.neutral[500] },
  tabLabelActive: { color: colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.neutral[500] },
  listContent: { padding: 16, paddingBottom: 120 },
  dealsRow: { gap: 12 },
  // Bank offer styles
  bankCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  bankGradient: { padding: 16 },
  bankContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankIcon: { fontSize: 32 },
  bankName: { fontSize: 16, fontWeight: '700', color: colors.background.primary, marginBottom: 4 },
  bankDiscount: { fontSize: 14, fontWeight: '600', color: colors.background.primary },
  bankMax: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  bankMin: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  bankPromoRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  bankPromoCode: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  // Deal styles
  dealCard: {
    flex: 1, padding: 16, borderRadius: 16, backgroundColor: colors.background.primary,
    alignItems: 'center', marginBottom: 12,
  },
  dealIcon: { fontSize: 32, marginBottom: 8 },
  dealTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral[900], marginBottom: 4, textAlign: 'center' },
  dealSubtitle: { fontSize: 12, color: colors.neutral[500], textAlign: 'center', marginBottom: 4 },
  dealStore: { fontSize: 11, color: colors.infoScale[400], fontWeight: '500' },
  dealValidity: { fontSize: 10, color: colors.neutral[500], marginTop: 4 },
  // Coupon styles
  couponCard: {
    flexDirection: 'row', backgroundColor: colors.background.primary, borderRadius: 12,
    padding: 16, borderLeftWidth: 4, borderLeftColor: colors.brand.blue, marginBottom: 12,
  },
  couponLeft: { flex: 1 },
  couponDiscount: { fontSize: 18, fontWeight: '700', color: colors.brand.blue, marginBottom: 4 },
  couponTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral[900], marginBottom: 2 },
  couponDesc: { fontSize: 12, color: colors.neutral[500], marginBottom: 2 },
  couponMin: { fontSize: 11, color: colors.neutral[500], marginBottom: 2 },
  couponExpiry: { fontSize: 11, color: colors.neutral[500] },
  couponRight: { alignItems: 'flex-end', justifyContent: 'center' },
  couponCodeBox: {
    borderWidth: 1, borderColor: colors.neutral[200], borderStyle: 'dashed',
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8,
  },
  couponCode: { fontSize: 12, fontWeight: '600', color: colors.neutral[900], letterSpacing: 1 },
  copyBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.brand.blue, borderRadius: 6 },
  copyBtnText: { fontSize: 11, fontWeight: '600', color: colors.background.primary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral[900], marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.neutral[500], marginTop: 4 },
});

export default withErrorBoundary(OffersIndexPage, 'MainCategorySlugOffersIndex');
