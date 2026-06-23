import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { FashionStore } from '@/hooks/useFashionData';

interface StoreCardProps {
  store: FashionStore;
  index: number;
  onPress: (store: FashionStore) => void;
}

const StoreCard = ({ store, index, onPress }: StoreCardProps) => {
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const translateY = useSharedValue(0);
  const shimmer = useSharedValue(-100);

  // Entrance animation
  useEffect(() => {
    translateY.value = withDelay(
      index * 100,
      withSpring(0, {
        damping: 12,
        stiffness: 100,
      })
    );

    // Floating animation
    translateY.value = withDelay(
      index * 100 + 500,
      withRepeat(
        withTiming(-5, {
          duration: 2000 + index * 200,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    // Shimmer effect
    shimmer.value = withRepeat(
      withTiming(200, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
      { translateY: translateY.value },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, {
      damping: 10,
      stiffness: 400,
    });
    rotateZ.value = withSpring(5, {
      damping: 10,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 400,
    });
    rotateZ.value = withSpring(0, {
      damping: 10,
      stiffness: 300,
    });
  };

  // Generate gradient based on store name or use default
  const getGradient = (storeName: string): [string, string, string] => {
    const gradients: Record<string, [string, string, string]> = {
      'ZARA': ['#1F2937', '#111827', '#000000'],
      'ADIDAS': ['#1E3A8A', '#1E40AF', '#3B82F6'],
      'PUMA': ['#000000', '#1F2937', '#374151'],
      'VANS': ['#DC2626', '#991B1B', '#7F1D1D'],
      'NIKE': ['#000000', '#0F172A', '#1E293B'],
      'H&M': ['#FF6B9D', '#C651CD', '#8E2DE2'],
    };

    const name = storeName.toUpperCase();
    return gradients[name] || ['#ffcd57', '#00996B', '#0B2240']; // Default green gradient
  };

  // Get accent color based on cashback percentage
  const getAccentColor = (cashback: number): string => {
    if (cashback >= 15) return '#ffcd57'; // Light Mustard for high cashback
    if (cashback >= 10) return '#F59E0B'; // Orange for medium
    return '#ffcd57'; // Green for standard
  };

  const cashback = store.offers?.cashback || 5;
  const gradient = getGradient(store.name);
  const accentColor = getAccentColor(cashback);

  return (
    <Pressable
      style={styles.storeContainer}
      onPress={() => onPress(store)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
     
    >
      <Animated.View style={[styles.storeWrapper, animatedStyle]}>
        {/* 3D Card Container */}
        <View style={styles.cardContainer}>
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>

          {/* Store Logo Circle */}
          {store.logo ? (
            // Real logo image
            <View style={styles.storeCircle}>
              <Image source={{ uri: store.logo }} style={styles.logoImage} contentFit="contain" transition={200} />
            </View>
          ) : (
            // Gradient circle with text
            <LinearGradient
              colors={gradient}
              style={styles.storeCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Inner glow */}
              <View style={styles.innerGlow} />
              <Text style={styles.logoText}>{store.name.substring(0, 4).toUpperCase()}</Text>
            </LinearGradient>
          )}

          {/* Cashback Badge */}
          <View style={[styles.cashbackBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeText}>{cashback}%</Text>
          </View>
        </View>

        {/* Store Name Label */}
        <View style={styles.labelContainer}>
          <Text style={styles.cashbackLabel} numberOfLines={1}>
            {store.name}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

interface ProductionStoreListProps {
  stores: FashionStore[];
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => void;
}

const ProductionStoreList = ({ stores, isLoading, error, onRefresh }: ProductionStoreListProps) => {
  const router = useRouter();

  const handleStorePress = (store: FashionStore) => {
    // Navigate to store detail page with storeId query parameter
    router.push(`/MainStorePage?storeId=${store._id}`);
  };

  const handleViewAllPress = () => {
    // Navigate to stores listing page - backend now handles 'all' category
    router.push('/StoreListPage');
  };

  // Loading skeleton
  if (isLoading && stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Store you can't miss</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffcd57" />
          <Text style={styles.loadingText}>Loading fashion stores...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Store you can't miss</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>😕 Oops! Couldn't load stores</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
          {onRefresh && (
            <Pressable style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Empty state
  if (stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Store you can't miss</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏪 No fashion stores available</Text>
          <Text style={styles.emptySubtext}>Check back soon for new stores!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Store you can't miss</Text>
        <Pressable
          onPress={handleViewAllPress}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      {/* Store Grid - Horizontal Scroll */}
      <View style={styles.scrollContainer}>
        {/* First Row - Horizontal scroll */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {stores.slice(0, Math.ceil(stores.length / 2)).map((store, index) => (
            <View key={store._id} style={styles.storeItemWrapper}>
              <StoreCard
                store={store}
                index={index}
                onPress={handleStorePress}
              />
            </View>
          ))}
        </ScrollView>

        {/* Second Row - Horizontal scroll if more stores */}
        {stores.length > Math.ceil(stores.length / 2) && (
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {stores.slice(Math.ceil(stores.length / 2)).map((store, index) => (
              <View key={store._id} style={styles.storeItemWrapper}>
                <StoreCard
                  store={store}
                  index={index + Math.ceil(stores.length / 2)}
                  onPress={handleStorePress}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 20,
    marginVertical: 12,
    shadowColor: '#ffcd57',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#ffcd57',
    fontWeight: '700',
  },
  scrollContainer: {
    overflow: 'visible',
  },
  horizontalScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 10,
    alignItems: 'center',
  },
  storeItemWrapper: {
    marginRight: 20,
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: -5,
    paddingTop: 15,
    marginBottom: 24,
    overflow: 'visible',
  },
  storeContainer: {
    alignItems: 'center',
    overflow: 'visible',
  },
  storeWrapper: {
    alignItems: 'center',
  },
  cardContainer: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 40,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: 0,
    bottom: 0,
    width: 100,
    zIndex: 10,
  },
  shimmerGradient: {
    flex: 1,
  },
  storeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  innerGlow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    zIndex: 1,
  },
  cashbackBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'white',
    zIndex: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  labelContainer: {
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  cashbackLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Loading states
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Error states
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#ffcd57',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Empty states
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
});

export default ProductionStoreList;

