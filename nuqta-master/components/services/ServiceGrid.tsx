// @ts-nocheck
import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ServiceCard, { ServiceItem } from './ServiceCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface ServiceGridProps {
  services: ServiceItem[];
  onBookPress: (service: ServiceItem) => void;
  onServicePress?: (service: ServiceItem) => void;
  loading?: boolean;
  emptyMessage?: string;
  numColumns?: number;
  contentContainerStyle?: any;
}

const ServiceGrid: React.FC<ServiceGridProps> = ({
  services,
  onBookPress,
  onServicePress,
  loading = false,
  emptyMessage = 'No services available',
  numColumns,
  contentContainerStyle,
}) => {
  const columns = numColumns || (isTablet ? 3 : 2);

  // Render loading skeletons
  const renderSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        {[...Array(6)].map((_, index) => (
          <View key={index} style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonContent}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonDescription} />
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonTag} />
                <View style={styles.skeletonTag} />
              </View>
              <View style={styles.skeletonBottom}>
                <View style={styles.skeletonPrice} />
                <View style={styles.skeletonButton} />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.neutral[300]} />
        </View>
        <Text style={styles.emptyTitle}>No Services Found</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    );
  };

  // Render service item
  const renderItem = ({ item }: { item: ServiceItem }) => {
    return (
      <View style={styles.itemContainer}>
        <ServiceCard
          service={item}
          onBookPress={onBookPress}
          onPress={() => onServicePress?.(item)}
        />
      </View>
    );
  };

  if (loading) {
    return renderSkeleton();
  }

  if (!services || services.length === 0) {
    return renderEmpty();
  }

  return (
    <FlashList
      data={services}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      removeClippedSubviews={Platform.OS !== 'web'}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={8}
      estimatedItemSize={220}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    marginBottom: 0,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  // Skeleton Loading
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  skeletonImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.neutral[200],
  },
  skeletonContent: {
    padding: 12,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonDescription: {
    height: 12,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    marginBottom: 6,
    width: '100%',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 6,
  },
  skeletonTag: {
    height: 12,
    width: 50,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  skeletonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  skeletonPrice: {
    height: 20,
    width: 60,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  skeletonButton: {
    height: 32,
    width: 70,
    backgroundColor: colors.neutral[200],
    borderRadius: 8,
  },
});

export default React.memo(ServiceGrid);
