/**
 * HomeDeliverySection Component
 * Section for home delivery stores - groceries, pharmacy, cloud kitchens
 * Displays stores with category tabs and Cobone-style list design
 */

import React, { useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import { useHomeDeliverySection, HomeDeliverySectionStore } from '@/hooks/useHomeDeliverySection';
import { ThemedText } from '@/components/ThemedText';
import {
  HOME_DELIVERY_SUBCATEGORIES,
  HOME_DELIVERY_SECTION_CONFIG,
  HOME_DELIVERY_COLORS,
} from '@/config/homeDeliverySectionConfig';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

// Animated components
const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.View;

// List item dimensions
const LIST_IMAGE_SIZE = 85;
const MAX_VISIBLE_STORES = 3;

// Skeleton Loading List Item
const SkeletonListItem = memo(() => (
  <View style={styles.listItem}>
    <View style={[styles.listImageContainer, styles.skeletonImage]} />
    <View style={styles.listItemContent}>
      <View style={[styles.skeletonText, { width: '80%', height: 16 }]} />
      <View style={[styles.skeletonText, { width: '50%', height: 14, marginTop: 8 }]} />
      <View style={[styles.skeletonText, { width: '30%', height: 12, marginTop: 8 }]} />
    </View>
  </View>
));

// Category Chip Component
const CategoryChip = memo(({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
    onPress={onPress}
   
  >
    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
      {label}
    </Text>
  </Pressable>
));

// Store List Item Component (Cobone-style)
const StoreListItem = memo(({
  store,
  index,
  onPress,
  currencySymbol,
}: {
  store: HomeDeliverySectionStore;
  index: number;
  onPress: () => void;
  currencySymbol: string;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  // Get display image
  const displayImage = store.banner || store.logo;

  // Check if store is a "Best Seller" (rating >= 4.5)
  const isBestSeller = store.rating.average >= 4.5;

  // Calculate savings percentage from earnAmount (simulated)
  const savingsPercent = store.earnAmount > 0 ? Math.min(Math.round((store.earnAmount / 50) * 10), 25) : 0;

  // Simulated original price (for display purposes)
  const estimatedValue = store.earnAmount > 0 ? store.earnAmount * 5 : 0;
  const originalPrice = estimatedValue + store.earnAmount;

  return (
    <AnimatedView
      entering={FadeIn.delay(index * 60).springify()}
      layout={Layout.springify()}
    >
      <AnimatedTouchable
        style={[styles.listItem, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
      >
        {/* Store Image with Best Seller Badge */}
        <View style={styles.listImageWrapper}>
          <View style={styles.listImageContainer}>
            {displayImage ? (
              <CachedImage
                source={displayImage}
                style={styles.listImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.listImagePlaceholder}>
                <Ionicons name="storefront-outline" size={32} color={HOME_DELIVERY_COLORS.textMuted} />
              </View>
            )}
          </View>
          {isBestSeller && (
            <View style={styles.bestSellerBadge}>
              <Ionicons name="checkmark-circle" size={10} color={colors.background.primary} />
              <Text style={styles.bestSellerText}>Best Seller</Text>
            </View>
          )}
        </View>

        {/* Store Info - Right Side */}
        <View style={styles.listItemContent}>
          {/* Store Name */}
          <Text style={styles.listItemTitle} numberOfLines={2}>
            {store.name}
          </Text>

          {/* Category/Location */}
          <Text style={styles.listItemSubtitle} numberOfLines={1}>
            {store.category.length > 0 ? store.category.slice(0, 2).join(' • ') : 'Store'}
          </Text>

          {/* Pricing Row */}
          <View style={styles.pricingRow}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <Text style={styles.currentPrice}>{estimatedValue || 'Free'}</Text>
            {originalPrice > 0 && store.earnAmount > 0 && (
              <Text style={styles.originalPrice}>{originalPrice}</Text>
            )}
            {savingsPercent > 0 && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save {savingsPercent}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right side logo/brand indicator */}
        {store.logo && store.banner && (
          <View style={styles.brandLogoContainer}>
            <CachedImage
              source={store.logo}
              style={styles.brandLogo}
              contentFit="contain"
            />
          </View>
        )}
      </AnimatedTouchable>
    </AnimatedView>
  );
});

// Main Component
function HomeDeliverySection() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const {
    activeSubcategory,
    stores,
    loading,
    error,
    setActiveSubcategory,
    refreshStores,
  } = useHomeDeliverySection();

  const tabScrollRef = useRef<ScrollView>(null);

  const handleSubcategoryPress = useCallback((subcategoryId: string) => {
    setActiveSubcategory(subcategoryId);
  }, [setActiveSubcategory]);

  const handleStorePress = useCallback((store: HomeDeliverySectionStore) => {
    router.push(`/MainStorePage?storeId=${store.id}` as any);
  }, [router]);

  const handleViewAll = useCallback(() => {
    router.push('/home-delivery' as any);
  }, [router]);

  const handleRetry = useCallback(() => {
    refreshStores();
  }, [refreshStores]);

  // Render category chips
  const renderCategoryChips = () => (
    <ScrollView
      ref={tabScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContainer}
      style={styles.chipsScroll}
    >
      {HOME_DELIVERY_SUBCATEGORIES.map((subcategory) => {
        const isActive = activeSubcategory === subcategory.id;
        return (
          <CategoryChip
            key={subcategory.id}
            label={subcategory.label}
            isActive={isActive}
            onPress={() => handleSubcategoryPress(subcategory.id)}
          />
        );
      })}
    </ScrollView>
  );

  // Render store list items (vertical list - Cobone style)
  const renderStores = () => {
    // Loading state
    if (loading) {
      return (
        <View style={styles.storesListContainer}>
          {[1, 2, 3].map((_, index) => (
            <SkeletonListItem key={`skeleton-${index}`} />
          ))}
        </View>
      );
    }

    // Error state
    if (error) {
      return (
        <Pressable style={styles.errorContainer} onPress={handleRetry}>
          <Ionicons name="refresh-outline" size={32} color={HOME_DELIVERY_COLORS.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </Pressable>
      );
    }

    // Empty state
    if (stores.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={40} color={HOME_DELIVERY_COLORS.textMuted} />
          <Text style={styles.emptyText}>No stores found</Text>
          <Text style={styles.emptySubtext}>Check back soon for new listings</Text>
        </View>
      );
    }

    // Vertical stores list (limited to MAX_VISIBLE_STORES)
    const visibleStores = stores.slice(0, MAX_VISIBLE_STORES);

    return (
      <View style={styles.storesListContainer}>
        {visibleStores.map((store, index) => (
          <StoreListItem
            key={store.id}
            store={store}
            index={index}
            onPress={() => handleStorePress(store)}
            currencySymbol={currencySymbol}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>
          {HOME_DELIVERY_SECTION_CONFIG.title}
        </ThemedText>
        <ThemedText style={styles.sectionSubtitle}>
          {HOME_DELIVERY_SECTION_CONFIG.subtitle}
        </ThemedText>
      </View>

      {/* Category Tabs - Horizontal Scroll */}
      {renderCategoryChips()}

      {/* Store List Items - Vertical */}
      {renderStores()}

      {/* View All Button - Bottom */}
      {stores.length > 0 && !loading && !error && (
        <Pressable
          style={styles.viewAllButton}
          onPress={handleViewAll}
         
        >
          <Text style={styles.viewAllButtonText}>View All</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: HOME_DELIVERY_COLORS.white,
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  // Header styles
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: HOME_DELIVERY_COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: HOME_DELIVERY_COLORS.textMuted,
    fontWeight: '400',
  },
  // Category Chips/Tabs styles (horizontal scroll at top)
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  chipsScroll: {
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryChipActive: {
    borderBottomColor: HOME_DELIVERY_COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: HOME_DELIVERY_COLORS.textMuted,
  },
  categoryChipTextActive: {
    color: HOME_DELIVERY_COLORS.primary,
    fontWeight: '600',
  },
  // Stores List Container (vertical)
  storesListContainer: {
    paddingHorizontal: 12,
  },
  // List Item Styles (Cobone-style)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  listImageWrapper: {
    position: 'relative',
  },
  listImageContainer: {
    width: LIST_IMAGE_SIZE,
    height: LIST_IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.neutral[50],
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  // Best Seller Badge
  bestSellerBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: HOME_DELIVERY_COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bestSellerText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // List Item Content (right side)
  listItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: HOME_DELIVERY_COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: HOME_DELIVERY_COLORS.textMuted,
    marginBottom: 8,
  },
  // Pricing Row
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: HOME_DELIVERY_COLORS.textPrimary,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: HOME_DELIVERY_COLORS.textPrimary,
  },
  originalPrice: {
    fontSize: 13,
    color: HOME_DELIVERY_COLORS.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  saveBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 6,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Brand Logo (right side)
  brandLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.neutral[50],
    marginLeft: 8,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  // View All Button (bottom)
  viewAllButton: {
    marginTop: 12,
    marginHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: HOME_DELIVERY_COLORS.textSecondary,
  },
  // Skeleton styles
  skeletonImage: {
    backgroundColor: colors.neutral[200],
  },
  skeletonText: {
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  // Error state
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: HOME_DELIVERY_COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: HOME_DELIVERY_COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: HOME_DELIVERY_COLORS.textMuted,
    marginTop: 4,
  },
});

export default memo(HomeDeliverySection);
