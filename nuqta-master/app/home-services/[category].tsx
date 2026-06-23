import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Home Services Category Page - Dynamic route
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import homeServicesApi, { HomeService, HomeServicesByCategoryResponse } from '@/services/homeServicesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Fallback gradient colors for categories
const categoryGradients: Record<string, string[]> = {
  repair: [colors.infoScale[400], colors.brand.blue],
  cleaning: [colors.success, colors.brand.greenDark],
  painting: [colors.brand.orange, colors.brand.orangeDark],
  carpentry: [colors.brand.purpleLight, colors.brand.purple],
  plumbing: [colors.brand.cyan, colors.cyanDark],
  electrical: [colors.brand.amber, '#CA8A04'],
};

const HomeServicesCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [services, setServices] = useState<HomeService[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      if (!category) return;
      
      try {
        setIsLoading(true);
        let sortBy: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular' = 'rating';
        
        if (selectedFilter === 'Best Price') {
          sortBy = 'price_low';
        } else if (selectedFilter === 'Top Rated') {
          sortBy = 'rating';
        } else if (selectedFilter === 'Today') {
          // Filter for same-day services (would need backend support)
          sortBy = 'rating';
        }

        const response = await homeServicesApi.getByCategory(category, {
          page: currentPage,
          limit: 20,
          sortBy
        });

        if (response.success && response.data) {
          const data = response.data;
          if (currentPage === 1) {
            if (!isMounted()) return;
            setServices(data.services || []);
          } else {
            if (!isMounted()) return;
            setServices(prev => [...prev, ...(data.services || [])]);
          }
          if (data.category) {
            if (!isMounted()) return;
            setCategoryInfo(data.category);
          }
          if (data.pagination) {
            if (!isMounted()) return;
            setTotalPages(data.pagination.pages);
            if (!isMounted()) return;
            setHasMore(data.pagination.page < data.pagination.pages);
          }
          setError(null);
        } else {
          if (!isMounted()) return;
          setError(response.error || 'Failed to load services');
        }
      } catch (error) {
        if (!isMounted()) return;
        setError('Failed to load services. Please try again.');
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [category, selectedFilter, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setServices([]);
  }, [category, selectedFilter]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleServicePress = (service: HomeService) => {
    const serviceId = service._id || service.id;
    if (serviceId) {
      router.push(`/product-page?cardId=${serviceId}&cardType=product` as any);
    }
  };

  const handleBookPress = (service: HomeService) => {
    const serviceId = service._id || service.id;
    const storeId = service.store?._id;
    if (serviceId && storeId) {
      router.push(`/booking?storeId=${storeId}&productId=${serviceId}&bookingType=service` as any);
    }
  };

  const gradientColors = categoryGradients[category || 'repair'] || categoryGradients['repair'];
  const displayTitle = categoryInfo?.name || `${category?.charAt(0).toUpperCase()}${category?.slice(1)} Services`;
  const displayIcon = categoryInfo?.icon || '🔧';
  
  // Check if icon is a URL or emoji
  const isIconUrl = displayIcon && (displayIcon.startsWith('http://') || displayIcon.startsWith('https://'));

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text.inverse} /></Pressable>
          <View style={styles.headerTitleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isIconUrl ? (
                <CachedImage source={{ uri: displayIcon }} style={{ width: 24, height: 24 }} contentFit="contain" cachePolicy="memory-disk" />
              ) : (
                <Text style={styles.headerTitle}>{displayIcon} </Text>
              )}
              <Text style={styles.headerTitle}>{displayTitle}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{services.length} services</Text>
          </View>
          <Pressable style={styles.searchButton}><Ionicons name="search" size={24} color={Colors.text.inverse} /></Pressable>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'Today', 'Top Rated', 'Best Price'].map((filter) => (
            <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>{filter === 'all' ? 'All' : filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {error && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: Colors.error, textAlign: 'center' }}>{error}</Text>
            <Pressable
              style={{ marginTop: 10, padding: 10, backgroundColor: Colors.info, borderRadius: BorderRadius.sm }}
              onPress={() => {
                setError(null);
                setCurrentPage(1);
                setServices([]);
              }}
            >
              <Text style={{ color: Colors.text.inverse }}>Retry</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.itemsList}>
          {services.length === 0 && !isLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.text.tertiary }}>No services found in this category</Text>
            </View>
          ) : (
            services.map((service) => {
              const serviceId = service._id || service.id;
              const imageUrl = service.images?.[0];
              const price = service.pricing?.selling || 0;
              const cashback = service.cashback?.percentage || service.serviceCategory?.cashbackPercentage || 0;
              const rating = service.ratings?.average || 0;
              
              return (
                <Pressable 
                  key={serviceId} 
                  style={styles.itemCard} 
                  onPress={() => handleServicePress(service)} 
                 
                >
                  <CachedImage source={{ uri: imageUrl }} style={styles.itemImage} cachePolicy="memory-disk" />
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{cashback}%</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{service.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{service.serviceCategory?.name || 'Service'}</Text>
                    </View>
                    <View style={styles.itemMeta}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.itemFooter}>
                      <Text style={styles.priceText}>From {currencySymbol}{price}</Text>
                      <Pressable 
                        style={styles.bookButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleBookPress(service);
                        }}
                      >
                        <Text style={styles.bookButtonText}>Book</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
        {hasMore && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.info} />
            <Text style={{ color: Colors.text.tertiary, marginTop: 10 }}>Loading more services...</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : Spacing.base, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { ...Typography.h3, color: Colors.text.inverse },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  searchButton: { padding: Spacing.sm },
  filtersContainer: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  filterChip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: Colors.background.secondary, marginRight: Spacing.sm },
  filterChipActive: { backgroundColor: Colors.info },
  filterChipText: { ...Typography.body, color: Colors.text.tertiary },
  filterChipTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  itemsList: { padding: Spacing.base, gap: Spacing.base },
  itemCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  itemImage: { width: '100%', height: 140 },
  cashbackBadge: { position: 'absolute', top: Spacing.md, right: Spacing.md, backgroundColor: Colors.success, paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  cashbackText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },
  itemInfo: { padding: Spacing.base },
  itemName: { ...Typography.h4, color: Colors.nileBlue, marginBottom: Spacing.sm },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: Colors.background.secondary, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  typeText: { ...Typography.caption, fontWeight: '600', color: Colors.text.tertiary },
  itemMeta: { flexDirection: 'row', gap: Spacing.base, marginBottom: Spacing.md },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ratingText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { ...Typography.body, fontWeight: '600', color: Colors.success },
  bookButton: { backgroundColor: Colors.info, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: BorderRadius.xl },
  bookButtonText: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },
});

export default withErrorBoundary(HomeServicesCategoryPage, 'HomeServicesCategory');
