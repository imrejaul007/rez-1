/**
 * StoreExperiencesSection Component
 * Displays store experience cards for different store types:
 * - 60-Minute Delivery (fastDelivery)
 * - ₹1 Store (budgetFriendly)
 * - Luxury Store (premium)
 * - Organic Store (organic)
 * Connected to /api/experiences/homepage
 */

import React, { memo, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { StoreExperienceCard, StoreExperienceCardProps } from './cards/StoreExperienceCard';
import { experiencesApi } from '@/services/experiencesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Fallback store experience configurations generator - Nuqta palette
const getFallbackStoreExperiences = (currencySymbol: string): StoreExperienceCardProps[] => [
  {
    title: '60-Minute Delivery',
    subtitle: 'Fashion, beauty, grocery & essentials',
    icon: '⚡',
    buttonText: 'Shop Now',
    gradientColors: [colors.nileBlue, '#243f55'] as const,
    storeType: 'fastDelivery',
    buttonTextColor: colors.nileBlue,
  },
  {
    title: `${currencySymbol}1 Store`,
    subtitle: `${currencySymbol}1 products + delivery cashback on sharing`,
    icon: '🏷️',
    buttonText: 'Explore Deals',
    gradientColors: [colors.lightPeach, colors.brand.sand] as const,
    storeType: 'budgetFriendly',
    buttonTextColor: colors.nileBlue,
  },
  {
    title: 'Luxury Store',
    subtitle: 'Premium brands with exclusive rewards',
    icon: '👑',
    buttonText: 'Shop Luxury',
    gradientColors: [colors.nileBlue, '#2d4a5f'] as const,
    storeType: 'premium',
    buttonTextColor: colors.nileBlue,
  },
  {
    title: 'Organic Store',
    subtitle: 'Eco-friendly & sustainable products',
    icon: '🌿',
    buttonText: 'Go Green',
    gradientColors: [colors.lavenderMist, '#b8d4ed'] as const,
    storeType: 'organic',
    buttonTextColor: colors.nileBlue,
  },
];

// Map experience types to gradient colors and button text colors - Nuqta palette
const EXPERIENCE_STYLES: Record<string, { gradientColors: readonly [string, string]; buttonTextColor: string; buttonText: string }> = {
  fastDelivery: { gradientColors: [colors.nileBlue, '#243f55'], buttonTextColor: colors.nileBlue, buttonText: 'Shop Now' },
  oneRupee: { gradientColors: [colors.lightPeach, colors.brand.sand], buttonTextColor: colors.nileBlue, buttonText: 'Explore Deals' },
  budgetFriendly: { gradientColors: [colors.lightPeach, colors.brand.sand], buttonTextColor: colors.nileBlue, buttonText: 'Explore Deals' },
  luxury: { gradientColors: [colors.nileBlue, '#2d4a5f'], buttonTextColor: colors.nileBlue, buttonText: 'Shop Luxury' },
  premium: { gradientColors: [colors.nileBlue, '#2d4a5f'], buttonTextColor: colors.nileBlue, buttonText: 'Shop Luxury' },
  organic: { gradientColors: [colors.lavenderMist, '#b8d4ed'], buttonTextColor: colors.nileBlue, buttonText: 'Go Green' },
};

interface StoreExperiencesSectionProps {
  showTitle?: boolean;
}

const StoreExperiencesSection: React.FC<StoreExperiencesSectionProps> = memo(({
  showTitle = true,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const fallbackExperiences = getFallbackStoreExperiences(currencySymbol);
  const [isLoading, setIsLoading] = useState(true);
  const [experiences, setExperiences] = useState<StoreExperienceCardProps[]>(fallbackExperiences);
  const isMounted = useIsMounted();

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        setIsLoading(true);
        const response = await experiencesApi.getHomepageExperiences(4);

        if (response.success && response.data && response.data.experiences.length > 0) {
          // Transform API data to component format
          const transformedExperiences = response.data.experiences.map((exp, index) => {
            const styles = EXPERIENCE_STYLES[exp.type] || EXPERIENCE_STYLES.fastDelivery;
            const fallback = fallbackExperiences[index] || fallbackExperiences[0];

            return {
              title: exp.title,
              subtitle: exp.subtitle || fallback.subtitle,
              icon: exp.icon,
              buttonText: styles.buttonText,
              gradientColors: styles.gradientColors,
              storeType: exp.type,
              buttonTextColor: styles.buttonTextColor,
            } as StoreExperienceCardProps;
          });

          if (!isMounted()) return;
          setExperiences(transformedExperiences);
        }
      } catch (error) {
        // Keep using fallback data
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    fetchExperiences();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.lightMustard} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <ThemedText style={styles.sectionTitle}>Store Experiences</ThemedText>
      )}
      <View style={styles.cardsContainer}>
        {experiences.map((experience) => (
          <StoreExperienceCard
            key={experience.storeType}
            {...experience}
          />
        ))}
      </View>
    </View>
  );
});

StoreExperiencesSection.displayName = 'StoreExperiencesSection';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.nileBlue,
  },
  cardsContainer: {
    gap: 4,
  },
});

export { StoreExperiencesSection };
