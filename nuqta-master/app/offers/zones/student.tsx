// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Student Zone Page - Production Ready
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import realOffersApi from '@/services/realOffersApi';
import verificationService, { VerificationStatus } from '@/services/verificationApi';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZONE_SLUG = 'student';

interface ZoneOffer {
  _id: string;
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
  description: string;
  offersCount: number;
  icon: string;
  backgroundColor: string;
  iconColor: string;
  verificationRequired: boolean;
  eligibilityDetails?: string;
  userEligible?: boolean;
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, string> = {
  all: '🎓',
  food: '🍕',
  entertainment: '🎬',
  electronics: '📱',
  general: '🛍️',
  fashion: '👗',
  beauty: '💄',
  wellness: '💆' };

// Category label mapping
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  food: 'Food',
  entertainment: 'Entertainment',
  electronics: 'Electronics',
  general: 'Shopping',
  fashion: 'Fashion',
  beauty: 'Beauty',
  wellness: 'Wellness' };

function StudentZonePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ZoneOffer[]>([]);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<{ id: string; icon: string; label: string }[]>([
    { id: 'all', icon: '🎓', label: 'All' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

  // Animation for skeleton
  const shimmerAnim = useSharedValue(0);
  const shimmerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  const bottomPadding = 80 + 70 + insets.bottom;

  // Check verification status
  const isVerified = verificationStatus?.verified === true || user?.verifications?.student?.verified === true || zoneInfo?.userEligible === true;
  const isPending = verificationStatus?.status === 'pending';
  const isRejected = verificationStatus?.status === 'rejected';

  useEffect(() => {
    fetchZoneData();
    fetchVerificationStatus();
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
    return () => { shimmerAnim.value = 0; };
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await verificationService.getZoneStatus('student');
      if (response.success && response.data) {
        if (!isMounted()) return;
        setVerificationStatus(response.data);
      }
    } catch (error) {
      // silently handle
    }
  };

  const fetchZoneData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch zone info and offers in parallel
      const [zonesResponse, offersResponse] = await Promise.all([
        realOffersApi.getExclusiveZones(),
        realOffersApi.getExclusiveZoneOffers(ZONE_SLUG),
      ]);

      // Get zone info
      if (zonesResponse.success && zonesResponse.data) {
        const zone = zonesResponse.data.find((z: any) => z.slug === ZONE_SLUG);
        if (zone) {
          if (!isMounted()) return;
          setZoneInfo({
            name: zone.name,
            description: zone.description,
            offersCount: zone.offersCount || 0,
            icon: zone.icon,
            backgroundColor: zone.backgroundColor,
            iconColor: zone.iconColor,
            verificationRequired: zone.verificationRequired,
            eligibilityDetails: zone.eligibilityDetails,
            userEligible: zone.userEligible });
        }
      }

      // Get offers - API returns { zone, offers }
      if (offersResponse.success && offersResponse.data) {
        const offersData = offersResponse.data.offers || offersResponse.data;
        const offersArray = Array.isArray(offersData) ? offersData : [];
        if (!isMounted()) return;
        setOffers(offersArray);

        // Generate dynamic categories from offers
        const uniqueCategories = new Set(offersArray.map((o: any) => o.category?.toLowerCase()).filter(Boolean));
        const dynamicCategories = [
          { id: 'all', icon: CATEGORY_ICONS['all'] || '🎓', label: 'All' },
          ...Array.from(uniqueCategories).map((cat) => ({
            id: cat as string,
            icon: CATEGORY_ICONS[cat as string] || '📦',
            label: CATEGORY_LABELS[cat as string] || (cat as string).charAt(0).toUpperCase() + (cat as string).slice(1) })),
        ];
        if (!isMounted()) return;
        setCategories(dynamicCategories);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load offers. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const filteredOffers =
    selectedCategory === 'all'
      ? offers
      : offers.filter((o) => o.category?.toLowerCase() === selectedCategory);

  // Calculate stats from real data
  const stats = {
    totalDeals: offers.length,
    maxDiscount: offers.reduce((max, o) => Math.max(max, o.cashbackPercentage || 0), 0),
    avgSavings: offers.length > 0
      ? Math.round(offers.reduce((sum, o) => sum + (o.cashbackPercentage || 0), 0) / offers.length)
      : 0 };

  const handleVerify = () => {
    // Navigate to verification page with zone parameter
    router.push({
      pathname: '/profile/verification',
      params: { zone: 'student' }
    } as any);
  };

  const handleDealPress = (offer: ZoneOffer) => {
    router.push(`/offers/${offer._id}` as any);
  };

  const renderSkeletonCard = () => (
    <View style={styles.dealCard}>
      <Animated.View
        style={[
          styles.skeletonImage,
          shimmerOpacityStyle,
        ]}
      />
      <View style={styles.dealContent}>
        <View style={[styles.skeletonText, { width: '40%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '80%', marginBottom: 8 }]} />
        <View style={[styles.skeletonText, { width: '60%' }]} />
      </View>
    </View>
  );

  const renderDealCard = (offer: ZoneOffer) => (
    <Pressable
      key={offer._id}
      style={styles.dealCard}
      onPress={() => handleDealPress(offer)}
     
    >
      <View style={styles.dealImageContainer}>
        {offer.image ? (
          <CachedImage source={offer.image} style={styles.dealImage} contentFit="cover" />
        ) : (
          <View style={styles.dealImagePlaceholder}>
            <Ionicons name="school" size={32} color={Colors.primary[600]} />
          </View>
        )}
      </View>

      <View style={styles.dealContent}>
        <View style={styles.dealHeader}>
          <View style={styles.dealInfo}>
            <ThemedText style={styles.dealStore}>{offer.store?.name || 'Store'}</ThemedText>
            <ThemedText style={styles.dealTitle}>{offer.title}</ThemedText>
          </View>
          {offer.cashbackPercentage && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{offer.cashbackPercentage}%</ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={styles.dealDescription} numberOfLines={2}>
          {offer.description || offer.subtitle || 'Exclusive student offer'}
        </ThemedText>

        <View style={styles.dealTags}>
          <View style={styles.tag}>
            <ThemedText style={styles.tagText}>🎓 Students Only</ThemedText>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.infoScale[400]} translucent />

      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.infoScale[400], colors.brand.blue, '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
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
                {zoneInfo?.name || 'Student Zone'}
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Campus deals & student discounts
              </ThemedText>
            </View>

            <View style={styles.headerIcon}>
              <ThemedText style={styles.graduationEmoji}>🎓</ThemedText>
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
            colors={['rgba(59, 130, 246, 0.3)', 'rgba(139, 92, 246, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="school" size={32} color={colors.infoScale[400]} />
              </View>
              <View style={styles.heroTextContainer}>
                <ThemedText style={styles.heroTitle}>Exclusive Student Discounts</ThemedText>
                <ThemedText style={styles.heroSubtitle}>
                  {zoneInfo?.description || 'Verified students get access to special deals'}
                </ThemedText>
              </View>
            </View>

            {/* Verification Status */}
            <View style={styles.verificationCard}>
              {isVerified ? (
                <View style={styles.verifiedStatus}>
                  <View style={styles.verifiedLeft}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <ThemedText style={styles.verifiedText}>Student Verified</ThemedText>
                  </View>
                  <View style={styles.activeBadge}>
                    <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
                  </View>
                </View>
              ) : isPending ? (
                <View style={styles.verifiedStatus}>
                  <View style={styles.verifiedLeft}>
                    <Ionicons name="time" size={20} color={colors.warningScale[400]} />
                    <ThemedText style={[styles.verifiedText, { color: colors.warningScale[400] }]}>Verification Under Review</ThemedText>
                  </View>
                  <View style={[styles.activeBadge, { backgroundColor: colors.tint.amberLight }]}>
                    <ThemedText style={[styles.activeBadgeText, { color: colors.warningScale[700] }]}>Pending</ThemedText>
                  </View>
                </View>
              ) : isRejected ? (
                <View style={styles.unverifiedStatus}>
                  <View style={styles.unverifiedLeft}>
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                    <ThemedText style={[styles.unverifiedText, { color: Colors.error }]}>Verification Rejected</ThemedText>
                  </View>
                  <Pressable
                    style={[styles.verifyButton, { backgroundColor: Colors.error }]}
                    onPress={handleVerify}
                   
                  >
                    <ThemedText style={styles.verifyButtonText}>Try Again</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.unverifiedStatus}>
                  <View style={styles.unverifiedLeft}>
                    <Ionicons name="alert-circle" size={20} color={colors.warningScale[400]} />
                    <ThemedText style={styles.unverifiedText}>Verify to unlock all deals</ThemedText>
                  </View>
                  <Pressable
                    style={styles.verifyButton}
                    onPress={handleVerify}
                   
                  >
                    <ThemedText style={styles.verifyButtonText}>Verify Now</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats - Dynamic */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: colors.infoScale[400] }]}>
              {loading ? '...' : `${stats.totalDeals}+`}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Active Deals</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: colors.brand.purpleSoft }]}>
              {loading ? '...' : `${stats.maxDiscount}%`}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Max Discount</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: Colors.success }]}>
              {loading ? '...' : `${stats.avgSavings}%`}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Avg. Savings</ThemedText>
          </View>
        </View>

        {/* Browse by Category */}
        <View style={styles.categorySection}>
          <ThemedText style={styles.sectionTitle}>Browse by Category</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
               
              >
                <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
                <ThemedText
                  style={[
                    styles.categoryLabel,
                    selectedCategory === cat.id && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Deals List */}
        <View style={styles.dealsSection}>
          <ThemedText style={styles.sectionTitle}>
            {selectedCategory === 'All' ? 'All Student Deals' : `${selectedCategory} Deals`}
          </ThemedText>

          {loading ? (
            <>
              {renderSkeletonCard()}
              {renderSkeletonCard()}
              {renderSkeletonCard()}
            </>
          ) : filteredOffers.length > 0 ? (
            filteredOffers.map((offer) => renderDealCard(offer))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyStateText}>
                No offers found in this category
              </ThemedText>
            </View>
          )}
        </View>

        {/* How to Verify - only show if not verified and not pending */}
        {!isVerified && !isPending && (
          <View style={styles.howToVerify}>
            <ThemedText style={styles.howToVerifyTitle}>How to Verify</ThemedText>
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>1</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>Enter your college email (.edu)</ThemedText>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>2</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>Upload student ID (optional)</ThemedText>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>3</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>Get verified in 24 hours</ThemedText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed CTA Button */}
      <View style={styles.fixedCTA}>
        <Pressable
          style={styles.ctaButton}
          onPress={isVerified || isPending ? () => {} : handleVerify}
         
          disabled={isPending}
        >
          <LinearGradient
            colors={isPending ? [colors.warningScale[400], colors.warningScale[700]] : Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <ThemedText style={styles.ctaButtonText}>
              {isVerified
                ? 'Browse All Student Deals'
                : isPending
                  ? '⏳ Verification Under Review'
                  : isRejected
                    ? 'Verify Again'
                    : 'Verify Student Status'}
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

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
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 },
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
  headerIcon: {
    width: 40,
    alignItems: 'center' },
  graduationEmoji: {
    fontSize: 32 },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 150 },
  heroBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.medium },
  heroGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: BorderRadius['2xl'] },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base },
  heroTextContainer: {
    flex: 1 },
  heroTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 4 },
  heroSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary },
  verificationCard: {
    marginTop: Spacing.base,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  verifiedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  verifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  verifiedText: {
    ...Typography.label,
    color: Colors.success },
  activeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm },
  activeBadgeText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '600' },
  unverifiedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  unverifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  unverifiedText: {
    ...Typography.body,
    color: colors.warningScale[400] },
  verifyButton: {
    backgroundColor: colors.warningScale[400],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md },
  verifyButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
    fontWeight: '600' },
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
  categorySection: {
    marginBottom: Spacing.lg },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md },
  categoryScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
    gap: Spacing.xs },
  categoryChipActive: {
    backgroundColor: colors.infoScale[400] },
  categoryIcon: {
    fontSize: 16 },
  categoryLabel: {
    ...Typography.labelSmall,
    color: Colors.text.secondary },
  categoryLabelActive: {
    color: colors.background.primary },
  dealsSection: {
    paddingHorizontal: Spacing.base },
  dealCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle },
  dealImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.base },
  dealImage: {
    width: '100%',
    height: '100%' },
  dealImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center' },
  dealContent: {
    flex: 1 },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs },
  dealInfo: {
    flex: 1,
    marginRight: Spacing.sm },
  dealStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2 },
  dealTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600' },
  discountBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm },
  discountText: {
    ...Typography.labelSmall,
    color: colors.infoScale[400],
    fontWeight: '700' },
  dealDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm },
  dealTags: {
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
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md },
  howToVerify: {
    margin: Spacing.base,
    marginTop: Spacing.lg,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle },
  howToVerifyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.md },
  stepsContainer: {
    gap: Spacing.md },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center' },
  stepNumberText: {
    ...Typography.caption,
    color: colors.infoScale[400],
    fontWeight: '700' },
  stepText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
    paddingTop: 2 },
  fixedCTA: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    ...Shadows.medium },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center' },
  ctaButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600' } });

export default withErrorBoundary(StudentZonePage, 'OffersZonesStudent');
