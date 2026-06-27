// @ts-nocheck
/**
 * MallExclusiveOffers Component
 *
 * Horizontal scrolling section for exclusive mall offers
 * Upgraded with warm gradient container, pulsing LIVE indicator, and premium styling
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MallOffer } from '../../types/mall.types';
import MallOfferCard from './cards/MallOfferCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

interface MallExclusiveOffersProps {
  offers: MallOffer[];
  isLoading?: boolean;
  onOfferPress: (offer: MallOffer) => void;
  onViewAllPress?: () => void;
}

const MallExclusiveOffers: React.FC<MallExclusiveOffersProps> = ({
  offers,
  isLoading = false,
  onOfferPress,
  onViewAllPress,
}) => {
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
      }, [pulseAnim]);

  const renderOffer = useCallback(
    ({ item }: { item: MallOffer }) => (
      <MallOfferCard offer={item} onPress={onOfferPress} />
    ),
    [onOfferPress]
  );

  const keyExtractor = useCallback((item: MallOffer) => item.id || item._id, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.tint.orange, '#FFEDD5', colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.warningScale[400], colors.warningScale[700]]}
              style={styles.iconWrapper}
            >
              <Ionicons name="pricetag" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Exclusive Offers</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.warningScale[700]} />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Empty state
  if (!offers || offers.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.tint.orange, '#FFEDD5', colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Section Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.warningScale[400], colors.warningScale[700]]}
              style={styles.iconWrapper}
            >
              <Ionicons name="pricetag" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Exclusive Offers</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Limited time deals you don't want to miss
          </Text>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="gift-outline" size={24} color={colors.neutral[400]} />
            <Text style={styles.emptyStateText}>Exclusive offers loading soon</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.tint.orange, '#FFEDD5', colors.background.primary]}
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
            colors={[colors.warningScale[400], colors.warningScale[700]]}
            style={styles.iconWrapper}
          >
            <Ionicons name="pricetag" size={18} color={colors.background.primary} />
          </LinearGradient>
          <Text style={styles.title}>Exclusive Offers</Text>
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim }]} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <View style={styles.headerSpacer} />
          {onViewAllPress && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <LinearGradient
                colors={[colors.warningScale[400], colors.warningScale[700]]}
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
          Limited time deals you don't want to miss
        </Text>

        {/* Offers List */}
        <FlashList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={3}
          windowSize={3}
          initialNumToRender={2}
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
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  decorCircle1: {
    width: 130,
    height: 130,
    top: -40,
    right: -20,
  },
  decorCircle2: {
    width: 90,
    height: 90,
    bottom: -20,
    left: -15,
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
        shadowColor: colors.warningScale[400],
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.error,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand.amberDark,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.brand.amberDeep,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  viewAllButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[400],
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
    color: colors.brand.amberDeep,
    fontWeight: '500',
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

export default memo(MallExclusiveOffers);
