// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import CachedImage from '@/components/ui/CachedImage';
import { colors } from '@/constants/theme';

export interface TopStoreCardProps {
  store: {
    id: string;
    name: string;
    image?: string;
    banner?: string | string[];
    logo?: string;
    rating: {
      value: number;
      count?: number;
    };
    distance?: string;
    cashback?: {
      percentage: number;
      maxAmount?: number;
    };
    category?: string;
  };
  onPress: (store: any) => void;
  width?: number;
}

// Calculate Nuqta coins based on cashback percentage and average order
// Nuqta coins are typically 1 coin per ₹2 cashback earned
const calculateNuqtaCoins = (cashbackPercentage: number): number => {
  const avgOrderAmount = 1200; // Estimated average order amount in INR
  const cashbackAmount = (cashbackPercentage / 100) * avgOrderAmount;
  const coinsPerRupee = 0.5; // 1 coin per ₹2 cashback = 0.5 coins per ₹1
  return Math.round(cashbackAmount * coinsPerRupee);
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: TopStoreCardProps, nextProps: TopStoreCardProps) => {
  return (
    prevProps.store.id === nextProps.store.id &&
    prevProps.width === nextProps.width &&
    prevProps.store.rating?.value === nextProps.store.rating?.value &&
    prevProps.store.distance === nextProps.store.distance &&
    prevProps.store.cashback?.percentage === nextProps.store.cashback?.percentage
  );
};

function TopStoreCard({ store, onPress, width = 180 }: TopStoreCardProps) {
  // Get the image URL (prioritize banner, then image, then logo)
  const imageUrl = useMemo(() => {
    if (store.banner) {
      if (Array.isArray(store.banner) && store.banner.length > 0) {
        return store.banner[0];
      }
      if (typeof store.banner === 'string') {
        return store.banner;
      }
    }
    return store.image || store.logo || '';
  }, [store.banner, store.image, store.logo]);

  // Format rating
  const formattedRating = useMemo(() => {
    return typeof store.rating?.value === 'number'
      ? store.rating.value.toFixed(1)
      : store.rating?.value || '0.0';
  }, [store.rating?.value]);

  // Get cashback percentage
  const cashbackPercentage = useMemo(() => {
    return store.cashback?.percentage || 5;
  }, [store.cashback?.percentage]);

  // Calculate Nuqta coins
  const nuqtaCoins = useMemo(() => {
    return calculateNuqtaCoins(cashbackPercentage);
  }, [cashbackPercentage]);

  // Handle press
  const handlePress = useCallback(() => {
    try {
      onPress(store);
    } catch (error) {
      // silently handle
    }
  }, [onPress, store]);

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
      delayPressIn={0}
      delayPressOut={0}
    >
      <ThemedView style={styles.card}>
        {/* Store Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <CachedImage
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Ionicons name="storefront-outline" size={40} color={colors.neutral[400]} />
            </View>
          )}
        </View>

        {/* Store Details */}
        <View style={styles.content}>
          {/* Store Name */}
          <ThemedText style={styles.name} numberOfLines={1}>
            {store.name}
          </ThemedText>

          {/* Rating and Distance Row */}
          <View style={styles.infoRow}>
            <Ionicons name="star" size={14} color={colors.brand.goldWarm} />
            <ThemedText style={styles.ratingText}>
              {formattedRating}
            </ThemedText>
            {store.distance && (
              <>
                <View style={styles.dot} />
                <ThemedText style={styles.distanceText}>
                  {store.distance}
                </ThemedText>
              </>
            )}
          </View>

          {/* Cashback and Nuqta Coins Row */}
          <View style={styles.cashbackEarnRow}>
            {/* Cashback Percentage - Left */}
            <View style={styles.cashbackRow}>
              <Ionicons name="refresh-circle" size={14} color={colors.lightMustard} />
              <ThemedText style={styles.cashbackText}>
                {cashbackPercentage}%
              </ThemedText>
            </View>

            {/* Earn Nuqta Coins Badge - Right */}
            <View style={styles.earnBadge}>
              <ThemedText style={styles.earnText}>
                {`Earn ${nuqtaCoins} ${BRAND.COIN_SINGLE}`}
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default React.memo(TopStoreCard, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
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
        boxShadow: '0px 4px 12px rgba(11, 34, 64, 0.08)',
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    width: '100%',
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[400],
    marginHorizontal: 6,
  },
  distanceText: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  cashbackEarnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cashbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  earnBadge: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
    flexShrink: 0,
  },
  earnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
});
