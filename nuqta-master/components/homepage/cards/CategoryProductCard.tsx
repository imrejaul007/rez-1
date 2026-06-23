// @ts-nocheck
import React, { memo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { HomepageProduct } from '@/services/productApi';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface CategoryProductCardProps {
  product: HomepageProduct;
  width?: number;
}

function CategoryProductCard({
  product,
  width = 156,
}: CategoryProductCardProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handlePress = () => {
    router.push(`/product-page?cardId=${product._id || product.id}&cardType=product`);
  };

  // Get cashback percentage
  const cashbackPercentage = product.cashbackPercentage || 0;
  const hasCashback = cashbackPercentage > 0;

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
    >
      <View style={styles.card}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {/* Background gradient for placeholder */}
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.08)', 'rgba(26, 58, 82, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imagePlaceholderBg}
          />

          {/* Loading indicator - just show gradient bg */}
          {imageLoading && !imageError && (
            <View style={styles.imagePlaceholder} />
          )}

          {/* Error fallback - just show gradient bg, no icon */}
          {imageError ? (
            <View style={styles.imagePlaceholder} />
          ) : (
            <CachedImage
              source={product.image || 'https://via.placeholder.com/160x140?text=No+Image'}
              style={[styles.image, imageLoading && styles.imageHidden]}
              contentFit="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}

          {/* Cashback Badge - Top Right */}
          {hasCashback && (
            <View style={styles.cashbackBadge}>
              <LinearGradient
                colors={[colors.lightMustard, colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cashbackGradient}
              >
                <ThemedText style={styles.cashbackBadgeText}>
                  {cashbackPercentage}%
                </ThemedText>
              </LinearGradient>
            </View>
          )}

          {/* Subtle overlay gradient at bottom of image */}
          {!imageError && !imageLoading && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.05)']}
              style={styles.imageOverlay}
            />
          )}
        </View>

        {/* Product Details */}
        <View style={styles.content}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {product.name}
          </ThemedText>

          {/* Cashback Pill */}
          <View style={styles.cashbackPill}>
            <View style={styles.coinIcon}>
              <ThemedText style={styles.coinText}>{currencySymbol}</ThemedText>
            </View>
            <ThemedText style={styles.cashbackPillText}>
              {hasCashback ? `Upto ${cashbackPercentage}% back` : 'Cashback'}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    height: 210,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.08)',
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
    overflow: 'hidden',
  },
  imagePlaceholderBg: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageHidden: {
    opacity: 0,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  errorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(255, 205, 87, 0.25)',
      },
    }),
  },
  cashbackGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cashbackBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
    fontFamily: 'Inter',
    letterSpacing: 0.3,
  },
  content: {
    padding: 12,
    paddingTop: 10,
    paddingBottom: 12,
    height: 90,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
    fontFamily: 'Inter',
    lineHeight: 17,
    letterSpacing: -0.1,
    height: 34,
  },
  cashbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  coinIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.lightMustard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  coinText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  cashbackPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nileBlue,
    fontFamily: 'Inter',
  },
});

export default memo(CategoryProductCard);
