/**
 * FavoriteStoresSection Component
 * "Shop at your favorite" section with tall cards and ReZ design system
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FavoriteStore } from '@/types/favoriteStore.types';
import { colors } from '@/constants/theme';

interface FavoriteStoresSectionProps {
  stores: FavoriteStore[];
  isLoading?: boolean;
  onToggleFavorite: (storeId: string) => Promise<boolean>;
  maxItems?: number;
}

const CARD_WIDTH = 260;
const CARD_GAP = 16;
const IMAGE_HEIGHT = 280;

// Memoized Card Component - Zara style design
const FavoriteStoreCard = memo(({
  store,
  onPress,
}: {
  store: FavoriteStore;
  onPress: () => void;
}) => {
  const formattedRating = store.rating.value > 0 ? store.rating.value.toFixed(1) : '0.0';
  const hasCashback = store.cashbackPercentage && store.cashbackPercentage > 0;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
     
      accessibilityLabel={`View ${store.name}`}
      accessibilityRole="button"
    >
      {/* Image Container - Tall image like Zara design */}
      <View style={styles.imageContainer}>
        {store.image ? (
          <CachedImage
            source={store.image}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="storefront-outline" size={50} color={colors.neutral[400]} />
          </View>
        )}
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Name and Rating Row */}
        <View style={styles.nameRatingRow}>
          <Text style={styles.storeName} numberOfLines={1}>
            {store.name}
          </Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingValue}>{formattedRating}</Text>
            <Ionicons name="star" size={14} color="#FFB800" />
          </View>
        </View>

        {/* Description - What the store offers */}
        {store.description && store.description.length > 1 && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {store.description}
          </Text>
        )}

        {/* Address */}
        {store.address && store.address.length > 1 && (
          <Text style={styles.addressText} numberOfLines={2}>
            {store.address}
          </Text>
        )}

        {/* Bottom Row: Delivery Time + Cashback */}
        <View style={styles.bottomRow}>
          {/* Delivery Time */}
          {store.deliveryTime && store.deliveryTime.length > 0 && (
            <View style={styles.deliveryBadge}>
              <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
              <Text style={styles.deliveryText}>{store.deliveryTime}</Text>
            </View>
          )}

          {/* Cashback Pill - ReZ green style */}
          {hasCashback && (
            <View style={styles.cashbackPill}>
              <Text style={styles.cashbackText}>
                {store.cashbackPercentage}% cashback
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

FavoriteStoreCard.displayName = 'FavoriteStoreCard';

const FavoriteStoresSection: React.FC<FavoriteStoresSectionProps> = ({
  stores,
  isLoading = false,
  onToggleFavorite,
  maxItems = 10,
}) => {
  const router = useRouter();

  // Handle store press - navigate to store page
  const handleStorePress = useCallback((store: FavoriteStore) => {
    router.push({
      pathname: '/MainStorePage',
      params: { storeId: store.id },
    } as any);
  }, [router]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async (storeId: string) => {
    await onToggleFavorite(storeId);
  }, [onToggleFavorite]);

  // Don't render if no stores and not loading
  if (!isLoading && stores.length === 0) {
    return null;
  }

  const displayStores = stores.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Shop at your favorite</Text>
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lightMustard} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : (
        /* Horizontal Scroll of Cards */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_GAP}
          snapToAlignment="start"
        >
          {displayStores.map((store) => (
            <FavoriteStoreCard
              key={store.id}
              store={store}
              onPress={() => handleStorePress(store)}
            />
          ))}
        </ScrollView>
      )}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.neutral[400],
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.08)',
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  cardContent: {
    padding: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
    marginRight: 10,
    letterSpacing: -0.3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  descriptionText: {
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  deliveryText: {
    fontSize: 12,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  cashbackPill: {
    backgroundColor: 'rgba(255, 205, 87, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.25)',
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.lightMustard,
  },
});

export default memo(FavoriteStoresSection);
