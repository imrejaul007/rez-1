import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { StoreItem } from '@/services/searchDiscoveryApi';
import { colors } from '@/constants/theme';

interface PopularStoresSectionProps {
  stores: StoreItem[];
  onStorePress: (store: StoreItem) => void;
  onViewAll?: () => void;
}

function PopularStoresSection({
  stores,
  onStorePress,
  onViewAll,
}: PopularStoresSectionProps) {
  if (!stores || stores.length === 0) {
    return null;
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'cashback':
        return colors.brand.green;
      case 'emi':
        return colors.brand.indigo;
      case 'new':
        return colors.error;
      default:
        return colors.neutral[500];
    }
  };

  const getBadgeLabel = (store: StoreItem) => {
    if (store.cashbackPercentage && store.cashbackPercentage >= 10) {
      return `${store.cashbackPercentage}% cashback`;
    }
    return 'New arrivals';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={20} color={colors.nileBlue} />
        <Text style={styles.headerText}>Popular near you</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stores.map((store) => (
          <Pressable
            key={store._id}
            style={styles.storeCard}
            onPress={() => onStorePress(store)}
           
          >
            {store.logo ? (
              <CachedImage source={{ uri: store.logo }} style={styles.logo} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront-outline" size={32} color={colors.neutral[400]} />
              </View>
            )}

            <Text style={styles.storeName} numberOfLines={1}>
              {store.name}
            </Text>

            <View style={styles.badge}>
              <Text style={[styles.badgeText, { color: getBadgeColor('cashback') }]}>
                {getBadgeLabel(store)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              {store.distance && (
                <Text style={styles.metaText}>{store.distance.toFixed(1)} km</Text>
              )}
              {store.rating > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                  <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} style={styles.arrow} />
          </Pressable>
        ))}
      </ScrollView>

      {onViewAll && (
        <Pressable style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View all nearby stores</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.nileBlue} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: 8,
  },
  storeCard: {
    width: 160,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.08)',
    alignItems: 'center',
    position: 'relative',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 6,
    textAlign: 'center',
  },
  badge: {
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  arrow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    marginHorizontal: 16,
    gap: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },
});

export default React.memo(PopularStoresSection);
