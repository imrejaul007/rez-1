/**
 * Travel Section - Converted from V2
 * Flights, Hotels, Trains, Bus, Cab, Packages
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import travelApi, { TravelServiceCategory } from '@/services/travelApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;

const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray600: colors.neutral[500],
  mustard: colors.lightMustard,
  green500: colors.lightMustard, // Migrated to mustard
};

const TravelSection: React.FC = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<TravelServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  // Fetch categories from backend
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getCategories();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setCategories(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleViewAll = () => {
    router.push('/travel' as any);
  };

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  // Get category data for main cards
  const flightsCategory = categories.find(c => c.id === 'flights');
  const hotelsCategory = categories.find(c => c.id === 'hotels');
  const trainsCategory = categories.find(c => c.id === 'trains');
  const busCategory = categories.find(c => c.id === 'bus');
  const cabCategory = categories.find(c => c.id === 'cab');
  const packagesCategory = categories.find(c => c.id === 'packages');

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingVertical: 20, alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={COLORS.green500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>✈️ Travel</Text>
          <Text style={styles.headerSubtitle}>Book trips, save big</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Main Cards Row */}
      <View style={styles.mainRow}>
        {/* Book Flights Card */}
        <Pressable
          style={styles.flightsCard}
          onPress={() => handlePress('/travel/flights')}
         
        >
          <LinearGradient
            colors={[colors.nileBlue, '#243f55', '#2d4a5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.flightsGradient}
          >
            <View style={styles.flightsTop}>
              <View style={styles.flightsIconBox}>
                <Text style={styles.flightsIcon}>{flightsCategory?.icon || '✈️'}</Text>
              </View>
              <View style={styles.bestPriceBadge}>
                <Text style={styles.bestPriceText}>BEST PRICE</Text>
              </View>
            </View>
            <Text style={styles.flightsTitle}>Book Flights</Text>
            <Text style={styles.flightsSubtitle}>Domestic & International</Text>
            <View style={styles.flightsBadges}>
              <View style={styles.instantBadge}>
                <Text style={styles.badgeText}>Instant Booking</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.badgeText}>
                  {flightsCategory?.cashback ? `${flightsCategory.cashback}% OFF` : '5% OFF'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Hotels Card */}
        <Pressable
          style={styles.hotelsCard}
          onPress={() => handlePress('/travel/hotels')}
         
        >
          <LinearGradient
            colors={[colors.lightPeach, colors.brand.sand, colors.brand.caramel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hotelsGradient}
          >
            <View style={styles.hotelsIconBox}>
              <Text style={styles.hotelsIcon}>{hotelsCategory?.icon || '🏨'}</Text>
            </View>
            <Text style={styles.hotelsTitle}>Hotels</Text>
            <Text style={styles.hotelsSubtitle}>Luxury to Budget</Text>
            <View style={styles.hotelDiscountBadge}>
              <Text style={styles.hotelDiscountText}>
                {hotelsCategory?.cashback ? `${hotelsCategory.cashback}% OFF` : '50% OFF'}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Bottom Row - Quick Actions */}
      <View style={styles.bottomRow}>
        {/* Trains */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/travel/trains')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(26, 58, 82, 0.15)' }]}>
            <Text style={styles.bottomIcon}>{trainsCategory?.icon || '🚂'}</Text>
          </View>
          <Text style={styles.bottomTitle}>{trainsCategory?.title || 'Trains'}</Text>
        </Pressable>

        {/* Bus */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/travel/bus')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 215, 181, 0.3)' }]}>
            <Text style={styles.bottomIcon}>{busCategory?.icon || '🚌'}</Text>
          </View>
          <Text style={styles.bottomTitle}>{busCategory?.title || 'Bus'}</Text>
        </Pressable>

        {/* Cab */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/travel/cab')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 205, 87, 0.2)' }]}>
            <Text style={styles.bottomIcon}>{cabCategory?.icon || '🚕'}</Text>
          </View>
          <Text style={styles.bottomTitle}>{cabCategory?.title || 'Cab'}</Text>
        </Pressable>

        {/* Packages */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/travel/packages')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(223, 235, 247, 0.5)' }]}>
            <Text style={styles.bottomIcon}>{packagesCategory?.icon || '🎒'}</Text>
          </View>
          <Text style={styles.bottomTitle}>{packagesCategory?.title || 'Packages'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
    // Web-specific: Prevent inspector overlay
    ...(Platform.OS === 'web' && {
      // @ts-ignore - Web-only CSS
      position: 'relative',
      isolation: 'isolate',
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green500,
  },

  // Main Row
  mainRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Flights Card
  flightsCard: {
    flex: 1.3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  flightsGradient: {
    padding: 16,
    minHeight: 180,
  },
  flightsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  flightsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightsIcon: {
    fontSize: 28,
  },
  bestPriceBadge: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestPriceText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  flightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  flightsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  flightsBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  instantBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Hotels Card
  hotelsCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  hotelsGradient: {
    padding: 14,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  hotelsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelsIcon: {
    fontSize: 24,
  },
  hotelsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 8,
  },
  hotelsSubtitle: {
    fontSize: 12,
    color: 'rgba(26, 58, 82, 0.8)',
    marginBottom: 8,
  },
  hotelDiscountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hotelDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 12,
    alignItems: 'center',
  },
  bottomIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bottomIcon: {
    fontSize: 20,
  },
  bottomTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
});

export default React.memo(TravelSection);
