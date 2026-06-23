// @ts-nocheck
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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

interface ProductionBrandListProps {
  stores: FashionStore[];
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => void;
}

const ProductionBrandList = ({ stores, isLoading, error, onRefresh }: ProductionBrandListProps) => {
  const router = useRouter();

  const handleBrandPress = (store: FashionStore) => {
    // Navigate to store detail page with storeId query parameter
    router.push(`/MainStorePage?storeId=${store._id}` as any);
  };

  const handleViewAllPress = () => {
    // Navigate to stores listing page - backend now handles 'all' category
    router.push('/StoreListPage' as any);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFD700" />
      );
    }

    return stars;
  };

  const BrandCard = ({ store, index }: { store: FashionStore; index: number }) => {
    const scale = useSharedValue(1);
    const rotateX = useSharedValue(0);
    const translateY = useSharedValue(50);
    const opacity = useSharedValue(0);
    const shimmer = useSharedValue(-100);

    useEffect(() => {
      // Entrance animation
      translateY.value = withDelay(
        index * 100,
        withSpring(0, {
          damping: 15,
          stiffness: 120,
        })
      );
      opacity.value = withDelay(
        index * 100,
        withTiming(1, { duration: 500 })
      );

      // Shimmer effect
      shimmer.value = withRepeat(
        withTiming(300, {
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
        { translateY: translateY.value },
        {
          rotateX: `${rotateX.value}deg`,
        },
      ],
      opacity: opacity.value,
    }));

    const shimmerStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shimmer.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.95, {
        damping: 10,
        stiffness: 400,
      });
      rotateX.value = withSpring(-2, {
        damping: 10,
        stiffness: 300,
      });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, {
        damping: 10,
        stiffness: 400,
      });
      rotateX.value = withSpring(0, {
        damping: 10,
        stiffness: 300,
      });
    };

    const rating = store.ratings?.average || 0;

    // Handle cashback from multiple possible sources - cast to any for additional properties
    const storeAny = store as any;
    const cashback = store.offers?.cashback || storeAny.cashback || 0;
    const hasCashback = cashback > 0;

    // Handle address - backend sends it in 'address' field, not 'location'
    const storeAddress = store.address || store.location;
    const addressStr = storeAddress?.street || storeAddress?.address || '';
    const cityStr = storeAddress?.city || '';
    const address = addressStr && cityStr
      ? `${addressStr}, ${cityStr}`
      : (addressStr || cityStr || '');

    // Handle delivery time from multiple sources
    const deliveryTime = store.operationalInfo?.deliveryTime || storeAny.deliveryTime || '30-45 mins';

    // Get short description if available
    const shortDesc = storeAny.shortDescription || storeAny.description || '';

    return (
      <Animated.View style={[styles.brandCardWrapper, animatedStyle]}>
        <Pressable
          style={styles.brandCard}
          onPress={() => handleBrandPress(store)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
         
        >
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle, { pointerEvents: 'none' }]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>

          {/* 3D Card Container */}
          <View style={styles.card3D}>
            <ImageBackground
              source={{ 
                uri: store.banner || store.logo || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop'
              }}
              style={styles.brandImage}
              imageStyle={styles.imageStyle}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                style={styles.gradientOverlay}
              />
              {/* Featured Badge */}
              {store.isFeatured && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
            </ImageBackground>
            
            <View style={styles.brandInfo}>
              <View style={styles.brandHeader}>
                <Text style={styles.brandName} numberOfLines={1}>{store.name}</Text>
                {rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                    <View style={styles.starsContainer}>
                      {renderStars(rating)}
                    </View>
                  </View>
                )}
              </View>

              {/* Show address if available */}
              {address ? (
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.brandAddress} numberOfLines={1}>
                    {address}
                  </Text>
                </View>
              ) : null}

              <View style={styles.metaRow}>
                <View style={styles.deliveryBadge}>
                  <Ionicons name="time-outline" size={14} color="#ffcd57" />
                  <Text style={styles.deliveryText}>{deliveryTime}</Text>
                </View>

                {/* Only show cashback badge if cashback > 0 */}
                {hasCashback ? (
                  <LinearGradient
                    colors={['#ffcd57', '#1a3a52']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cashbackContainer}
                  >
                    <Ionicons name="gift-outline" size={14} color="white" />
                    <Text style={styles.cashbackText}>Upto {cashback}% cashback</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.partnerBadge}>
                    <Ionicons name="storefront-outline" size={14} color="#ffcd57" />
                    <Text style={styles.partnerText}>Partner Store</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderBrand = (store: FashionStore, index: number) => {
    return <BrandCard key={store._id} store={store} index={index} />;
  };

  // Loading skeleton
  if (isLoading && stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Explore all brands</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffcd57" />
          <Text style={styles.loadingText}>Loading fashion brands...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Explore all brands</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>😕 Oops! Couldn't load brands</Text>
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
          <Text style={styles.sectionTitle}>Explore all brands</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏪 No fashion brands available</Text>
          <Text style={styles.emptySubtext}>Check back soon for new brands!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Explore all brands</Text>
        <Pressable onPress={handleViewAllPress}>
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      {/* Brand Cards */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stores.slice(0, 5).map((store, index) => renderBrand(store, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#ffcd57',
    fontWeight: '600',
  },
  scrollContainer: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
    paddingHorizontal: 0,
  },
  brandCardWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  brandCard: {
    borderRadius: 20,
    overflow: 'visible',
    backgroundColor: 'white',
  },
  card3D: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#ffcd57',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.1)',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: 'none',
  },
  shimmerGradient: {
    width: '100%',
    height: '100%',
  },
  brandImage: {
    width: '100%',
    height: 140,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 12,
  },
  imageStyle: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  brandInfo: {
    padding: 18,
    backgroundColor: 'white',
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
    letterSpacing: -0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 14,
  },
  brandAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deliveryText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#ffcd57',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cashbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  partnerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a3a52',
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

export default ProductionBrandList;

