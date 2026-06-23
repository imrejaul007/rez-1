import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Women Exclusive Zone Page - Production Ready
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
const ZONE_SLUG = 'women';

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

const CATEGORIES = [
  { id: 'All', icon: '💄', label: 'All' },
  { id: 'Beauty', icon: '💅', label: 'Beauty' },
  { id: 'Fashion', icon: '👗', label: 'Fashion' },
  { id: 'Wellness', icon: '🧘', label: 'Wellness' },
  { id: 'Fitness', icon: '💪', label: 'Fitness' },
];

function WomenZonePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ZoneOffer[]>([]);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shimmerAnim = useSharedValue(0);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));
  const bottomPadding = 80 + 70 + insets.bottom;

  // Women zone eligibility - based on gender
  const isEligible = user?.profile?.gender === 'female' || zoneInfo?.userEligible === true;

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

  const filteredOffers = selectedCategory
    ? offers.filter((o) => o.category?.toLowerCase() === selectedCategory.toLowerCase())
    : offers;

  // Calculate stats from real data
  const stats = {
    totalDeals: offers.length,
    avgSavings: offers.length > 0
      ? Math.round(offers.reduce((sum, o) => sum + (o.cashbackPercentage || 0), 0) / offers.length)
      : 0 };

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
          {deal.description || deal.subtitle || 'Exclusive women offer'}
        </ThemedText>

        <View style={styles.dealTags}>
          <View style={styles.tag}>
            <ThemedText style={styles.tagText}>👩 Women Exclusive</ThemedText>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.pink} translucent />

      {/* Header */}
      <LinearGradient
        colors={[colors.brand.pink, colors.deepPink, '#BE185D']}
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
                {zoneInfo?.name || 'Women Exclusive'}
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>Beauty, wellness & lifestyle</ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.emoji}>👩</ThemedText>
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
            colors={['rgba(236, 72, 153, 0.3)', 'rgba(219, 39, 119, 0.2)', 'rgba(139, 92, 246, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={20} color="#F472B6" />
                <ThemedText style={styles.heroBadgeText}>Curated for You</ThemedText>
              </View>
              <ThemedText style={styles.heroTitle}>Celebrate You</ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                {zoneInfo?.description || 'Exclusive deals on beauty, fashion & wellness'}
              </ThemedText>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <ThemedText style={styles.heroStatValue}>
                    {loading ? '...' : `${stats.totalDeals}+`}
                  </ThemedText>
                  <ThemedText style={styles.heroStatLabel}>Deals</ThemedText>
                </View>
                <View style={styles.heroStat}>
                  <ThemedText style={[styles.heroStatValue, { color: colors.brand.purpleSoft }]}>
                    {loading ? '...' : `${stats.avgSavings}%`}
                  </ThemedText>
                  <ThemedText style={styles.heroStatLabel}>Avg. Savings</ThemedText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Categories */}
        <View style={styles.categorySection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Shop by Category</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardActive]}
                onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id === 'All' ? null : cat.id)}
               
              >
                <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
                <ThemedText style={styles.categoryLabel}>{cat.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Deals List */}
        <View style={styles.dealsSection}>
          <ThemedText style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory} Deals` : 'All Deals'} ({filteredOffers.length})
          </ThemedText>
          {loading ? (
            <>
              {renderSkeletonCard()}
              {renderSkeletonCard()}
              {renderSkeletonCard()}
            </>
          ) : filteredOffers.length > 0 ? (
            filteredOffers.map((deal) => renderDealCard(deal))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyStateText}>No offers in this category</ThemedText>
            </View>
          )}
        </View>

        {/* Self-Care Reminder */}
        <View style={styles.selfCareCard}>
          <LinearGradient
            colors={['rgba(244, 63, 94, 0.1)', 'rgba(236, 72, 153, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selfCareGradient}
          >
            <View style={styles.selfCareIcon}>
              <Ionicons name="heart" size={24} color="#FB7185" />
            </View>
            <View style={styles.selfCareContent}>
              <ThemedText style={styles.selfCareTitle}>Self-Care Sunday</ThemedText>
              <ThemedText style={styles.selfCareSubtitle}>
                Extra 10% off on wellness services
              </ThemedText>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Fixed CTA Button */}
      <View style={styles.fixedCTA}>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/offers' as any)}>
          <LinearGradient
            colors={[colors.brand.pink, colors.brand.purpleSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <ThemedText style={styles.ctaButtonText}>
              Explore All Women Exclusive Deals
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
  heroGradient: { padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(236, 72, 153, 0.2)', borderRadius: BorderRadius['2xl'] },
  heroContent: { position: 'relative' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.xs, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: Spacing.md },
  heroBadgeText: { ...Typography.labelSmall, color: '#F472B6', fontWeight: '600' },
  heroTitle: { ...Typography.h2, color: Colors.text.primary, fontWeight: '700', marginBottom: Spacing.xs },
  heroSubtitle: { ...Typography.body, color: Colors.text.secondary, marginBottom: Spacing.base },
  heroStats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.base },
  heroStat: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  heroStatValue: { ...Typography.h3, color: '#F472B6', fontWeight: '700', marginBottom: 2 },
  heroStatLabel: { ...Typography.caption, color: Colors.text.tertiary },
  categorySection: { marginBottom: Spacing.lg },
  sectionHeader: { paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '600' },
  categoryScroll: { paddingHorizontal: Spacing.base, gap: Spacing.md },
  categoryCard: { alignItems: 'center', padding: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: Colors.background.primary, minWidth: 100, ...Shadows.subtle },
  categoryCardActive: { borderWidth: 2, borderColor: colors.brand.pink },
  categoryIcon: { fontSize: 32, marginBottom: Spacing.sm },
  categoryLabel: { ...Typography.label, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  dealsSection: { paddingHorizontal: Spacing.base },
  dealCard: { flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadows.subtle },
  dealImage: { width: 112, height: 112 },
  dealContent: { flex: 1, padding: Spacing.base },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  dealInfo: { flex: 1, marginRight: Spacing.sm },
  dealStore: { ...Typography.bodySmall, color: Colors.text.tertiary, marginBottom: 2 },
  dealTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600' },
  discountBadge: { backgroundColor: 'rgba(236, 72, 153, 0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  discountText: { ...Typography.labelSmall, color: colors.brand.pink, fontWeight: '700' },
  dealDescription: { ...Typography.bodySmall, color: Colors.text.secondary, marginBottom: Spacing.sm },
  dealTags: { flexDirection: 'row', gap: Spacing.xs },
  tag: { backgroundColor: Colors.gray[100], paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  tagText: { ...Typography.caption, color: Colors.text.secondary },
  skeletonImage: { width: 112, height: 112, backgroundColor: Colors.gray[200] },
  skeletonText: { height: 12, borderRadius: 6, backgroundColor: Colors.gray[200] },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyStateText: { ...Typography.body, color: Colors.text.tertiary, marginTop: Spacing.md },
  selfCareCard: { margin: Spacing.base, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.medium },
  selfCareGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)', borderRadius: BorderRadius.lg, gap: Spacing.md },
  selfCareIcon: { width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: 'rgba(251, 113, 133, 0.2)', alignItems: 'center', justifyContent: 'center' },
  selfCareContent: { flex: 1 },
  selfCareTitle: { ...Typography.label, color: Colors.text.primary, fontWeight: '600', marginBottom: 2 },
  selfCareSubtitle: { ...Typography.bodySmall, color: Colors.text.secondary },
  fixedCTA: { position: 'absolute', bottom: 70, left: 0, right: 0, padding: Spacing.base, backgroundColor: Colors.background.primary, borderTopWidth: 1, borderTopColor: Colors.border.light, ...Shadows.medium },
  ctaButton: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: Spacing.base, alignItems: 'center', justifyContent: 'center' },
  ctaButtonText: { ...Typography.button, color: colors.background.primary, fontWeight: '600' } });

export default withErrorBoundary(WomenZonePage, 'OffersZonesWomen');
