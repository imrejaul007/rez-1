// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Experience Detail Page - Production Ready
 * Fetches experience data and stores from backend API
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { experiencesApi, StoreExperience } from '@/services/experiencesApi';
import PremiumStoreCard from '@/components/experience/PremiumStoreCard';
import ThinkOutsideTheBox from '@/components/experience/ThinkOutsideTheBox';
import { getTheme } from '@/constants/experienceThemes';
import { useLocation } from '@/contexts/LocationContext';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const ExperienceDetailPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { currentLocation } = useLocation();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const [experience, setExperience] = useState<StoreExperience | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['all']);

  // Get Theme based on type (handles aliases like "fast-delivery")
  const currentTheme = getTheme(type);

  useEffect(() => {
    const fetchExperienceData = async () => {
      if (!type) return;

      try {
        setIsLoading(true);

        // Fetch experience details
        const expResponse = await experiencesApi.getExperienceById(type);
        if (expResponse.success && expResponse.data) {
          setExperience(expResponse.data);
        } else {
          // Fallback structure using Theme
          if (!isMounted()) return;
          setExperience({
            _id: type,
            slug: type,
            title: capitalizeLine(type.replace(/-/g, ' ')),
            type: type,
            icon: currentTheme.icon,
            sortOrder: 1,
            isActive: true,
            isFeatured: false,
            iconType: 'emoji',
          });
        }

        // Fetch stores (initial load) - pass user location for distance calculation
        const locationParam = currentLocation?.coordinates
          ? `${currentLocation.coordinates.longitude},${currentLocation.coordinates.latitude}`
          : undefined;

        const storesResponse = await experiencesApi.getStoresByExperience(type, {
          page: 1,
          limit: 50,
          q: searchQuery,
          location: locationParam,
        });

        if (storesResponse.success && storesResponse.data) {
          const fetchedStores = storesResponse.data.stores || [];
          if (!isMounted()) return;
          setStores(fetchedStores);

          // Extract unique categories (only on initial load or if not filtering)
          if (!searchQuery) {
            const uniqueCategories = Array.from(
              new Set(fetchedStores.map((s: any) => s.category?.name || 'Other'))
            );
            if (!isMounted()) return;
            setCategories(['all', ...uniqueCategories]);
          }
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    // Debounce search requests
    const timer = setTimeout(() => {
      fetchExperienceData();
    }, isSearchActive ? 500 : 0);

    return () => clearTimeout(timer);
  }, [type, searchQuery, currentLocation]);

  const capitalizeLine = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());

  // Filter Logic
  const filteredStores = useMemo(() => stores.filter((store: any) => {
    const matchesCategory = selectedFilter === 'all' || (store.category?.name || store.category || 'Other') === selectedFilter;
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [stores, selectedFilter, searchQuery]);

  const handleStorePress = (store: any) => {
    const storeId = store._id || store.id;
    if (storeId) {
      router.push(`/MainStorePage?storeId=${storeId}` as any);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer]}>
        <CardGridSkeleton />
      </View>
    );
  }

  // Display Vars (Backend > Theme > Defaults)
  const displayTitle = experience?.title || capitalizeLine(type);
  const displaySubtitle = experience?.subtitle || 'Curated for you';
  const displayDesc = experience?.description || currentTheme.description;
  // Use Theme Gradient if backend missing or default, for better contrast
  const displayGradient = currentTheme.gradientColors;
  const benefits = experience?.benefits && experience.benefits.length > 0 ? experience.benefits : (currentTheme.benefits || []);

  // Calculate real stats from stores data
  const { avgRating, avgCashback } = useMemo(() => {
    const withRating = stores.filter((s: any) => s.rating && s.rating > 0);
    const rating = withRating.length > 0
      ? (withRating.reduce((sum: number, s: any) => sum + s.rating, 0) / withRating.length).toFixed(1)
      : null;

    const withCashback = stores.filter((s: any) => s.cashback && s.cashback > 0);
    const cashback = withCashback.length > 0
      ? Math.round(withCashback.reduce((sum: number, s: any) => sum + s.cashback, 0) / withCashback.length)
      : null;

    return { avgRating: rating, avgCashback: cashback };
  }, [stores]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Floating Header with Blur */}
      <View style={styles.header}>
        {scrollY > 50 && (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>

          {isSearchActive ? (
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color={Colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stores..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable onPress={() => setIsSearchActive(!isSearchActive)} style={styles.iconButton}>
            <Ionicons name={isSearchActive ? "close" : "search"} size={24} color={Colors.nileBlue} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >

        {/* Dynamic Gradient Hero */}
        <LinearGradient
          colors={displayGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Text style={styles.heroIcon}>{experience?.icon || currentTheme.icon}</Text>
            </View>
            <Text style={styles.heroTitle}>{displayTitle}</Text>
            <Text style={styles.heroSubtitle}>{displaySubtitle}</Text>
            <Text style={styles.heroDescription}>{displayDesc}</Text>
          </View>

          {/* Floated Stats Card */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stores.length > 0 ? `${stores.length}+` : '0'}</Text>
              <Text style={styles.statLabel}>Stores</Text>
            </View>
            {avgCashback && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{avgCashback}%</Text>
                  <Text style={styles.statLabel}>Avg Cashback</Text>
                </View>
              </>
            )}
            {avgRating && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{avgRating}</Text>
                  <Text style={styles.statLabel}>Avg Rating</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>

          {/* New Section: Think Outside The Box */}
          <ThinkOutsideTheBox experienceType={type as string} searchQuery={searchQuery} />

          {/* Benefits Grid */}
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Why shop here?</Text>
          </View>
          <View style={styles.benefitsGrid}>
            {benefits.map((benefit: string, idx: number) => (
              <View key={idx} style={styles.benefitCard}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={{ marginRight: 8 }} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Store Browser */}
          <View style={[styles.sectionHeader, { marginTop: 32 }]}>
            <Text style={styles.sectionTitle}>Browse Stores</Text>
          </View>

          {/* Categories Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingRight: 20 }}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setSelectedFilter(cat)}
                style={[
                  styles.filterChip,
                  selectedFilter === cat && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === cat && styles.filterTextActive
                ]}>
                  {cat === 'all' ? 'All Stores' : cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Stores List */}
          <View style={styles.storesList}>
            {filteredStores.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color={Colors.border.default} />
                <Text style={styles.emptyText}>No stores found matching your criteria</Text>
              </View>
            ) : (
              filteredStores.map((store: any, index: number) => (
                <PremiumStoreCard
                  key={store.id || index}
                  store={store}
                  onPress={handleStorePress}
                />
              ))
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'web' ? 12 : Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: Spacing.base,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    height: 40,
    marginHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.nileBlue,
  },
  heroSection: {
    paddingTop: Platform.OS === 'web' ? 70 : Platform.OS === 'ios' ? 110 : 100, // Space for floating header
    paddingBottom: 60, // Space for the floated card
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: 40,
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroIcon: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
  },
  statsContainer: {
    position: 'absolute',
    bottom: -30,
    left: 20,
    right: 20,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    paddingVertical: Spacing.base,
    shadowColor: colors.slateGray,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.nileBlue,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.default,
  },
  contentContainer: {
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  benefitText: {
    fontSize: 13,
    color: Colors.nileBlue,
    fontWeight: '500',
    flex: 1,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.background.primary,
    borderRadius: 100,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterChipActive: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
  },
  filterTextActive: {
    color: Colors.text.inverse,
  },
  storesList: {
    gap: Spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.neutral[400],
    marginTop: Spacing.md,
    fontSize: 16,
  },
});

export default withErrorBoundary(ExperienceDetailPage, 'ExperienceType');
