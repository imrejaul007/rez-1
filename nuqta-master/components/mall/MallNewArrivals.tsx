// @ts-nocheck
/**
 * MallNewArrivals Component
 *
 * Horizontal scrolling section for new arrival brands
 * with early-bird rewards and blue Mall theme
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
import MallNewArrivalCard from './cards/MallNewArrivalCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

interface MallNewArrivalsProps {
  brands: MallBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: MallBrand) => void;
  onViewAllPress?: () => void;
}

const MallNewArrivals: React.FC<MallNewArrivalsProps> = ({
  brands,
  isLoading = false,
  onBrandPress,
  onViewAllPress,
}) => {
  const renderBrand = useCallback(
    ({ item, index }: { item: MallBrand; index: number }) => (
      <MallNewArrivalCard brand={item} onPress={onBrandPress} index={index} />
    ),
    [onBrandPress]
  );

  const keyExtractor = useCallback((item: MallBrand) => item.id || item._id, []);

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
              colors={[colors.nileBlue, colors.brand.sky]}
              style={styles.iconWrapper}
            >
              <Ionicons name="sparkles" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>New Arrivals</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.brand.sky} />
            <Text style={styles.loadingText}>Loading new brands...</Text>
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
              colors={[colors.nileBlue, colors.brand.sky]}
              style={styles.iconWrapper}
            >
              <Ionicons name="sparkles" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>New Arrivals</Text>
          </View>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="sparkles-outline" size={24} color={colors.brand.skyDark} />
            <Text style={styles.emptyStateText}>New arrivals launching soon</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

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
            colors={[colors.nileBlue, colors.brand.sky]}
            style={styles.iconWrapper}
          >
            <Ionicons name="sparkles" size={18} color={colors.background.primary} />
          </LinearGradient>
          <Text style={styles.title}>New Arrivals</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
          <View style={styles.headerSpacer} />
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

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Fresh brands with exclusive early-bird rewards
        </Text>

        {/* Early Bird Banner */}
        <View style={styles.earlyBirdWrapper}>
          <LinearGradient
            colors={[colors.lavenderMist, '#E0F2FE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.earlyBirdBanner}
          >
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.earlyBirdIcon}
            >
              <Ionicons name="gift" size={16} color={colors.background.primary} />
            </LinearGradient>
            <View style={styles.earlyBirdContent}>
              <Text style={styles.earlyBirdTitle}>Early Bird Bonus!</Text>
              <Text style={styles.earlyBirdText}>
                Earn bonus coins when you shop new brands
              </Text>
            </View>
            <View style={styles.earlyBirdArrow}>
              <Ionicons name="chevron-forward" size={18} color={colors.brand.sky} />
            </View>
          </LinearGradient>
        </View>

        {/* Brands List */}
        <FlashList
          data={brands}
          renderItem={renderBrand}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={4}
          windowSize={4}
          initialNumToRender={2}
          estimatedItemSize={180}
        />
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
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
  },
  decorCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -20,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
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
  newBadge: {
    backgroundColor: colors.brand.sky,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 1,
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
  earlyBirdWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  earlyBirdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    gap: 12,
  },
  earlyBirdIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earlyBirdContent: {
    flex: 1,
  },
  earlyBirdTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 2,
  },
  earlyBirdText: {
    fontSize: 12,
    color: colors.brand.skyDark,
    lineHeight: 16,
  },
  earlyBirdArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 28,
    paddingBottom: 8,
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

export default memo(MallNewArrivals);
