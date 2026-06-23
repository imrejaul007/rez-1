/**
 * MallNewArrivalCard Component
 *
 * Card for new arrival brands - uses MallBrandCard-style layout
 * with image, name, coins pill, and blue theme
 */

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallBrand } from '../../../types/mall.types';
import { colors } from '@/constants/theme';

interface MallNewArrivalCardProps {
  brand: MallBrand;
  onPress: (brand: MallBrand) => void;
  width?: number;
  index?: number;
}

const GRADIENT_COLORS: string[][] = [
  [colors.nileBlue, colors.brand.nileBlueLight],
  [colors.brand.sky, colors.brand.skyDark],
  [colors.brand.nileBlueLight, colors.brand.sky],
  [colors.brand.skyDark, colors.nileBlue],
  [colors.cyanDark, colors.brand.skyDark],
  [colors.nileBlue, colors.brand.sky],
];

const MallNewArrivalCard: React.FC<MallNewArrivalCardProps> = ({
  brand,
  onPress,
  width = 170,
  index = 0,
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const brandName = brand.name || 'Brand';
  const gradientColors = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  const rewardPercent = brand.cashback?.percentage ?? 0;
  const hasEarlyBird = (brand.cashback?.earlyBirdBonus ?? 0) > 0;

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={() => onPress(brand)}
     
    >
      <View style={styles.card}>
        {/* Image Area */}
        <View style={styles.imageWrapper}>
          {!imageError && brand.logo ? (
            <CachedImage
              source={brand.logo}
              style={styles.image}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <LinearGradient
              colors={gradientColors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageFallback}
            >
              <Text style={styles.fallbackText}>{getInitials(brandName)}</Text>
            </LinearGradient>
          )}

          {/* Bottom gradient for readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.imageOverlay}
          />

          {/* NEW badge */}
          <View style={styles.newBadge}>
            <Ionicons name="sparkles" size={8} color={colors.background.primary} />
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>

          {/* Coin reward pill */}
          {rewardPercent > 0 && (
            <View style={styles.coinPill}>
              <Ionicons name="flash" size={10} color={colors.background.primary} />
              <Text style={styles.coinPillText}>{rewardPercent}% coins</Text>
            </View>
          )}
        </View>

        {/* Info Area */}
        <View style={styles.infoArea}>
          <Text style={styles.brandName} numberOfLines={1}>
            {brandName}
          </Text>

          {/* Category */}
          {brand.mallCategory && (
            <Text style={styles.categoryText} numberOfLines={1}>
              {brand.mallCategory.name}
            </Text>
          )}

          {/* Early Bird Bonus */}
          {hasEarlyBird && (
            <View style={styles.earlyBirdPill}>
              <Ionicons name="gift" size={10} color={colors.brand.sky} />
              <Text style={styles.earlyBirdText}>
                +{brand.cashback?.earlyBirdBonus ?? 0} bonus
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F0F8',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 10px rgba(26, 58, 82, 0.08)',
      },
    }),
  },
  imageWrapper: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#F0F4F8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.background.primary,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
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
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.sky,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  coinPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  coinPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  infoArea: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 3,
  },
  categoryText: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  earlyBirdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.lavenderMist,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  earlyBirdText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.sky,
  },
});

export default memo(MallNewArrivalCard);
