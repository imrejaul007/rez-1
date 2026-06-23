// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * First Time User Zone Page - Production Ready
 * Fetches real data from backend API
 */

import React, { useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import realOffersApi from '@/services/realOffersApi';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZONE_SLUG = 'first-time';

interface ZoneOffer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  cashbackPercentage?: number;
  type: string;
  category?: string;
  store?: {
    name: string;
    logo?: string;
  };
}

interface ZoneInfo {
  name: string;
  description: string;
  offersCount: number;
  verificationRequired: boolean;
  eligibilityDetails?: string;
  userEligible?: boolean;
}

function FirstTimeUserZonePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ZoneOffer[]>([]);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shimmerAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));
  const bottomPadding = 80 + 70 + insets.bottom;

  // Check if user is a first-time user (no orders)
  const isFirstTimeUser = !user?.profile?.ordersCount || user.profile.ordersCount === 0;
  const isEligible = isFirstTimeUser || zoneInfo?.userEligible === true;

  useEffect(() => {
    fetchZoneData();
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    );

    return () => {
      shimmerAnim.value = 0;
      pulseAnim.value = 1;
    };
  }, []);

  const fetchZoneData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [zonesResponse, offersResponse] = await Promise.all([
        realOffersApi.getExclusiveZones(),
        realOffersApi.getExclusiveZoneOffers(ZONE_SLUG),
      ]);

      if (zonesResponse.success && zonesResponse.data) {
        const zone = zonesResponse.data.find((z: any) => z.slug === ZONE_SLUG);
        if (zone) {
          if (!isMounted()) return;
          setZoneInfo({
            name: zone.name,
            description: zone.description,
            offersCount: zone.offersCount || 0,
            verificationRequired: zone.verificationRequired,
            eligibilityDetails: zone.eligibilityDetails,
            userEligible: zone.userEligible });
        }
      }

      if (offersResponse.success && offersResponse.data) {
        const offersData = offersResponse.data.offers || offersResponse.data;
        if (!isMounted()) return;
        setOffers(Array.isArray(offersData) ? offersData : []);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load offers. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleDealPress = (offer: ZoneOffer) => {
    router.push(`/offers/${offer._id}` as any);
  };

  const renderSkeletonCard = () => (
    <View style={styles.dealCard}>
      <Animated.View
        style={[styles.skeletonImage, shimmerOpacityStyle]}
      />
      <View style={styles.dealContent}>
        <View style={[styles.skeletonText, { width: '40%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '80%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '60%' }]} />
      </View>
    </View>
  );

  const renderDealCard = (deal: ZoneOffer) => (
    <Pressable
      key={deal._id}
      style={styles.dealCard}
      onPress={() => handleDealPress(deal)}
     
    >
      {deal.image && (
        <CachedImage source={deal.image} style={styles.dealImage} contentFit="cover" />
      )}
      <View style={styles.dealContent}>
        <View style={styles.dealHeader}>
          <View style={styles.dealInfo}>
            <ThemedText style={styles.dealStore}>{deal.store?.name || 'Store'}</ThemedText>
            <ThemedText style={styles.dealTitle}>{deal.title}</ThemedText>
          </View>
          {deal.cashbackPercentage && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{deal.cashbackPercentage}%</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.dealDescription} numberOfLines={2}>
          {deal.description || deal.subtitle || 'Welcome offer for new users'}
        </ThemedText>
        <View style={styles.dealTags}>
          <View style={styles.tag}>
            <ThemedText style={styles.tagText}>New User</ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryButton} onPress={fetchZoneData}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.purpleLight} translucent />

      {/* Header */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple, colors.brand.purpleDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>
                {zoneInfo?.name || 'Welcome Offers'}
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>Exclusive deals for new users</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>🌟</ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(124, 58, 237, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <ThemedText style={styles.heroEmoji}>🎁</ThemedText>
              </View>
              <View style={styles.heroTextContainer}>
                <ThemedText style={styles.heroTitle}>Welcome to Rez!</ThemedText>
                <ThemedText style={styles.heroSubtitle}>
                  {zoneInfo?.description || 'Enjoy special offers on your first order'}
                </ThemedText>
              </View>
            </View>

            {/* Eligibility Status */}
            <View style={styles.eligibilityCard}>
              {isEligible ? (
                <View style={styles.eligibleStatus}>
                  <View style={styles.eligibleLeft}>
                    <Ionicons name="star" size={20} color={colors.brand.purpleLight} />
                    <ThemedText style={styles.eligibleText}>First order bonus unlocked!</ThemedText>
                  </View>
                  <View style={styles.activeBadge}>
                    <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.notEligibleStatus}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <ThemedText style={styles.notEligibleText}>You've already used your first order bonus!</ThemedText>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Welcome Perks */}
        <View style={styles.perksSection}>
          <ThemedText style={styles.sectionTitle}>New User Benefits</ThemedText>
          <View style={styles.perksGrid}>
            {[
              { icon: '💰', title: `Flat ${currencySymbol}100 Off`, desc: 'On first order' },
              { icon: '🚚', title: 'Free Delivery', desc: 'No minimum order' },
              { icon: '🎯', title: 'Double Points', desc: 'First 3 orders' },
              { icon: '🎁', title: 'Welcome Gift', desc: 'Surprise bonus' },
            ].map((perk, i) => (
              <View key={i} style={styles.perkCard}>
                <ThemedText style={styles.perkIcon}>{perk.icon}</ThemedText>
                <ThemedText style={styles.perkTitle}>{perk.title}</ThemedText>
                <ThemedText style={styles.perkDesc}>{perk.desc}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={styles.howItWorksSection}>
          <ThemedText style={styles.sectionTitle}>How It Works</ThemedText>
          <View style={styles.stepsContainer}>
            {[
              { step: '1', title: 'Browse Offers', desc: 'Choose from welcome deals' },
              { step: '2', title: 'Add to Cart', desc: 'Select your favorites' },
              { step: '3', title: 'Checkout', desc: 'Discount auto-applied' },
            ].map((item, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{item.step}</ThemedText>
                </View>
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.stepDesc}>{item.desc}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Deals List */}
        <View style={styles.dealsSection}>
          <ThemedText style={styles.sectionTitle}>Welcome Deals ({offers.length})</ThemedText>
          {loading ? (
            <>
              {renderSkeletonCard()}
              {renderSkeletonCard()}
              {renderSkeletonCard()}
            </>
          ) : offers.length > 0 ? (
            offers.map((deal) => renderDealCard(deal))
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyEmoji}>🌟</ThemedText>
              <ThemedText style={styles.emptyStateText}>No welcome offers available right now</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>Check back soon for exciting deals!</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      {isEligible && (
        <View style={styles.fixedCTA}>
          <Animated.View style={pulseStyle}>
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push('/offers' as any)}
             
            >
              <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                <Ionicons name="cart" size={20} color={colors.background.primary} />
                <ThemedText style={styles.ctaButtonText}>Start Shopping - Get {currencySymbol}100 Off</ThemedText>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  retryButton: { backgroundColor: colors.brand.purpleLight, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryButtonText: { ...Typography.button, color: colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 },
  safeHeader: { paddingBottom: Spacing.base },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { ...Typography.h3, color: colors.background.primary, fontWeight: '700' },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 },
  headerIcon: { width: 40, alignItems: 'center' },
  emoji: { fontSize: 32 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 150 },
  heroBanner: { margin: Spacing.base, borderRadius: BorderRadius['2xl'], overflow: 'hidden', ...Shadows.medium },
  heroGradient: { padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)', borderRadius: BorderRadius['2xl'] },
  heroContent: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.base },
  heroIconContainer: { width: 64, height: 64, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  heroEmoji: { fontSize: 32 },
  heroTextContainer: { flex: 1 },
  heroTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: 4 },
  heroSubtitle: { ...Typography.bodySmall, color: Colors.text.secondary },
  eligibilityCard: { marginTop: Spacing.base, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  eligibleStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eligibleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eligibleText: { ...Typography.label, color: colors.brand.purpleDeep },
  activeBadge: { backgroundColor: colors.brand.purpleLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  activeBadgeText: { ...Typography.caption, color: colors.background.primary, fontWeight: '600' },
  notEligibleStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notEligibleText: { ...Typography.body, color: Colors.success, flex: 1 },
  perksSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: Spacing.md },
  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  perkCard: { width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm) / 2, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center', ...Shadows.subtle },
  perkIcon: { fontSize: 28, marginBottom: Spacing.xs },
  perkTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  perkDesc: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'center' },
  howItWorksSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  stepsContainer: { gap: Spacing.sm },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, ...Shadows.subtle },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand.purpleLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  stepNumberText: { ...Typography.label, color: colors.background.primary, fontWeight: '700' },
  stepContent: { flex: 1 },
  stepTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600' },
  stepDesc: { ...Typography.caption, color: Colors.text.tertiary },
  dealsSection: { paddingHorizontal: Spacing.base },
  dealCard: { flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadows.subtle },
  dealImage: { width: 96, height: 96 },
  dealContent: { flex: 1, padding: Spacing.base },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  dealInfo: { flex: 1, marginRight: Spacing.sm },
  dealStore: { ...Typography.bodySmall, color: Colors.text.tertiary, marginBottom: 2 },
  dealTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600' },
  discountBadge: { backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  discountText: { ...Typography.labelSmall, color: colors.brand.purpleDeep, fontWeight: '700' },
  dealDescription: { ...Typography.bodySmall, color: Colors.text.secondary, marginBottom: Spacing.sm },
  dealTags: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tint.purple, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4 },
  tagText: { ...Typography.caption, color: colors.brand.purpleDeep },
  skeletonImage: { width: 96, height: 96, backgroundColor: Colors.gray[200] },
  skeletonText: { height: 12, borderRadius: 6, backgroundColor: Colors.gray[200] },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyStateText: { ...Typography.body, color: Colors.text.tertiary },
  emptyStateSubtext: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs },
  fixedCTA: { position: 'absolute', bottom: 70, left: 0, right: 0, padding: Spacing.base, backgroundColor: Colors.background.primary, borderTopWidth: 1, borderTopColor: Colors.border.light, ...Shadows.medium },
  ctaButton: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', paddingVertical: Spacing.base, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  ctaButtonText: { ...Typography.button, color: colors.background.primary, fontWeight: '600' } });

export default withErrorBoundary(FirstTimeUserZonePage, 'OffersZonesFirstTime');
