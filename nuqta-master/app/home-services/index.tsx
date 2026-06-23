import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Home Services Hub Page
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import homeServicesApi, { HomeServiceCategory, HomeService, HomeServicesStats } from '@/services/homeServicesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HomeServicesPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [categories, setCategories] = useState<HomeServiceCategory[]>([]);
  const [featuredServices, setFeaturedServices] = useState<HomeService[]>([]);
  const [stats, setStats] = useState<HomeServicesStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [categoriesRes, featuredRes, statsRes] = await Promise.all([
          homeServicesApi.getCategories(),
          homeServicesApi.getFeatured(3),
          homeServicesApi.getStats()
        ]);

        if (categoriesRes.success && categoriesRes.data) {
          if (!isMounted()) return;
          setCategories(categoriesRes.data);
        }
        if (featuredRes.success && featuredRes.data) {
          if (!isMounted()) return;
          setFeaturedServices(featuredRes.data);
        }
        if (statsRes.success && statsRes.data) {
          if (!isMounted()) return;
          setStats(statsRes.data);
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleServicePress = (service: HomeService) => {
    const serviceId = service._id || service.id;
    if (serviceId) {
      router.push(`/product-page?cardId=${serviceId}&cardType=product` as any);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.infoScale[400], colors.brand.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.background.primary} /></Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Home Services</Text>
            <Text style={styles.headerSubtitle}>Professional services at home</Text>
          </View>
          <Pressable style={styles.searchButton}><Ionicons name="search" size={24} color={Colors.background.primary} /></Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.professionals || 200}+</Text>
            <Text style={styles.statLabel}>Professionals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.maxCashback || 30}%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Same Day</Text>
            <Text style={styles.statLabel}>Service</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => {
              const isIconUrl = cat.icon && (cat.icon.startsWith('http://') || cat.icon.startsWith('https://'));
              return (
                <Pressable key={cat.id} style={styles.categoryCard} onPress={() => router.push(`/home-services/${cat.id}` as any)}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                    {isIconUrl ? (
                      <CachedImage
                        source={cat.icon}
                        style={{ width: 32, height: 32 }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                    )}
                  </View>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <Text style={styles.categoryCount}>{cat.count}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Popular Services</Text><Pressable><Text style={styles.viewAllText}>View All</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredServices.map((service) => {
              const serviceId = service._id || service.id;
              const imageUrl = service.images?.[0];
              const price = service.pricing?.selling || 0;
              const cashback = service.cashback?.percentage || service.serviceCategory?.cashbackPercentage || 0;
              const categoryName = service.serviceCategory?.name || 'Service';
              
              return (
                <Pressable 
                  key={serviceId} 
                  style={styles.serviceCard} 
                  onPress={() => handleServicePress(service)} 
                 
                >
                  <CachedImage source={{ uri: imageUrl }} style={styles.serviceImage} cachePolicy="memory-disk" />
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{cashback}%</Text>
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceType}>{categoryName}</Text>
                    <Text style={styles.servicePrice}>From {currencySymbol}{price}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.promoBanner}>
          <LinearGradient colors={[colors.success, colors.brand.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <Text style={styles.promoEmoji}>🏠</Text>
            <Text style={styles.promoTitle}>Verified Professionals</Text>
            <Text style={styles.promoSubtitle}>Background verified • Trained experts • Guaranteed service</Text>
            <Pressable style={styles.promoButton}><Text style={styles.promoButtonText}>Book Now</Text></Pressable>
          </LinearGradient>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: 16 },
  backButton: { padding: 8 },
  headerTitleContainer: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  searchButton: { padding: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  statItem: { alignItems: 'center', paddingHorizontal: 16 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text.inverse },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.nileBlue, marginBottom: 12 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: Colors.brand.purple },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: (SCREEN_WIDTH - 56) / 3, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: 16 },
  categoryIcon: { width: 48, height: 48, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryEmoji: { fontSize: 24 },
  categoryTitle: { fontSize: 12, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textAlign: 'center' },
  categoryCount: { fontSize: 10, color: Colors.neutral[500] },
  serviceCard: { width: 200, marginRight: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.default },
  serviceImage: { width: '100%', height: 120 },
  cashbackBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: 8 },
  cashbackText: { fontSize: 11, fontWeight: '700', color: Colors.text.inverse },
  serviceInfo: { padding: 12 },
  serviceName: { fontSize: 15, fontWeight: '700', color: Colors.nileBlue, marginBottom: 2 },
  serviceType: { fontSize: 12, color: Colors.neutral[500], marginBottom: 4 },
  servicePrice: { fontSize: 14, fontWeight: '600', color: Colors.success },
  promoBanner: { marginHorizontal: 16 },
  promoGradient: { padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  promoEmoji: { fontSize: 40, marginBottom: 12 },
  promoTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.inverse, marginBottom: 4 },
  promoSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 16 },
  promoButton: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 24 },
  promoButtonText: { fontSize: 14, fontWeight: '700', color: Colors.success },
});

export default withErrorBoundary(HomeServicesPage, 'HomeServicesIndex');
