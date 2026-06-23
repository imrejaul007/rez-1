/**
 * ExperiencesSection Component
 * Displays food experiences from real API with dummy data fallback
 * Used in FoodDiningCategoryPage experiences tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { experiencesApi, StoreExperience } from '@/services/experiencesApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ExperiencesSectionProps {
  categorySlug: string;
  pageConfig?: any; // receives pageConfig for experience benefits overrides
}

// Default hardcoded benefits (used when pageConfig doesn't provide them)
const DEFAULT_EXPERIENCE_BENEFITS = [
  { icon: '💰', title: 'Earn Cashback', description: 'Up to 20% on experiences' },
  { icon: '✅', title: 'Verified', description: 'Quality assured venues' },
  { icon: '🎁', title: 'Bonus Rewards', description: 'Extra coins on booking' },
  { icon: '💳', title: 'Easy Refunds', description: 'Hassle-free cancellation' },
];

const COLORS = {
  primaryGreen: colors.lightMustard,
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
};

const EXPERIENCE_TYPE_ICONS: Record<string, string> = {
  fastDelivery: '⚡', budgetFriendly: '💰', premium: '👑', organic: '🌿',
  oneRupee: '1️⃣', ninetyNine: '🏷️', luxury: '✨', verified: '✅',
  partner: '🤝', mall: '🏬', dining: '🍽️', cooking: '👨‍🍳',
  tours: '🚶', events: '🎉', private: '👑',
};

function ExperiencesSection({ categorySlug, pageConfig }: ExperiencesSectionProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [experiences, setExperiences] = useState<StoreExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  // Use pageConfig benefits if available, otherwise fall back to hardcoded defaults
  const benefits = pageConfig?.experienceBenefits?.length ? pageConfig.experienceBenefits : DEFAULT_EXPERIENCE_BENEFITS;

  const fetchExperiences = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await experiencesApi.getExperiences({ featured: true, limit: 10, category: categorySlug });
      if (response.success && response.data?.experiences) {
        if (!isMounted()) return;
        setExperiences(response.data.experiences);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => { fetchExperiences(); }, [fetchExperiences]);

  const handleExperiencePress = (experience: StoreExperience) => {
    router.push(`/MainCategory/${categorySlug}/experiences/${experience._id || experience.slug}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryGold} />
        <Text style={styles.loadingText}>Loading experiences...</Text>
      </View>
    );
  }

  if (experiences.length === 0) {
    return (
      <View style={styles.container}>
        {/* Banner */}
        <View style={styles.banner}>
          <LinearGradient
            colors={['rgba(251, 191, 36, 0.2)', 'rgba(249, 115, 22, 0.2)']}
            style={styles.bannerGradient}
          >
            <Text style={styles.bannerTitle}>Not just food. Experiences.</Text>
            <Text style={styles.bannerSubtitle}>Worth remembering.</Text>
          </LinearGradient>
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Experiences coming soon</Text>
          <Text style={styles.emptySubtitle}>Curated food experiences will be available in your area shortly</Text>
        </View>

        {/* Why Book Section */}
        <View style={styles.whySection}>
          <Text style={styles.whyTitle}>{`Why Book with ${BRAND.APP_NAME}?`}</Text>
          <View style={styles.whyGrid}>
            {benefits.map((item: { icon: string; title: string; description: string }, index: number) => (
              <View key={index} style={styles.whyItem}>
                <Text style={styles.whyIcon}>{item.icon}</Text>
                <Text style={styles.whyItemTitle}>{item.title}</Text>
                <Text style={styles.whyItemDescription}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Experience Banner */}
      <View style={styles.banner}>
        <LinearGradient
          colors={['rgba(251, 191, 36, 0.2)', 'rgba(249, 115, 22, 0.2)']}
          style={styles.bannerGradient}
        >
          <Text style={styles.bannerTitle}>Not just food. Experiences.</Text>
          <Text style={styles.bannerSubtitle}>Worth remembering.</Text>
        </LinearGradient>
      </View>

      {/* Experience Types Carousel */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={20} color={colors.warningScale[400]} />
          <Text style={styles.sectionTitle}>Explore Experiences</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typesList}>
          {experiences.map((exp) => (
            <Pressable
              key={exp._id}
              style={styles.typeCard}
              onPress={() => handleExperiencePress(exp)}
            >
              <Text style={styles.typeIcon}>
                {exp.icon || EXPERIENCE_TYPE_ICONS[exp.type] || '🍽️'}
              </Text>
              <Text style={styles.typeName} numberOfLines={1}>{exp.title}</Text>
              <Text style={styles.typeCount}>
                {exp.storeCount ? `${exp.storeCount} places` : 'Explore'}
              </Text>
              {exp.badge && (
                <View style={[styles.typeBadge, { backgroundColor: exp.badgeBg || COLORS.primaryGold }]}>
                  <Text style={[styles.typeBadgeText, { color: exp.badgeColor || COLORS.white }]}>{exp.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Featured Experiences */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>⭐</Text>
          <Text style={styles.sectionTitle}>Featured Experiences</Text>
          <Pressable onPress={() => router.push(`/MainCategory/${categorySlug}/experiences` as any)}>
            <Text style={styles.sectionSeeAll}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.experiencesList}>
          {experiences.filter(e => e.isFeatured).slice(0, 4).map((experience) => (
            <Pressable
              key={experience._id}
              style={styles.experienceCard}
              onPress={() => handleExperiencePress(experience)}
            >
              <LinearGradient
                colors={(experience.backgroundColor ? [experience.backgroundColor, experience.backgroundColor + '80'] : ['#F59E0B20', colors.brand.orange] ) as any}
                style={styles.experienceCardGradient}
              >
                <View style={styles.experienceCardContent}>
                  <Text style={styles.experienceIcon}>
                    {experience.icon || EXPERIENCE_TYPE_ICONS[experience.type] || '🍽️'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.experienceTitle} numberOfLines={1}>{experience.title}</Text>
                    <Text style={styles.experienceDescription} numberOfLines={2}>
                      {experience.subtitle || experience.description || ''}
                    </Text>
                    {experience.storeCount ? (
                      <Text style={styles.experienceStoreCount}>
                        {experience.storeCount} restaurants
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </View>
                {experience.benefits && experience.benefits.length > 0 && (
                  <View style={styles.benefitsList}>
                    {experience.benefits.slice(0, 2).map((benefit, i) => (
                      <View key={i} style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Why Book Experiences */}
      <View style={styles.whySection}>
        <Text style={styles.whyTitle}>{`Why Book with ${BRAND.APP_NAME}?`}</Text>
        <View style={styles.whyGrid}>
          {benefits.map((item: { icon: string; title: string; description: string }, index: number) => (
            <View key={index} style={styles.whyItem}>
              <Text style={styles.whyIcon}>{item.icon}</Text>
              <Text style={styles.whyItemTitle}>{item.title}</Text>
              <Text style={styles.whyItemDescription}>{item.description}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  banner: { marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  bannerGradient: { padding: 24, alignItems: 'center' },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  bannerSubtitle: { fontSize: 16, color: COLORS.textSecondary },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: COLORS.primaryGold, fontWeight: '600' },
  typesList: { gap: 12, paddingRight: 16 },
  typeCard: { width: 100, padding: 16, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', position: 'relative' },
  typeIcon: { fontSize: 28, marginBottom: 8 },
  typeName: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' },
  typeCount: { fontSize: 10, color: COLORS.textSecondary },
  typeBadge: {
    position: 'absolute', top: -4, right: -4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  typeBadgeText: { fontSize: 8, fontWeight: '700' },
  experiencesList: { gap: 12 },
  experienceCard: { borderRadius: 16, overflow: 'hidden' },
  experienceCardGradient: { padding: 16 },
  experienceCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  experienceIcon: { fontSize: 36 },
  experienceTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  experienceDescription: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  experienceStoreCount: { fontSize: 11, color: COLORS.primaryGold, fontWeight: '500' },
  benefitsList: { marginTop: 12, gap: 6 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitText: { fontSize: 12, color: COLORS.textSecondary },
  whySection: { margin: 16, marginTop: 24, padding: 20, backgroundColor: COLORS.white, borderRadius: 16 },
  whyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16, textAlign: 'center' },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  whyItem: { width: '47%' as any, alignItems: 'center', padding: 12 },
  whyIcon: { fontSize: 24, marginBottom: 8 },
  whyItemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  whyItemDescription: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
});

export default React.memo(ExperiencesSection);
