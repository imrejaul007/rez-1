// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Healthcare Category Page - Dynamic route
 * Handles doctors, teleconsult, insurance, offers
 * Redirects to dedicated pages for lab, pharmacy, dental, emergency, records
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  white: Colors.background.primary,
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

// Category configuration
const categoryConfig: Record<string, {
  title: string;
  icon: string;
  gradientColors: [string, string];
  apiType: string;
  dedicatedPage?: string;
}> = {
  doctors: {
    title: 'Doctors',
    icon: 'medical',
    gradientColors: [Colors.info, colors.brand.blue],
    apiType: 'doctor',
  },
  pharmacy: {
    title: 'Pharmacy',
    icon: 'medkit',
    gradientColors: [Colors.success, colors.successScale[700]],
    apiType: 'pharmacy',
    dedicatedPage: '/healthcare/pharmacy',
  },
  lab: {
    title: 'Lab Tests',
    icon: 'flask',
    gradientColors: [Colors.brand.purpleLight, Colors.brand.purple],
    apiType: 'lab',
    dedicatedPage: '/healthcare/lab',
  },
  'lab-tests': {
    title: 'Lab Tests',
    icon: 'flask',
    gradientColors: [Colors.brand.purpleLight, Colors.brand.purple],
    apiType: 'lab',
    dedicatedPage: '/healthcare/lab',
  },
  dental: {
    title: 'Dental Care',
    icon: 'happy',
    gradientColors: [colors.brand.pink, colors.deepPink],
    apiType: 'doctor',
    dedicatedPage: '/healthcare/dental',
  },
  emergency: {
    title: 'Emergency 24x7',
    icon: 'warning',
    gradientColors: [Colors.error, colors.error],
    apiType: 'emergency',
    dedicatedPage: '/healthcare/emergency',
  },
  records: {
    title: 'Health Records',
    icon: 'document-text',
    gradientColors: [colors.brand.cyan, colors.cyanDark],
    apiType: 'records',
    dedicatedPage: '/healthcare/records',
  },
  teleconsult: {
    title: 'Teleconsult',
    icon: 'videocam',
    gradientColors: [Colors.success, colors.successScale[700]],
    apiType: 'doctor',
  },
  insurance: {
    title: 'Health Insurance',
    icon: 'shield-checkmark',
    gradientColors: [colors.brand.orange, colors.brand.orangeDark],
    apiType: 'insurance',
  },
  offers: {
    title: 'Health Offers',
    icon: 'pricetag',
    gradientColors: [Colors.error, colors.error],
    apiType: 'offers',
  },
};

interface Store {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
  metadata?: {
    specialization?: string;
    experience?: string;
    qualification?: string;
    consultationFee?: number;
    availableSlots?: string[];
    languages?: string[];
    services?: string[];
    cashbackPercentage?: number;
  };
}

const filterOptions = ['All', 'Nearby', 'Top Rated', 'Best Price'];

const HealthcareCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const config = categoryConfig[category || 'doctors'] || categoryConfig['doctors'];

  // Redirect to dedicated pages if they exist
  if (config.dedicatedPage) {
    return <Redirect href={config.dedicatedPage as any} />;
  }

  // Fetch stores from API
  const fetchStores = async () => {
    try {
      setLoading(true);
      let url = `/stores?category=healthcare`;

      if (config.apiType === 'doctor') {
        url += '&type=doctor';
        // For teleconsult, filter for doctors offering video consultation
        if (category === 'teleconsult') {
          // This would need backend support for filtering by teleconsult capability
        }
      } else if (config.apiType === 'pharmacy') {
        url += '&type=pharmacy';
      } else if (config.apiType === 'lab') {
        url += '&type=lab';
      }

      // Add filter params
      if (selectedFilter === 'Top Rated') {
        url += '&sortBy=ratings.average&sortOrder=desc';
      } else if (selectedFilter === 'Best Price') {
        url += '&sortBy=metadata.consultationFee&sortOrder=asc';
      }

      const response = await apiClient.get(url);

      if (response.success && response.data?.stores) {
        if (!isMounted()) return;
        setStores(response.data.stores);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load data. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [category, selectedFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStores();
    if (!isMounted()) return;
    setRefreshing(false);
  }, [category, selectedFilter]);

  const handleCallStore = (phone?: string) => {
    if (phone) {
      try { Linking.openURL(`tel:${phone}`); } catch (_e) { /* silently handle */ }
    } else {
      platformAlertSimple('Not Available', 'Phone number is not available.');
    }
  };

  const handleBookAppointment = (store: Store) => {
    // Navigate to consultation booking
    router.push({
      pathname: '/consultation/book',
      params: {
        storeId: store._id,
        storeName: store.name,
        fee: store.metadata?.consultationFee || 500,
      },
    } as any);
  };

  const renderStoreCard = (store: Store) => {
    const cashback = store.metadata?.cashbackPercentage || 0;

    return (
      <Pressable
        key={store._id}
        style={styles.itemCard}
        onPress={() => router.push(`/MainStorePage?storeId=${store._id}` as any)}
       
      >
        <View style={styles.cardHeader}>
          <View style={styles.storeImageContainer}>
            {store.logo ? (
              <CachedImage source={store.logo} style={styles.storeImage} />
            ) : store.banner ? (
              <CachedImage source={store.banner} style={styles.storeImage} />
            ) : (
              <View style={styles.storeImagePlaceholder}>
                <Ionicons name={config.icon as any} size={32} color={config.gradientColors[0]} />
              </View>
            )}
          </View>
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>{cashback}% CB</Text>
          </View>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{store.name}</Text>

          {store.metadata?.specialization && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{store.metadata.specialization}</Text>
            </View>
          )}

          {store.metadata?.qualification && (
            <Text style={styles.qualificationText}>{store.metadata.qualification}</Text>
          )}

          {store.metadata?.experience && (
            <Text style={styles.experienceText}>{store.metadata.experience}</Text>
          )}

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.gray600} />
            <Text style={styles.locationText}>
              {store.address.city}, {store.address.state}
            </Text>
          </View>

          <View style={styles.itemMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={COLORS.amber500} />
              <Text style={styles.ratingText}>
                {store.ratings.average.toFixed(1)} ({store.ratings.count})
              </Text>
            </View>

            {store.metadata?.languages && store.metadata.languages.length > 0 && (
              <View style={styles.languagesContainer}>
                <Ionicons name="chatbubble-outline" size={12} color={COLORS.gray600} />
                <Text style={styles.languagesText}>
                  {store.metadata.languages.slice(0, 2).join(', ')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.itemFooter}>
            <View>
              {store.metadata?.consultationFee ? (
                <Text style={styles.priceText}>Rs {store.metadata.consultationFee}</Text>
              ) : (
                <Text style={styles.priceText}>Contact for price</Text>
              )}
              <Text style={styles.priceLabel}>Consultation Fee</Text>
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                style={styles.callButton}
                onPress={() => handleCallStore(store.contact.phone)}
              >
                <Ionicons name="call" size={18} color={config.gradientColors[0]} />
              </Pressable>
              <Pressable
                style={[styles.bookButton, { backgroundColor: config.gradientColors[0] }]}
                onPress={() => handleBookAppointment(store)}
              >
                <Text style={styles.bookButtonText}>Book</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  // Static content for insurance and offers (placeholder until APIs are ready)
  const renderStaticContent = () => {
    if (category === 'insurance') {
      return (
        <View style={styles.staticContent}>
          <View style={styles.comingSoonCard}>
            <Ionicons name="shield-checkmark" size={64} color={COLORS.gray200} />
            <Text style={styles.comingSoonTitle}>Health Insurance</Text>
            <Text style={styles.comingSoonText}>
              Compare and buy health insurance plans from top providers.
              This feature is coming soon!
            </Text>
            <Pressable style={styles.notifyButton}>
              <Text style={styles.notifyButtonText}>Notify Me</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (category === 'offers') {
      return (
        <View style={styles.staticContent}>
          <View style={styles.comingSoonCard}>
            <Ionicons name="pricetag" size={64} color={COLORS.gray200} />
            <Text style={styles.comingSoonTitle}>Health Offers</Text>
            <Text style={styles.comingSoonText}>
              Exclusive health offers and discounts.
              Stay tuned for amazing deals!
            </Text>
            <Pressable style={styles.notifyButton}>
              <Text style={styles.notifyButtonText}>Notify Me</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={config.icon as any} size={24} color={COLORS.white} />
              <Text style={styles.headerTitle}>{config.title}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {stores.length > 0 ? `${stores.length} options available` : 'Finding options...'}
            </Text>
          </View>
          <Pressable style={styles.searchButton}>
            <Ionicons name="search" size={24} color={COLORS.white} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Filters */}
      {(config.apiType === 'doctor' || config.apiType === 'pharmacy' || config.apiType === 'lab') && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterOptions.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterChip,
                  selectedFilter === filter && { backgroundColor: config.gradientColors[0] },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[config.gradientColors[0]]}
          />
        }
      >
        {/* Static content for insurance/offers */}
        {(category === 'insurance' || category === 'offers') && renderStaticContent()}

        {/* Dynamic content for doctors/pharmacies/labs */}
        {config.apiType !== 'insurance' && config.apiType !== 'offers' && (
          <>
            {loading ? (
              <CardGridSkeleton />
            ) : stores.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={config.icon as any} size={64} color={COLORS.gray200} />
                <Text style={styles.emptyText}>No {config.title.toLowerCase()} found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filters or check back later
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {stores.map(renderStoreCard)}
              </View>
            )}
          </>
        )}

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
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchButton: {
    padding: Spacing.sm,
  },
  filtersContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray100,
    marginRight: Spacing.sm,
  },
  filterChipText: {
    ...Typography.body,
    color: COLORS.gray600,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: COLORS.gray600,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: COLORS.gray600,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  itemsList: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    position: 'relative',
  },
  storeImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.gray50,
  },
  storeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  storeImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray50,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.green500,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: COLORS.white,
  },
  itemInfo: {
    padding: Spacing.base,
  },
  itemName: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: 6,
  },
  typeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  qualificationText: {
    ...Typography.bodySmall,
    color: COLORS.cyan500,
    marginBottom: Spacing.xs,
  },
  experienceText: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  locationText: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
  },
  languagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  languagesText: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  priceText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.green500,
  },
  priceLabel: {
    ...Typography.caption,
    color: COLORS.gray600,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  bookButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  staticContent: {
    padding: Spacing.base,
  },
  comingSoonCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
  },
  comingSoonTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  comingSoonText: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  notifyButton: {
    backgroundColor: COLORS.red500,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  notifyButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default withErrorBoundary(HealthcareCategoryPage, 'HealthcareCategory');
