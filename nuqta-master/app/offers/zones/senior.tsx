// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Senior Citizens Zone Page - Production Ready
 * Fetches real data from backend API for 60+ citizens
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
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZONE_SLUG = 'senior';

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
  discountRange?: string;
}

function SeniorCitizenZonePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ZoneOffer[]>([]);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shimmerAnim = useSharedValue(0);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));
  const bottomPadding = 80 + 70 + insets.bottom;

  // Calculate age from DOB
  const calculateAge = (dob: string | Date): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const userAge = user?.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : 0;
  const isVerified = user?.verifications?.senior?.verified === true;
  const isEligible = userAge >= 60 || isVerified || zoneInfo?.userEligible === true;

  useEffect(() => {
    fetchZoneData();
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
    return () => { shimmerAnim.value = 0; };
  }, []);

  const fetchZoneData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try exclusive zones first, then special profiles
      const [zonesResponse, profilesResponse, offersResponse] = await Promise.all([
        realOffersApi.getExclusiveZones(),
        realOffersApi.getSpecialProfiles(),
        realOffersApi.getSpecialProfileOffers(ZONE_SLUG),
      ]);

      // Check exclusive zones
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

      // Check special profiles if not found in exclusive zones
      if (!zoneInfo && profilesResponse.success && profilesResponse.data) {
        const profile = profilesResponse.data.find((p: any) => p.slug === ZONE_SLUG);
        if (profile) {
          if (!isMounted()) return;
          setZoneInfo({
            name: profile.name,
            description: profile.description,
            offersCount: profile.offersCount || 0,
            verificationRequired: !!profile.verificationRequired,
            eligibilityDetails: profile.verificationRequired,
            userEligible: profile.userEligible,
            discountRange: profile.discountRange });
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

  const handleVerify = () => {
    router.push({
      pathname: '/profile/verification',
      params: { zone: 'senior' }
    } as any);
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
          {deal.description || deal.subtitle || 'Senior citizen exclusive offer'}
        </ThemedText>
        <View style={styles.dealTags}>
          <View style={styles.tag}>
            <ThemedText style={styles.tagText}>60+ Benefits</ThemedText>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.purple} translucent />

      {/* Header */}
      <LinearGradient
        colors={[colors.brand.purple, colors.brand.purpleDeep, '#5B21B6']}
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
                {zoneInfo?.name || 'Senior Citizens'}
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>Exclusive benefits for 60+</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>👴</ThemedText>
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
            colors={['rgba(124, 58, 237, 0.15)', 'rgba(109, 40, 217, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="heart" size={32} color={colors.brand.purple} />
              </View>
              <View style={styles.heroTextContainer}>
                <ThemedText style={styles.heroTitle}>Respect & Rewards</ThemedText>
                <ThemedText style={styles.heroSubtitle}>
                  {zoneInfo?.description || 'Special discounts for our respected senior citizens'}
                </ThemedText>
              </View>
            </View>

            {/* Verification Status */}
            <View style={styles.verificationCard}>
              {isEligible ? (
                <View style={styles.verifiedStatus}>
                  <View style={styles.verifiedLeft}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <ThemedText style={styles.verifiedText}>Senior Citizen Verified</ThemedText>
                  </View>
                  <View style={styles.activeBadge}>
                    <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.unverifiedStatus}>
                  <View style={styles.unverifiedLeft}>
                    <Ionicons name="alert-circle" size={20} color={colors.warningScale[400]} />
                    <ThemedText style={styles.unverifiedText}>Verify age (60+) to unlock deals</ThemedText>
                  </View>
                  <Pressable style={styles.verifyButton} onPress={handleVerify}>
                    <ThemedText style={styles.verifyButtonText}>Verify Now</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Senior Benefits */}
        <View style={styles.perksSection}>
          <ThemedText style={styles.sectionTitle}>Senior Benefits</ThemedText>
          <View style={styles.perksGrid}>
            {[
              { icon: '💰', title: 'Up to 25% Off', desc: 'On select items' },
              { icon: '🚚', title: 'Free Delivery', desc: 'No minimum order' },
              { icon: '📞', title: 'Helpline', desc: 'Dedicated support' },
              { icon: '↩️', title: 'Easy Returns', desc: 'Hassle-free process' },
            ].map((perk, i) => (
              <View key={i} style={styles.perkCard}>
                <ThemedText style={styles.perkIcon}>{perk.icon}</ThemedText>
                <ThemedText style={styles.perkTitle}>{perk.title}</ThemedText>
                <ThemedText style={styles.perkDesc}>{perk.desc}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Deals List */}
        <View style={styles.dealsSection}>
          <ThemedText style={styles.sectionTitle}>Available Deals ({offers.length})</ThemedText>
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
              <ThemedText style={styles.emptyEmoji}>👴</ThemedText>
              <ThemedText style={styles.emptyStateText}>No senior citizen offers available</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>Check back soon for special deals!</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      {!isEligible && (
        <View style={styles.fixedCTA}>
          <Pressable style={styles.ctaButton} onPress={handleVerify}>
            <LinearGradient colors={[colors.brand.purple, colors.brand.purpleDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
              <Ionicons name="shield-checkmark" size={20} color={colors.background.primary} />
              <ThemedText style={styles.ctaButtonText}>Verify Age to Unlock Benefits</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  retryButton: { backgroundColor: colors.brand.purple, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
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
  heroGradient: { padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.3)', borderRadius: BorderRadius['2xl'] },
  heroContent: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.base },
  heroIconContainer: { width: 64, height: 64, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(124, 58, 237, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  heroTextContainer: { flex: 1 },
  heroTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: 4 },
  heroSubtitle: { ...Typography.bodySmall, color: Colors.text.secondary },
  verificationCard: { marginTop: Spacing.base, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  verifiedStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  verifiedText: { ...Typography.label, color: Colors.success },
  activeBadge: { backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  activeBadgeText: { ...Typography.caption, color: colors.background.primary, fontWeight: '600' },
  unverifiedStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unverifiedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  unverifiedText: { ...Typography.body, color: colors.warningScale[400], flex: 1 },
  verifyButton: { backgroundColor: colors.brand.purple, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  verifyButtonText: { ...Typography.labelSmall, color: colors.background.primary, fontWeight: '600' },
  perksSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: Spacing.md },
  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  perkCard: { width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm) / 2, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center', ...Shadows.subtle },
  perkIcon: { fontSize: 28, marginBottom: Spacing.xs },
  perkTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  perkDesc: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'center' },
  dealsSection: { paddingHorizontal: Spacing.base },
  dealCard: { flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadows.subtle },
  dealImage: { width: 96, height: 96 },
  dealContent: { flex: 1, padding: Spacing.base },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  dealInfo: { flex: 1, marginRight: Spacing.sm },
  dealStore: { ...Typography.bodySmall, color: Colors.text.tertiary, marginBottom: 2 },
  dealTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600' },
  discountBadge: { backgroundColor: 'rgba(124, 58, 237, 0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
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

export default withErrorBoundary(SeniorCitizenZonePage, 'OffersZonesSenior');
