// @ts-nocheck
/**
 * MallLuxuryZone Component
 *
 * Ultra-premium section for luxury brands with elegant dark + gold theme
 * Modern design with glass morphism, gradients, and premium visuals
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallBrand } from '../../types/mall.types';
import MallLuxuryBrandCard from './cards/MallLuxuryBrandCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MallLuxuryZoneProps {
  brands: MallBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: MallBrand) => void;
  onViewAllPress?: () => void;
}

const MallLuxuryZone: React.FC<MallLuxuryZoneProps> = ({
  brands,
  isLoading = false,
  onBrandPress,
  onViewAllPress,
}) => {
  const renderBrand = useCallback(
    ({ item, index }: { item: MallBrand; index: number }) => (
      <MallLuxuryBrandCard brand={item} onPress={onBrandPress} index={index} />
    ),
    [onBrandPress]
  );

  const keyExtractor = useCallback((item: MallBrand) => item.id || item._id, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.nileBlue, colors.brand.nileBlueLight, colors.nileBlue]}
          style={styles.gradientContainer}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <LinearGradient colors={[colors.warningScale[400], colors.warningScale[700]]} style={styles.iconWrapper}>
                <Ionicons name="diamond" size={20} color={colors.nileBlue} />
              </LinearGradient>
              <Text style={styles.title}>Luxury Zone</Text>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.warningScale[700]} />
            <Text style={styles.loadingText}>Loading luxury brands...</Text>
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
          colors={[colors.nileBlue, colors.brand.nileBlueLight, colors.nileBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Section Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <LinearGradient
                colors={[colors.warningScale[400], colors.warningScale[700]]}
                style={styles.iconWrapper}
              >
                <Ionicons name="diamond" size={20} color={colors.nileBlue} />
              </LinearGradient>
              <Text style={styles.title}>Luxury Zone</Text>
            </View>
          </View>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="diamond-outline" size={24} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.emptyStateText}>Luxury zone coming soon</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.nileBlue, colors.brand.nileBlueLight, colors.nileBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Decorative Elements */}
        <View style={styles.decorElements}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0)']}
            style={styles.decorGlow1}
          />
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0)']}
            style={styles.decorGlow2}
          />
          <View style={styles.decorLine1} />
          <View style={styles.decorLine2} />
        </View>

        {/* Section Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[colors.warningScale[400], colors.warningScale[700]]}
              style={styles.iconWrapper}
            >
              <Ionicons name="diamond" size={20} color={colors.nileBlue} />
            </LinearGradient>
            <View>
              <Text style={styles.title}>Luxury Zone</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={10} color={colors.warningScale[400]} />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            </View>
          </View>
          {onViewAllPress && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <Text style={styles.viewAllText}>Explore All</Text>
              <LinearGradient
                colors={[colors.warningScale[400], colors.warningScale[700]]}
                style={styles.viewAllArrow}
              >
                <Ionicons name="arrow-forward" size={14} color={colors.nileBlue} />
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Exclusive access to world-class luxury brands
        </Text>

        {/* Premium Features Row */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']}
              style={styles.featureIconBg}
            >
              <Ionicons name="shield-checkmark" size={16} color={colors.warningScale[400]} />
            </LinearGradient>
            <Text style={styles.featureText}>Verified Authentic</Text>
          </View>
          <View style={styles.featureItem}>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']}
              style={styles.featureIconBg}
            >
              <Ionicons name="gift" size={16} color={colors.warningScale[400]} />
            </LinearGradient>
            <Text style={styles.featureText}>Premium Rewards</Text>
          </View>
          <View style={styles.featureItem}>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']}
              style={styles.featureIconBg}
            >
              <Ionicons name="ribbon" size={16} color={colors.warningScale[400]} />
            </LinearGradient>
            <Text style={styles.featureText}>VIP Service</Text>
          </View>
        </View>

        {/* Horizontal Brands List */}
        <FlashList
          data={brands}
          renderItem={renderBrand}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={SCREEN_WIDTH * 0.75 + 14}
          decelerationRate="fast"
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={3}
          windowSize={3}
          initialNumToRender={2}
          estimatedItemSize={180}
        />

        {/* Bottom CTA */}
        <Pressable
          style={styles.bottomCta}
          onPress={onViewAllPress}
         
        >
          <LinearGradient
            colors={[colors.warningScale[400], colors.warningScale[700], colors.nileBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaIconWrapper}>
              <Ionicons name="diamond" size={18} color={colors.nileBlue} />
            </View>
            <Text style={styles.ctaText}>Discover All Luxury Brands</Text>
            <View style={styles.ctaArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.warningScale[400]} />
            </View>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginHorizontal: 12,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[400],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  gradientContainer: {
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  decorElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorGlow1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorGlow2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  decorLine1: {
    position: 'absolute',
    top: 60,
    right: 0,
    width: 80,
    height: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  decorLine2: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    width: 60,
    height: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.warningScale[400],
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warningScale[400],
  },
  viewAllArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  bottomCta: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  ctaIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 58, 82, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: 0.3,
  },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 58, 82, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
});

export default memo(MallLuxuryZone);
