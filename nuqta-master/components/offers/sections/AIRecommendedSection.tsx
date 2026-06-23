/**
 * AIRecommendedSection Component
 *
 * Personalized AI recommendations
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { AIRecommendedOffer } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface AIRecommendedSectionProps {
  offers: AIRecommendedOffer[];
  onViewAll?: () => void;
}

export const AIRecommendedSection: React.FC<AIRecommendedSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: AIRecommendedOffer) => {
    router.push(`/offers/${offer.id}`);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      width: 240,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    imageContainer: {
      height: 120,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    aiBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.brand.purpleLight,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    aiBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.background.primary,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    matchBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.3)' : colors.tint.green,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },
    matchText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? colors.successScale[400] : colors.successScale[700],
    },
    content: {
      padding: Spacing.md,
    },
    storeName: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 6,
      letterSpacing: -0.2,
    },
    reasonContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : colors.tint.purpleLight,
      padding: Spacing.sm,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.xs,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : colors.tint.purple,
    },
    reasonIcon: {
      marginRight: 6,
      marginTop: 1,
    },
    reasonText: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? colors.brand.purpleSoft : colors.brand.purple,
      flex: 1,
      lineHeight: 16,
    },
    cashbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    cashbackText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.primary[600],
      marginLeft: 4,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Recommended For You"
        subtitle="Based on your activity"
        icon="sparkles"
        iconColor={colors.brand.purpleLight}
        showViewAll={offers.length > 2}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((offer) => (
          <Pressable
            key={offer.id}
            style={styles.card}
            onPress={() => handleOfferPress(offer)}
           
          >
            <View style={styles.imageContainer}>
              <CachedImage
                source={{ uri: offer.image }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={styles.aiBadge}>
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={isDark ? colors.brand.purpleSoft : colors.brand.purple}
                />
                <Text style={styles.aiBadgeText}>AI PICK</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{Math.round((offer.matchScore ?? 0) < 1 ? (offer.matchScore ?? 0) * 100 : (offer.matchScore ?? 0))}% Match</Text>
              </View>
            </View>

            <View style={styles.content}>
              <Text style={styles.storeName} numberOfLines={1}>
                {offer.store.name}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {offer.title}
              </Text>

              <View style={styles.reasonContainer}>
                <Ionicons
                  name="bulb-outline"
                  size={12}
                  color={isDark ? colors.brand.purpleSoft : colors.brand.purple}
                  style={styles.reasonIcon}
                />
                <Text style={styles.reasonText} numberOfLines={2}>
                  {offer.reason || 'Recommended for you'}
                </Text>
              </View>

              {offer.cashbackPercentage > 0 && (
                <View style={styles.cashbackRow}>
                  <View style={styles.cashbackBadge}>
                    <Ionicons
                      name="wallet-outline"
                      size={12}
                      color={Colors.primary[600]}
                    />
                    <Text style={styles.cashbackText}>
                      {offer.cashbackPercentage}% Cashback
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </HorizontalScrollSection>
    </View>
  );
};

export default React.memo(AIRecommendedSection);
