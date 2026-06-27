// @ts-nocheck
// Coupon Management Screen — Production Ready
// Browse, search, claim, and manage coupons

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import couponService, { Coupon, UserCoupon } from '@/services/couponApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { CardGridSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { errorReporter } from '@/utils/errorReporter';
import ErrorState from '@/components/common/ErrorState';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useSafeBack } from '@/hooks/useSafeBack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type CouponTab = 'available' | 'my-coupons' | 'expired';

// ── Palette ───────────────────────────────────────────────────
const C = {
  headerDark: Colors.secondary[900],     // was colors.deepNavy
  headerMid: Colors.secondary[800],      // was '#16213E'
  accent: '#FF6B35',                     // keep - unique orange for deals
  accentDark: '#E85D2C',                 // keep - unique
  success: Colors.success,               // was '#00C897'
  danger: Colors.error,                  // was '#FF4757'
  amber: Colors.warning,                 // was '#FFB23F'
  bg: Colors.background.secondary,       // was '#F5F5FA'
  card: Colors.background.primary,       // was colors.background.primary
  textPrimary: Colors.text.primary,      // was colors.deepNavy
  textSecondary: Colors.text.secondary,  // was colors.neutral[500]
  textMuted: Colors.text.tertiary,       // was colors.neutral[400]
  border: Colors.border.medium,          // was colors.neutral[200]
  discountGradient: ['#FF6B35', '#FF4757'] as [string, string],  // keep unique
  discountGradientDimmed: [Colors.text.tertiary, '#B0B0B0'] as [string, string],
};

const getRefName = (ref: string | { _id: string; name: string; [key: string]: any }): string | null => {
  if (typeof ref === 'object' && ref?.name) return ref.name;
  return null;
};

function CouponsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const handleBack = useSafeBack();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // ── State ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CouponTab>('available');
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [featuredCoupons, setFeaturedCoupons] = useState<Coupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedUserCoupon, setSelectedUserCoupon] = useState<UserCoupon | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [couponSummary, setCouponSummary] = useState({
    total: 0, available: 0, used: 0, expired: 0,
  });

  // Search & filter
  const [codeInput, setCodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Coupon[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    availableCoupons.forEach(c => c.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).slice(0, 8);
  }, [availableCoupons]);

  const filteredCoupons = useMemo(() => {
    if (searchResults) return searchResults;
    if (!activeFilter) return availableCoupons;
    return availableCoupons.filter(c => c.tags?.includes(activeFilter));
  }, [availableCoupons, activeFilter, searchResults]);

  const availableCount = availableCoupons.length;
  const myCount = couponSummary.available;
  const expiredCount = couponSummary.expired;

  // ── Data loading ──────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'available') {
        await Promise.all([loadAvailableCoupons(), loadFeaturedCoupons()]);
      } else if (activeTab === 'my-coupons') {
        await loadMyCoupons('available');
      } else {
        await loadMyCoupons('expired');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load coupons. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const loadAvailableCoupons = async () => {
    try {
      const response = await couponService.getAvailableCoupons();
      if (response.success && response.data) {
        setAvailableCoupons(response.data.coupons);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to load available coupons'),
        { context: 'CouponsPage.loadAvailableCoupons' },
        'warning'
      );
    }
  };

  const loadFeaturedCoupons = async () => {
    try {
      const response = await couponService.getFeaturedCoupons();
      if (response.success && response.data) {
        setFeaturedCoupons(response.data.coupons);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to load featured coupons'),
        { context: 'CouponsPage.loadFeaturedCoupons' },
        'warning'
      );
    }
  };

  const loadMyCoupons = async (status?: 'available' | 'used' | 'expired') => {
    try {
      const response = await couponService.getMyCoupons({ status });
      if (response.success && response.data) {
        setMyCoupons(response.data.coupons);
        setCouponSummary(response.data.summary);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to load my coupons'),
        { context: 'CouponsPage.loadMyCoupons' },
        'warning'
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchResults(null);
    setCodeInput('');
    setActiveFilter(null);
    await loadData();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  // ── Search by code ────────────────────────────────────────────
  const handleSearchCode = async () => {
    const trimmed = codeInput.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const response = await couponService.searchCoupons({ q: trimmed });
      if (response.success && response.data) {
        setSearchResults(response.data.coupons);
      } else {
        if (!isMounted()) return;
        setSearchResults([]);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to search coupons'),
        { context: 'CouponsPage.handleSearchCode' },
        'warning'
      );
      if (!isMounted()) return;
      setSearchResults([]);
    } finally {
      if (!isMounted()) return;
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setCodeInput('');
    setSearchResults(null);
  };

  // ── Claim ─────────────────────────────────────────────────────
  const handleClaimCoupon = async (couponId: string) => {
    if (claimingId) return;
    setClaimingId(couponId);
    try {
      setAvailableCoupons(prev => prev.filter(c => c._id !== couponId));
      setFeaturedCoupons(prev => prev.filter(c => c._id !== couponId));
      if (searchResults) setSearchResults(prev => prev!.filter(c => c._id !== couponId));

      const response = await couponService.claimCoupon(couponId);
      if (response.success) {
        setShowDetailsModal(false);
        platformAlertConfirm(
          'Coupon Claimed!',
          'Apply the code at checkout to get your discount.',
          () => setActiveTab('my-coupons'),
          'View My Coupons'
        );
      } else {
        platformAlertSimple('Oops', response.error || 'You may have already claimed this coupon.');
        await loadAvailableCoupons();
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to claim coupon'),
        { context: 'CouponsPage.handleClaimCoupon' },
        'warning'
      );
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
      await loadAvailableCoupons();
    } finally {
      if (!isMounted()) return;
      setClaimingId(null);
    }
  };

  // ── Remove ────────────────────────────────────────────────────
  const handleRemoveCoupon = async (userCouponId: string) => {
    platformAlertDestructive('Remove Coupon', 'Remove this coupon from your collection?', async () => {
      const prev = [...myCoupons];
      setMyCoupons(c => c.filter(uc => uc._id !== userCouponId));
      try {
        const response = await couponService.removeCoupon(userCouponId);
        if (!response.success) {
          setMyCoupons(prev);
          platformAlertSimple('Error', response.error || 'Failed to remove');
        }
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to remove coupon'),
          { context: 'CouponsPage.handleRemoveCoupon' },
          'warning'
        );
        if (!isMounted()) return;
        setMyCoupons(prev);
        platformAlertSimple('Error', 'Something went wrong');
      }
    });
  };

  // ── Copy ──────────────────────────────────────────────────────
  const handleCopyCode = async (code: string) => {
    try {
      if (Platform.OS === 'web') {
        await (navigator as any).clipboard?.writeText(code);
      } else {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(code);
      }
      platformAlertSimple('Copied!', `Code "${code}" copied to clipboard`);
    } catch { // Silent: non-critical clipboard operation
      platformAlertSimple('Coupon Code', code);
    }
  };

  // ── Use Now ───────────────────────────────────────────────────
  const handleUseCoupon = (coupon: Coupon) => {
    const stores = coupon.applicableTo?.stores || [];
    const categories = coupon.applicableTo?.categories || [];
    setShowDetailsModal(false);
    if (stores.length === 1 && typeof stores[0] === 'object') {
      router.push(`/MainStorePage?storeId=${(stores[0] as any)._id}` as any);
    } else if (categories.length === 1 && typeof categories[0] === 'object') {
      router.push(`/explore/category/${(categories[0] as any)._id}` as any);
    } else {
      router.push('/explore');
    }
  };

  // ── Share ─────────────────────────────────────────────────────
  const handleShareCoupon = async (coupon: Coupon) => {
    try {
      const disc = coupon.discountType === 'PERCENTAGE'
        ? `${coupon.discountValue}% OFF` : `${currencySymbol}${coupon.discountValue} OFF`;
      await Share.share({ message: `Use code "${coupon.couponCode}" to get ${disc} on Nquta! ${coupon.title}` });
    } catch {} // Silent: non-critical Share API
  };

  // ── View Details ──────────────────────────────────────────────
  const handleViewDetails = (coupon: Coupon, userCoupon?: UserCoupon) => {
    setSelectedCoupon(coupon);
    setSelectedUserCoupon(userCoupon || null);
    setShowDetailsModal(true);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  const getApplicableNames = (c: Coupon): string[] => {
    const n: string[] = [];
    c.applicableTo?.stores?.forEach(s => { const x = getRefName(s); if (x) n.push(x); });
    c.applicableTo?.categories?.forEach(s => { const x = getRefName(s); if (x) n.push(x); });
    return n;
  };

  const getApplicableStores = (c: Coupon): { _id: string; name: string }[] => {
    const stores: { _id: string; name: string }[] = [];
    c.applicableTo?.stores?.forEach(s => {
      if (typeof s === 'object' && s?.name) stores.push({ _id: s._id, name: s.name });
    });
    return stores;
  };

  const isAllStores = (c: Coupon) => {
    const a = c.applicableTo;
    return !a?.stores?.length && !a?.categories?.length && !a?.products?.length;
  };

  const fmtCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  // ═══════════════════════════════════════════════════════════════
  //  FEATURED COUPON CARD (horizontal)
  // ═══════════════════════════════════════════════════════════════
  const renderFeaturedCard = (coupon: Coupon) => (
    <Pressable
      key={coupon._id}
      style={s.featCard}
      onPress={() => handleViewDetails(coupon)}
     
    >
      <LinearGradient colors={C.discountGradient} style={s.featGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <ThemedText style={s.featDiscount}>
          {coupon.discountType === 'PERCENTAGE'
            ? `${coupon.discountValue}%`
            : `${currencySymbol}${coupon.discountValue}`}
        </ThemedText>
        <ThemedText style={s.featOff}>OFF</ThemedText>
        {coupon.maxDiscountCap > 0 && coupon.discountType === 'PERCENTAGE' && (
          <ThemedText style={s.featCap}>up to {currencySymbol}{coupon.maxDiscountCap}</ThemedText>
        )}
      </LinearGradient>
      <View style={s.featBody}>
        <ThemedText style={s.featTitle} numberOfLines={1}>{coupon.title}</ThemedText>
        <ThemedText style={s.featCode}>{coupon.couponCode}</ThemedText>
      </View>
    </Pressable>
  );

  // ═══════════════════════════════════════════════════════════════
  //  AVAILABLE COUPON CARD
  // ═══════════════════════════════════════════════════════════════
  const renderAvailableCard = (coupon: Coupon) => {
    const dl = daysLeft(coupon.validTo);
    const expiring = dl <= 3 && dl > 0;
    const claiming = claimingId === coupon._id;
    const names = getApplicableNames(coupon);
    const all = isAllStores(coupon);

    return (
      <Pressable
        key={coupon._id}
        style={s.card}
        onPress={() => handleViewDetails(coupon)}
       
      >
        {/* ── Discount banner ──────────────────────── */}
        <LinearGradient
          colors={C.discountGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.cardBanner}
        >
          <View style={s.cardBannerLeft}>
            <ThemedText style={s.cardBannerDiscount}>
              {coupon.discountType === 'PERCENTAGE'
                ? `${coupon.discountValue}% OFF`
                : `${currencySymbol}${coupon.discountValue} OFF`}
            </ThemedText>
            {coupon.maxDiscountCap > 0 && coupon.discountType === 'PERCENTAGE' && (
              <ThemedText style={s.cardBannerCap}>
                Save up to {currencySymbol}{coupon.maxDiscountCap}
              </ThemedText>
            )}
          </View>
          <View style={s.cardBannerBadges}>
            {coupon.isFeatured && (
              <View style={s.badgeFeatured}>
                <Ionicons name="star" size={10} color="#FFB23F" />
              </View>
            )}
            {coupon.isNewlyAdded && (
              <View style={s.badgeNew}><ThemedText style={s.badgeNewText}>NEW</ThemedText></View>
            )}
          </View>
        </LinearGradient>

        {/* ── Card body ────────────────────────────── */}
        <View style={s.cardBody}>
          {/* Title + code */}
          <ThemedText style={s.cardTitle} numberOfLines={1}>{coupon.title}</ThemedText>
          <ThemedText style={s.cardDesc} numberOfLines={2}>{coupon.description}</ThemedText>

          {/* Code pill + badges row */}
          <View style={s.cardChipRow}>
            <View style={s.codePill}>
              <ThemedText style={s.codeText}>{coupon.couponCode}</ThemedText>
            </View>
            {coupon.autoApply && (
              <View style={s.autoApplyChip}>
                <Ionicons name="flash" size={10} color={C.accent} />
                <ThemedText style={s.autoApplyText}>Auto-apply</ThemedText>
              </View>
            )}
            {expiring && (
              <View style={s.urgentChip}>
                <ThemedText style={s.urgentText}>{dl}d left</ThemedText>
              </View>
            )}
          </View>

          {/* Applicable info */}
          <View style={s.infoRow}>
            {all ? (
              <View style={s.infoItem}>
                <Ionicons name="globe-outline" size={13} color={C.textMuted} />
                <ThemedText style={s.infoText}>All stores</ThemedText>
              </View>
            ) : (
              <View style={s.infoItem}>
                <Ionicons name="storefront-outline" size={13} color={C.textMuted} />
                {getApplicableStores(coupon).map((store, idx) => (
                  <Pressable
                    key={store._id}
                    onPress={(e) => { e.stopPropagation(); router.push(`/MainStorePage?storeId=${store._id}` as any); }}
                  >
                    <ThemedText style={s.storeLink} numberOfLines={1}>
                      {idx > 0 ? ' \u2022 ' : ''}{store.name}
                    </ThemedText>
                  </Pressable>
                ))}
                {getApplicableStores(coupon).length === 0 && names.length > 0 && (
                  <ThemedText style={s.infoText} numberOfLines={1}>{names.join(' \u2022 ')}</ThemedText>
                )}
              </View>
            )}
            {coupon.claimCount > 0 && (
              <View style={s.infoItem}>
                <Ionicons name="people-outline" size={13} color={C.textMuted} />
                <ThemedText style={s.infoText}>{fmtCount(coupon.claimCount)} claimed</ThemedText>
              </View>
            )}
          </View>

          {/* Dashed line */}
          <View style={s.dashed} />

          {/* Footer */}
          <View style={s.cardFooter}>
            <View style={{ flex: 1 }}>
              {coupon.minOrderValue > 0 && (
                <ThemedText style={s.footerMeta}>Min {currencySymbol}{coupon.minOrderValue}</ThemedText>
              )}
              <ThemedText style={s.footerDate}>Valid till {fmtDate(coupon.validTo)}</ThemedText>
            </View>
            <Pressable
              style={[s.claimBtn, claiming && { opacity: 0.5 }]}
              onPress={() => handleClaimCoupon(coupon._id)}
              disabled={claiming}
            >
              {claiming ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <LinearGradient colors={C.discountGradient} style={s.claimBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <ThemedText style={s.claimBtnText}>Claim</ThemedText>
                  <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  MY COUPON CARD
  // ═══════════════════════════════════════════════════════════════
  const renderUserCard = (uc: UserCoupon) => {
    const coupon = uc.coupon;
    if (!coupon) return null;
    const isExp = uc.status === 'expired';
    const isUsed = uc.status === 'used';
    const dim = isExp || isUsed;
    const dl = daysLeft(uc.expiryDate);
    const expiring = !dim && dl <= 3 && dl > 0;
    const names = getApplicableNames(coupon);
    const all = isAllStores(coupon);

    return (
      <Pressable
        key={uc._id}
        style={[s.card, dim && s.cardDim]}
        onPress={() => handleViewDetails(coupon, uc)}
       
      >
        {/* Banner */}
        <LinearGradient
          colors={dim ? C.discountGradientDimmed : C.discountGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.cardBanner}
        >
          <ThemedText style={s.cardBannerDiscount}>
            {coupon.discountType === 'PERCENTAGE'
              ? `${coupon.discountValue}% OFF`
              : `${currencySymbol}${coupon.discountValue} OFF`}
          </ThemedText>
          <View style={[s.statusPill,
            isUsed ? s.statusUsed : isExp ? s.statusExpired : s.statusActive]}>
            <ThemedText style={s.statusPillText}>
              {isUsed ? 'USED' : isExp ? 'EXPIRED' : 'ACTIVE'}
            </ThemedText>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={s.cardBody}>
          <ThemedText style={s.cardTitle} numberOfLines={1}>{coupon.title}</ThemedText>

          <View style={s.cardChipRow}>
            <View style={s.codePill}>
              <ThemedText style={s.codeText}>{coupon.couponCode}</ThemedText>
            </View>
            {expiring && (
              <View style={s.urgentChip}>
                <ThemedText style={s.urgentText}>{dl}d left</ThemedText>
              </View>
            )}
          </View>

          <View style={s.infoRow}>
            {all ? (
              <View style={s.infoItem}>
                <Ionicons name="globe-outline" size={13} color={C.textMuted} />
                <ThemedText style={s.infoText}>All stores</ThemedText>
              </View>
            ) : (
              <View style={s.infoItem}>
                <Ionicons name="storefront-outline" size={13} color={C.textMuted} />
                {getApplicableStores(coupon).map((store, idx) => (
                  <Pressable
                    key={store._id}
                    onPress={(e) => { e.stopPropagation(); router.push(`/MainStorePage?storeId=${store._id}` as any); }}
                  >
                    <ThemedText style={s.storeLink} numberOfLines={1}>
                      {idx > 0 ? ' \u2022 ' : ''}{store.name}
                    </ThemedText>
                  </Pressable>
                ))}
                {getApplicableStores(coupon).length === 0 && names.length > 0 && (
                  <ThemedText style={s.infoText} numberOfLines={1}>{names.join(' \u2022 ')}</ThemedText>
                )}
              </View>
            )}
          </View>

          <View style={s.dashed} />

          <View style={s.cardFooter}>
            <ThemedText style={s.footerDate}>
              {isUsed
                ? `Used ${uc.usedDate ? fmtDate(uc.usedDate) : ''}`
                : `Expires ${fmtDate(uc.expiryDate)}`}
            </ThemedText>
            {!dim && (
              <View style={s.myActions}>
                <Pressable style={s.useNowBtn} onPress={() => handleUseCoupon(coupon)}>
                  <ThemedText style={s.useNowText}>Use Now</ThemedText>
                </Pressable>
                <Pressable style={s.trashBtn} onPress={() => handleRemoveCoupon(uc._id)}>
                  <Ionicons name="trash-outline" size={15} color={C.danger} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  DETAIL MODAL
  // ═══════════════════════════════════════════════════════════════
  const renderDetailModal = () => {
    if (!selectedCoupon) return null;
    const coupon = selectedCoupon;
    const uc = selectedUserCoupon;
    const claimed = !!uc;
    const names = getApplicableNames(coupon);
    const all = isAllStores(coupon);

    return (
      <Modal visible={showDetailsModal} animationType="slide" transparent onRequestClose={() => setShowDetailsModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.handleBar} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {/* Hero */}
              <LinearGradient colors={C.discountGradient} style={s.modalHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <ThemedText style={s.modalHeroDiscount}>
                  {coupon.discountType === 'PERCENTAGE'
                    ? `${coupon.discountValue}% OFF`
                    : `${currencySymbol}${coupon.discountValue} OFF`}
                </ThemedText>
                {coupon.maxDiscountCap > 0 && coupon.discountType === 'PERCENTAGE' && (
                  <ThemedText style={s.modalHeroCap}>Save up to {currencySymbol}{coupon.maxDiscountCap}</ThemedText>
                )}
                {coupon.claimCount > 0 && (
                  <View style={s.modalHeroSocial}>
                    <Ionicons name="people" size={12} color="rgba(255,255,255,0.8)" />
                    <ThemedText style={s.modalHeroSocialText}>{fmtCount(coupon.claimCount)} people claimed</ThemedText>
                  </View>
                )}
              </LinearGradient>

              <View style={s.modalBody}>
                <ThemedText style={s.modalTitle}>{coupon.title}</ThemedText>
                <ThemedText style={s.modalDesc}>{coupon.description}</ThemedText>

                {/* Copy code */}
                <Pressable style={s.copyRow} onPress={() => handleCopyCode(coupon.couponCode)}>
                  <View style={s.copyPill}>
                    <ThemedText style={s.copyPillText}>{coupon.couponCode}</ThemedText>
                  </View>
                  <View style={s.copyAction}>
                    <Ionicons name="copy-outline" size={14} color={C.accent} />
                    <ThemedText style={s.copyActionText}>Copy</ThemedText>
                  </View>
                </Pressable>

                {/* Details */}
                <View style={s.detailGrid}>
                  {coupon.minOrderValue > 0 && (
                    <View style={s.detailChip}>
                      <Ionicons name="cart-outline" size={14} color={C.textSecondary} />
                      <ThemedText style={s.detailChipLabel}>Min Order</ThemedText>
                      <ThemedText style={s.detailChipVal}>{currencySymbol}{coupon.minOrderValue}</ThemedText>
                    </View>
                  )}
                  <View style={s.detailChip}>
                    <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                    <ThemedText style={s.detailChipLabel}>Valid Till</ThemedText>
                    <ThemedText style={s.detailChipVal}>{fmtDate(coupon.validTo)}</ThemedText>
                  </View>
                  {coupon.usageLimit?.perUser > 0 && (
                    <View style={s.detailChip}>
                      <Ionicons name="person-outline" size={14} color={C.textSecondary} />
                      <ThemedText style={s.detailChipLabel}>Per User</ThemedText>
                      <ThemedText style={s.detailChipVal}>{coupon.usageLimit.perUser}x</ThemedText>
                    </View>
                  )}
                </View>

                {/* Applicable at */}
                <View style={s.section}>
                  <ThemedText style={s.sectionTitle}>Applicable At</ThemedText>
                  {all ? (
                    <View style={s.allStoresBanner}>
                      <Ionicons name="globe-outline" size={15} color={C.accent} />
                      <ThemedText style={s.allStoresText}>Valid on all stores & categories on Nquta</ThemedText>
                    </View>
                  ) : (
                    <View style={s.chipWrap}>
                      {coupon.applicableTo?.stores?.map((st, i) => {
                        const n = getRefName(st);
                        const storeId = typeof st === 'object' ? st._id : null;
                        return n ? (
                          <Pressable
                            key={`s${i}`}
                            style={s.applicableChip}
                            onPress={() => {
                              if (storeId) {
                                setShowDetailsModal(false);
                                router.push(`/MainStorePage?storeId=${storeId}` as any);
                              }
                            }}
                           
                          >
                            <Ionicons name="storefront-outline" size={12} color={C.accent} />
                            <ThemedText style={s.applicableChipText}>{n}</ThemedText>
                            {storeId && <Ionicons name="chevron-forward" size={12} color={C.accent} />}
                          </Pressable>
                        ) : null;
                      })}
                      {coupon.applicableTo?.categories?.map((ct, i) => {
                        const n = getRefName(ct);
                        return n ? (
                          <View key={`c${i}`} style={s.applicableChip}>
                            <Ionicons name="grid-outline" size={12} color={C.accent} />
                            <ThemedText style={s.applicableChipText}>{n}</ThemedText>
                          </View>
                        ) : null;
                      })}
                    </View>
                  )}
                </View>

                {/* How to use */}
                <View style={s.section}>
                  <ThemedText style={s.sectionTitle}>How to Use</ThemedText>
                  <View style={s.steps}>
                    <View style={s.step}>
                      <View style={[s.stepDot, { backgroundColor: '#FFF0E6' }]}>
                        <ThemedText style={[s.stepDotNum, { color: C.accent }]}>1</ThemedText>
                      </View>
                      <View style={s.stepBody}>
                        <ThemedText style={s.stepHead}>
                          {claimed ? 'Coupon Claimed' : 'Claim this Coupon'}
                        </ThemedText>
                        <ThemedText style={s.stepSub}>
                          {claimed ? 'Already in your collection' : 'Tap "Claim" to add it to My Coupons'}
                        </ThemedText>
                      </View>
                      {claimed && <Ionicons name="checkmark-circle" size={16} color={C.success} />}
                    </View>
                    <View style={s.step}>
                      <View style={[s.stepDot, { backgroundColor: '#E6F9F1' }]}>
                        <ThemedText style={[s.stepDotNum, { color: C.success }]}>2</ThemedText>
                      </View>
                      <View style={s.stepBody}>
                        <ThemedText style={s.stepHead}>
                          {all ? 'Shop on Nquta' : `Shop at ${names[0] || 'applicable stores'}`}
                        </ThemedText>
                        <ThemedText style={s.stepSub}>Add items to your cart</ThemedText>
                      </View>
                    </View>
                    <View style={s.step}>
                      <View style={[s.stepDot, { backgroundColor: '#FFF8E6' }]}>
                        <ThemedText style={[s.stepDotNum, { color: C.amber }]}>3</ThemedText>
                      </View>
                      <View style={s.stepBody}>
                        <ThemedText style={s.stepHead}>Apply at Checkout</ThemedText>
                        <ThemedText style={s.stepSub}>
                          Enter "{coupon.couponCode}"
                          {coupon.minOrderValue > 0 ? ` (min ${currencySymbol}${coupon.minOrderValue})` : ''}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Tags */}
                {coupon.tags && coupon.tags.length > 0 && (
                  <View style={s.section}>
                    <ThemedText style={s.sectionTitle}>Tags</ThemedText>
                    <View style={s.chipWrap}>
                      {coupon.tags.map((t, i) => (
                        <View key={i} style={s.tagChip}>
                          <ThemedText style={s.tagChipText}>{t}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Terms */}
                {coupon.termsAndConditions && coupon.termsAndConditions.length > 0 && (
                  <View style={s.section}>
                    <ThemedText style={s.sectionTitle}>Terms & Conditions</ThemedText>
                    {coupon.termsAndConditions.map((t, i) => (
                      <ThemedText key={i} style={s.termItem}>{'\u2022'} {t}</ThemedText>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom bar */}
            <View style={s.modalBar}>
              <Pressable style={s.modalShareBtn} onPress={() => handleShareCoupon(coupon)}>
                <Ionicons name="share-social-outline" size={20} color={C.accent} />
              </Pressable>
              {!claimed ? (
                <Pressable
                  style={[s.modalMainBtn, claimingId === coupon._id && { opacity: 0.5 }]}
                  onPress={() => handleClaimCoupon(coupon._id)}
                  disabled={claimingId === coupon._id}
                >
                  <LinearGradient colors={C.discountGradient} style={s.modalMainBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {claimingId === coupon._id
                      ? <ActivityIndicator size="small" color={colors.background.primary} />
                      : <>
                          <Ionicons name="gift-outline" size={16} color={colors.background.primary} />
                          <ThemedText style={s.modalMainBtnText}>Claim Coupon</ThemedText>
                        </>
                    }
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable style={s.modalMainBtn} onPress={() => handleUseCoupon(coupon)}>
                  <LinearGradient colors={[C.success, '#00A87D']} style={s.modalMainBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <ThemedText style={s.modalMainBtnText}>Use Now</ThemedText>
                    <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  EMPTY STATES
  // ═══════════════════════════════════════════════════════════════
  const renderEmpty = () => {
    const cfg: Record<CouponTab, { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; btn?: string; onBtn?: () => void }> = {
      available: { icon: 'ticket-outline', title: 'No Coupons Available', desc: 'Check back later for exciting deals!', btn: 'Browse Stores', onBtn: () => router.push('/explore') },
      'my-coupons': { icon: 'gift-outline', title: 'No Coupons Yet', desc: 'Claim coupons from the Available tab to start saving!', btn: 'View Available', onBtn: () => setActiveTab('available') },
      expired: { icon: 'time-outline', title: 'No Expired Coupons', desc: 'Your expired coupons will appear here.' },
    };
    const c = cfg[activeTab];
    return (
      <View style={s.empty}>
        <View style={s.emptyCircle}><Ionicons name={c.icon} size={44} color={C.textMuted} /></View>
        <ThemedText style={s.emptyTitle}>{c.title}</ThemedText>
        <ThemedText style={s.emptyDesc}>{c.desc}</ThemedText>
        {c.btn && c.onBtn && (
          <Pressable onPress={c.onBtn}>
            <LinearGradient colors={C.discountGradient} style={s.emptyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <ThemedText style={s.emptyBtnText}>{c.btn}</ThemedText>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  FLATLIST HELPERS
  // ═══════════════════════════════════════════════════════════════
  const flatListData = loading ? [] : (activeTab === 'available' ? filteredCoupons : myCoupons);

  const flatListKeyExtractor = useCallback((item: Coupon | UserCoupon) => {
    return (item as any)._id || (item as any).couponId || '';
  }, []);

  const flatListRenderItem = useCallback(({ item }: { item: Coupon | UserCoupon }) => {
    if (activeTab === 'available') {
      return renderAvailableCard(item as Coupon);
    }
    return renderUserCard(item as UserCoupon);
  }, [activeTab]);

  // ═══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  if (error && !loading) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ErrorState error={error} onRetry={() => loadData()} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.headerDark} translucent />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <LinearGradient colors={[C.headerDark, C.headerMid]} style={s.header}>
        <View style={s.headerRow}>
          <Pressable onPress={handleBack} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={s.headerTitle}>Coupons</ThemedText>
          <Pressable onPress={handleRefresh} style={s.headerBtn}>
            <Ionicons name="refresh" size={20} color={colors.background.primary} />
          </Pressable>
        </View>

        {/* Summary in My Coupons */}
        {activeTab === 'my-coupons' && (
          <View style={s.summaryRow}>
            {[
              { n: couponSummary.available, l: 'Active', color: C.success },
              { n: couponSummary.used, l: 'Used', color: C.textMuted },
              { n: couponSummary.expired, l: 'Expired', color: C.danger },
            ].map((item, idx) => (
              <React.Fragment key={item.l}>
                {idx > 0 && <View style={s.summaryDiv} />}
                <View style={s.summaryItem}>
                  <ThemedText style={[s.summaryNum, { color: item.color }]}>{item.n}</ThemedText>
                  <ThemedText style={s.summaryLabel}>{item.l}</ThemedText>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={s.tabs}>
          {([
            { key: 'available' as CouponTab, label: 'Available', count: availableCount },
            { key: 'my-coupons' as CouponTab, label: 'My Coupons', count: myCount },
            { key: 'expired' as CouponTab, label: 'Expired', count: expiredCount },
          ]).map(t => (
            <Pressable
              key={t.key}
              style={[s.tab, activeTab === t.key && s.tabActive]}
              onPress={() => { setActiveTab(t.key); clearSearch(); setActiveFilter(null); }}
            >
              <ThemedText style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}>
                {t.label}
                {t.count > 0 ? ` (${t.count})` : ''}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* ── CONTENT ────────────────────────────────────────────── */}
      <FlashList
        data={flatListData}
        keyExtractor={flatListKeyExtractor}
        renderItem={flatListRenderItem}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        estimatedItemSize={120}
        ListHeaderComponent={
          <>
            {loading && <CardGridSkeleton />}
            {!loading && activeTab === 'available' && (
              <>
                {/* Enter code */}
                <View style={s.searchBox}>
                  <Ionicons name="ticket-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Have a coupon code?"
                    placeholderTextColor={C.textMuted}
                    value={codeInput}
                    onChangeText={setCodeInput}
                    onSubmitEditing={handleSearchCode}
                    autoCapitalize="characters"
                    returnKeyType="search"
                  />
                  {codeInput ? (
                    <Pressable onPress={clearSearch} style={s.searchClear}>
                      <Ionicons name="close-circle" size={18} color={C.textMuted} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[s.searchBtn, !codeInput.trim() && { opacity: 0.4 }]}
                    onPress={handleSearchCode}
                    disabled={!codeInput.trim()}
                  >
                    {searching
                      ? <ActivityIndicator size="small" color={colors.background.primary} />
                      : <ThemedText style={s.searchBtnText}>Apply</ThemedText>
                    }
                  </Pressable>
                </View>

                {/* Search results */}
                {searchResults !== null && (
                  <View style={s.searchResultsBanner}>
                    <ThemedText style={s.searchResultsText}>
                      {searchResults.length > 0
                        ? `Found ${searchResults.length} coupon${searchResults.length > 1 ? 's' : ''}`
                        : 'No coupons found for this code'}
                    </ThemedText>
                    <Pressable onPress={clearSearch}>
                      <ThemedText style={s.searchClearText}>Clear</ThemedText>
                    </Pressable>
                  </View>
                )}

                {/* Tag filters */}
                {allTags.length > 0 && !searchResults && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
                    <Pressable
                      style={[s.filterChip, !activeFilter && s.filterChipActive]}
                      onPress={() => setActiveFilter(null)}
                    >
                      <ThemedText style={[s.filterChipText, !activeFilter && s.filterChipTextActive]}>All</ThemedText>
                    </Pressable>
                    {allTags.map(tag => (
                      <Pressable
                        key={tag}
                        style={[s.filterChip, activeFilter === tag && s.filterChipActive]}
                        onPress={() => setActiveFilter(activeFilter === tag ? null : tag)}
                      >
                        <ThemedText style={[s.filterChipText, activeFilter === tag && s.filterChipTextActive]}>
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {/* Featured section */}
                {featuredCoupons.length > 0 && !searchResults && !activeFilter && (
                  <View style={s.featSection}>
                    <ThemedText style={s.featSectionTitle}>
                      <Ionicons name="flash" size={15} color={C.amber} /> Top Picks
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featScroll}>
                      {featuredCoupons.map(c => renderFeaturedCard(c))}
                    </ScrollView>
                  </View>
                )}

                {/* All available */}
                {!searchResults && !activeFilter && filteredCoupons.length > 0 && (
                  <ThemedText style={s.listTitle}>All Coupons</ThemedText>
                )}
                {activeFilter && filteredCoupons.length > 0 && (
                  <ThemedText style={s.listTitle}>
                    {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Coupons
                  </ThemedText>
                )}
              </>
            )}
          </>
        }
        ListEmptyComponent={!loading ? renderEmpty() : null}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
      />

      {renderDetailModal()}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
//  STYLES
// ═════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 40) + Spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: 14 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { flex: 1, ...Typography.h4, color: Colors.text.inverse, textAlign: 'center' },

  // Summary
  summaryRow: { flexDirection: 'row', marginHorizontal: Spacing.base, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.sm + 2, paddingVertical: 10 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: Typography.h4.fontSize, fontWeight: '800' },
  summaryLabel: { ...Typography.overline, color: 'rgba(255,255,255,0.6)', marginTop: 2, letterSpacing: Typography.overline.letterSpacing },
  summaryDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },

  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.accent },
  tabLabel: { ...Typography.bodySmall, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: Colors.text.inverse, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, paddingBottom: 100 },
  loader: { paddingVertical: Spacing['5xl'], alignItems: 'center' },

  // Search box
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.md,
    ...Platform.select({ ios: Shadows.subtle, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } }),
  },
  searchInput: { flex: 1, ...Typography.body, color: C.textPrimary, paddingVertical: 10, marginLeft: Spacing.sm, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  searchClear: { padding: Spacing.xs, marginRight: Spacing.xs },
  searchBtn: { backgroundColor: C.accent, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  searchBtnText: { fontSize: Typography.bodySmall.fontSize + 1, fontWeight: '700', color: Colors.text.inverse },

  // Search results banner
  searchResultsBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: Spacing.xs },
  searchResultsText: { fontSize: Typography.bodySmall.fontSize + 1, color: C.textSecondary },
  searchClearText: { fontSize: Typography.bodySmall.fontSize + 1, fontWeight: '600', color: C.accent },

  // Filter chips
  filterScroll: { height: 44, marginBottom: Spacing.base },
  filterRow: { gap: Spacing.sm, alignItems: 'center' as const },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.headerDark, borderColor: C.headerDark },
  filterChipText: { ...Typography.bodySmall, fontWeight: '500', color: C.textSecondary },
  filterChipTextActive: { color: Colors.text.inverse },

  // Featured section
  featSection: { marginBottom: Spacing.lg },
  featSectionTitle: { ...Typography.bodyLarge, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
  featScroll: { gap: Spacing.md, paddingRight: Spacing.base },
  featCard: { width: 150, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: C.card,
    ...Platform.select({ ios: Shadows.md, android: { elevation: 3 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } }),
  },
  featGradient: { padding: 14, alignItems: 'center' },
  featDiscount: { fontSize: Typography.h1.fontSize, fontWeight: '900', color: Colors.text.inverse },
  featOff: { ...Typography.bodySmall, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: -2 },
  featCap: { ...Typography.overline, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
  featBody: { padding: 10 },
  featTitle: { ...Typography.bodySmall, fontWeight: '600', color: C.textPrimary, marginBottom: Spacing.xs },
  featCode: { ...Typography.caption, fontWeight: '700', color: C.accent, letterSpacing: 1 },

  // Section title
  listTitle: { ...Typography.bodyLarge, fontWeight: '700', color: C.textPrimary, marginBottom: Spacing.md },

  // ── Card ────────────────────────────────────────────────────
  card: { backgroundColor: C.card, borderRadius: 14, marginBottom: 14, overflow: 'hidden',
    ...Platform.select({ ios: { ...Shadows.sm, shadowOpacity: 0.08, shadowRadius: 6 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } }),
  },
  cardDim: { opacity: 0.55 },
  cardBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 14 },
  cardBannerLeft: {},
  cardBannerDiscount: { fontSize: 22, fontWeight: '900', color: Colors.text.inverse },
  cardBannerCap: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  cardBannerBadges: { flexDirection: 'row', gap: 6 },
  badgeFeatured: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  badgeNew: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.xs + 2 },
  badgeNewText: { fontSize: 9, fontWeight: '800', color: Colors.text.inverse, letterSpacing: 1 },

  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  cardDesc: { ...Typography.bodySmall, color: C.textSecondary, lineHeight: 18, marginBottom: 10 },

  cardChipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 10, flexWrap: 'wrap' },
  codePill: { backgroundColor: '#FFF5EE', paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: 6, borderWidth: 1, borderColor: '#FFE0CC', borderStyle: 'dashed' },
  codeText: { ...Typography.caption, fontWeight: '800', color: C.accent, letterSpacing: 1.5 },
  autoApplyChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF5EE', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.xs + 2 },
  autoApplyText: { ...Typography.overline, fontWeight: '600', color: C.accent, letterSpacing: 0 },
  urgentChip: { backgroundColor: '#FFF0F0', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.xs + 2 },
  urgentText: { ...Typography.overline, fontWeight: '700', color: C.danger, letterSpacing: 0 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 1 },
  infoText: { ...Typography.caption, color: C.textMuted },
  storeLink: { ...Typography.caption, color: C.accent, fontWeight: '600', textDecorationLine: 'underline' },

  dashed: { height: 1, borderTopWidth: 1, borderTopColor: '#F0F0F0', borderStyle: 'dashed', marginBottom: 10 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerMeta: { ...Typography.caption, color: C.textMuted, marginBottom: 1 },
  footerDate: { ...Typography.caption, color: C.textMuted },

  claimBtn: { borderRadius: BorderRadius.sm, overflow: 'hidden' },
  claimBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 9, gap: Spacing.xs },
  claimBtnText: { fontSize: Typography.bodySmall.fontSize + 1, fontWeight: '700', color: Colors.text.inverse },

  // My coupon actions
  myActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  useNowBtn: { backgroundColor: C.success, paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  useNowText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },
  trashBtn: { width: 30, height: 30, borderRadius: BorderRadius.sm, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },

  // Status pill
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.xs + 2 },
  statusActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  statusUsed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  statusExpired: { backgroundColor: 'rgba(255,255,255,0.2)' },
  statusPillText: { ...Typography.overline, fontWeight: '700', color: Colors.text.inverse, letterSpacing: 0.5 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing['5xl'] },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EEEEF2', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: Typography.bodySmall.fontSize + 1, color: C.textMuted, textAlign: 'center', paddingHorizontal: Spacing['3xl'] + Spacing.sm, lineHeight: Typography.body.lineHeight, marginBottom: Spacing.lg },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 11, borderRadius: BorderRadius.sm + 2 },
  emptyBtnText: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },

  // ═══ MODAL ═══════════════════════════════════════════════════
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.background.primary, borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], maxHeight: '90%', minHeight: '50%' },
  handleBar: { width: 36, height: 4, borderRadius: BorderRadius.xs, backgroundColor: colors.neutral[300], alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.xs },

  modalHero: { marginHorizontal: Spacing.base, marginTop: Spacing.sm, padding: Spacing.xl, borderRadius: 14, alignItems: 'center' },
  modalHeroDiscount: { fontSize: 34, fontWeight: '900', color: Colors.text.inverse },
  modalHeroCap: { fontSize: Typography.bodySmall.fontSize + 1, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs },
  modalHeroSocial: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  modalHeroSocialText: { ...Typography.caption, color: 'rgba(255,255,255,0.85)' },

  modalBody: { padding: Spacing.base },
  modalTitle: { ...Typography.h4, color: C.textPrimary, marginBottom: Spacing.xs },
  modalDesc: { ...Typography.body, color: C.textSecondary, lineHeight: 22, marginBottom: Spacing.base },

  copyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F3', borderRadius: BorderRadius.sm + 2, borderWidth: 1, borderColor: '#FFE0CC', borderStyle: 'dashed', padding: Spacing.md, marginBottom: Spacing.base, gap: Spacing.md },
  copyPill: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.base, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#FFD4B8' },
  copyPillText: { ...Typography.bodyLarge, fontWeight: '800', color: C.accent, letterSpacing: 2 },
  copyAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  copyActionText: { fontSize: Typography.bodySmall.fontSize + 1, fontWeight: '600', color: C.accent },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8F8FC', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  detailChipLabel: { ...Typography.caption, color: C.textMuted },
  detailChipVal: { ...Typography.bodySmall, fontWeight: '700', color: C.textPrimary, marginLeft: 2 },

  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },

  allStoresBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F3', borderRadius: BorderRadius.sm, padding: Spacing.md, gap: Spacing.sm },
  allStoresText: { flex: 1, fontSize: Typography.bodySmall.fontSize + 1, color: C.accentDark },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  applicableChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm, gap: 5 },
  applicableChipText: { ...Typography.bodySmall, fontWeight: '500', color: C.accentDark },

  steps: { gap: 0 },
  step: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderLeftWidth: 2, borderLeftColor: '#F0F0F0', marginLeft: 13, paddingLeft: Spacing.base },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', position: 'absolute', left: -28 },
  stepDotNum: { ...Typography.bodySmall, fontWeight: '800' },
  stepBody: { flex: 1 },
  stepHead: { fontSize: Typography.bodySmall.fontSize + 1, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
  stepSub: { ...Typography.bodySmall, color: C.textSecondary, lineHeight: 18 },

  tagChip: { backgroundColor: '#F3F3F8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.md },
  tagChipText: { ...Typography.bodySmall, color: C.textSecondary },

  termItem: { ...Typography.bodySmall, color: C.textSecondary, lineHeight: Typography.body.lineHeight, marginBottom: Spacing.xs, paddingLeft: Spacing.xs },

  modalBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.base, borderTopWidth: 1, borderTopColor: '#F3F3F8', gap: Spacing.md, backgroundColor: Colors.background.primary },
  modalShareBtn: { width: 44, height: 44, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#FFE0CC', alignItems: 'center', justifyContent: 'center' },
  modalMainBtn: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  modalMainBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  modalMainBtnText: { fontSize: 15, fontWeight: '700', color: Colors.text.inverse },
});

export default withErrorBoundary(CouponsPage, 'Coupons');
