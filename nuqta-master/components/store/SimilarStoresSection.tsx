// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import StoreCard from '@/components/homepage/cards/StoreCard';
import storesApi from '@/services/storesApi';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isTablet = SCREEN_WIDTH >= 768;

interface SimilarStoresSectionProps {
  currentStoreId: string;
  currentStoreCategory?: string;
  onStorePress?: (storeId: string, storeData: any) => void;
  limit?: number;
}

interface Store {
  id?: string;
  _id?: string;
  name: string;
  category?: string;
  description?: string;
  image?: string;
  rating?: number;
  distance?: string;
  [key: string]: any;
}

// Calculate card width based on screen
const getCardWidth = () => {
  if (isWeb) {
    if (SCREEN_WIDTH >= 1024) return 280;
    if (SCREEN_WIDTH >= 768) return 260;
  }
  return 240;
};

const SimilarStoresSection: React.FC<SimilarStoresSectionProps> = ({
  currentStoreId,
  currentStoreCategory,
  onStorePress,
  limit = 8,
}) => {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const cardWidth = getCardWidth();

  const fetchSimilarStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await storesApi.getFeaturedStores(limit);

      if (response?.data) {
        // Filter out current store
        let filteredStores = response.data.filter(
          (store: Store) =>
            store.id !== currentStoreId &&
            store._id !== currentStoreId
        );

        // Optional: Filter by category if provided
        if (currentStoreCategory) {
          const categoryStores = filteredStores.filter(
            (store: Store) =>
              store.category?.toLowerCase() === currentStoreCategory.toLowerCase()
          );

          // If we have category matches, prioritize them, otherwise show all
          if (categoryStores.length > 0) {
            filteredStores = categoryStores;
          }
        }

        if (!isMounted()) return;
        setStores(filteredStores);
      } else {
        setStores([]);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load similar stores');
      setStores([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [currentStoreId, currentStoreCategory, limit]);

  useEffect(() => {
    fetchSimilarStores();
  }, [fetchSimilarStores]);

  const handleStorePress = (store: Store) => {
    const storeId = store.id || store._id || '';

    if (onStorePress) {
      onStorePress(storeId, store);
    } else {
      router.push({
        pathname: '/MainStorePage',
        params: {
          storeId: storeId,
          storeName: store.name,
          storeData: JSON.stringify(store),
        },
      });
    }
  };

  const handleViewAll = () => {
    router.push('/StoreListPage');
  };

  const handleRetry = () => {
    fetchSimilarStores();
  };

  const renderStoreItem = useCallback(({ item }: { item: Store }) => (
    <View style={{ width: cardWidth }}>
      <StoreCard
        store={item}
        onPress={() => handleStorePress(item)}
        width={cardWidth}
      />
    </View>
  ), [cardWidth, handleStorePress]);

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Explore Similar Stores</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
          <ThemedText style={styles.loadingText}>Loading stores...</ThemedText>
        </View>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Explore Similar Stores</ThemedText>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color={colors.background.primary} />
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty State
  if (stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Explore Similar Stores</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={48} color={colors.neutral[400]} />
          <ThemedText style={styles.emptyText}>No similar stores found</ThemedText>
          <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
            <ThemedText style={styles.viewAllButtonText}>Browse All Stores</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Success State - Show Stores
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={22} color={colors.lightMustard} />
          <ThemedText style={styles.title}>Similar Stores</ThemedText>
        </View>
        <Pressable
          style={styles.viewAllLink}
          onPress={handleViewAll}
          accessibilityLabel="View all stores"
          accessibilityRole="button"
        >
          <ThemedText style={styles.viewAllText}>View All</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={colors.lightMustard} />
        </Pressable>
      </View>

      <FlashList
        data={stores}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.id || item._id || `store-${index}`}
        renderItem={renderStoreItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={() => <View style={styles.listFooter} />}
        initialNumToRender={isWeb ? 8 : 4}
        maxToRenderPerBatch={isWeb ? 8 : 4}
        windowSize={isWeb ? 10 : 5}
        removeClippedSubviews={Platform.OS === 'android'}
        accessibilityLabel="Similar stores list"
        estimatedItemSize={110}
      />

      {/* View All Button - Bottom */}
      <Pressable
        style={styles.bottomViewAllButton}
        onPress={handleViewAll}
        accessibilityLabel="View all stores"
        accessibilityRole="button"
      >
        <ThemedText style={styles.bottomViewAllText}>View All Stores</ThemedText>
        <Ionicons name="arrow-forward" size={20} color={colors.lightMustard} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No background/shadow - parent sectionCard provides that
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  listContent: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  separator: {
    width: 12,
  },
  listFooter: {
    width: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  viewAllButton: {
    marginTop: 16,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewAllButtonText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderRadius: 8,
  },
  bottomViewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
});

export default React.memo(SimilarStoresSection);
