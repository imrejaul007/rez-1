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
  Share as RNShare
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Brand } from '@/types/voucher.types';
import realVouchersApi from '@/services/realVouchersApi';
import PurchaseModal from '@/components/voucher/PurchaseModal';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width, height } = Dimensions.get('window');

// ReZ Premium Color System from TASK.md

function BrandDetailPage() {
  const router = useRouter();
  const { brandId } = useLocalSearchParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [denominations, setDenominations] = useState<number[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Animations
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const scaleAnim = useSharedValue(0.95);
  const pulseAnim = useSharedValue(1);
  const isMounted = useIsMounted();

  const heroAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }, { scale: scaleAnim.value }]}));
  const fadeSlideAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }]}));
  const actionAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }, { scale: pulseAnim.value }]}));

  useEffect(() => {
    let isMounted = true;

    if (brand) {
      // Entrance animations
      fadeAnim.value = withTiming(1, { duration: 600 });
      slideAnim.value = withSpring(0, { damping: 8, stiffness: 50 });
      scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });

      // Pulse animation for CTA
      pulseAnim.value = withRepeat(withSequence(
          withTiming(1.02, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ), -1);

      return () => {
        isMounted = false;
      };
    }
  }, [brand]);

  useEffect(() => {
    loadBrandDetails();
  }, [brandId]);

  const loadBrandDetails = async () => {
    try {
      setLoading(true);
      const brandRes = await realVouchersApi.getVoucherBrandById(brandId as string);

      if (!brandRes.success || !brandRes.data) {
        return;
      }

      const brandData: Brand = {
        id: brandRes.data._id,
        name: brandRes.data.name,
        logo: brandRes.data.logo,
        backgroundColor: brandRes.data.backgroundColor || colors.neutral[100],
        logoColor: brandRes.data.logoColor,
        cashbackRate: brandRes.data.cashbackRate || 0,
        rating: brandRes.data.rating || 0,
        reviewCount: brandRes.data.ratingCount ? `${(brandRes.data.ratingCount / 1000).toFixed(1)}k+ users` : '0 users',
        description: brandRes.data.description || '',
        categories: [brandRes.data.category || ''],
        featured: brandRes.data.isFeatured || false,
        newlyAdded: brandRes.data.isNewlyAdded || false,
        offers: [] };

      if (!isMounted()) return;
      setDenominations(brandRes.data.denominations || [100, 500, 1000, 2000]);
      if (!isMounted()) return;
      setBrand(brandData);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!brand) return;

    try {
      const shareMessage = `Check out ${brand.name} - Get up to ${brand.cashbackRate}% cashback! Download ${BRAND.APP_NAME} app to save smarter.`;

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: brand.name, text: shareMessage });
        } else {
          await Clipboard.setStringAsync(shareMessage);
          platformAlertSimple('Copied', 'Link copied to clipboard!');
        }
      } else {
        await RNShare.share({ message: shareMessage, title: brand.name });
      }
    } catch (error) {
      // silently handle
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handlePurchaseSuccess = () => {
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.gold, Colors.nileBlue, '#00695C']}
      style={styles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative elements */}
      <View style={styles.headerOrb1} />
      <View style={styles.headerOrb2} />
      <View style={styles.headerGlassOverlay} />

      <View style={styles.headerContent}>
        <Pressable
          style={styles.glassButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
         
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
        </Pressable>

        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {brand?.name || 'Brand'}
        </ThemedText>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.glassButton}
            onPress={handleShare}
           
          >
            <Ionicons name="share-outline" size={20} color={Colors.text.inverse} />
          </Pressable>

          <Pressable
            style={[styles.glassButton, isFavorite && styles.favoriteActive]}
            onPress={handleFavorite}
           
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#FF6B6B" : Colors.background.primary}
            />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );

  const renderBrandHero = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
      ]}
    >
      {/* Logo with glow effect */}
      <View style={styles.logoWrapper}>
        <View style={styles.logoGlow} />
        <LinearGradient
          colors={[brand?.backgroundColor || colors.neutral[100], (brand?.backgroundColor || colors.neutral[100]) + 'CC']}
          style={styles.brandLogo}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoShine} />
          <ThemedText style={[styles.brandLogoText, { color: brand?.logoColor || Colors.nileBlue }]}>
            {brand?.logo}
          </ThemedText>
        </LinearGradient>
      </View>

      <ThemedText style={styles.brandName}>{brand?.name}</ThemedText>

      {brand?.featured && (
        <View style={styles.featuredBadge}>
          <LinearGradient
            colors={[Colors.gold, Colors.warning]}
            style={styles.featuredGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="star" size={12} color={Colors.nileBlue} />
            <ThemedText style={styles.featuredText}>Featured Brand</ThemedText>
          </LinearGradient>
        </View>
      )}
    </Animated.View>
  );

  const renderStats = () => (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Rating Card */}
      <View style={[
        styles.statCard,
        Platform.OS === 'web' && { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }
      ]}>
        <View style={styles.cardShine} />
        <View style={styles.statRow}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 205, 87, 0.15)' }]}>
            <Ionicons name="star" size={20} color={Colors.gold} />
          </View>
          <View style={styles.statContent}>
            <ThemedText style={styles.statValue}>
              {brand?.rating ? `${brand.rating.toFixed(1)}%` : '95%'} Positive rating
            </ThemedText>
            <ThemedText style={styles.statSubtext}>
              by {brand?.reviewCount || '8.8k+ users'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Rewards Card */}
      <View style={[
        styles.statCard,
        Platform.OS === 'web' && { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }
      ]}>
        <View style={styles.cardShine} />
        <View style={styles.statRow}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
            <Ionicons name="trophy" size={20} color={Colors.brand.purple} />
          </View>
          <View style={styles.statContent}>
            <ThemedText style={styles.statValue}>
              55 lakh+ Rewards
            </ThemedText>
            <ThemedText style={styles.statSubtext}>
              given in last month
            </ThemedText>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderNoticeCard = () => (
    <Animated.View
      style={[
        styles.noticeSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={[
        styles.noticeCard,
        Platform.OS === 'web' && { boxShadow: '0 4px 20px rgba(0, 192, 106, 0.1)' }
      ]}>
        <LinearGradient
          colors={['rgba(255, 205, 87, 0.1)', 'rgba(0, 192, 106, 0.05)']}
          style={styles.noticeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.noticeHeader}>
            <View style={styles.noticeIconContainer}>
              <Ionicons name="information-circle" size={20} color={Colors.gold} />
            </View>
            <ThemedText style={styles.noticeTitle}>Important Notice</ThemedText>
          </View>
          <ThemedText style={styles.noticeText}>
            Add products to your cart/Wishlist or save for later only after going via REZ
          </ThemedText>
        </LinearGradient>
      </View>
    </Animated.View>
  );

  const renderActionButton = () => (
    <Animated.View
      style={[
        styles.actionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }] }
      ]}
    >
      <Pressable
        style={styles.rewardButton}
       
        onPress={() => setShowPurchaseModal(true)}
      >
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          style={styles.rewardButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* Button shine effect */}
          <View style={styles.buttonShine} />

          <View style={styles.rewardButtonContent}>
            <View style={styles.rewardIconContainer}>
              <Ionicons name="gift" size={22} color={Colors.text.inverse} />
            </View>
            <ThemedText style={styles.rewardButtonText}>
              Earn up to {brand?.cashbackRate || 12}% Reward
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.inverse} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );

  const renderTimeline = () => (
    <Animated.View
      style={[
        styles.timelineSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }] }
      ]}
    >
      <ThemedText style={styles.timelineSectionTitle}>How it works</ThemedText>

      <View style={styles.timelineContainer}>
        {/* Step 1 */}
        <View style={styles.timelineStep}>
          <View style={styles.timelineStepNumber}>
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              style={styles.stepNumberGradient}
            >
              <ThemedText style={styles.stepNumber}>1</ThemedText>
            </LinearGradient>
          </View>
          <View style={styles.timelineStepContent}>
            <ThemedText style={styles.timelineStepTitle}>Purchase Voucher</ThemedText>
            <ThemedText style={styles.timelineStepSubtitle}>Select amount & pay</ThemedText>
          </View>
        </View>

        <View style={styles.timelineConnector}>
          <View style={styles.connectorDash} />
          <View style={styles.connectorDash} />
          <View style={styles.connectorDash} />
        </View>

        {/* Step 2 */}
        <View style={styles.timelineStep}>
          <View style={styles.timelineStepNumber}>
            <LinearGradient
              colors={[Colors.gold, Colors.warning]}
              style={styles.stepNumberGradient}
            >
              <ThemedText style={styles.stepNumber}>2</ThemedText>
            </LinearGradient>
          </View>
          <View style={styles.timelineStepContent}>
            <ThemedText style={styles.timelineStepTitle}>Get Reward</ThemedText>
            <ThemedText style={styles.timelineStepSubtitle}>Within 30 minutes</ThemedText>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderBottomActions = () => (
    <Animated.View
      style={[
        styles.bottomActions,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }] }
      ]}
    >
      <Pressable style={styles.bottomActionButton}>
        <View style={styles.bottomActionInner}>
          <View style={styles.bottomActionIcon}>
            <Ionicons name="pricetag" size={18} color={Colors.gold} />
          </View>
          <ThemedText style={styles.bottomActionText}>Reward Rates</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
        </View>
      </Pressable>

      <Pressable style={styles.bottomActionButton}>
        <View style={styles.bottomActionInner}>
          <View style={styles.bottomActionIcon}>
            <Ionicons name="document-text" size={18} color={Colors.gold} />
          </View>
          <ThemedText style={styles.bottomActionText}>Offer Terms</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
        </View>
      </Pressable>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          style={styles.loadingHeader}
        >
          <View style={styles.headerContent}>
            <Pressable style={styles.glassButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Loading...</ThemedText>
            <View style={{ width: 94 }} />
          </View>
        </LinearGradient>
        <DetailPageSkeleton />
      </View>
    );
  }

  if (!brand) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {renderHeader()}
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={56} color={Colors.text.tertiary} />
          </View>
          <ThemedText style={styles.errorTitle}>Brand not found</ThemedText>
          <ThemedText style={styles.errorText}>
            This brand may have been removed or is temporarily unavailable.
          </ThemedText>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              style={styles.backButton}
            >
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Background */}
      <LinearGradient
        colors={[colors.greenMist, '#E0F2F1', colors.tint.warmGray, colors.greenMist]}
        style={styles.backgroundGradient}
      >
        <View style={styles.bgOrb1} />
        <View style={styles.bgOrb2} />
      </LinearGradient>

      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderBrandHero()}
        {renderStats()}
        {renderNoticeCard()}
        {renderActionButton()}
        {renderTimeline()}
        {renderBottomActions()}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <PurchaseModal
        visible={showPurchaseModal}
        brand={brand ? {
          id: brand.id,
          name: brand.name,
          logo: brand.logo,
          backgroundColor: brand.backgroundColor,
          logoColor: brand.logoColor,
          cashbackRate: brand.cashbackRate,
          description: brand.description } : null}
        denominations={denominations}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },

  // Background
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden' },
  bgOrb1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    top: height * 0.25,
    right: -80,
    opacity: 0.3 },
  bgOrb2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 205, 87, 0.12)',
    bottom: 150,
    left: -50,
    opacity: 0.25 },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden' },
  headerOrb1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -40,
    right: -20 },
  headerOrb2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    bottom: -20,
    left: 40 },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1 },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)' },
  favoriteActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginHorizontal: Spacing.md },
  headerActions: {
    flexDirection: 'row',
    gap: 10 },

  // Content
  content: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 120 },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg },
  logoWrapper: {
    position: 'relative',
    marginBottom: Spacing.base },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 192, 106, 0.15)' },
  brandLogo: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden' },
  logoShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25 },
  brandLogoText: {
    fontSize: 48,
    marginTop: Spacing.sm },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.nileBlue,
    letterSpacing: -0.5,
    marginBottom: Spacing.md },
  featuredBadge: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4 },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    gap: 6 },
  featuredText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: 0.3 },

  // Stats
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.base },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden' },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewY: '-2deg' }],
    marginTop: -15 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14 },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center' },
  statContent: {
    flex: 1 },
  statValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.2,
    marginBottom: 3 },
  statSubtext: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary },

  // Notice
  noticeSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg },
  noticeCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)' },
  noticeGradient: {
    padding: 18 },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10 },
  noticeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 192, 106, 0.15)',
    justifyContent: 'center',
    alignItems: 'center' },
  noticeTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.2 },
  noticeText: {
    ...Typography.body,
    color: Colors.gold,
    lineHeight: 20,
    fontWeight: '500' },

  // Action Button
  actionSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl },
  rewardButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10 },
  rewardButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    position: 'relative',
    overflow: 'hidden' },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  rewardButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md },
  rewardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center' },
  rewardButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: -0.2,
    flex: 1 },

  // Timeline
  timelineSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl },
  timelineSectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.3,
    marginBottom: Spacing.base },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)' },
  timelineStep: {
    alignItems: 'center',
    flex: 1 },
  timelineStepNumber: {
    marginBottom: Spacing.md,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4 },
  stepNumberGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center' },
  stepNumber: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text.inverse },
  timelineStepContent: {
    alignItems: 'center' },
  timelineStepTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2 },
  timelineStepSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500' },
  timelineConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg },
  connectorDash: {
    width: 10,
    height: 3,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    opacity: 0.4 },

  // Bottom Actions
  bottomActions: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md },
  bottomActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden' },
  bottomActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md },
  bottomActionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center' },
  bottomActionText: {
    flex: 1,
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  loadingHeader: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' },
  loaderWrapper: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)' },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500' },

  // Error
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'] },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)' },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl },
  backButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: 14 },
  backButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse },

  // Bottom Space
  bottomSpace: {
    height: 60 } });

export default withErrorBoundary(BrandDetailPage, 'VoucherBrandId');
