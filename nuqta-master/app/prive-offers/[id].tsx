import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Prive Offer Detail Page
 *
 * Full offer detail with dark Prive theme, brand info,
 * reward details, expiry countdown, images, terms, and redeem CTA.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import priveApi, { PriveOffer } from '@/services/priveApi';
import { DetailPageSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 220;

/** Tier display colors */
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  entry: { bg: 'rgba(201, 169, 98, 0.15)', text: PRIVE_COLORS.gold.primary },
  signature: { bg: 'rgba(168, 85, 247, 0.15)', text: colors.brand.purpleMedium },
  elite: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
};

/** Reward type labels */
const REWARD_TYPE_LABELS: Record<string, string> = {
  percentage: 'Discount',
  fixed: 'Flat Off',
  coins: 'Coin Reward',
};

function PriveOfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [offer, setOffer] = useState<PriveOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffer = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await priveApi.getOfferById(id);
      if (response.success && response.data) {
        setOffer(response.data);
      } else {
        if (!isMounted()) return;
        setError('Offer not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load offer details');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [id]);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  /** Format the reward value for display */
  const formattedRewardValue = useMemo(() => {
    if (!offer?.rewardValue) return null;
    switch (offer.rewardType) {
      case 'percentage':
        return `${offer.rewardValue}% Off`;
      case 'fixed':
        return `Rs ${offer.rewardValue} Off`;
      case 'coins':
        return `${offer.rewardValue} Coins`;
      default:
        return `${offer.rewardValue}`;
    }
  }, [offer?.rewardValue, offer?.rewardType]);

  /** Format expiry date */
  const formattedExpiry = useMemo(() => {
    if (!offer?.expiresAt) return null;
    return new Date(offer.expiresAt).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [offer?.expiresAt]);

  /** Tier badge color */
  const tierColor = useMemo(() => {
    if (!offer?.tierRequired || offer.tierRequired === 'none') return null;
    return TIER_COLORS[offer.tierRequired] || TIER_COLORS.entry;
  }, [offer?.tierRequired]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Offer Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  // --- Error state ---
  if (error || !offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Offer Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={PRIVE_COLORS.status.error} />
          <Text style={styles.errorText}>{error || 'Offer not found'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchOffer}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main content ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Offer Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        {offer.coverImage ? (
          <CachedImage
            source={offer.coverImage}
            style={styles.coverImage}
            contentFit="cover"
          />
        ) : null}

        {/* Brand Badge + Exclusive Tag */}
        <View style={styles.badgeRow}>
          <View style={styles.brandBadge}>
            {offer.brandLogo ? (
              <CachedImage source={offer.brandLogo} style={styles.brandLogo} contentFit="contain" />
            ) : null}
            <Text style={styles.brandText}>{offer.brand}</Text>
          </View>
          {offer.isExclusive && (
            <View style={styles.exclusiveBadge}>
              <Ionicons name="diamond" size={11} color={PRIVE_COLORS.gold.primary} />
              <Text style={styles.exclusiveText}>Exclusive</Text>
            </View>
          )}
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.subtitle}>{offer.subtitle}</Text>

        {/* Reward Card */}
        <View style={styles.rewardCard}>
          <View style={styles.rewardIconWrap}>
            <Ionicons name="gift-outline" size={24} color={PRIVE_COLORS.gold.primary} />
          </View>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardLabel}>Reward</Text>
            <Text style={styles.rewardValue}>{offer.reward}</Text>
            {formattedRewardValue && (
              <Text style={styles.rewardDetail}>
                {formattedRewardValue}
                {offer.rewardType ? ` \u00B7 ${REWARD_TYPE_LABELS[offer.rewardType] || offer.rewardType}` : ''}
                {offer.coinType && offer.rewardType === 'coins' ? ` (${offer.coinType})` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Tier Required Badge */}
        {tierColor && offer.tierRequired && offer.tierRequired !== 'none' && (
          <View style={[styles.tierBadge, { backgroundColor: tierColor.bg }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={tierColor.text} />
            <Text style={[styles.tierText, { color: tierColor.text }]}>
              {offer.tierRequired.charAt(0).toUpperCase() + offer.tierRequired.slice(1)}+ Tier Required
            </Text>
          </View>
        )}

        {/* Expiry Countdown */}
        <View style={styles.expiryCard}>
          <Ionicons name="time-outline" size={18} color={PRIVE_COLORS.status.warning} />
          <View style={styles.expiryInfo}>
            <Text style={styles.expiryCountdown}>{offer.expiresIn}</Text>
            {formattedExpiry && (
              <Text style={styles.expiryDate}>Expires on {formattedExpiry}</Text>
            )}
          </View>
        </View>

        {/* Redemptions Progress */}
        {typeof offer.redemptions === 'number' && typeof offer.totalLimit === 'number' && offer.totalLimit > 0 && (
          <View style={styles.redemptionsCard}>
            <View style={styles.redemptionsHeader}>
              <Text style={styles.redemptionsLabel}>Redemptions</Text>
              <Text style={styles.redemptionsCount}>
                {offer.redemptions} / {offer.totalLimit}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((offer.redemptions / offer.totalLimit) * 100, 100)}%` },
                ]}
              />
            </View>
            {offer.redemptions >= offer.totalLimit && (
              <Text style={styles.soldOutText}>Fully Redeemed</Text>
            )}
          </View>
        )}

        {/* Full Description */}
        {offer.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{offer.description}</Text>
          </View>
        ) : null}

        {/* Images Gallery */}
        {offer.images && offer.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageGallery}
            >
              {offer.images.map((img, index) => (
                <CachedImage
                  key={index}
                  source={img}
                  style={styles.galleryImage}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* How to Redeem */}
        {offer.howToRedeem ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>How to Redeem</Text>
            <Text style={styles.infoBoxText}>{offer.howToRedeem}</Text>
          </View>
        ) : null}

        {/* Terms & Conditions */}
        {offer.terms && offer.terms.length > 0 && (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Terms & Conditions</Text>
            {offer.terms.map((term, i) => (
              <View key={i} style={styles.termRow}>
                <Text style={styles.termBullet}>{'\u2022'}</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacing for CTA */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={styles.ctaButton}
         
          onPress={() => router.push('/prive/redeem' as any)}
        >
          <Ionicons name="flash" size={18} color={PRIVE_COLORS.text.inverse} />
          <Text style={styles.ctaText}>Redeem Now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PRIVE_SPACING.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  headerSpacer: {
    width: 40,
  },

  // Loading
  loadingText: {
    marginTop: PRIVE_SPACING.md,
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
  },

  // Error
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
    textAlign: 'center',
    marginTop: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.lg,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingBottom: 120,
  },

  // Cover Image
  coverImage: {
    width: SCREEN_WIDTH - PRIVE_SPACING.xl * 2,
    height: IMAGE_HEIGHT,
    borderRadius: PRIVE_RADIUS.lg,
    marginBottom: PRIVE_SPACING.lg,
    backgroundColor: PRIVE_COLORS.background.secondary,
  },

  // Brand Badge Row
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: PRIVE_SPACING.md,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.xs + 2,
    borderRadius: PRIVE_RADIUS.sm,
    gap: PRIVE_SPACING.sm,
  },
  brandLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: PRIVE_RADIUS.sm,
  },
  exclusiveText: {
    fontSize: 10,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '600',
  },

  // Title / Subtitle
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: PRIVE_SPACING.lg,
  },

  // Reward Card
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.md,
  },
  rewardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    marginBottom: 2,
  },
  rewardDetail: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
  },

  // Tier Badge
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.xs + 2,
    borderRadius: PRIVE_RADIUS.sm,
    gap: PRIVE_SPACING.xs,
    marginBottom: PRIVE_SPACING.md,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Expiry
  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.md,
  },
  expiryInfo: {
    flex: 1,
  },
  expiryCountdown: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.status.warning,
  },
  expiryDate: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
  },

  // Redemptions
  redemptionsCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.md,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  redemptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.sm,
  },
  redemptionsLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  redemptionsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.secondary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: 3,
  },
  soldOutText: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIVE_COLORS.status.error,
    marginTop: PRIVE_SPACING.xs,
    textAlign: 'right',
  },

  // Section
  section: {
    marginBottom: PRIVE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 22,
  },

  // Image Gallery
  imageGallery: {
    gap: PRIVE_SPACING.sm,
  },
  galleryImage: {
    width: 200,
    height: 140,
    borderRadius: PRIVE_RADIUS.md,
    backgroundColor: PRIVE_COLORS.background.secondary,
  },

  // Info Box (Terms / How to Redeem)
  infoBox: {
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  infoBoxText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
  },
  termRow: {
    flexDirection: 'row',
    marginBottom: PRIVE_SPACING.xs,
  },
  termBullet: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginRight: PRIVE_SPACING.sm,
    lineHeight: 18,
  },
  termText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    lineHeight: 18,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 80,
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg,
    backgroundColor: PRIVE_COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.border.primary,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingVertical: PRIVE_SPACING.lg,
    borderRadius: PRIVE_RADIUS.lg,
    gap: PRIVE_SPACING.sm,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.inverse,
  },
});

export default withErrorBoundary(PriveOfferDetailScreen, 'PriveOffersId');
