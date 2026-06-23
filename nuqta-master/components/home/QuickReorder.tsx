// @ts-nocheck
// QuickReorder Component
// Homepage widget for quick reordering from recent orders

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useFrequentlyOrdered } from '@/hooks/useReorder';
import { router } from 'expo-router';
import { useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface QuickReorderProps {
  limit?: number;
  onViewAll?: () => void;
}

function QuickReorder({ limit = 5, onViewAll }: QuickReorderProps) {
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { items, loading, error, refresh } = useFrequentlyOrdered(limit);

  // Don't render for unauthenticated users
  if (!isAuthenticated) return null;

  useEffect(() => {
    refresh();
  }, []);

  const handleItemPress = (productId: string, storeId: string) => {
    router.push(`/product-page?cardId=${productId}&cardType=product` as any);
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/orders');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.itemCard}
      onPress={() => handleItemPress(item.productId, item.storeId)}
     
    >
      <CachedImage
        source={item.productImage}
        style={styles.productImage}
        contentFit="cover"
      />

      <View style={styles.itemInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.storeName} numberOfLines={1}>
          {item.storeName}
        </Text>

        <View style={styles.statsRow}>
          <Text style={styles.orderCount}>
            Ordered {item.orderCount}x
          </Text>
          <Text style={styles.price}>{currencySymbol}{item.currentPrice}</Text>
        </View>

        {item.isAvailable ? (
          <View style={styles.reorderBadge}>
            <Text style={styles.reorderText}>Tap to reorder</Text>
          </View>
        ) : (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Out of stock</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyText}>No order history yet</Text>
      <Pressable
        style={styles.shopButton}
        onPress={() => router.push('/')}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quick Reorder</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      </View>
    );
  }

  if (error || items.length === 0) {
    return null; // Don't show if error or no items
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quick Reorder</Text>
          <Text style={styles.subtitle}>Your frequently ordered items</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.productId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        estimatedItemSize={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 2
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500]
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1'
  },
  listContent: {
    paddingHorizontal: 16
  },
  itemCard: {
    width: 160,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden'
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.gray[100]
  },
  itemInfo: {
    padding: 12
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
    minHeight: 36
  },
  storeName: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 8
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  orderCount: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600'
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900]
  },
  reorderBadge: {
    backgroundColor: '#ede9fe',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  reorderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1'
  },
  unavailableBadge: {
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyState: {
    width: 300,
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 16,
    textAlign: 'center'
  },
  shopButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  shopButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600'
  }
});

export default React.memo(QuickReorder);
