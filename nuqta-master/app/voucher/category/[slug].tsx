// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Brand } from '@/types/voucher.types';
import realVouchersApi from '@/services/realVouchersApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width, height } = Dimensions.get('window');

// ReZ Premium Color System - using DesignSystem tokens
const COLORS = {
  // Primary
  primary: Colors.gold,
  primaryDark: Colors.nileBlue,
  primaryLight: 'rgba(255, 205, 87, 0.1)',
  primaryGlow: 'rgba(255, 205, 87, 0.3)',

  // Gold (rewards)
  gold: colors.brand.goldWarm,
  goldDark: Colors.warning,
  goldLight: 'rgba(255, 200, 87, 0.15)',
  goldGlow: 'rgba(255, 200, 87, 0.3)',

  // Navy (text)
  navy: Colors.nileBlue,
  slate: '#1F2D3D',
  muted: Colors.text.tertiary,

  // Surface
  surface: Colors.background.secondary,
  white: Colors.background.primary,

  // Glass
  glassWhite: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
  glassHighlight: 'rgba(255, 255, 255, 0.6)',

  // Status
  error: Colors.error,
  star: Colors.warning };

// Category icon and color mapping - Updated with ReZ colors
const CATEGORY_INFO: { [key: string]: { icon: string; gradient: string[]; bgColor: string } } = {
  beauty: { icon: '💄', gradient: [colors.brand.pink, colors.deepPink], bgColor: 'rgba(236, 72, 153, 0.1)' },
  electronics: { icon: '📱', gradient: [colors.infoScale[400], colors.brand.blue], bgColor: 'rgba(59, 130, 246, 0.1)' },
  entertainment: { icon: '🎬', gradient: [colors.brand.purpleLight, colors.brand.purple], bgColor: 'rgba(139, 92, 246, 0.1)' },
  fashion: { icon: '👗', gradient: ['#F472B6', colors.brand.pink], bgColor: 'rgba(244, 114, 182, 0.1)' },
  food: { icon: '🍔', gradient: [COLORS.primary, COLORS.primaryDark], bgColor: COLORS.primaryLight },
  grocery: { icon: '🛒', gradient: [colors.warningScale[400], colors.warningScale[700]], bgColor: 'rgba(245, 158, 11, 0.1)' },
  groceries: { icon: '🛒', gradient: [colors.warningScale[400], colors.warningScale[700]], bgColor: 'rgba(245, 158, 11, 0.1)' },
  shopping: { icon: '🛍️', gradient: [colors.error, colors.error], bgColor: 'rgba(239, 68, 68, 0.1)' },
  travel: { icon: '✈️', gradient: [colors.brand.cyan, colors.cyanDark], bgColor: 'rgba(6, 182, 212, 0.1)' },
  sports: { icon: '⚽', gradient: [colors.tealGreen, '#0D9488'], bgColor: 'rgba(20, 184, 166, 0.1)' } };

function VoucherCategoryPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const headerScale = useSharedValue(0.95);
  const isMounted = useIsMounted();

  const headerScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));
  const brandCardAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: slideAnim.value },
      { scale: interpolate(fadeAnim.value, [0, 1], [0.95, 1]) },
    ],
  }));

  const categoryInfo = slug ? CATEGORY_INFO[slug.toLowerCase()] : null;
  const categoryName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ') : 'Category';

  useEffect(() => {
    // Entrance animation
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withSpring(0, { damping: 8, stiffness: 50 });
    headerScale.value = withSpring(1, { damping: 7, stiffness: 50 });
  }, []);

  useEffect(() => {
    if (slug) {
      loadCategoryBrands();
    }
  }, [slug]);

  const loadCategoryBrands = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const brandsRes = await realVouchersApi.getVoucherBrands({
        category: slug.toLowerCase(),
        page: 1,
        limit: 50
      });

      if (!brandsRes.success || !brandsRes.data) {
        if (!isMounted()) return;
        setError('Failed to load brands. Please try again.');
        if (!isMounted()) return;
        setBrands([]);
        return;
      }

      const transformedBrands: Brand[] = brandsRes.data.map((brand: any) => ({
        id: brand._id,
        name: brand.name,
        logo: brand.logo,
        backgroundColor: brand.backgroundColor || colors.neutral[100],
        logoColor: brand.logoColor,
        cashbackRate: brand.cashbackRate || 0,
        rating: brand.rating || 0,
        reviewCount: brand.ratingCount ? `${(brand.ratingCount / 1000).toFixed(1)}k+ users` : '0 users',
        description: brand.description || '',
        categories: [brand.category || ''],
        featured: brand.isFeatured || false,
        newlyAdded: brand.isNewlyAdded || false,
        offers: [] }));

      transformedBrands.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.cashbackRate - a.cashbackRate;
      });

      if (!isMounted()) return;
      setBrands(transformedBrands);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load brands. Please try again.');
      if (!isMounted()) return;
      setBrands([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCategoryBrands();
  };

  const handleBrandSelect = (brand: Brand) => {
    router.push(`/voucher/${brand.id}`);
  };

  const renderHeader = () => (
    <Animated.View style={headerScaleStyle}>
      <LinearGradient
        colors={categoryInfo?.gradient || [COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative orbs */}
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />

        {/* Glass overlay */}
        <View style={styles.headerGlassOverlay} />

        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
           
          >
            <View style={styles.glassButton}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </View>
          </Pressable>

          <View style={styles.headerTitleContainer}>
            {categoryInfo && (
              <View style={styles.categoryIconBadge}>
                <ThemedText style={styles.categoryIconText}>{categoryInfo.icon}</ThemedText>
              </View>
            )}
            <ThemedText style={styles.headerTitle}>{categoryName}</ThemedText>
          </View>

          <Pressable
            style={styles.glassButton}
            onPress={() => {/* Share */}}
           
          >
            <Ionicons name="share-outline" size={20} color={COLORS.white} />
          </Pressable>
        </View>

        <View style={styles.headerSubtitleContainer}>
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>
              {brands.length} {brands.length === 1 ? 'brand' : 'brands'} available
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderBrandCard = (brand: Brand, index: number) => (
    <Animated.View
      key={brand.id}
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: interpolate(fadeAnim.value, [0, 1], [0.95, 1]) }
        ] }}
    >
      <Pressable
        style={[
          styles.brandCard,
          Platform.OS === 'web' && {
            boxShadow: '0 8px 32px rgba(11, 34, 64, 0.08), 0 2px 8px rgba(11, 34, 64, 0.04)' }
        ]}
        onPress={() => handleBrandSelect(brand)}
       
      >
        {/* Glass shine effect */}
        <View style={styles.cardShine} />

        <View style={styles.brandHeader}>
          {/* Premium Logo Container */}
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={[brand.backgroundColor || colors.neutral[100], (brand.backgroundColor || colors.neutral[100]) + 'CC']}
              style={styles.brandLogo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={[styles.brandLogoText, { color: brand.logoColor || COLORS.navy }]}>
                {brand.logo}
              </ThemedText>
            </LinearGradient>
          </View>

          <View style={styles.brandInfo}>
            <View style={styles.brandNameRow}>
              <ThemedText style={styles.brandName} numberOfLines={1}>{brand.name}</ThemedText>
              {brand.featured && (
                <LinearGradient
                  colors={[COLORS.gold, COLORS.goldDark]}
                  style={styles.featuredBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ThemedText style={styles.featuredText}>Featured</ThemedText>
                </LinearGradient>
              )}
            </View>

            {/* Cashback with icon */}
            <View style={styles.cashbackRow}>
              <View style={styles.cashbackIconContainer}>
                <Ionicons name="gift" size={12} color={COLORS.primary} />
              </View>
              <ThemedText style={styles.brandCashback}>
                Cashback upto {brand.cashbackRate || 0}%
              </ThemedText>
            </View>

            {/* Rating with premium styling */}
            {brand.rating && brand.rating > 0 && (
              <View style={styles.brandRating}>
                <View style={styles.starContainer}>
                  <Ionicons name="star" size={12} color={COLORS.gold} />
                </View>
                <ThemedText style={styles.ratingText}>{brand.rating.toFixed(1)}</ThemedText>
                <ThemedText style={styles.ratingCount}>{brand.reviewCount || '0 users'}</ThemedText>
              </View>
            )}
          </View>

          {/* Arrow with glass effect */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </View>
        </View>

        {brand.description && (
          <View style={styles.descriptionContainer}>
            <ThemedText style={styles.brandDescription} numberOfLines={2}>
              {brand.description}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

  const renderContent = () => {
    if (loading && !refreshing) {
      return <CardGridSkeleton />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          </View>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable onPress={loadCategoryBrands}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.retryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={18} color={COLORS.white} />
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    if (brands.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="receipt-outline" size={56} color={COLORS.muted} />
          </View>
          <ThemedText style={styles.emptyTitle}>No brands found</ThemedText>
          <ThemedText style={styles.emptyText}>
            There are no voucher brands available in this category yet.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.brandsList}>
        {brands.map((brand, index) => renderBrandCard(brand, index))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Gradient Background */}
      <LinearGradient
        colors={[colors.greenMist, '#E0F2F1', colors.tint.warmGray, colors.greenMist]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.bgOrb1} />
        <View style={styles.bgOrb2} />
      </LinearGradient>

      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            progressBackgroundColor={COLORS.white}
          />
        }
      >
        {renderContent()}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface },

  // Premium Background
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden' },
  bgOrb1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryGlow,
    top: height * 0.3,
    right: -80,
    opacity: 0.3 },
  bgOrb2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.goldGlow,
    bottom: 100,
    left: -50,
    opacity: 0.25 },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28 },
  headerOrb1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -50,
    right: -30 },
  headerOrb2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    bottom: -30,
    left: 30 },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    zIndex: 1 },
  backButton: {},
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)' },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base },
  categoryIconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)' },
  categoryIconText: {
    ...Typography.h3 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.3 },
  headerSubtitleContainer: {
    alignItems: 'center',
    zIndex: 1 },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)' },
  countText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600' },

  // Content
  content: {
    flex: 1 },
  scrollContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 120 },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80 },
  loaderWrapper: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.glassWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: COLORS.glassBorder },
  loadingText: {
    ...Typography.body,
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '500' },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['2xl'] },
  errorIconContainer: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.error + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg },
  errorText: {
    ...Typography.body,
    fontSize: 15,
    color: COLORS.slate,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: Spacing.sm },
  retryButtonText: {
    color: COLORS.white,
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600' },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['2xl'] },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.glassWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder },
  emptyTitle: {
    ...Typography.h3,
    color: COLORS.navy,
    marginBottom: Spacing.sm,
    letterSpacing: -0.3 },
  emptyText: {
    ...Typography.body,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20 },

  // Brands List
  brandsList: {
    padding: Spacing.lg,
    paddingTop: Spacing.md },

  // Brand Card - Premium Glass Style
  brandCard: {
    backgroundColor: COLORS.glassWhite,
    borderRadius: BorderRadius.xl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...Shadows.strong,
    position: 'relative',
    overflow: 'hidden' },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewY: '-3deg' }],
    marginTop: -20 },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center' },
  logoWrapper: {
    ...Shadows.medium },
  brandLogo: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)' },
  brandLogoText: {
    ...Typography.h2 },
  brandInfo: {
    flex: 1 },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: Spacing.sm },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: -0.2 },
  featuredBadge: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm },
  featuredText: {
    ...Typography.overline,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: 0.3 },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6 },
  cashbackIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center' },
  brandCashback: {
    ...Typography.body,
    color: COLORS.primary,
    fontWeight: '600' },
  brandRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 },
  starContainer: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: COLORS.goldLight,
    justifyContent: 'center',
    alignItems: 'center' },
  ratingText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy },
  ratingCount: {
    ...Typography.bodySmall,
    color: COLORS.muted,
    marginLeft: 2 },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center' },
  descriptionContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)' },
  brandDescription: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19 },

  // Bottom Space
  bottomSpace: {
    height: 60 } });

export default withErrorBoundary(VoucherCategoryPage, 'VoucherCategorySlug');
