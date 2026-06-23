/**
 * Grocery Store Card Component
 * Reusable card for displaying grocery stores
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: colors.neutral[50],
  gray100: colors.neutral[100],
  gray200: colors.neutral[200],
  gray400: colors.neutral[400],
  gray600: colors.neutral[500],
  green500: colors.success,
  green600: colors.brand.greenDark,
  amber500: colors.warningScale[400],
  blue500: colors.infoScale[400],
};

export interface GroceryStore {
  id: string;
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  image?: string;
  rating?: {
    average?: number;
    count?: number;
  };
  maxCashback?: number;
  cashback?: string;
  operationalInfo?: {
    deliveryTime?: { min?: number; max?: number };
    minimumOrder?: number;
    deliveryFee?: number;
    freeDeliveryAbove?: number;
  };
  deliveryTime?: string;
  tags?: string[];
  deliveryCategories?: {
    fastDelivery?: boolean;
    budgetFriendly?: boolean;
    organic?: boolean;
    premium?: boolean;
  };
  isOpen?: boolean;
  distance?: string;
}

interface GroceryStoreCardProps {
  store: GroceryStore;
  variant?: 'default' | 'compact' | 'horizontal' | 'featured';
  showDistance?: boolean;
}

const GroceryStoreCard: React.FC<GroceryStoreCardProps> = ({
  store,
  variant = 'default',
  showDistance = false,
}) => {
  const router = useRouter();

  // Normalize store data
  const storeId = store.id || store._id || '';
  const storeImage = store.banner || store.logo || store.image || 'https://via.placeholder.com/400';
  const rating = store.rating?.average || 0;
  const ratingCount = store.rating?.count || 0;
  const cashback = store.maxCashback || parseInt(store.cashback || '0') || 0;

  // Delivery time
  let deliveryTimeText = store.deliveryTime || '';
  if (!deliveryTimeText && store.operationalInfo?.deliveryTime) {
    const { min, max } = store.operationalInfo.deliveryTime;
    if (min && max) {
      deliveryTimeText = `${min}-${max} min`;
    } else if (min) {
      deliveryTimeText = `${min} min`;
    }
  }

  const handlePress = () => {
    router.push(`/MainStorePage?storeId=${storeId}` as any);
  };

  // Tags
  const tags: string[] = [];
  if (store.deliveryCategories?.fastDelivery) tags.push('Fast');
  if (store.deliveryCategories?.organic) tags.push('Organic');
  if (store.deliveryCategories?.premium) tags.push('Premium');
  if (store.deliveryCategories?.budgetFriendly) tags.push('Budget');

  if (variant === 'featured') {
    return (
      <Pressable
        style={styles.featuredCard}
        onPress={handlePress}
       
      >
        <CachedImage source={storeImage} style={styles.featuredImage} />
        <View style={styles.featuredOverlay}>
          {cashback > 0 && (
            <View style={styles.featuredCashback}>
              <Text style={styles.featuredCashbackText}>{cashback}% Cashback</Text>
            </View>
          )}
          <View style={styles.featuredContent}>
            {store.logo && (
              <CachedImage source={store.logo} style={styles.featuredLogo} />
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredName}>{store.name}</Text>
              <View style={styles.featuredMeta}>
                {rating > 0 && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={COLORS.amber500} />
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                  </View>
                )}
                {deliveryTimeText && (
                  <View style={styles.deliveryBadge}>
                    <Ionicons name="time-outline" size={12} color={COLORS.green500} />
                    <Text style={styles.deliveryText}>{deliveryTimeText}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Pressable
        style={styles.horizontalCard}
        onPress={handlePress}
       
      >
        <CachedImage source={storeImage} style={styles.horizontalImage} />
        {cashback > 0 && (
          <View style={styles.cashbackBadgeHorizontal}>
            <Text style={styles.cashbackTextSmall}>{cashback}%</Text>
          </View>
        )}
        <View style={styles.horizontalContent}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          <View style={styles.horizontalMeta}>
            {rating > 0 && (
              <>
                <Ionicons name="star" size={12} color={COLORS.amber500} />
                <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
              </>
            )}
            {deliveryTimeText && (
              <>
                <View style={styles.dot} />
                <Text style={styles.deliveryTextSmall}>{deliveryTimeText}</Text>
              </>
            )}
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        style={styles.compactCard}
        onPress={handlePress}
       
      >
        <CachedImage source={store.logo || storeImage} style={styles.compactImage} />
        <Text style={styles.compactName} numberOfLines={1}>{store.name}</Text>
        {cashback > 0 && (
          <Text style={styles.compactCashback}>{cashback}% cashback</Text>
        )}
        {deliveryTimeText && (
          <Text style={styles.compactDelivery}>{deliveryTimeText}</Text>
        )}
      </Pressable>
    );
  }

  // Default variant
  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
     
    >
      <CachedImage source={storeImage} style={styles.image} />

      {/* Cashback Badge */}
      {cashback > 0 && (
        <View style={styles.cashbackBadge}>
          <Text style={styles.cashbackText}>{cashback}%</Text>
        </View>
      )}

      {/* Store Info */}
      <View style={styles.info}>
        <Text style={styles.storeName}>{store.name}</Text>

        <View style={styles.metaRow}>
          {/* Rating */}
          {rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={COLORS.amber500} />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              {ratingCount > 0 && (
                <Text style={styles.ratingCount}>({ratingCount})</Text>
              )}
            </View>
          )}

          {/* Delivery Time */}
          {deliveryTimeText && (
            <Text style={styles.deliveryTime}>{deliveryTimeText}</Text>
          )}
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagLabel}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Distance & Open Status */}
        <View style={styles.bottomRow}>
          {showDistance && store.distance && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location-outline" size={12} color={COLORS.gray600} />
              <Text style={styles.distanceText}>{store.distance}</Text>
            </View>
          )}
          {store.isOpen !== undefined && (
            <View style={[styles.statusBadge, store.isOpen ? styles.openBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, store.isOpen ? styles.openText : styles.closedText]}>
                {store.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Default Card
  card: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: 120,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.green500,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  info: {
    padding: 12,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
  },
  ratingCount: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  deliveryTime: {
    fontSize: 12,
    color: COLORS.green500,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagLabel: {
    fontSize: 10,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    color: COLORS.gray600,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  closedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  openText: {
    color: COLORS.green500,
  },
  closedText: {
    color: colors.error,
  },

  // Featured Card
  featuredCard: {
    width: SCREEN_WIDTH - 32,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 16,
  },
  featuredCashback: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.green500,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featuredCashbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    marginRight: 12,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Horizontal Card
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 12,
    marginBottom: 12,
  },
  horizontalImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  cashbackBadgeHorizontal: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: COLORS.green500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cashbackTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  horizontalContent: {
    flex: 1,
    marginLeft: 12,
  },
  horizontalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
    marginLeft: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gray400,
    marginHorizontal: 6,
  },
  deliveryTextSmall: {
    fontSize: 12,
    color: COLORS.green500,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tagBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.gray600,
    fontWeight: '500',
  },

  // Compact Card
  compactCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  compactImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    backgroundColor: COLORS.gray100,
  },
  compactName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 2,
  },
  compactCashback: {
    fontSize: 10,
    color: COLORS.green500,
    fontWeight: '500',
  },
  compactDelivery: {
    fontSize: 10,
    color: COLORS.gray600,
  },
});

export default React.memo(GroceryStoreCard);
