import { colors } from '@/constants/theme';
import React, { useEffect,  useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import exploreApi, { ExploreStats } from '@/services/exploreApi';
import { useCurrentLocation } from '@/hooks/useLocation';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

interface ProofItem {
  id: number;
  icon: string;
  text: string;
  color: string;
}

// Helper to format currency
const formatCurrency = (amount: number, currencySymbol: string): string => {
  if (amount >= 10000000) {
    return `${currencySymbol}${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `${currencySymbol}${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `${currencySymbol}${Math.round(amount / 1000)}k`;
  }
  return `${currencySymbol}${amount}`;
};

// Helper to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString('en-IN');
};

const ProofItemView = ({ item, index, scrollX, isCurrent }: { item: ProofItem; index: number; scrollX: Animated.SharedValue<number>; isCurrent: boolean }) => {
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [index - 1, index, index + 1], [0, 1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollX.value, [index - 1, index, index + 1], [20, 0, -20], 'clamp') }],
    position: isCurrent ? 'relative' as const : 'absolute' as const,
  }));

  return (
    <Animated.View
      style={[styles.proofItem, animStyle]}
    >
      <View style={[styles.iconBadge, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={14} color={item.color} />
      </View>
      <Text style={styles.proofText}>{item.text}</Text>
    </Animated.View>
  );
};

const SocialProofStrip = () => {
  const isMounted = useIsMounted();
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [proofItems, setProofItems] = useState<ProofItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentLocation } = useCurrentLocation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Get location name for display
  const locationName = currentLocation?.address?.city
    || currentLocation?.address?.formattedAddress?.split(',')[0]
    || 'your area';

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const fetchLiveStats = async () => {
    try {
      setIsLoading(true);
      const response = await exploreApi.getLiveStats();

      if (response.success && response.data) {
        const stats = response.data;

        // Build dynamic proof items from real stats
        const items: ProofItem[] = [];

        if (stats.peopleEarnedToday > 0 || stats.peopleNearby > 0) {
          items.push({
            id: 1,
            icon: 'people',
            text: `${formatNumber(stats.peopleEarnedToday || stats.peopleNearby)} people earning near you`,
            color: Colors.info });
        }

        if (stats.earnedToday > 0) {
          items.push({
            id: 2,
            icon: 'trending-up',
            text: `${formatCurrency(stats.earnedToday, currencySymbol)} saved today in ${locationName}`,
            color: Colors.gold });
        }

        if (stats.dealsLive > 0) {
          items.push({
            id: 3,
            icon: 'flame',
            text: `${stats.dealsLive} deals live right now`,
            color: colors.brand.orange });
        }

        if (stats.activeUsers > 0) {
          items.push({
            id: 4,
            icon: 'flash',
            text: `${formatNumber(stats.activeUsers)} users active now`,
            color: colors.brand.purpleMedium });
        }

        // Only set items if we have some data
        if (items.length > 0) {
          if (!isMounted()) return;
          setProofItems(items);
        }
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (proofItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % proofItems.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [proofItems.length]);

  useEffect(() => {
    if (proofItems.length === 0) return;
    scrollX.value = withSpring(currentIndex);
  }, [currentIndex, proofItems.length]);

  // Don't render if loading or no data
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Don't render if no proof items
  if (proofItems.length === 0) {
    return null;
  }

  return (
    <FeatureErrorBoundary featureName="Social Proof" compact={true}>
    <View style={styles.container}>
      <View style={styles.strip}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        <View style={styles.contentContainer}>
          {proofItems.map((item, index) => {
            return (
              <ProofItemView
                key={item.id}
                item={item}
                index={index}
                scrollX={scrollX}
                isCurrent={index === currentIndex}
              />
            );
          })}
        </View>

        <View style={styles.dotsContainer}>
          {proofItems.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md },
  strip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center' },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
    marginRight: Spacing.md,
    gap: Spacing.xs },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.error },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  contentContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    overflow: 'hidden' },
  proofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center' },
  proofText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '500',
    flex: 1 },
  dotsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginLeft: Spacing.sm },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.default },
  dotActive: {
    backgroundColor: Colors.gold,
    width: 12 } });

export default SocialProofStrip;
