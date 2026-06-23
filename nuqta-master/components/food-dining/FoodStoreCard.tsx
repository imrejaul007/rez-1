/**
 * Shared Food Store Card Component
 * Used across [subcategory], fast-delivery, and top-rated pages.
 * Supports 3 display variants.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FoodRestaurant } from './constants';
import { colors } from '@/constants/theme';

export interface FoodStoreCardProps {
  store: FoodRestaurant;
  currencySymbol: string;
  /** 'default' shows all badges, 'delivery-focused' highlights delivery time, 'rating-focused' shows large rating */
  variant?: 'default' | 'delivery-focused' | 'rating-focused';
}

function FoodStoreCard({ store, currencySymbol, variant = 'default' }: FoodStoreCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  // Guard against incomplete store data
  if (!store || !store.name) return null;

  const imageUri = store.banner?.[0] || (typeof store.banner === 'string' ? store.banner : undefined) || store.logo || store.image;
  const isHalal = store.tags?.some((t: string) => t.toLowerCase() === 'halal');
  const isPureVeg = store.tags?.some((t: string) => ['pure-veg', 'veg', 'vegetarian'].includes(t.toLowerCase()));
  const cashbackPercent = store.offers?.cashback || 0;

  const cuisineTags = (store.tags || [])
    .filter((t: string) => !['halal', 'pure-veg', 'veg', 'non-veg', 'jain', 'vegetarian'].includes(t.toLowerCase()))
    .slice(0, 3)
    .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' \u2022 ') || store.category?.name || 'Restaurant';

  const ratingDisplay = store.ratings?.average ? store.ratings.average.toFixed(1) : 'New';
  const storeId = store._id || store.id;

  return (
    <Pressable
      style={styles.storeCard}
      onPress={() => router.push(`/MainStorePage?storeId=${storeId}` as any)}
     
      accessibilityLabel={`${store.name}, rated ${ratingDisplay}`}
      accessibilityRole="button"
    >
      <View style={styles.storeImageContainer}>
        {imageUri && !imageError ? (
          <CachedImage
            source={{ uri: imageUri }}
            style={styles.storeImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.storeImage, styles.storeImagePlaceholder,
            variant === 'delivery-focused' && { backgroundColor: colors.tint.amberLight }
          ]}>
            <Ionicons
              name={variant === 'delivery-focused' ? 'flash' : 'restaurant'}
              size={32}
              color={variant === 'delivery-focused' ? COLORS.primaryGold : colors.neutral[500]}
            />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.storeImageGradient} />

        {/* Badges — variant-specific */}
        {variant === 'delivery-focused' ? (
          // Delivery-focused: delivery time badge only
          store.operationalInfo?.deliveryTime ? (
            <View style={styles.deliveryTimeBadge}>
              <Ionicons name="flash" size={12} color={colors.text.primary} />
              <Text style={styles.deliveryTimeText}>{store.operationalInfo.deliveryTime}</Text>
            </View>
          ) : null
        ) : variant === 'rating-focused' ? (
          // Rating-focused: dietary + cashback badges (no delivery badge)
          <View style={styles.storeBadges}>
            {isHalal && (
              <View style={[styles.badgeTag, { backgroundColor: '#0D9488' }]}>
                <Text style={styles.badgeTagText}>Halal</Text>
              </View>
            )}
            {isPureVeg && (
              <View style={[styles.badgeTag, { backgroundColor: colors.success }]}>
                <Text style={styles.badgeTagText}>Pure Veg</Text>
              </View>
            )}
            {cashbackPercent > 0 && (
              <View style={[styles.badgeTag, { backgroundColor: colors.brand.purpleLight }]}>
                <Text style={styles.badgeTagText}>{cashbackPercent}% cashback</Text>
              </View>
            )}
          </View>
        ) : (
          // Default: all badges
          <View style={styles.storeBadges}>
            {store.deliveryCategories?.fastDelivery && (
              <View style={styles.badge60Min}>
                <Ionicons name="flash" size={10} color={colors.text.primary} />
                <Text style={styles.badge60MinText}>60 min</Text>
              </View>
            )}
            {isHalal && (
              <View style={[styles.badgeTag, { backgroundColor: '#0D9488' }]}>
                <Text style={styles.badgeTagText}>Halal</Text>
              </View>
            )}
            {isPureVeg && (
              <View style={[styles.badgeTag, { backgroundColor: colors.success }]}>
                <Text style={styles.badgeTagText}>Pure Veg</Text>
              </View>
            )}
            {cashbackPercent > 0 && (
              <View style={[styles.badgeTag, { backgroundColor: colors.brand.purpleLight }]}>
                <Text style={styles.badgeTagText}>{cashbackPercent}% cashback</Text>
              </View>
            )}
          </View>
        )}

        {/* Rating badge */}
        {variant === 'rating-focused' ? (
          <View style={styles.ratingBadgeLarge}>
            <Ionicons name="star" size={14} color={COLORS.primaryGold} />
            <Text style={styles.ratingValueLarge}>{ratingDisplay}</Text>
            <Text style={styles.ratingCountLarge}>({store.ratings?.count || 0} reviews)</Text>
          </View>
        ) : (
          <View style={styles.storeRating}>
            <Ionicons name="star" size={12} color={COLORS.primaryGold} />
            <Text style={styles.storeRatingText}>{ratingDisplay}</Text>
            {variant === 'default' && (
              <Text style={styles.storeRatingCount}>({store.ratings?.count || 0})</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeCuisine} numberOfLines={1}>{cuisineTags}</Text>

        <View style={styles.storeMeta}>
          <View style={styles.storeMetaItem}>
            <Ionicons name="location-outline" size={12} color={colors.neutral[500]} />
            <Text style={styles.storeMetaText}>{store.location?.city || 'Nearby'}</Text>
          </View>
          {variant !== 'delivery-focused' && store.operationalInfo?.deliveryTime ? (
            <View style={styles.storeMetaItem}>
              <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
              <Text style={styles.storeMetaText}>{store.operationalInfo.deliveryTime}</Text>
            </View>
          ) : null}
          {store.priceForTwo && variant !== 'delivery-focused' && (
            <Text style={styles.storePriceForTwo}>{currencySymbol}{store.priceForTwo} for two</Text>
          )}
          {variant === 'delivery-focused' && cashbackPercent > 0 && (
            <View style={styles.cashbackTag}>
              <Text style={styles.cashbackTagText}>{cashbackPercent}% cashback</Text>
            </View>
          )}
        </View>

        {variant === 'default' && cashbackPercent > 0 && (
          <View style={styles.storeRewardsRow}>
            <Ionicons name="star" size={14} color={COLORS.primaryGold} />
            <Text style={styles.storeCoinsText}>Earn coins</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default React.memo(FoodStoreCard);

const styles = StyleSheet.create({
  storeCard: {
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeImageContainer: {
    height: 160,
    position: 'relative',
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  storeImagePlaceholder: {
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  storeBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge60Min: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGold,
    gap: 3,
  },
  badge60MinText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  badgeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  deliveryTimeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGold,
    gap: 4,
  },
  deliveryTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.primary,
  },
  storeRating: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 4,
  },
  storeRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  storeRatingCount: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  ratingBadgeLarge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    gap: 4,
  },
  ratingValueLarge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  ratingCountLarge: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  storeContent: {
    padding: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  storeCuisine: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeMetaText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  storePriceForTwo: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  cashbackTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.tint.pink,
  },
  cashbackTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  storeRewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 4,
  },
  storeCoinsText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primaryGold,
  },
});
