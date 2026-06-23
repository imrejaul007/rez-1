import React, { useEffect, useState, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import socialProofApi from '@/services/socialProofApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Nuqta Brand Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.brand.goldRich,
  primaryLight: colors.lightMustard,
  gold: colors.lightMustard,
  goldDark: '#F5A623',
  white: colors.background.primary,
  textDark: colors.nileBlue,
  textMuted: colors.neutral[500],
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  background: colors.linen,
  success: colors.nileBlue,
};

interface NearbyActivity {
  id: string;
  firstName: string;
  savings: number;
  savingsType: 'cashback' | 'discount';
  storeName: string;
  storeId?: string;
  storeLogo?: string;
  timeAgo: string;
  distance?: string;
}

interface StoreAggregate {
  storeId: string;
  storeName: string;
  todayRedemptions: number;
  message: string;
}

interface CityWideStats {
  totalPeopleToday: number;
  totalSavingsToday: number;
  city: string;
  message: string;
}

const SocialProofSection: React.FC = () => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activities, setActivities] = useState<NearbyActivity[]>([]);
  const [storeAggregates, setStoreAggregates] = useState<StoreAggregate[]>([]);
  const [cityWideStats, setCityWideStats] = useState<CityWideStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userCity, setUserCity] = useState<string>('');
  const isMounted = useIsMounted();

  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const liveDotAnim = useSharedValue(1);

  // Animate the live indicator dot
  useEffect(() => {
    liveDotAnim.value = withRepeat(withSequence(withTiming(0.3, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1);
  }, [liveDotAnim]);

  const liveDotStyle = useAnimatedStyle(() => ({
    opacity: liveDotAnim.value,
  }));

  const activityAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const fetchNearbyActivity = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!isMounted()) return;
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Try to get city name, but don't fail if geocoding doesn't work
      let city = '';
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        city = geocode?.[0]?.city || geocode?.[0]?.region || '';
        if (!isMounted()) return;
        setUserCity(city);
      } catch (geocodeError) {
        // Geocoding not available, continue without city name
      }

      const response = await socialProofApi.getNearbyActivity({
        latitude,
        longitude,
        radius: 5,
        limit: 10,
        city,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setActivities(response.data.activities || []);
        setStoreAggregates(response.data.storeAggregates || []);
        setCityWideStats(response.data.cityWideStats || null);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling every 30 seconds
  useEffect(() => {
    fetchNearbyActivity();

    const interval = setInterval(() => {
      fetchNearbyActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNearbyActivity]);

  // Rotate through activities with animation
  useEffect(() => {
    if (activities.length <= 1) return;

    const rotateInterval = setInterval(() => {
      // Fade out and slide
      fadeAnim.value = withTiming(0, { duration: 300 });
      slideAnim.value = withTiming(-20, { duration: 300 });

      // After fade out, update index and fade back in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        slideAnim.value = 20;
        fadeAnim.value = withTiming(1, { duration: 300 });
        slideAnim.value = withTiming(0, { duration: 300 });
      }, 350);
    }, 4000);

    return () => {
      clearInterval(rotateInterval);
    };
  }, [activities.length, fadeAnim, slideAnim]);

  if (isLoading) {
    return null;
  }

  // Show city-wide stats if no nearby activity
  const showCityWide = activities.length === 0 && cityWideStats;
  const currentActivity = activities[currentIndex];
  const showEmptyState = activities.length === 0 && !cityWideStats;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.liveDot, liveDotStyle]} />
          <Text style={styles.headerTitle}>People near you are earning</Text>
        </View>
      </View>

      {/* Activity Card */}
      <View style={styles.activityContainer}>
        {showEmptyState ? (
          // Empty state - no activity nearby
          <View style={styles.cityWideCard}>
            <View style={styles.cityWideIconContainer}>
              <Ionicons name="trending-up" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cityWideContent}>
              <Text style={styles.cityWideText}>
                <Text style={styles.highlightCity}>Be the first!</Text>
                {` Start saving with ${BRAND.APP_NAME} today`}
              </Text>
              <Text style={styles.cityWideSavings}>
                Earn cashback on every order
              </Text>
            </View>
          </View>
        ) : showCityWide ? (
          // City-wide fallback
          <View style={styles.cityWideCard}>
            <View style={styles.cityWideIconContainer}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cityWideContent}>
              <Text style={styles.cityWideText}>
                <Text style={styles.highlightNumber}>
                  {cityWideStats!.totalPeopleToday}
                </Text>
                {' people saved today in '}
                <Text style={styles.highlightCity}>{cityWideStats!.city}</Text>
              </Text>
              <Text style={styles.cityWideSavings}>
                Total: {currencySymbol}{cityWideStats!.totalSavingsToday.toLocaleString()} saved
              </Text>
            </View>
          </View>
        ) : (
          // Nearby activity
          <Animated.View
            style={[
              styles.activityCard,
              activityAnimStyle,
            ]}
          >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {currentActivity?.firstName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={10} color={COLORS.white} />
              </View>
            </View>

            {/* Content */}
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.nameText}>{currentActivity?.firstName}</Text>
                {' saved '}
                <Text style={styles.savingsText}>
                  {currencySymbol}{currentActivity?.savings}
                </Text>
                {' at '}
                <Text style={styles.storeText}>{currentActivity?.storeName}</Text>
              </Text>
              <Text style={styles.timeText}>{currentActivity?.timeAgo}</Text>
            </View>

            {/* Savings Icon */}
            <View style={styles.savingsIconContainer}>
              <Ionicons
                name={
                  currentActivity?.savingsType === 'cashback'
                    ? 'cash-outline'
                    : 'pricetag-outline'
                }
                size={16}
                color={COLORS.gold}
              />
            </View>
          </Animated.View>
        )}
      </View>

      {/* Store Aggregates */}
      {storeAggregates.length > 0 && (
        <View style={styles.aggregatesContainer}>
          {storeAggregates.slice(0, 2).map((store) => (
            <View key={store.storeId} style={styles.aggregateBadge}>
              <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.aggregateText}>
                {store.todayRedemptions} at {store.storeName}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Activity Dots Indicator */}
      {activities.length > 1 && (
        <View style={styles.dotsContainer}>
          {activities.slice(0, 5).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginHorizontal: 0,
    marginVertical: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    letterSpacing: -0.2,
  },
  activityContainer: {
    minHeight: 60,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
  nameText: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  savingsText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  storeText: {
    fontWeight: '600',
    color: COLORS.gold,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  savingsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cityWideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  cityWideIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cityWideContent: {
    flex: 1,
  },
  cityWideText: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  highlightNumber: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 16,
  },
  highlightCity: {
    fontWeight: '600',
    color: COLORS.textDark,
  },
  cityWideSavings: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  aggregatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  aggregateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  aggregateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 16,
  },
});

export default React.memo(SocialProofSection);
