/**
 * MallTopRated Component
 *
 * Premium list section for top-rated brands with ratings and success rate
 * Modern design with gradients, ranking badges, and enhanced visuals
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallBrand } from '../../types/mall.types';
import MallTopRatedItem from './cards/MallTopRatedItem';
import { colors } from '@/constants/theme';

interface MallTopRatedProps {
  brands: MallBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: MallBrand) => void;
  onViewAllPress?: () => void;
  limit?: number;
}

const MallTopRated: React.FC<MallTopRatedProps> = ({
  brands,
  isLoading = false,
  onBrandPress,
  onViewAllPress,
  limit = 5,
}) => {
  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.lavenderMist, colors.tint.blue, colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="trophy" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Top Rated Brands</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.brand.sky} />
            <Text style={styles.loadingText}>Loading top brands...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Empty state
  if (!brands || brands.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.lavenderMist, colors.tint.blue, colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Section Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="trophy" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Top Rated Brands</Text>
          </View>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="ribbon-outline" size={24} color={colors.brand.skyDark} />
            <Text style={styles.emptyStateText}>Top rated stores appearing soon</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const displayBrands = brands.slice(0, limit);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.lavenderMist, colors.tint.blue, colors.background.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        {/* Section Header */}
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[colors.brand.sky, colors.brand.skyDark]}
            style={styles.iconWrapper}
          >
            <Ionicons name="trophy" size={18} color={colors.background.primary} />
          </LinearGradient>
          <Text style={styles.title}>Top Rated Brands</Text>
          <View style={styles.headerSpacer} />
          {onViewAllPress && brands.length > limit && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <LinearGradient
                colors={[colors.brand.sky, colors.brand.skyDark]}
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

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Trusted by users with highest success rates
        </Text>

        {/* Stats Row */}
        <View style={styles.statsWrapper}>
          <LinearGradient
            colors={['rgba(2, 132, 199, 0.08)', 'rgba(223, 235, 247, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statsContainer}
          >
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                <Ionicons name="star" size={14} color={colors.brand.sky} />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {brands.length > 0
                    ? (brands.reduce((sum, b) => sum + (b.ratings?.average || 0), 0) / brands.length).toFixed(1)
                    : '4.5'}+
                </Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.brand.sky} />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {brands.length > 0
                    ? Math.round(brands.reduce((sum, b) => sum + (b.ratings?.successRate || 100), 0) / brands.length)
                    : 95}%
                </Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(26, 58, 82, 0.1)' }]}>
                <Ionicons name="storefront" size={14} color={colors.nileBlue} />
              </View>
              <View>
                <Text style={styles.statValue}>{brands.length}</Text>
                <Text style={styles.statLabel}>Top Brands</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Brands List */}
        <View style={styles.listContainer}>
          {displayBrands.map((brand, index) => (
            <MallTopRatedItem
              key={brand.id || brand._id}
              brand={brand}
              onPress={onBrandPress}
              rank={index + 1}
            />
          ))}
        </View>

        {/* View More Button */}
        {brands.length > limit && onViewAllPress && (
          <Pressable
            style={styles.viewMoreButton}
            onPress={onViewAllPress}
           
          >
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewMoreGradient}
            >
              <Text style={styles.viewMoreText}>
                View All {brands.length} Brands
              </Text>
              <View style={styles.viewMoreArrow}>
                <Ionicons name="arrow-forward" size={16} color={colors.brand.sky} />
              </View>
            </LinearGradient>
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  gradientBackground: {
    paddingVertical: 20,
    borderRadius: 24,
    marginHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -20,
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sky,
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
    color: colors.brand.skyDark,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sky,
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
  statsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  viewMoreButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  viewMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  viewMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
  },
  viewMoreArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.brand.skyDark,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.brand.skyDark,
    fontWeight: '500',
  },
});

export default memo(MallTopRated);
