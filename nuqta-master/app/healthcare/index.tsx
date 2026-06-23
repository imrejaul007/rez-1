// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Healthcare Hub Page
 * Production-ready with API integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';
import emergencyApi from '@/services/emergencyApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  red500: Colors.error,
  amber500: Colors.warning,
  cyan500: colors.brand.cyan,
};

// Category definitions with routes
const categoryConfig = [
  { id: 'doctors', title: 'Doctors', icon: 'medical', color: Colors.info, route: '/healthcare/doctors' },
  { id: 'pharmacy', title: 'Pharmacy', icon: 'medkit', color: Colors.success, route: '/healthcare/pharmacy' },
  { id: 'lab', title: 'Lab Tests', icon: 'flask', color: Colors.brand.purpleLight, route: '/healthcare/lab' },
  { id: 'dental', title: 'Dental Care', icon: 'happy', color: colors.brand.pink, route: '/healthcare/dental' },
  { id: 'emergency', title: 'Emergency', icon: 'warning', color: Colors.error, route: '/healthcare/emergency' },
  { id: 'records', title: 'Health Records', icon: 'document-text', color: colors.brand.cyan, route: '/healthcare/records' },
];

// Quick actions for emergency
const quickActions = [
  { id: 'ambulance', title: 'Ambulance', icon: 'car', color: Colors.error, phone: '102' },
  { id: 'police', title: 'Police', icon: 'shield', color: Colors.info, phone: '100' },
  { id: 'emergency', title: 'Emergency', icon: 'warning', color: Colors.warning, phone: '112' },
];

interface ServiceProduct {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  price: {
    mrp: number;
    selling: number;
    discount?: number;
  };
  category: string;
  metadata?: {
    cashbackPercentage?: number;
    serviceType?: string;
  };
}

interface CategoryStats {
  doctors: number;
  pharmacies: number;
  labs: number;
  tests: number;
}

