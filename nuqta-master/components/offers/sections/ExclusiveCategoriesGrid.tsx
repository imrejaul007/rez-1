/**
 * ExclusiveCategoriesGrid Component
 *
 * Grid of exclusive offer categories
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader } from '../common';
import { ExclusiveCategory } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface ExclusiveCategoriesGridProps {
  categories: ExclusiveCategory[];
}

export const ExclusiveCategoriesGrid: React.FC<ExclusiveCategoriesGridProps> = ({
  categories,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (categories.length === 0) return null;

  const handleCategoryPress = (category: ExclusiveCategory) => {
    router.push(`/offers/zones/${category.slug}`);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.base,
      gap: Spacing.md,
    },
    card: {
      width: '47%',
      borderRadius: BorderRadius.lg,
      padding: Spacing.base,
      borderWidth: 1.5,
      ...(isDark ? {} : Shadows.medium),
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    count: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: Spacing.sm,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.xs,
    },
    viewText: {
      fontSize: 12,
      fontWeight: '700',
      marginRight: 4,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Exclusive Zones"
        subtitle="Special offers for you"
        icon="diamond"
        iconColor={colors.brand.purpleLight}
        showViewAll={false}
      />
      <View style={styles.grid}>
        {categories.map((category) => {
          const bgColor = isDark
            ? `${category.iconColor}15`
            : category.backgroundColor;
          const borderColor = isDark
            ? `${category.iconColor}30`
            : category.backgroundColor;

          return (
            <Pressable
              key={category.id}
              style={[
                styles.card,
                {
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                },
              ]}
              onPress={() => handleCategoryPress(category)}
             
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${category.iconColor}25` },
                ]}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={category.iconColor}
                />
              </View>
              <Text style={styles.name}>{category.name}</Text>
              <Text style={styles.count}>{category.offersCount} offers</Text>
              <View style={styles.viewButton}>
                <Text
                  style={[styles.viewText, { color: category.iconColor }]}
                >
                  Explore
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={12}
                  color={category.iconColor}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(ExclusiveCategoriesGrid);
