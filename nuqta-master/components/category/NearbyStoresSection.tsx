/**
 * NearbyStoresSection Component
 * Enhanced horizontal scrollable nearby store cards with distance and features
 * Adapted from Rez_v-2-main FashionStoreCard
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getNearbyStoresForCategory, NearbyStore, nearbyStoresData } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';

interface NearbyStoresSectionProps {
  categorySlug: string;
  stores?: NearbyStore[];
  onStorePress?: (store: NearbyStore) => void;
}

const CARD_WIDTH = 200;

const StoreCard = memo(({
  store,
  onPress,
}: {
  store: NearbyStore;
  onPress: () => void;
}) => (
  <Pressable
    style={styles.storeCard}
    onPress={onPress}
   
    accessibilityLabel={`${store.name} store`}
    accessibilityRole="button"
  >
    {/* Store Header */}
    <View style={styles.storeHeader}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>{store.logo}</Text>
      </View>
      <View style={styles.headerInfo}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#FFB800" />
          <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
        </View>
      </View>
    </View>

    {/* Distance */}
    <View style={styles.distanceRow}>
      <Ionicons name="location-outline" size={14} color={colors.neutral[500]} />
      <Text style={styles.distanceText}>{store.distance}</Text>
    </View>

    {/* Feature Badges */}
    <View style={styles.badgesRow}>
      {store.is60Min && (
        <View style={styles.featureBadge}>
          <Ionicons name="flash" size={10} color={colors.warningScale[400]} />
          <Text style={styles.featureText}>60 min</Text>
        </View>
      )}
      {store.hasPickup && (
        <View style={styles.featureBadge}>
          <Ionicons name="storefront-outline" size={10} color={colors.infoScale[400]} />
          <Text style={styles.featureText}>Pickup</Text>
        </View>
      )}
    </View>

    {/* Cashback */}
    <View style={styles.cashbackRow}>
      <View style={styles.cashbackBadge}>
        <Text style={styles.cashbackText}>{store.cashback}% cashback</Text>
      </View>
    </View>

    {/* Categories */}
    <View style={styles.categoriesRow}>
      {store.categories.slice(0, 2).map((cat, idx) => (
        <View key={idx} style={styles.categoryChip}>
          <Text style={styles.categoryText}>{cat}</Text>
        </View>
      ))}
      {store.categories.length > 2 && (
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>+{store.categories.length - 2}</Text>
        </View>
      )}
    </View>
  </Pressable>
));

StoreCard.displayName = 'StoreCard';

const NearbyStoresSection: React.FC<NearbyStoresSectionProps> = ({
  categorySlug,
  stores,
  onStorePress,
}) => {
  const router = useRouter();
  const displayStores = stores || getNearbyStoresForCategory(categorySlug);

  const handlePress = useCallback((store: NearbyStore) => {
    if (onStorePress) {
      onStorePress(store);
    } else {
      router.push({
        pathname: '/MainStorePage',
        params: { storeId: store.id },
      } as any);
    }
  }, [router, onStorePress]);

  // Always show some stores - use all nearby stores if category-specific is empty
  const storestoShow = displayStores.length > 0 ? displayStores : nearbyStoresData;

  if (storestoShow.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={20} color={colors.lightMustard} />
          <Text style={styles.sectionTitle}>Nearby Stores</Text>
        </View>
        <Pressable
          style={styles.seeAllButton}
          onPress={() => router.push(`/stores?category=${categorySlug}&sort=distance` as any)}
          accessibilityLabel="See all nearby stores"
        >
          <Text style={styles.seeAllText}>View All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {storestoShow.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            onPress={() => handlePress(store)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.4,
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storeCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logo: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  distanceText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  cashbackRow: {
    marginBottom: 10,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryChip: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'capitalize',
  },
});

export default memo(NearbyStoresSection);
