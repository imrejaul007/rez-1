// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Financial Services Hub Page
 * Connected to /api/services (financial category)
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';
import financialServicesApi, { FinancialServiceCategory, FinancialService } from '@/services/financialServicesApi';
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useGetCurrencySymbol } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fallback categories (used if API fails)
const FALLBACK_CATEGORIES = [
  { id: 'bills', title: 'Bill Payment', icon: '📄', color: Colors.info, count: 'All bills' },
  { id: 'ott', title: 'OTT & DTH', icon: '📺', color: Colors.error, count: '50+ services' },
  { id: 'recharge', title: 'Recharge', icon: '📱', color: Colors.success, count: 'All networks' },
  { id: 'gold', title: 'Digital Gold', icon: '🪙', color: Colors.warning, count: 'Buy/Sell' },
  { id: 'insurance', title: 'Insurance', icon: '🛡️', color: Colors.brand.purple, count: '100+ plans' },
  { id: 'offers', title: 'Offers', icon: '🎁', color: colors.brand.pink, count: 'Special deals' },
];

// Fallback services
const FALLBACK_SERVICES: DisplayService[] = [
  { id: '1', name: 'Electricity Bill', type: 'Utility', cashback: '5%', image: undefined as any },
  { id: '2', name: 'Netflix', type: 'OTT', cashback: '10%', image: undefined as any },
  { id: '3', name: 'Mobile Recharge', type: 'Prepaid', cashback: '3%', image: undefined as any },
];

interface DisplayService {
  id: string;
  name: string;
  type: string;
  cashback: string;
  image: string;
}

const FinancialPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { trackEvent, trackScreen } = useComprehensiveAnalytics();
  const { isOffline } = useNetworkStatus();
  const startTimeRef = useRef<number>(Date.now());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categories, setCategories] = useState<FinancialServiceCategory[]>([]);
  const [featuredServices, setFeaturedServices] = useState<DisplayService[]>(FALLBACK_SERVICES);
  const [stats, setStats] = useState({ billers: 100, maxCashback: 10 });

  const fetchFinancialData = useCallback(async () => {
    if (isOffline) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // Fetch categories, featured services, and stats in parallel
      const [categoriesRes, featuredRes, statsRes] = await Promise.allSettled([
        financialServicesApi.getCategories(),
        financialServicesApi.getFeatured(6),
        financialServicesApi.getStats(),
      ]);

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.success && categoriesRes.value.data) {
        if (!isMounted()) return;
        setCategories(categoriesRes.value.data);
        trackEvent('financial_categories_loaded', {
          count: categoriesRes.value.data.length,
        });
      }

      if (featuredRes.status === 'fulfilled' && featuredRes.value.success && featuredRes.value.data) {
        const transformed = featuredRes.value.data.slice(0, 3).map((service: FinancialService) => ({
          id: service._id || service.id || '',
          name: service.name,
          type: service.serviceCategory?.name || 'Service',
          cashback: service.cashback?.percentage
            ? `${service.cashback.percentage}%`
            : service.serviceCategory?.cashbackPercentage
              ? `${service.serviceCategory.cashbackPercentage}%`
              : '5%',
          image: service.images?.[0] || undefined,
        }));
        if (!isMounted()) return;
        setFeaturedServices(transformed);
        trackEvent('financial_featured_loaded', {
          count: transformed.length,
        });
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        if (!isMounted()) return;
        setStats({
          billers: statsRes.value.data.totalBillers || 100,
          maxCashback: statsRes.value.data.maxCashback || 10,
        });
      }
    } catch (error: any) {
      trackEvent('financial_data_error', {
        error: error.message || 'Unknown error',
      });
      // Keep fallback data
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [isOffline, trackEvent]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Track screen view
  useEffect(() => {
    trackScreen('financial_services_hub', {});

    return () => {
      const timeSpent = Date.now() - startTimeRef.current;
      trackEvent('financial_hub_time_spent', {
        time_spent_ms: timeSpent,
        time_spent_seconds: Math.floor(timeSpent / 1000),
      });
    };
  }, [trackScreen, trackEvent]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFinancialData();
  }, [fetchFinancialData]);

  const handleCategoryPress = (categoryId: string) => {
    trackEvent('financial_category_clicked', {
      category_id: categoryId,
    });
    router.push(`/financial/${categoryId}` as any);
  };

  const handleServicePress = (serviceId: string) => {
    trackEvent('financial_service_clicked', {
      service_id: serviceId,
      source: 'quick_pay',
    });
    router.push(`/financial/service/${serviceId}` as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.brand.purple, Colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Financial Services</Text>
            <Text style={styles.headerSubtitle}>Pay bills, earn rewards</Text>
          </View>
          <Pressable style={styles.searchButton} onPress={() => router.push('/search' as any)}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.billers}+</Text>
            <Text style={styles.statLabel}>Billers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.maxCashback}%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Instant</Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.brand.purple]} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.categoriesGrid}>
            {(categories.length > 0 ? categories : FALLBACK_CATEGORIES).map((cat) => {
              const category = categories.find(c => c.slug === cat.id) || cat;
              return (
                <Pressable
                  key={cat.id}
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(cat.id)}
                 
                >
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color || cat.color}20` }]}>
                    <Text style={styles.categoryEmoji}>{category.icon || cat.icon}</Text>
                  </View>
                  <Text style={styles.categoryTitle}>{category.name || cat.title}</Text>
                  <Text style={styles.categoryCount}>
                    {category.serviceCount ? `${category.serviceCount}+ services` : cat.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Pay</Text>
            <Pressable onPress={() => router.push('/financial/bills' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredServices.map((service) => (
              <Pressable
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServicePress(service.id)}
               
              >
                <CachedImage source={service.image} style={styles.serviceImage} />
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{service.cashback}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceType}>{service.type}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.promoBanner}>
          <LinearGradient
            colors={[Colors.warning, Colors.warning]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <Text style={styles.promoEmoji}>🪙</Text>
            <Text style={styles.promoTitle}>Digital Gold</Text>
            <Text style={styles.promoSubtitle}>Start with just {currencySymbol}10 • 24K purity guaranteed</Text>
            <Pressable
              style={styles.promoButton}
              onPress={() => router.push('/financial/gold' as any)}
            >
              <Text style={styles.promoButtonText}>Buy Gold</Text>
            </Pressable>
          </LinearGradient>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  searchButton: {
    padding: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statValue: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  section: {
    padding: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.md,
  },
  viewAllText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.brand.purple,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryEmoji: {
    fontSize: Typography.h2.fontSize,
  },
  categoryTitle: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: 2,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: Typography.overline.fontSize,
    color: Colors.text.tertiary,
  },
  serviceCard: {
    width: 160,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  serviceImage: {
    width: '100%',
    height: 100,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  serviceInfo: {
    padding: Spacing.md,
  },
  serviceName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  promoBanner: {
    marginHorizontal: Spacing.base,
  },
  promoGradient: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  promoEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  promoTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  promoButton: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  promoButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.warning,
  },
});

// Wrap with Error Boundary for production
const FinancialPageWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <View style={[styles.container, styles.loadingContainer]}>
          <Ionicons name="alert-circle" size={48} color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Something went wrong. Please try again.</Text>
        </View>
      }
    >
      <FinancialPage />
    </ErrorBoundary>
  );
};

export default withErrorBoundary(FinancialPageWithErrorBoundary, 'FinancialIndex');
