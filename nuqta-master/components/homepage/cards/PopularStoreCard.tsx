// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
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
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

export interface PopularStoreCardProps {
  store: {
    id: string;
    name: string;
    logo?: string;
    image?: string;
    banner?: string | string[];
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

// Calculate reward amount based on cashback percentage
const calculateRewardAmount = (cashbackPercentage: number): number => {
  const avgOrderAmount = 1400; // Estimated average order amount in INR
  return Math.round((cashbackPercentage / 100) * avgOrderAmount);
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: PopularStoreCardProps, nextProps: PopularStoreCardProps) => {
  return (
    prevProps.store.id === nextProps.store.id &&
    prevProps.width === nextProps.width &&
    prevProps.store.rating?.value === nextProps.store.rating?.value &&
    prevProps.store.distance === nextProps.store.distance &&
    prevProps.store.cashback?.percentage === nextProps.store.cashback?.percentage
  );
};

function PopularStoreCard({ store, onPress, width = 170 }: PopularStoreCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Get the logo URL (prioritize logo, then first banner, then image)
  const logoUrl = useMemo(() => {
    if (store.logo) {
      return store.logo;
    }
    if (store.banner) {
      if (Array.isArray(store.banner) && store.banner.length > 0) {
        return store.banner[0];
      }
      if (typeof store.banner === 'string') {
        return store.banner;
      }
    }
    return store.image || '';
  }, [store.logo, store.banner, store.image]);

  // Format rating
  const formattedRating = useMemo(() => {
    return typeof store.rating?.value === 'number'
      ? store.rating.value.toFixed(1)
      : store.rating?.value || '0.0';
  }, [store.rating?.value]);

  // Calculate reward amount
  const rewardAmount = useMemo(() => {
    const percentage = store.cashback?.percentage || 10;
    return calculateRewardAmount(percentage);
  }, [store.cashback?.percentage]);

  // Format distance
  const formattedDistance = useMemo(() => {
    if (store.distance) {
      // If distance already has "km" or "away", return as is
      if (store.distance.toLowerCase().includes('away')) {
        return store.distance;
      }
      return `${store.distance} away`;
    }
    return '';
  }, [store.distance]);

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
        {/* Logo and Info Row */}
        <View style={styles.mainRow}>
          {/* Store Logo */}
          <View style={styles.logoContainer}>
            {logoUrl ? (
              <CachedImage
                source={{ uri: logoUrl }}
                style={styles.logo}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.logo, styles.placeholderLogo]}>
                <Ionicons name="storefront-outline" size={24} color={colors.neutral[400]} />
              </View>
            )}
          </View>

          {/* Store Info */}
          <View style={styles.infoContainer}>
            {/* Store Name */}
            <ThemedText style={styles.name} numberOfLines={1}>
              {store.name}
            </ThemedText>

            {/* Rating */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.lightMustard} />
              <ThemedText style={styles.ratingText}>
                {formattedRating}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Row - Distance and Reward */}
        <View style={styles.bottomRow}>
          {/* Distance */}
          {formattedDistance && (
            <ThemedText style={styles.distanceText}>
              {formattedDistance}
            </ThemedText>
          )}

          {/* Reward Amount */}
          <ThemedText style={styles.rewardText}>
            {currencySymbol}{rewardAmount}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default React.memo(PopularStoreCard, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    marginRight: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    marginLeft: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.lightMustard,
  },
});
