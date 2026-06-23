// @ts-nocheck
/**
 * MallRewardBoosters Component
 *
 * Section highlighting stores with the highest Nuqta Coin rewards.
 * Drives purchases to high-reward stores with prominent coin percentages.
 * Blue-gold gradient container matching the Nuqta Coins theme.
 */

import React, { memo, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallBrand } from '../../types/mall.types';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

interface MallRewardBoostersProps {
  brands: MallBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: MallBrand) => void;
  onViewAllPress?: () => void;
}

const MallRewardBoosters: React.FC<MallRewardBoostersProps> = ({
  brands,
  isLoading = false,
  onBrandPress,
  onViewAllPress,
}) => {
  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const renderItem = useCallback(
    ({ item, index }: { item: MallBrand; index: number }) => {
      const hasLogo = item.logo && !item.logo.includes('placeholder');
      const coinPercent = item.cashback?.percentage || 0;

      return (
        <Pressable
          style={styles.card}
          onPress={() => onBrandPress(item)}
         
        >
          {/* Big Coin Badge */}
          <View style={styles.coinBadgeWrapper}>
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.coinBadge}
            >
              <Ionicons name="flash" size={12} color={colors.background.primary} />
              <Text style={styles.coinBadgeText}>{coinPercent}%</Text>
            </LinearGradient>
          </View>

          {/* Store Logo */}
          <View style={styles.logoContainer}>
            {hasLogo ? (
              <CachedImage
                source={item.logo}
                style={styles.logo}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={[colors.nileBlue, colors.brand.nileBlueLight]}
                style={styles.logoFallback}
              >
                <Text style={styles.logoInitials}>{getInitials(item.name || 'Store')}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Store Info */}
          <Text style={styles.storeName} numberOfLines={1}>{item.name || 'Store'}</Text>

          {/* Category */}
          {item.mallCategory?.name && (
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.mallCategory.name}
            </Text>
          )}

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={colors.warningScale[400]} />
            <Text style={styles.ratingText}>
              {(item.ratings?.average || 0) > 0 ? (item.ratings?.average || 0).toFixed(1) : 'New'}
            </Text>
          </View>

          {/* Earn More CTA */}
          <View style={styles.earnMore}>
            <Text style={styles.earnMoreText}>Earn Coins</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.brand.sky} />
          </View>
        </Pressable>
      );
    },
    [onBrandPress]
  );

  const keyExtractor = useCallback((item: MallBrand) => item.id || item._id, []);

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
              <Ionicons name="rocket" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Reward Boosters</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.brand.sky} />
            <Text style={styles.loadingText}>Loading reward boosters...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!brands || brands.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.lavenderMist, colors.tint.blue, colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="rocket" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Reward Boosters</Text>
          </View>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="trophy-outline" size={24} color={colors.brand.skyDark} />
            <Text style={styles.emptyStateText}>Reward boosters loading</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Compute stats
  const maxCoin = Math.max(...brands.map(b => b.cashback?.percentage || 0));
  const avgCoin = brands.length > 0
    ? Math.round(brands.reduce((s, b) => s + (b.cashback?.percentage || 0), 0) / brands.length)
    : 0;

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

        {/* Header */}
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[colors.brand.sky, colors.brand.skyDark]}
            style={styles.iconWrapper}
          >
            <Ionicons name="rocket" size={18} color={colors.background.primary} />
          </LinearGradient>
          <Text style={styles.title}>Reward Boosters</Text>
          <View style={styles.headerSpacer} />
          {onViewAllPress && (
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

        <Text style={styles.subtitle}>
          {`Stores with the highest ${BRAND.COIN_SINGLE} rewards`}
        </Text>

        {/* Stats Banner */}
        <View style={styles.statsWrapper}>
          <LinearGradient
            colors={['rgba(2, 132, 199, 0.08)', 'rgba(223, 235, 247, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statsContainer}
          >
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                <Ionicons name="flash" size={14} color={colors.brand.sky} />
              </View>
              <View>
                <Text style={styles.statValue}>Up to {maxCoin}%</Text>
                <Text style={styles.statLabel}>Max Coins</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                <Ionicons name="trending-up" size={14} color={colors.brand.sky} />
              </View>
              <View>
                <Text style={styles.statValue}>{avgCoin}% Avg</Text>
                <Text style={styles.statLabel}>Coin Rate</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(26, 58, 82, 0.1)' }]}>
                <Ionicons name="storefront" size={14} color={colors.nileBlue} />
              </View>
              <View>
                <Text style={styles.statValue}>{brands.length}</Text>
                <Text style={styles.statLabel}>Stores</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Brands List */}
        <FlashList
          data={brands}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={155}
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={3}
          estimatedItemSize={150}
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
      android: { elevation: 4 },
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
      android: { elevation: 4 },
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
    marginBottom: 14,
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
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 28,
    paddingBottom: 8,
  },
  card: {
    width: 140,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.tint.blueLight,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sky,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  coinBadgeWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 2,
  },
  coinBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background.primary,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  logoInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nileBlue,
    textAlign: 'center',
    marginBottom: 2,
    width: '100%',
  },
  categoryText: {
    fontSize: 11,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  earnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tint.blue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 'auto',
  },
  earnMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.sky,
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

export default memo(MallRewardBoosters);
