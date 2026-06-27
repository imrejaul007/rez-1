// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Financial Category Page - Dynamic route
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, RefreshControl } from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import financialServicesApi, { FinancialService, FinancialServiceCategory } from '@/services/financialServicesApi';
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';


// Fallback data
const fallbackCategoryData: Record<string, any> = {
  bills: { title: 'Bill Payment', icon: '📄', gradientColors: [colors.infoScale[400], colors.brand.blue] },
  ott: { title: 'OTT & DTH', icon: '📺', gradientColors: [colors.error, colors.error] },
  recharge: { title: 'Mobile Recharge', icon: '📱', gradientColors: [colors.success, colors.brand.greenDark] },
  gold: { title: 'Digital Gold', icon: '🪙', gradientColors: [colors.warningScale[400], colors.warningScale[700]] },
  insurance: { title: 'Insurance', icon: '🛡️', gradientColors: [colors.brand.purpleLight, colors.brand.purple] },
  offers: { title: 'Offers', icon: '🎁', gradientColors: [colors.brand.pink, colors.deepPink] },
};

const FinancialCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { trackEvent, trackScreen } = useComprehensiveAnalytics();
  const { isOffline } = useNetworkStatus();
  const startTimeRef = useRef<number>(Date.now());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [services, setServices] = useState<FinancialService[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<FinancialServiceCategory | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const categorySlug = category || 'bills';
  const fallbackData = fallbackCategoryData[categorySlug] || fallbackCategoryData['bills'];

  const fetchServices = useCallback(async () => {
    if (isOffline) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await financialServicesApi.getByCategory(categorySlug, {
        page: 1,
        limit: 50,
        sortBy: selectedFilter === 'Top Rated' ? 'rating' : 
                selectedFilter === 'Best Price' ? 'price_low' : 'rating',
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setServices(response.data.services);
        if (response.data.category) {
          if (!isMounted()) return;
          setCategoryInfo({
            _id: response.data.category._id,
            id: response.data.category.slug,
            name: response.data.category.name,
            slug: response.data.category.slug,
            icon: response.data.category.icon,
            iconType: response.data.category.iconType || 'emoji',
            color: response.data.category.metadata?.color || fallbackData.gradientColors[0],
            cashbackPercentage: response.data.category.cashbackPercentage,
            maxCashback: response.data.category.maxCashback,
            serviceCount: response.data.category.serviceCount || 0,
            metadata: response.data.category.metadata,
          });
        }
        trackEvent('financial_category_services_loaded', {
          category: categorySlug,
          count: response.data.services?.length || 0,
          filter: selectedFilter,
        });
      }
    } catch (error: any) {
      trackEvent('financial_category_error', {
        category: categorySlug,
        error: error.message || 'Unknown error',
      });
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [categorySlug, selectedFilter, isOffline, trackEvent]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Track screen view
  useEffect(() => {
    trackScreen('financial_category', {
      category: categorySlug,
    });

    return () => {
      const timeSpent = Date.now() - startTimeRef.current;
      trackEvent('financial_category_time_spent', {
        category: categorySlug,
        time_spent_ms: timeSpent,
        time_spent_seconds: Math.floor(timeSpent / 1000),
      });
    };
  }, [categorySlug, trackScreen, trackEvent]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchServices();
  }, [fetchServices]);

  const handleServicePress = (service: FinancialService) => {
    const serviceId = service._id || service.id;
    if (serviceId) {
      trackEvent('financial_service_clicked', {
        service_id: serviceId,
        service_name: service.name,
        category: categorySlug,
        source: 'category_page',
      });
      router.push(`/financial/service/${serviceId}` as any);
    }
  };

  const gradientColors = categoryInfo?.metadata?.color 
    ? [categoryInfo.metadata.color, categoryInfo.metadata.color] 
    : fallbackData.gradientColors;
  const categoryTitle = categoryInfo?.name || fallbackData.title;
  const categoryIcon = categoryInfo?.icon || fallbackData.icon;

  if (isLoading && services.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{categoryIcon} {categoryTitle}</Text>
            <Text style={styles.headerSubtitle}>{services.length} {services.length === 1 ? 'service' : 'services'}</Text>
          </View>
          <Pressable style={styles.searchButton}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.brand.purple]} />
        }
      >
        <View style={styles.itemsList}>
          {services.length > 0 ? (
            services.map((service) => {
              const serviceId = service._id || service.id || '';
              const cashback = service.cashback?.percentage 
                ? `${service.cashback.percentage}%` 
                : service.serviceCategory?.cashbackPercentage 
                  ? `${service.serviceCategory.cashbackPercentage}%` 
                  : '5%';
              
              return (
                <Pressable 
                  key={serviceId} 
                  style={styles.itemCard} 
                  onPress={() => handleServicePress(service)} 
                 
                >
                  <CachedImage
                    source={service.images?.[0] || undefined}
                    style={styles.itemImage}
                  />
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{cashback}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{service.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>
                        {service.serviceCategory?.name || service.shortDescription || 'Service'}
                      </Text>
                    </View>
                    <Pressable 
                      style={styles.payButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleServicePress(service);
                      }}
                    >
                      <Text style={styles.payButtonText}>View Details</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
              <Text style={{ color: Colors.text.tertiary }}>No services found</Text>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  searchButton: { padding: Spacing.sm },
  itemsList: { padding: Spacing.base, gap: Spacing.base },
  itemCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  itemImage: { width: '100%', height: 140 },
  cashbackBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.success, paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  cashbackText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },
  itemInfo: { padding: Spacing.base },
  itemName: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.sm },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: Colors.background.secondary, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  typeText: { ...Typography.caption, fontWeight: '600', color: Colors.text.tertiary },
  payButton: { backgroundColor: Colors.brand.purple, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  payButtonText: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },
});

// Wrap with Error Boundary for production
const FinancialCategoryPageWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="alert-circle" size={48} color={Colors.brand.purple} />
          <Text style={{ marginTop: Spacing.md, color: Colors.text.tertiary }}>Something went wrong. Please try again.</Text>
        </View>
      }
    >
      <FinancialCategoryPage />
    </ErrorBoundary>
  );
};

export default withErrorBoundary(FinancialCategoryPageWithErrorBoundary, 'FinancialCategory');