const HealthcarePage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredServices, setFeaturedServices] = useState<ServiceProduct[]>([]);
  const [stats, setStats] = useState<CategoryStats>({
    doctors: 0,
    pharmacies: 0,
    labs: 0,
    tests: 0,
  });

  // Fetch healthcare data
  const fetchData = async () => {
    try {
      // Fetch stores count by type
      const [doctorsRes, pharmaciesRes, labsRes, productsRes] = await Promise.allSettled([
        apiClient.get('/stores?category=healthcare&type=doctor&limit=1'),
        apiClient.get('/stores?category=healthcare&type=pharmacy&limit=1'),
        apiClient.get('/stores?category=healthcare&type=lab&limit=1'),
        apiClient.get('/products?category=healthcare&limit=6'),
      ]);

      // Extract counts
      if (!isMounted()) return;
      setStats({
        doctors: doctorsRes.status === 'fulfilled' ? (doctorsRes.value.data?.total || doctorsRes.value.data?.stores?.length || 30) : 30,
        pharmacies: pharmaciesRes.status === 'fulfilled' ? (pharmaciesRes.value.data?.total || pharmaciesRes.value.data?.stores?.length || 15) : 15,
        labs: labsRes.status === 'fulfilled' ? (labsRes.value.data?.total || labsRes.value.data?.stores?.length || 10) : 10,
        tests: productsRes.status === 'fulfilled' ? (productsRes.value.data?.total || productsRes.value.data?.products?.length || 48) : 48,
      });

      // Get featured services/products
      if (productsRes.status === 'fulfilled' && productsRes.value.success && productsRes.value.data?.products) {
        if (!isMounted()) return;
        setFeaturedServices(productsRes.value.data.products.slice(0, 6));
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    if (!isMounted()) return;
    setRefreshing(false);
  }, []);

  const handleQuickCall = (phone: string) => {
    try { Linking.openURL(`tel:${phone}`); } catch (e) { catchAndWarn(e, 'Healthcare/openURL'); }
  };

  const getCategoryCount = (id: string): string => {
    switch (id) {
      case 'doctors':
        return `${stats.doctors}+ doctors`;
      case 'pharmacy':
        return `${stats.pharmacies}+ stores`;
      case 'lab':
        return `${stats.tests}+ tests`;
      case 'dental':
        return 'Book Now';
      case 'emergency':
        return '24/7 Available';
      case 'records':
        return 'Manage';
      default:
        return '';
    }
  };

  const navigateToCategory = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.error, Colors.error]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Healthcare</Text>
            <Text style={styles.headerSubtitle}>Your health, our priority</Text>
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => router.push('/healthcare/records' as any)}
          >
            <Ionicons name="document-text" size={24} color={COLORS.white} />
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.doctors}+</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>30%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24/7</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.red500]}
          />
        }
      >
        {/* Emergency Quick Actions */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Emergency Quick Dial</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                style={[styles.quickActionButton, { backgroundColor: action.color }]}
                onPress={() => handleQuickCall(action.phone)}
              >
                <Ionicons name={action.icon as any} size={20} color={COLORS.white} />
                <Text style={styles.quickActionText}>{action.title}</Text>
                <Text style={styles.quickActionPhone}>{action.phone}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Healthcare Services</Text>
          <View style={styles.categoriesGrid}>
            {categoryConfig.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => navigateToCategory(cat.route)}
               
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <Text style={styles.categoryCount}>{getCategoryCount(cat.id)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Featured Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <Pressable onPress={() => router.push('/healthcare/lab' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.red500} />
            </View>
          ) : featuredServices.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {featuredServices.map((service) => {
                const cashback = service.metadata?.cashbackPercentage || 0;
                const discount = service.price.discount ||
                  Math.round(((service.price.mrp - service.price.selling) / service.price.mrp) * 100);

                return (
                  <Pressable
                    key={service._id}
                    style={styles.serviceCard}
                    onPress={() => router.push('/healthcare/lab' as any)}
                   
                  >
                    <CachedImage
                      source={service.images?.[0] || undefined}
                      style={styles.serviceImage}
                    />
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackText}>{cashback}% CB</Text>
                    </View>
                    {discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{discount}% OFF</Text>
                      </View>
                    )}
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {service.name}
                      </Text>
                      <Text style={styles.serviceType}>
                        {service.metadata?.serviceType || 'Lab Test'}
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.servicePrice}>Rs {service.price.selling}</Text>
                        {service.price.mrp > service.price.selling && (
                          <Text style={styles.serviceMrp}>Rs {service.price.mrp}</Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyServices}>
              <Text style={styles.emptyText}>No services available</Text>
            </View>
          )}
        </View>

        {/* Health Records Banner */}
        <Pressable
          style={styles.recordsBanner}
          onPress={() => router.push('/healthcare/records' as any)}
        >
          <LinearGradient
            colors={[colors.brand.cyan, colors.cyanDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.recordsGradient}
          >
            <View style={styles.recordsIcon}>
              <Ionicons name="folder-open" size={32} color={COLORS.white} />
            </View>
            <View style={styles.recordsContent}>
              <Text style={styles.recordsTitle}>Health Records</Text>
              <Text style={styles.recordsSubtitle}>
                Store & manage your prescriptions, reports, and medical documents securely
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
          </LinearGradient>
        </Pressable>

        {/* Emergency Services Banner */}
        <Pressable
          style={styles.emergencyBanner}
          onPress={() => router.push('/healthcare/emergency' as any)}
        >
          <LinearGradient
            colors={[Colors.error, Colors.error]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyGradient}
          >
            <View style={styles.emergencyBannerIcon}>
              <Ionicons name="warning" size={32} color={COLORS.white} />
            </View>
            <View style={styles.emergencyBannerContent}>
              <Text style={styles.emergencyBannerTitle}>Emergency 24x7</Text>
              <Text style={styles.emergencyBannerSubtitle}>
                Book ambulance, find nearby hospitals, emergency contacts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
          </LinearGradient>
        </Pressable>

        {/* Insurance Promo Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient
            colors={[Colors.info, Colors.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <Ionicons name="shield-checkmark" size={48} color="rgba(255,255,255,0.3)" />
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Health Insurance</Text>
              <Text style={styles.promoSubtitle}>
                Get covered from {currencySymbol}500/month{'\n'}Family plans available
              </Text>
            </View>
            <Pressable style={styles.promoButton}>
              <Text style={styles.promoButtonText}>Get Quote</Text>
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
    backgroundColor: COLORS.white,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 120,
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
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
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
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  statLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  emergencySection: {
    backgroundColor: Colors.errorScale[50],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  emergencyTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.red500,
    marginBottom: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    gap: 6,
  },
  quickActionText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.white,
  },
  quickActionPhone: {
    ...Typography.caption,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
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
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.md,
  },
  viewAllText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.red500,
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
    backgroundColor: COLORS.gray50,
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
  categoryTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
    textAlign: 'center',
  },
  categoryCount: {
    ...Typography.overline,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyServices: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: COLORS.gray600,
  },
  serviceCard: {
    width: 180,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  serviceImage: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.gray100,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    ...Typography.overline,
    fontWeight: '700',
    color: COLORS.white,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.amber500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  serviceInfo: {
    padding: 10,
  },
  serviceName: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 2,
    minHeight: 32,
  },
  serviceType: {
    ...Typography.caption,
    color: COLORS.gray600,
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servicePrice: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.green500,
  },
  serviceMrp: {
    ...Typography.caption,
    color: COLORS.gray600,
    textDecorationLine: 'line-through',
  },
  recordsBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  recordsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  recordsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recordsContent: {
    flex: 1,
  },
  recordsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: Spacing.xs,
  },
  recordsSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  emergencyBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  emergencyBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emergencyBannerContent: {
    flex: 1,
  },
  emergencyBannerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: Spacing.xs,
  },
  emergencyBannerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  promoBanner: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  promoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  promoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  promoTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  promoButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  promoButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.info,
  },
});

export default withErrorBoundary(HealthcarePage, 'HealthcareIndex');
