// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Corporate/Employee Zone Page - Production Ready
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
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZONE_SLUG = 'corporate';

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
  eligibilityRequirement?: string;
}

interface ZoneInfo {
  name: string;
  description: string;
  offersCount: number;
  verificationRequired: boolean;
  eligibilityDetails?: string;
  userEligible?: boolean;
}

const TIME_SLOTS = [
  { id: 'all', label: 'All Day', icon: '🕐' },
  { id: 'morning', label: 'Morning', icon: '🌅' },
  { id: 'lunch', label: 'Lunch', icon: '🍽️' },
  { id: 'evening', label: 'Evening', icon: '🌆' },
];

const QUICK_CATEGORIES = [
  { icon: 'cafe', label: 'Coffee', color: colors.warningScale[400] },
  { icon: 'restaurant', label: 'Lunch', color: colors.brand.orange },
  { icon: 'car', label: 'Commute', color: colors.infoScale[400] },
  { icon: 'barbell', label: 'Fitness', color: Colors.success },
];

function CorporateZonePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ZoneOffer[]>([]);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [selectedTime, setSelectedTime] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const shimmerAnim = useSharedValue(0);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));
  const bottomPadding = 80 + 70 + insets.bottom;

  const isVerified = user?.verifications?.corporate?.verified === true || zoneInfo?.userEligible === true;

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

      // Get offers - API returns { zone, offers }
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
      params: { zone: 'corporate' }
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
          {deal.description || deal.subtitle || 'Exclusive corporate offer'}
        </ThemedText>

        <View style={styles.dealTags}>
          <View style={styles.tag}>
            <ThemedText style={styles.tagText}>🏢 Corporate</ThemedText>
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
      <StatusBar barStyle="light-content" backgroundColor="#475569" translucent />

      {/* Header */}
      <LinearGradient
        colors={['#475569', '#334155', '#1E293B']}
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
                {zoneInfo?.name || 'Corporate Perks'}
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>Office hour specials & team deals</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>🏢</ThemedText>
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
            colors={['rgba(71, 85, 105, 0.3)', 'rgba(51, 65, 85, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="business" size={32} color="#94A3B8" />
              </View>
              <View style={styles.heroTextContainer}>
                <ThemedText style={styles.heroTitle}>Work Smarter, Save Better</ThemedText>
                <ThemedText style={styles.heroSubtitle}>
                  {zoneInfo?.description || 'Exclusive deals for working professionals'}
                </ThemedText>
              </View>
            </View>

            {/* Verification Status */}
            <View style={styles.verificationCard}>
              {isVerified ? (
                <View style={styles.verifiedStatus}>
                  <View style={styles.verifiedLeft}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <ThemedText style={styles.verifiedText}>Corporate Verified</ThemedText>
                  </View>
                  <View style={styles.activeBadge}>
                    <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.unverifiedStatus}>
                  <View style={styles.unverifiedLeft}>
                    <Ionicons name="alert-circle" size={20} color={colors.warningScale[400]} />
                    <ThemedText style={styles.unverifiedText}>Verify to unlock deals</ThemedText>
                  </View>
                  <Pressable style={styles.verifyButton} onPress={handleVerify}>
                    <ThemedText style={styles.verifyButtonText}>Verify Now</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Time-based Filter */}
        <View style={styles.timeFilterSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Deals by Time</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Find deals perfect for your schedule</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
            {TIME_SLOTS.map((slot) => (
              <Pressable
                key={slot.id}
                style={[styles.timeSlot, selectedTime === slot.id && styles.timeSlotActive]}
                onPress={() => setSelectedTime(slot.id)}
               
              >
                <ThemedText style={styles.timeSlotIcon}>{slot.icon}</ThemedText>
                <ThemedText style={[styles.timeSlotLabel, selectedTime === slot.id && styles.timeSlotLabelActive]}>
                  {slot.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Quick Access Categories */}
        <View style={styles.quickCategories}>
          {QUICK_CATEGORIES.map((cat, i) => (
            <Pressable
              key={i}
              style={[styles.quickCategory, { backgroundColor: `${cat.color}15` }]}
            >
              <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              <ThemedText style={styles.quickCategoryLabel}>{cat.label}</ThemedText>
            </Pressable>
          ))}
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
              <Ionicons name="briefcase-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyStateText}>No corporate offers available</ThemedText>
            </View>
          )}
        </View>

        {/* Team Orders Section */}
        <View style={styles.teamOrdersCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.teamOrdersGradient}
          >
            <ThemedText style={styles.teamOrdersIcon}>👥</ThemedText>
            <View style={styles.teamOrdersContent}>
              <ThemedText style={styles.teamOrdersTitle}>Team Orders</ThemedText>
              <ThemedText style={styles.teamOrdersSubtitle}>
                Order for your team & get extra discounts
              </ThemedText>
            </View>
            <Pressable style={styles.teamOrdersButton}>
              <ThemedText style={styles.teamOrdersButtonText}>Explore</ThemedText>
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      <View style={styles.fixedCTA}>
        <Pressable style={styles.ctaButton} onPress={isVerified ? () => {} : handleVerify}>
          <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
            <ThemedText style={styles.ctaButtonText}>
              {isVerified ? 'Browse All Corporate Deals' : 'Connect Work Email for More Deals'}
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  retryButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
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
  heroGradient: { padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(71, 85, 105, 0.2)', borderRadius: BorderRadius['2xl'] },
  heroContent: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.base },
  heroIconContainer: { width: 64, height: 64, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(148, 163, 184, 0.3)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  heroTextContainer: { flex: 1 },
  heroTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: 4 },
  heroSubtitle: { ...Typography.bodySmall, color: Colors.text.secondary },
  verificationCard: { marginTop: Spacing.base, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  verifiedStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  verifiedText: { ...Typography.label, color: Colors.success },
  activeBadge: { backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  activeBadgeText: { ...Typography.caption, color: colors.background.primary, fontWeight: '600' },
  unverifiedStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unverifiedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  unverifiedText: { ...Typography.body, color: colors.warningScale[400] },
  verifyButton: { backgroundColor: colors.warningScale[400], paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  verifyButtonText: { ...Typography.labelSmall, color: colors.background.primary, fontWeight: '600' },
  timeFilterSection: { marginBottom: Spacing.lg },
  sectionHeader: { paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600', marginBottom: 4 },
  sectionSubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
  timeScroll: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  timeSlot: { alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.gray[100], minWidth: 90 },
  timeSlotActive: { backgroundColor: 'rgba(71, 85, 105, 0.3)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.5)' },
  timeSlotIcon: { fontSize: 24, marginBottom: 4 },
  timeSlotLabel: { ...Typography.labelSmall, color: Colors.text.secondary },
  timeSlotLabelActive: { color: colors.background.primary },
  quickCategories: { flexDirection: 'row', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.lg },
  quickCategory: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.xs },
  quickCategoryLabel: { ...Typography.caption, color: Colors.text.secondary },
  dealsSection: { paddingHorizontal: Spacing.base },
  dealCard: { flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadows.subtle },
  dealImage: { width: 96, height: 96 },
  dealContent: { flex: 1, padding: Spacing.base },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  dealInfo: { flex: 1, marginRight: Spacing.sm },
  dealStore: { ...Typography.bodySmall, color: Colors.text.tertiary, marginBottom: 2 },
  dealTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600' },
  discountBadge: { backgroundColor: 'rgba(71, 85, 105, 0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  discountText: { ...Typography.labelSmall, color: '#94A3B8', fontWeight: '700' },
  dealDescription: { ...Typography.bodySmall, color: Colors.text.secondary, marginBottom: Spacing.sm },
  dealTags: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray[100], paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4 },
  tagText: { ...Typography.caption, color: Colors.text.secondary },
  skeletonImage: { width: 96, height: 96, backgroundColor: Colors.gray[200] },
  skeletonText: { height: 12, borderRadius: 6, backgroundColor: Colors.gray[200] },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyStateText: { ...Typography.body, color: Colors.text.tertiary, marginTop: Spacing.md },
  teamOrdersCard: { margin: Spacing.base, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.medium },
  teamOrdersGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', borderRadius: BorderRadius.lg, gap: Spacing.md },
  teamOrdersIcon: { fontSize: 32 },
  teamOrdersContent: { flex: 1 },
  teamOrdersTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  teamOrdersSubtitle: { ...Typography.bodySmall, color: Colors.text.secondary },
  teamOrdersButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  teamOrdersButtonText: { ...Typography.labelSmall, color: colors.background.primary, fontWeight: '600' },
  fixedCTA: { position: 'absolute', bottom: 70, left: 0, right: 0, padding: Spacing.base, backgroundColor: Colors.background.primary, borderTopWidth: 1, borderTopColor: Colors.border.light, ...Shadows.medium },
  ctaButton: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: Spacing.base, alignItems: 'center', justifyContent: 'center' },
  ctaButtonText: { ...Typography.button, color: colors.background.primary, fontWeight: '600' } });

export default withErrorBoundary(CorporateZonePage, 'OffersZonesCorporate');
