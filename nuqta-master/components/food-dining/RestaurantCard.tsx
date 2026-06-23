// @ts-nocheck
/**
 * Food & Dining Module - RestaurantCard Component
 * Displays a restaurant with badges, ratings, delivery info, rewards, and visit progress.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { COLORS, FoodRestaurant } from './constants';
import { isRestaurantOpen } from './helpers';
import { colors } from '@/constants/theme';

interface RestaurantCardProps {
  restaurant: FoodRestaurant;
  variant?: 'default' | 'compact';
  userVisitCount?: number;
  showReserveButton?: boolean;
  showNewBadge?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  variant = 'default',
  userVisitCount = 0,
  showReserveButton = false,
  showNewBadge = false,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isCompact = variant === 'compact';
  const [imageError, setImageError] = useState(false);

  // Guard against incomplete restaurant data
  if (!restaurant || !restaurant.name) return null;

  const getImageUri = (): string | undefined => {
    if (restaurant.banner) {
      if (Array.isArray(restaurant.banner) && restaurant.banner.length > 0) {
        return restaurant.banner[0];
      }
      if (typeof restaurant.banner === 'string') {
        return restaurant.banner;
      }
    }
    return restaurant.logo || restaurant.image || undefined;
  };

  const imageUri = getImageUri();

  const getCuisineTags = (): string => {
    if (restaurant.tags && Array.isArray(restaurant.tags) && restaurant.tags.length > 0) {
      const cuisineTags = restaurant.tags.filter((tag: string) =>
        !['halal', 'pure-veg', 'veg', 'non-veg', 'jain'].includes(tag.toLowerCase())
      );
      return cuisineTags.slice(0, 3).map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' \u2022 ') || restaurant.category?.name || 'Restaurant';
    }
    return restaurant.category?.name || 'Restaurant';
  };

  const isHalal = restaurant.tags?.some((t: string) => t.toLowerCase() === 'halal');
  const isPureVeg = restaurant.tags?.some((t: string) => ['pure-veg', 'veg', 'vegetarian'].includes(t.toLowerCase()));
  const openStatus = isRestaurantOpen(restaurant);

  // Display coins only from server-provided reward rules (no client-side estimation)
  const coinsEarned = restaurant.rewardRules?.estimatedCoins || null;

  const reviewBonus = restaurant.rewardRules?.reviewBonusCoins || null;
  const visitMilestone = restaurant.rewardRules?.visitMilestoneRewards?.[0]?.visits || 5;
  const hasRating = restaurant.ratings?.average != null && restaurant.ratings.average > 0;
  const ratingValue = restaurant.ratings?.average;

  return (
    <Pressable
      style={[styles.restaurantCard, isCompact && styles.restaurantCardCompact]}
      onPress={() => router.push(`/MainStorePage?storeId=${restaurant._id || restaurant.id}` as any)}
     
      accessibilityLabel={`${restaurant.name}${hasRating ? `, rated ${ratingValue!.toFixed(1)}` : ', new restaurant'}${openStatus.isOpen ? ', open now' : ', currently closed'}`}
      accessibilityRole="button"
    >
      <View style={[styles.restaurantImageContainer, isCompact && styles.restaurantImageContainerCompact]}>
        {imageUri && !imageError ? (
          <CachedImage
            source={{ uri: imageUri }}
            style={styles.restaurantImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.restaurantImage, styles.restaurantImagePlaceholder]}>
            <Ionicons name="restaurant" size={40} color={COLORS.textSecondary} />
            <Text style={styles.restaurantImagePlaceholderText}>{restaurant.name}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.restaurantImageGradient}
        />

        {/* Badges Row */}
        <View style={styles.restaurantBadges}>
          {showNewBadge && (
            <View style={styles.badgeNew}>
              <Text style={styles.badgeNewText}>NEW</Text>
            </View>
          )}
          <View style={[styles.badgeStatus, { backgroundColor: openStatus.isOpen ? colors.tint.greenLight : colors.errorScale[50] }]}>
            <View style={[styles.statusDot, { backgroundColor: openStatus.isOpen ? colors.success : colors.error }]} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: openStatus.isOpen ? colors.successScale[700] : colors.error }}>
              {openStatus.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
          {restaurant.deliveryCategories?.fastDelivery && (
            <View style={styles.badge60Min}>
              <Ionicons name="flash" size={10} color={colors.text.primary} />
              <Text style={styles.badge60MinText}>60 min</Text>
            </View>
          )}
          {isHalal && (
            <View style={styles.badgeHalal}>
              <Text style={styles.badgeHalalText}>Halal</Text>
            </View>
          )}
          {isPureVeg && (
            <View style={styles.badgePureVeg}>
              <Text style={styles.badgePureVegText}>Pure Veg</Text>
            </View>
          )}
          {restaurant.offers?.cashback && (
            <View style={styles.badgeCashbackPurple}>
              <Text style={styles.badgeCashbackPurpleText}>{restaurant.offers.cashback}% cashback</Text>
            </View>
          )}
        </View>

        {/* Rating Badge */}
        <View style={styles.restaurantRating}>
          {hasRating ? (
            <>
              <Ionicons name="star" size={12} color={COLORS.primaryGold} />
              <Text style={styles.restaurantRatingText}>{ratingValue!.toFixed(1)}</Text>
              <Text style={styles.restaurantRatingCount}>({restaurant.ratings?.count || 0})</Text>
            </>
          ) : (
            <Text style={[styles.restaurantRatingText, { color: colors.success, fontWeight: '700' }]}>New</Text>
          )}
        </View>
      </View>

      <View style={styles.restaurantContent}>
        <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.restaurantCuisine} numberOfLines={1}>{getCuisineTags()}</Text>

        {/* Meta Info Row */}
        <View style={styles.restaurantMeta}>
          <View style={styles.restaurantMetaItem}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.restaurantMetaText}>
              {restaurant.distance ? `${restaurant.distance} km` : restaurant.location?.city || 'Nearby'}
            </Text>
          </View>
          {restaurant.operationalInfo?.deliveryTime ? (
            <View style={styles.restaurantMetaItem}>
              <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.restaurantMetaText}>{restaurant.operationalInfo.deliveryTime}</Text>
            </View>
          ) : null}
          {restaurant.priceForTwo && (
            <Text style={styles.restaurantPriceForTwo}>
              {currencySymbol}{restaurant.priceForTwo} for two
            </Text>
          )}
        </View>

        {/* Delivery Info Row */}
        {(restaurant.operationalInfo?.deliveryFee !== undefined || restaurant.operationalInfo?.minimumOrder) && (
          <View style={styles.deliveryInfoRow}>
            {restaurant.operationalInfo?.deliveryFee !== undefined && (
              <View style={styles.restaurantMetaItem}>
                <Ionicons name="bicycle-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.restaurantMetaText}>
                  {restaurant.operationalInfo.deliveryFee === 0 ? 'Free delivery' : `${currencySymbol}${restaurant.operationalInfo.deliveryFee} delivery`}
                </Text>
              </View>
            )}
            {restaurant.operationalInfo?.freeDeliveryAbove && restaurant.operationalInfo?.deliveryFee > 0 ? (
              <View style={styles.freeDeliveryBadge}>
                <Text style={styles.freeDeliveryText}>Free above {currencySymbol}{restaurant.operationalInfo.freeDeliveryAbove}</Text>
              </View>
            ) : null}
            {restaurant.operationalInfo?.minimumOrder ? (
              <Text style={styles.restaurantMetaText}>Min {currencySymbol}{restaurant.operationalInfo.minimumOrder}</Text>
            ) : null}
          </View>
        )}

        {/* Coins and Review Bonus Row */}
        {(coinsEarned || reviewBonus || restaurant.offers?.cashback > 0) ? (
          <View style={styles.restaurantRewardsRow}>
            <View style={styles.restaurantCoins}>
              <Ionicons name="star" size={14} color={COLORS.primaryGold} />
              <Text style={styles.restaurantCoinsText}>
                {coinsEarned ? `Earn ${coinsEarned} coins` : 'Earn coins'}
              </Text>
            </View>
            {reviewBonus ? (
              <Text style={styles.reviewBonusText}>+{reviewBonus} for review</Text>
            ) : null}
          </View>
        ) : null}

        {/* Visit Progress Row — only show when user has visits */}
        {userVisitCount > 0 && (
          <View style={styles.visitProgressRow}>
            <Text style={styles.visitProgressText}>{userVisitCount}/{visitMilestone} visits</Text>
            {userVisitCount < visitMilestone && (
              <Pressable onPress={() => router.push('/my-visits' as any)}>
                <Text style={styles.unlockRewardText}>Unlock reward</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Reserve Button for Dine-In */}
        {showReserveButton && (
          <Pressable
            style={styles.reserveButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/MainCategory/food-dining/book-table?storeId=${restaurant._id || restaurant.id}` as any);
            }}
           
            accessibilityLabel={`Reserve a table at ${restaurant.name}`}
            accessibilityRole="button"
          >
            <Ionicons name="restaurant-outline" size={14} color={colors.background.primary} />
            <Text style={styles.reserveButtonText}>Reserve a Table</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  restaurantCard: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    marginBottom: 16,
  },
  restaurantCardCompact: {
    minWidth: 200,
    marginRight: 12,
    marginBottom: 0,
  },
  restaurantImageContainer: {
    height: 180,
    position: 'relative',
  },
  restaurantImageContainerCompact: {
    height: 120,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
  },
  restaurantImagePlaceholder: {
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantImagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  restaurantImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  restaurantBadges: {
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
  badgeHalal: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  badgeHalalText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  badgePureVeg: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.success,
  },
  badgePureVegText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  badgeCashbackPurple: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.brand.purpleLight,
  },
  badgeCashbackPurpleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  badgeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeNew: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGold,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background.primary,
  },
  restaurantRating: {
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
  restaurantRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  restaurantRatingCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  restaurantContent: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  restaurantMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restaurantMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  restaurantPriceForTwo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  freeDeliveryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.tint.greenLight,
  },
  freeDeliveryText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.successScale[700],
  },
  restaurantRewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  restaurantCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restaurantCoinsText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primaryGold,
  },
  reviewBonusText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  visitProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  visitProgressText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  unlockRewardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accentOrange,
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.nileBlue,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  reserveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(RestaurantCard);
