import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Dynamic Exclusive Zone Page
 *
 * Catch-all page for exclusive zone offers that renders dynamically
 * based on the zone slug parameter. Fetches zone info and offers from the API.
 */

import React, { useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import realOffersApi from '@/services/realOffersApi';
import logger from '@/utils/logger';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ZoneOffer {
  _id: string;
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  cashbackPercentage?: number;
  originalPrice?: number;
  discountedPrice?: number;
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
  slug: string;
  description: string;
  offersCount: number;
  icon: string;
  backgroundColor: string;
  iconColor: string;
  verificationRequired: boolean;
  eligibilityDetails?: string;
  userEligible?: boolean;
  cashbackBonusPercent?: number;
}

// ---------------------------------------------------------------------------
// Zone theme configuration – maps known zone slugs to presentational defaults.
// For unknown zones the API-provided backgroundColor / icon are used instead.
// ---------------------------------------------------------------------------

interface ZoneTheme {
  gradientColors: [string, string, string];
  ionicon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  tagLabel: string;
  placeholderSubtitle: string;
}

const ZONE_THEMES: Record<string, ZoneTheme> = {
  student: {
    gradientColors: [colors.infoScale[400], colors.brand.blue, '#1D4ED8'],
    ionicon: 'school',
    emoji: '',
    tagLabel: 'Students Only',
    placeholderSubtitle: 'Campus deals & student discounts' },
  birthday: {
    gradientColors: [colors.warningScale[400], colors.warningScale[700], colors.brand.amberDeep],
    ionicon: 'gift',
    emoji: '',
    tagLabel: 'Birthday Special',
    placeholderSubtitle: 'Celebrate with exclusive deals' },
  corporate: {
    gradientColors: [colors.brand.purpleSoft, colors.brand.purpleLight, colors.brand.purpleDeep],
    ionicon: 'briefcase',
    emoji: '',
    tagLabel: 'Corporate',
    placeholderSubtitle: 'Exclusive corporate benefits' },
  senior: {
    gradientColors: ['#FCD34D', colors.warningScale[400], colors.warningScale[700]],
    ionicon: 'heart',
    emoji: '',
    tagLabel: 'Senior Citizens',
    placeholderSubtitle: 'Special deals for senior citizens' },
  heroes: {
    gradientColors: [colors.successScale[400], colors.successScale[400], colors.successScale[700]],
    ionicon: 'shield',
    emoji: '',
    tagLabel: 'Heroes',
    placeholderSubtitle: 'Saluting our heroes with exclusive offers' },
  defence: {
    gradientColors: [colors.successScale[400], colors.successScale[400], colors.successScale[700]],
    ionicon: 'shield-checkmark',
    emoji: '',
    tagLabel: 'Defence',
    placeholderSubtitle: 'Thank you for your service' },
  women: {
    gradientColors: ['#F472B6', colors.brand.pink, colors.deepPink],
    ionicon: 'flower',
    emoji: '',
    tagLabel: 'Women Exclusive',
    placeholderSubtitle: 'Exclusive offers for women' },
  'first-time': {
    gradientColors: [colors.infoScale[400], colors.infoScale[400], colors.brand.blue],
    ionicon: 'sparkles',
    emoji: '',
    tagLabel: 'First-Time User',
    placeholderSubtitle: 'Welcome! Special first-time offers' },
  loyalty: {
    gradientColors: [colors.warningScale[400], colors.warningScale[400], colors.warningScale[700]],
    ionicon: 'star',
    emoji: '',
    tagLabel: 'Loyalty',
    placeholderSubtitle: 'Rewards for our loyal members' },
  healthcare: {
    gradientColors: ['#F87171', '#DC2626', '#B91C1C'],
    ionicon: 'medkit',
    emoji: '',
    tagLabel: 'Healthcare',
    placeholderSubtitle: 'Benefits for healthcare professionals' },
  teacher: {
    gradientColors: [colors.brand.purpleSoft, '#7C3AED', '#6D28D9'],
    ionicon: 'library',
    emoji: '',
    tagLabel: 'Educators',
    placeholderSubtitle: 'Exclusive deals for teachers & educators' },
  government: {
    gradientColors: ['#D97706', '#B45309', '#92400E'],
    ionicon: 'business',
    emoji: '',
    tagLabel: 'Government',
    placeholderSubtitle: 'Special offers for government employees' },
  'differently-abled': {
    gradientColors: ['#22D3EE', '#0891B2', '#0E7490'],
    ionicon: 'accessibility',
    emoji: '',
    tagLabel: 'Differently Abled',
    placeholderSubtitle: 'Inclusive benefits & accessibility offers' } };

const DEFAULT_THEME: ZoneTheme = {
  gradientColors: [colors.brand.indigo, '#4F46E5', '#4338CA'],
  ionicon: 'pricetag',
  emoji: '',
  tagLabel: 'Exclusive',
  placeholderSubtitle: 'Exclusive zone offers' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a gradient from the zone's API-provided backgroundColor (hex). */
function deriveGradient(hex: string): [string, string, string] {
  // Simple approach: darken the colour for deeper stops
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const darken = (v: number, f: number) => Math.max(0, Math.round(v * f));
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    const c1 = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const c2 = `#${toHex(darken(r, 0.85))}${toHex(darken(g, 0.85))}${toHex(darken(b, 0.85))}`;
    const c3 = `#${toHex(darken(r, 0.7))}${toHex(darken(g, 0.7))}${toHex(darken(b, 0.7))}`;
    return [c1, c2, c3];
  } catch {
    return DEFAULT_THEME.gradientColors;
  }
}

/** Map an API icon string (e.g. emoji or Ionicon name) to a valid Ionicons glyph. */
function resolveIonicon(
  apiIcon: string | undefined,
  fallback: keyof typeof Ionicons.glyphMap,
): keyof typeof Ionicons.glyphMap {
  if (!apiIcon) return fallback;
  // If the API returns a valid Ionicons name, use it directly
  if (apiIcon in (Ionicons.glyphMap ?? {})) {
    return apiIcon as keyof typeof Ionicons.glyphMap;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ExclusiveZonePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ZoneOffer[]>([]);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation for skeleton shimmer
  const shimmerAnim = useSharedValue(0);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  const bottomPadding = 80 + 70 + insets.bottom;

  // Resolve theme for the current slug
  const theme: ZoneTheme = (slug && ZONE_THEMES[slug]) ? ZONE_THEMES[slug] : DEFAULT_THEME;

  // If the API provides a backgroundColor, derive gradient from it; otherwise fall back to theme
  const gradientColors: [string, string, string] =
    zoneInfo?.backgroundColor
      ? deriveGradient(zoneInfo.backgroundColor)
      : theme.gradientColors;

  const ionicon = resolveIonicon(zoneInfo?.icon, theme.ionicon);

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (slug) {
      fetchZoneData();
    }
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
    return () => { shimmerAnim.value = 0; };
  }, [slug]);

  const fetchZoneData = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);

      logger.info(`Fetching zone data for slug: ${slug}`, undefined, 'ExclusiveZonePage');

      // Fetch zone info and offers in parallel
      const [zonesResponse, offersResponse] = await Promise.all([
        realOffersApi.getExclusiveZones(),
        realOffersApi.getExclusiveZoneOffers(slug),
      ]);

      // Parse zone info
      if (zonesResponse.success && zonesResponse.data) {
        const zone = zonesResponse.data.find((z: any) => z.slug === slug);
        if (zone) {
          if (!isMounted()) return;
          setZoneInfo({
            name: zone.name,
            slug: zone.slug,
            description: zone.description,
            offersCount: zone.offersCount || 0,
            icon: zone.icon,
            backgroundColor: zone.backgroundColor,
            iconColor: zone.iconColor,
            verificationRequired: zone.verificationRequired,
            eligibilityDetails: zone.eligibilityDetails,
            userEligible: zone.userEligible,
            cashbackBonusPercent: zone.cashbackBonusPercent || 0 });
        }
      }

      // Parse offers — API returns { zone, offers } or a raw array
      if (offersResponse.success && offersResponse.data) {
        const offersData = offersResponse.data.offers || offersResponse.data;
        const offersArray = Array.isArray(offersData) ? offersData : [];
        if (!isMounted()) return;
        setOffers(offersArray);
      }
    } catch (err: any) {
      logger.error('Error fetching zone data', err instanceof Error ? err : new Error(String(err)), 'ExclusiveZonePage');
      if (!isMounted()) return;
      setError('Failed to load offers. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleOfferPress = (offer: ZoneOffer) => {
    const offerId = offer._id || offer.id;
    if (offerId) {
      router.push(`/offers/${offerId}` as any);
    }
  };

  const handleVerify = () => {
    if (slug) {
      router.push(`/offers/zones/${slug}/verify` as any);
    }
  };

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const zoneName = zoneInfo?.name || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ') : 'Zone');
  const zoneDescription = zoneInfo?.description || theme.placeholderSubtitle;
  const stats = {
    totalDeals: offers.length,
    maxDiscount: offers.reduce((max, o) => Math.max(max, o.cashbackPercentage || 0), 0) };

  // -----------------------------------------------------------------------
  // Renderers
  // -----------------------------------------------------------------------

  const renderSkeletonCard = (index: number) => (
    <View key={`skeleton-${index}`} style={styles.offerCard}>
      <Animated.View
        style={[
          styles.skeletonImage,
          shimmerOpacityStyle,
        ]}
      />
      <View style={styles.offerContent}>
        <View style={[styles.skeletonText, { width: '40%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '80%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '60%' }]} />
      </View>
    </View>
  );

  const renderOfferCard = (offer: ZoneOffer) => {
    const offerId = offer._id || offer.id;
    return (
      <Pressable
        key={offerId}
        style={styles.offerCard}
        onPress={() => handleOfferPress(offer)}
       
      >
        <View style={styles.offerImageContainer}>
          {offer.image ? (
            <CachedImage
              source={offer.image}
              style={styles.offerImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.offerImagePlaceholder, { backgroundColor: `${gradientColors[0]}20` }]}>
              <Ionicons name={ionicon} size={32} color={gradientColors[0]} />
            </View>
          )}
        </View>

        <View style={styles.offerContent}>
          <View style={styles.offerHeader}>
            <View style={styles.offerInfo}>
              <ThemedText style={styles.offerStore}>
                {offer.store?.name || 'Store'}
              </ThemedText>
              <ThemedText style={styles.offerTitle} numberOfLines={2}>
                {offer.title}
              </ThemedText>
            </View>
            {offer.cashbackPercentage != null && offer.cashbackPercentage > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: `${gradientColors[0]}20` }]}>
                <ThemedText style={[styles.discountText, { color: gradientColors[0] }]}>
                  {offer.cashbackPercentage}%
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.offerDescription} numberOfLines={2}>
            {offer.description || offer.subtitle || `Exclusive ${zoneName} offer`}
          </ThemedText>

          <View style={styles.offerTags}>
            <View style={[styles.tag, { backgroundColor: `${gradientColors[0]}15` }]}>
              <ThemedText style={[styles.tagText, { color: gradientColors[1] }]}>
                {theme.tagLabel}
              </ThemedText>
            </View>
            {offer.category && (
              <View style={styles.tag}>
                <ThemedText style={styles.tagText}>{offer.category}</ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error && !loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={[styles.retryButton, { backgroundColor: gradientColors[0] }]} onPress={fetchZoneData}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={gradientColors[0]} translucent />

      {/* ---- Header ---- */}
      <View style={[styles.header, { backgroundColor: gradientColors[0], paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 }]}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>
                {zoneName}
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                {zoneDescription}
              </ThemedText>
            </View>

            <View style={styles.headerIconContainer}>
              <Ionicons name={ionicon} size={28} color={colors.background.primary} />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ---- Scrollable content ---- */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Zone Banner */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerGradient, { backgroundColor: `${gradientColors[0]}15`, borderColor: `${gradientColors[0]}30` }]}>
            <View style={styles.bannerContent}>
              <View style={[styles.bannerIconContainer, { backgroundColor: `${gradientColors[0]}30` }]}>
                <Ionicons name={ionicon} size={32} color={gradientColors[0]} />
              </View>
              <View style={styles.bannerTextContainer}>
                <ThemedText style={styles.bannerTitle}>
                  {zoneName} Offers
                </ThemedText>
                <ThemedText style={styles.bannerSubtitle}>
                  {zoneDescription}
                </ThemedText>
              </View>
            </View>

            {/* Verification prompt — show if zone requires verification and user is not eligible */}
            {zoneInfo?.verificationRequired && !zoneInfo?.userEligible && (
              <View style={styles.verificationCard}>
                <View style={styles.verificationRow}>
                  <View style={styles.verificationLeft}>
                    <Ionicons name="alert-circle" size={20} color={colors.warningScale[400]} />
                    <ThemedText style={styles.verificationText}>
                      Verify to unlock all deals
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.verifyButton, { backgroundColor: gradientColors[0] }]}
                    onPress={handleVerify}
                   
                  >
                    <ThemedText style={styles.verifyButtonText}>Verify</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Show eligible badge when user is eligible */}
            {zoneInfo?.userEligible && (
              <View style={styles.verificationCard}>
                <View style={styles.verificationRow}>
                  <View style={styles.verificationLeft}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <ThemedText style={[styles.verificationText, { color: Colors.success }]}>
                      Verified & Eligible
                    </ThemedText>
                  </View>
                  <View style={[styles.activeBadge, { backgroundColor: Colors.success }]}>
                    <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: gradientColors[0] }]}>
              {loading ? '...' : `${stats.totalDeals}`}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Active Deals</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: gradientColors[1] }]}>
              {loading ? '...' : stats.maxDiscount > 0 ? `${stats.maxDiscount}%` : '--'}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Max Discount</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: Colors.success }]}>
              {loading ? '...' : zoneInfo?.cashbackBonusPercent ? `+${zoneInfo.cashbackBonusPercent}%` : zoneInfo?.offersCount ? `${zoneInfo.offersCount}+` : `${stats.totalDeals}`}
            </ThemedText>
            <ThemedText style={styles.statLabel}>{zoneInfo?.cashbackBonusPercent ? 'Extra Cashback' : 'Total Offers'}</ThemedText>
          </View>
        </View>

        {/* Offers List */}
        <View style={styles.offersSection}>
          <ThemedText style={styles.sectionTitle}>
            {zoneName} Deals {!loading && `(${offers.length})`}
          </ThemedText>

          {loading ? (
            <>
              {renderSkeletonCard(0)}
              {renderSkeletonCard(1)}
              {renderSkeletonCard(2)}
            </>
          ) : offers.length > 0 ? (
            offers.map((offer) => renderOfferCard(offer))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyStateTitle}>
                No offers available
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                There are no active offers in this zone right now. Check back later!
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl },
  errorText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary },

  // Header
  header: {},
  safeHeader: {
    paddingBottom: Spacing.base },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center' },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
    fontWeight: '700' },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2 },
  headerIconContainer: {
    width: 40,
    alignItems: 'center' },

  // Scroll
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 150 },

  // Banner
  bannerContainer: {
    margin: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.medium },
  bannerGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'] },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base },
  bannerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base },
  bannerTextContainer: {
    flex: 1 },
  bannerTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 4 },
  bannerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary },

  // Verification card
  verificationCard: {
    marginTop: Spacing.base,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1 },
  verificationText: {
    ...Typography.body,
    color: colors.warningScale[400] },
  verifyButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md },
  verifyButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
    fontWeight: '600' },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm },
  activeBadgeText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '600' },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.subtle },
  statValue: {
    ...Typography.h2,
    fontWeight: '700',
    marginBottom: 4 },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary },

  // Offers section
  offersSection: {
    paddingHorizontal: Spacing.base },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.md },

  // Offer card
  offerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle },
  offerImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.base },
  offerImage: {
    width: '100%',
    height: '100%' },
  offerImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center' },
  offerContent: {
    flex: 1 },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs },
  offerInfo: {
    flex: 1,
    marginRight: Spacing.sm },
  offerStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2 },
  offerTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600' },
  discountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm },
  discountText: {
    ...Typography.labelSmall,
    fontWeight: '700' },
  offerDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm },
  offerTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap' },
  tag: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm },
  tagText: {
    ...Typography.caption,
    color: Colors.text.secondary },

  // Skeleton
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[200],
    marginRight: Spacing.base },
  skeletonText: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gray[200] },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl },
  emptyStateTitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '600',
    marginTop: Spacing.md },
  emptyStateSubtext: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs } });

export default withErrorBoundary(ExclusiveZonePage, 'OffersZonesSlugIndex');
