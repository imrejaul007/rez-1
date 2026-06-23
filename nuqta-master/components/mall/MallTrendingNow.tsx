// @ts-nocheck
/**
 * MallTrendingNow Component
 *
 * Horizontal scroll section showing trending/popular stores
 * based on recent views and orders. Warm gradient container
 * with fire icon and social proof indicators.
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
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallBrand } from '../../types/mall.types';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

interface MallTrendingNowProps {
  brands: MallBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: MallBrand) => void;
  onViewAllPress?: () => void;
}

const MallTrendingNow: React.FC<MallTrendingNowProps> = ({
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

      return (
        <Pressable
          style={styles.card}
          onPress={() => onBrandPress(item)}
         
        >
          {/* Trending Rank Badge */}
          <View style={styles.rankBadge}>
            <LinearGradient
              colors={[colors.error, colors.error]}
              style={styles.rankGradient}
            >
              <Ionicons name="flame" size={10} color={colors.background.primary} />
              <Text style={styles.rankText}>#{index + 1}</Text>
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

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={colors.warningScale[400]} />
            <Text style={styles.ratingText}>
              {(item.ratings?.average || 0) > 0 ? (item.ratings?.average || 0).toFixed(1) : 'New'}
            </Text>
            {(item.ratings?.count || 0) > 0 && (
              <Text style={styles.ratingCount}>({item.ratings?.count})</Text>
            )}
          </View>

          {/* Views/Orders indicator */}
          <View style={styles.trendingIndicator}>
            <Ionicons name="trending-up" size={12} color={colors.brand.sky} />
            <Text style={styles.trendingText}>Popular</Text>
          </View>

          {/* Coin Reward */}
          {(item.cashback?.percentage || 0) > 0 && (
            <View style={styles.coinRow}>
              <Ionicons name="flash" size={11} color={colors.brand.sky} />
              <Text style={styles.coinText}>{item.cashback?.percentage || 0}% Coins</Text>
            </View>
          )}
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
          colors={[colors.tint.blue, colors.tint.blueLight, colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.error, colors.error]}
              style={styles.iconWrapper}
            >
              <Ionicons name="flame" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Trending Now</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.brand.sky} />
            <Text style={styles.loadingText}>Loading trending stores...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!brands || brands.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.tint.blue, colors.tint.blueLight, colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.error, colors.error]}
              style={styles.iconWrapper}
            >
              <Ionicons name="flame" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Trending Now</Text>
          </View>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="trending-up-outline" size={24} color={colors.neutral[500]} />
            <Text style={styles.emptyStateText}>Trending section loading</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.tint.blue, colors.tint.blueLight, colors.background.primary]}
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
            colors={[colors.error, colors.error]}
            style={styles.iconWrapper}
          >
            <Ionicons name="flame" size={18} color={colors.background.primary} />
          </LinearGradient>
          <Text style={styles.title}>Trending Now</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={styles.headerSpacer} />
          {onViewAllPress && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <Text style={styles.viewAllText}>View All</Text>
              <View style={styles.viewAllArrow}>
                <Ionicons name="arrow-forward" size={14} color={colors.brand.sky} />
              </View>
            </Pressable>
          )}
        </View>

        <Text style={styles.subtitle}>
          Most popular stores this week
        </Text>

        {/* Stats Row */}
        <View style={styles.statsWrapper}>
          <LinearGradient
            colors={['rgba(2, 132, 199, 0.1)', 'rgba(3, 105, 161, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statsContainer}
          >
            <View style={styles.statItem}>
              <Ionicons name="flame" size={14} color={colors.error} />
              <Text style={styles.statValue}>{brands.length}</Text>
              <Text style={styles.statLabel}>Trending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color={colors.warningScale[400]} />
              <Text style={styles.statValue}>
                {brands.length > 0
                  ? (brands.reduce((s, b) => s + (b.ratings?.average || 0), 0) / brands.length).toFixed(1)
                  : '4.5'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={14} color={colors.brand.sky} />
              <Text style={styles.statValue}>
                {brands.length > 0
                  ? Math.round(brands.reduce((s, b) => s + (b.cashback?.percentage || 0), 0) / brands.length)
                  : 5}%
              </Text>
              <Text style={styles.statLabel}>Avg Coins</Text>
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.error,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    paddingHorizontal: 16,
    marginBottom: 12,
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
    gap: 6,
  },
  statValue: {
    fontSize: 15,
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
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.sky,
  },
  viewAllArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.tint.blue,
    alignItems: 'center',
    justifyContent: 'center',
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
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 2,
  },
  rankText: {
    fontSize: 10,
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
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
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
  ratingCount: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  trendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tint.blue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.sky,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  coinText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.skyDark,
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
    color: colors.neutral[500],
    fontWeight: '500',
  },
});

export default memo(MallTrendingNow);
