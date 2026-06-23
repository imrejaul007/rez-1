/**
 * MallCategoriesGrid Component
 *
 * 2-column grid of mall categories with glassmorphism design
 * Features vibrant multi-color gradients and modern styling
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallCategory } from '../../types/mall.types';
import MallCategoryCard from './cards/MallCategoryCard';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

interface MallCategoriesGridProps {
  categories: MallCategory[];
  isLoading?: boolean;
  onCategoryPress: (category: MallCategory) => void;
  onViewAllPress?: () => void;
}

const MallCategoriesGrid: React.FC<MallCategoriesGridProps> = ({
  categories,
  isLoading = false,
  onCategoryPress,
  onViewAllPress,
}) => {
  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[colors.nileBlue, colors.brand.nileBlueLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="apps" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Shop by Category</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.nileBlue} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (!categories || categories.length === 0) {
    return (
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <LinearGradient
                colors={[colors.nileBlue, colors.brand.nileBlueLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Ionicons name="apps" size={18} color={colors.background.primary} />
              </LinearGradient>
              <View>
                <Text style={styles.title}>Shop by Category</Text>
                <Text style={styles.subtitle}>
                  Explore categories
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Empty State Placeholder */}
        <View style={styles.emptyStateContainer}>
          <Ionicons name="apps-outline" size={24} color={colors.neutral[400]} />
          <Text style={styles.emptyStateText}>Categories being organized</Text>
        </View>
      </View>
    );
  }

  // Limit to 6 categories initially for cleaner layout
  const displayCategories = categories.slice(0, 6);

  // Create rows of 2 categories each
  const rows: MallCategory[][] = [];
  for (let i = 0; i < displayCategories.length; i += 2) {
    rows.push(displayCategories.slice(i, i + 2));
  }

  // Calculate total index for color mapping
  let categoryIndex = 0;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[colors.nileBlue, colors.brand.nileBlueLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="apps" size={18} color={colors.background.primary} />
            </LinearGradient>
            <View>
              <Text style={styles.title}>Shop by Category</Text>
              <Text style={styles.subtitle}>
                Explore {categories.length}+ categories
              </Text>
            </View>
          </View>

          {onViewAllPress && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <LinearGradient
                colors={[colors.nileBlue, colors.brand.nileBlueLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewAllGradient}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <View style={styles.viewAllArrow}>
                  <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
                </View>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>

      {/* Categories Grid */}
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((category) => {
              const currentIndex = categoryIndex++;
              return (
                <MallCategoryCard
                  key={category.id || category._id}
                  category={category}
                  onPress={onCategoryPress}
                  width={CARD_WIDTH}
                  index={currentIndex}
                />
              );
            })}
            {/* Add placeholder if odd number of items in last row */}
            {row.length === 1 && <View style={{ width: CARD_WIDTH, margin: 6 }} />}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  viewAllButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  viewAllArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    paddingHorizontal: 11,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  emptyStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.neutral[400],
    fontWeight: '500',
  },
});

export default memo(MallCategoriesGrid);
