/**
 * Price Section
 *
 * Bottom price bar with Buy Now button
 * Premium Nuqta design palette
 */

import React from 'react';
import { View, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PriceSectionProps } from '@/types/cart';
import { useGetCurrencySymbol, useFormatPrice, useGetLocale } from '@/stores/selectors';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

function PriceSection({
  totalPrice,
  onBuyNow,
  itemCount = 0,
  loading = false
}: PriceSectionProps) {
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 360;
  const scaleAnim = useSharedValue(1);
  const getCurrencySymbol = useGetCurrencySymbol();
  const formatPrice = useFormatPrice();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const handleBuyNowPress = () => {
    scaleAnim.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));

    onBuyNow();
  };

  const formattedPrice = new Intl.NumberFormat(locale).format(totalPrice);

  return (
    <View style={styles.container}>
      {/* Top Border Gradient */}
      <LinearGradient
        colors={[colors.nuqta.mustard, colors.nuqta.peach, colors.nuqta.linen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBorderGradient}
      />

      <View style={styles.content}>
        {/* Price Information */}
        <View style={styles.priceContainer}>
          <ThemedText style={[
            styles.priceLabel,
            { fontSize: isSmallScreen ? 12 : 13 }
          ]}>
            Price
          </ThemedText>
          <ThemedText style={[
            styles.totalPrice,
            { fontSize: isSmallScreen ? 22 : 24 }
          ]}>
            {currencySymbol}{formattedPrice}
          </ThemedText>
          {itemCount > 0 && (
            <View style={styles.itemCountBadge}>
              <ThemedText style={styles.itemCount}>
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Buy Now Button */}
        <Animated.View style={[
          styles.buttonContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <Pressable
            onPress={handleBuyNowPress}
            disabled={loading || totalPrice === 0}
           
            style={styles.buyNowButton}
            accessibilityLabel={loading ? "Processing order" : `Proceed to checkout with ${itemCount} item${itemCount !== 1 ? 's' : ''} for ${currencySymbol}${formattedPrice}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to proceed to checkout and complete your purchase"
            accessibilityState={{ disabled: loading || totalPrice === 0, busy: loading }}
          >
            <LinearGradient
              colors={loading || totalPrice === 0 ? [colors.neutral[400], colors.neutral[500]] : [colors.nuqta.mustard, colors.nuqta.peach]}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonIconWrapper}>
                  <Ionicons
                    name="bag"
                    size={isSmallScreen ? 16 : 18}
                    color={loading || totalPrice === 0 ? colors.background.primary : colors.nuqta.nileBlue}
                  />
                </View>
                <ThemedText style={[
                  styles.buttonText,
                  { fontSize: isSmallScreen ? 15 : 16 },
                  !(loading || totalPrice === 0) && { color: colors.nuqta.nileBlue }
                ]}>
                  {loading ? 'Processing...' : 'Buy Now'}
                </ThemedText>
                {!loading && totalPrice > 0 && (
                  <View style={styles.arrowWrapper}>
                    <Ionicons name="arrow-forward" size={16} color={colors.nuqta.nileBlue} />
                  </View>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.nileBlue,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    paddingBottom: Platform.OS === 'ios' ? 34 : 70,
  },
  topBorderGradient: {
    height: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 80,
  },
  priceContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  priceLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  totalPrice: {
    color: colors.nuqta.nileBlue,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  itemCountBadge: {
    marginTop: 4,
    backgroundColor: colors.nuqta.linen,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  itemCount: {
    ...typography.caption,
    fontSize: 11,
    color: colors.nuqta.nileBlue,
    fontWeight: '600',
  },
  buttonContainer: {
    flex: 1,
    maxWidth: 180,
  },
  buyNowButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.mustard,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  gradientButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  arrowWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(PriceSection);
