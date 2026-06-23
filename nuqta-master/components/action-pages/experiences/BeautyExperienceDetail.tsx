/**
 * Beauty Experience Detail Page
 * /MainCategory/beauty-wellness/experiences/[id]
 * Displays full details of a beauty/wellness experience with booking CTA
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

const COLORS = {
  pink: colors.brand.pink,
  pinkDark: '#BE185D',
  pinkLight: colors.pinkMist,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.offWhite,
  border: colors.neutral[200],
  gold: colors.warningScale[400],
  green: colors.success,
};

interface ExperienceDetail {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  image?: string;
  images?: string[];
  price?: number;
  originalPrice?: number;
  duration?: string;
  rating?: number;
  ratingsCount?: number;
  salonName?: string;
  salonId?: string;
  salonImage?: string;
  salonAddress?: string;
  salonRating?: number;
  whatsIncluded?: string[];
  highlights?: string[];
  tags?: string[];
  category?: string;
  subcategory?: string;
  availability?: string;
  maxParticipants?: number;
}

function ExperienceDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const isMounted = useIsMounted();

  const fetchExperience = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiClient.get<any>(`/experiences/${id}`);

      if (response.success && response.data) {
        const data = response.data.experience || response.data;
        if (!isMounted()) return;
        setExperience(data);
      } else {
        setError(response.message || 'Experience not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load experience details');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExperience();
  }, [fetchExperience]);

  const handleBookNow = () => {
    const params: Record<string, string> = {};
    if (experience?.salonId) {
      params.storeId = experience.salonId;
    }
    if (experience?.salonName) {
      params.storeName = experience.salonName;
    }
    router.push({
      pathname: '/MainCategory/beauty-wellness/book-appointment' as any,
      params,
    });
  };

  const heroImage = experience?.image || experience?.images?.[0];

  // ─────────── Loading State ───────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.pink} />
          <Text style={styles.loadingText}>Loading experience...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────── Error State ───────────
  if (error || !experience) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerText}>Experience</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.errorTitle}>Could not load experience</Text>
          <Text style={styles.errorSubtitle}>{error || 'The experience was not found'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchExperience}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const discountPercent =
    experience.originalPrice && experience.price && experience.originalPrice > experience.price
      ? Math.round(((experience.originalPrice - experience.price) / experience.originalPrice) * 100)
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {heroImage && !imageError ? (
            <CachedImage
              source={heroImage}
              style={styles.heroImage}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="sparkles" size={48} color={COLORS.pink} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.4, 1]}
            style={styles.heroGradient}
          />

          {/* Back button overlay */}
          <SafeAreaView style={styles.heroOverlay} edges={['top']}>
            <Pressable
              onPress={() => router.back()}
              style={styles.heroBackButton}
             
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </Pressable>
          </SafeAreaView>

          {/* Badges on hero */}
          <View style={styles.heroBadges}>
            {experience.duration && (
              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={12} color={COLORS.white} />
                <Text style={styles.heroBadgeText}>{experience.duration}</Text>
              </View>
            )}
            {discountPercent && (
              <View style={[styles.heroBadge, { backgroundColor: COLORS.green }]}>
                <Text style={styles.heroBadgeText}>{discountPercent}% OFF</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Title & Rating */}
          <Text style={styles.title}>{experience.title}</Text>

          {experience.rating != null && experience.rating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={COLORS.gold} />
              <Text style={styles.ratingText}>{experience.rating.toFixed(1)}</Text>
              {experience.ratingsCount != null && experience.ratingsCount > 0 && (
                <Text style={styles.ratingCountText}>
                  ({experience.ratingsCount} review{experience.ratingsCount !== 1 ? 's' : ''})
                </Text>
              )}
            </View>
          )}

          {/* Price */}
          <View style={styles.priceSection}>
            {experience.price != null ? (
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {currencySymbol}{experience.price.toLocaleString()}
                </Text>
                {experience.originalPrice != null && experience.originalPrice > experience.price && (
                  <Text style={styles.originalPrice}>
                    {currencySymbol}{experience.originalPrice.toLocaleString()}
                  </Text>
                )}
                {experience.duration && (
                  <Text style={styles.priceDuration}>/ {experience.duration}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.price}>Price on request</Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {experience.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this Experience</Text>
              <Text style={styles.descriptionText}>{experience.description}</Text>
            </View>
          ) : null}

          {/* What's Included */}
          {experience.whatsIncluded && experience.whatsIncluded.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Included</Text>
              <View style={styles.includedList}>
                {experience.whatsIncluded.map((item, index) => (
                  <View key={index} style={styles.includedItem}>
                    <View style={styles.includedIcon}>
                      <Ionicons name="checkmark" size={14} color={COLORS.pink} />
                    </View>
                    <Text style={styles.includedText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Highlights */}
          {experience.highlights && experience.highlights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Highlights</Text>
              <View style={styles.highlightsList}>
                {experience.highlights.map((item, index) => (
                  <View key={index} style={styles.highlightChip}>
                    <Ionicons name="sparkles" size={12} color={COLORS.pink} />
                    <Text style={styles.highlightText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Salon Info */}
          {experience.salonName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Salon Information</Text>
              <Pressable
                style={styles.salonCard}
               
                onPress={() => {
                  if (experience.salonId) {
                    router.push(`/MainStorePage?storeId=${experience.salonId}` as any);
                  }
                }}
              >
                <View style={styles.salonImageContainer}>
                  {experience.salonImage ? (
                    <CachedImage
                      source={experience.salonImage}
                      style={styles.salonImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.salonImage, styles.salonImagePlaceholder]}>
                      <Ionicons name="flower" size={20} color={COLORS.pink} />
                    </View>
                  )}
                </View>
                <View style={styles.salonInfo}>
                  <Text style={styles.salonNameText} numberOfLines={1}>
                    {experience.salonName}
                  </Text>
                  {experience.salonAddress && (
                    <View style={styles.salonMeta}>
                      <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.salonMetaText} numberOfLines={1}>
                        {experience.salonAddress}
                      </Text>
                    </View>
                  )}
                  {experience.salonRating != null && experience.salonRating > 0 && (
                    <View style={styles.salonMeta}>
                      <Ionicons name="star" size={12} color={COLORS.gold} />
                      <Text style={styles.salonMetaText}>
                        {experience.salonRating.toFixed(1)} rating
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Availability Note */}
          {experience.availability && (
            <View style={styles.availabilityNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.pink} />
              <Text style={styles.availabilityText}>{experience.availability}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Now CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaLeft}>
          {experience.price != null ? (
            <>
              <Text style={styles.ctaPrice}>
                {currencySymbol}{experience.price.toLocaleString()}
              </Text>
              {experience.duration && (
                <Text style={styles.ctaDuration}>{experience.duration}</Text>
              )}
            </>
          ) : (
            <Text style={styles.ctaPrice}>Get Quote</Text>
          )}
        </View>
        <Pressable
          style={styles.ctaButton}
          onPress={handleBookNow}
         
        >
          <LinearGradient
            colors={[colors.brand.pink, '#D946EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="calendar-outline" size={18} color={COLORS.white} />
            <Text style={styles.ctaButtonText}>Book Now</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },

  // Simple Header (error state)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  errorSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.pink,
  },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Hero Image
  heroContainer: { width: SCREEN_WIDTH, height: HERO_HEIGHT, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    backgroundColor: COLORS.pinkLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadges: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.white },

  // Content
  contentContainer: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  ratingText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  ratingCountText: { fontSize: 13, color: COLORS.textSecondary },

  // Price
  priceSection: { marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price: { fontSize: 24, fontWeight: '700', color: COLORS.pink },
  originalPrice: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  priceDuration: { fontSize: 14, color: COLORS.textSecondary },

  // Sections
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // What's Included
  includedList: { gap: 10 },
  includedItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  includedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  includedText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },

  // Highlights
  highlightsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.pinkLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  highlightText: { fontSize: 13, color: COLORS.pinkDark, fontWeight: '500' },

  // Salon Card
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  salonImageContainer: {},
  salonImage: { width: 52, height: 52, borderRadius: 14 },
  salonImagePlaceholder: {
    backgroundColor: COLORS.pinkLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salonInfo: { flex: 1 },
  salonNameText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  salonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  salonMetaText: { fontSize: 12, color: COLORS.textSecondary },

  // Availability Note
  availabilityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    backgroundColor: COLORS.pinkLight,
    borderRadius: 14,
    marginTop: 4,
  },
  availabilityText: { flex: 1, fontSize: 13, color: COLORS.pinkDark, lineHeight: 18 },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' },
    }),
  },
  ctaLeft: {},
  ctaPrice: { fontSize: 20, fontWeight: '700', color: COLORS.pink },
  ctaDuration: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  ctaButton: { borderRadius: 14, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  ctaButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

export default React.memo(ExperienceDetailPage);
