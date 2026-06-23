import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { SellerOption } from '@/types/search.types';
import { router } from 'expo-router';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface SellerComparisonCardProps {
  seller: SellerOption;
  onPress: (seller: SellerOption) => void;
  onFavorite?: (seller: SellerOption) => void;
  onShare?: (seller: SellerOption) => void;
  onCompare?: (seller: SellerOption) => void;
  productId?: string;
}

function SellerComparisonCard({
  seller,
  onPress,
  onFavorite,
  onShare,
  onCompare,
  productId,
}: SellerComparisonCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toLocaleString(locale)}`;
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getAvailabilityColor = () => {
    switch (seller.availability) {
      case 'in_stock':
        return colors.lightMustard; // Nuqta yellow
      case 'low_stock':
        return colors.warningScale[400]; // Orange
      case 'out_of_stock':
        return colors.error; // Red
      default:
        return colors.neutral[500];
    }
  };

  const getAvailabilityText = () => {
    switch (seller.availability) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Few Left';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return 'Check Availability';
    }
  };

  const getDeliveryIcon = () => {
    switch (seller.delivery.type) {
      case 'express':
        return 'flash';
      case 'pickup':
        return 'storefront';
      default:
        return 'car';
    }
  };

  const handleCompare = (e: any) => {
    e.stopPropagation();
    if (onCompare) {
      onCompare(seller);
    } else if (productId || seller.productId) {
      router.push(`/compare?productId=${productId || seller.productId}`);
    }
  };

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(seller)}
     
    >
      {/* Store Logo/Icon */}
      <View style={styles.storeLogoContainer}>
        {seller.storeLogo ? (
          <CachedImage
            source={seller.storeLogo}
            style={styles.storeLogo}
            contentFit="cover"
          />
        ) : (
          <View style={styles.storeLogoPlaceholder}>
            <Ionicons name="storefront" size={24} color={colors.nileBlue} />
          </View>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Store Name and Verified Badge */}
        <View style={styles.storeNameRow}>
          <Text style={styles.storeName} numberOfLines={1}>
            {seller.storeName}
          </Text>
          {seller.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
            </View>
          )}
        </View>

        {/* Location and Distance */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.neutral[500]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {seller.distance 
              ? `${seller.location} • ${formatDistance(seller.distance)}`
              : seller.location
            }
          </Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.warningScale[400]} />
          <Text style={styles.ratingText}>
            {seller.rating.toFixed(1)} ({formatReviewCount(seller.reviewCount)})
          </Text>
          <View style={[styles.availabilityBadge, { backgroundColor: `${getAvailabilityColor()}20` }]}>
            <View style={[styles.availabilityDot, { backgroundColor: getAvailabilityColor() }]} />
            <Text style={[styles.availabilityText, { color: getAvailabilityColor() }]}>
              {getAvailabilityText()}
            </Text>
          </View>
        </View>

        {/* Price and Savings */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.currentPrice}>
              {formatPrice(seller.price.current)}
            </Text>
            {seller.price.original && seller.price.original > seller.price.current && (
              <Text style={styles.originalPrice}>
                {formatPrice(seller.price.original)}
              </Text>
            )}
          </View>
          {seller.savings > 0 && (
            <View style={styles.savingsContainer}>
              <Ionicons name="information-circle-outline" size={14} color={colors.brand.amberDeep} />
              <Text style={styles.savingsText}>You Save {formatPrice(seller.savings)}</Text>
            </View>
          )}
        </View>

        {/* Cashback and Nuqta Coins */}
        <View style={styles.rewardsRow}>
          <Text style={styles.rewardsText}>
            {formatPrice(seller.cashback.amount)} + {seller.cashback.coins} {BRAND.COIN_NAME}
          </Text>
        </View>

        {/* Delivery Information */}
        <View style={styles.deliveryRow}>
          <Ionicons name={getDeliveryIcon()} size={14} color={colors.neutral[500]} />
          <Text style={styles.deliveryText}>{seller.delivery.time}</Text>
        </View>

        {/* Badges */}
        {seller.badges && seller.badges.length > 0 && (
          <View style={styles.badgesRow}>
            {seller.badges.map((badge, index) => (
              <View key={index} style={styles.badge}>
                {badge === 'Hot Deal' && <Ionicons name="flame" size={10} color={colors.error} />}
                {badge === 'Limited Stock' && <Ionicons name="time-outline" size={10} color={colors.warningScale[400]} />}
                {badge === 'Lock Available' && <Ionicons name="lock-closed" size={10} color={colors.nileBlue} />}
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Pressable
          style={styles.viewDealButton}
          onPress={() => onPress(seller)}
         
        >
          <Text style={styles.viewDealText}>View Deal</Text>
        </Pressable>
        <View style={styles.iconButtons}>
          {(productId || seller.productId) && (
            <Pressable
              style={styles.iconButton}
              onPress={handleCompare}
             
            >
              <Ionicons name="git-compare-outline" size={20} color={colors.lightMustard} />
            </Pressable>
          )}
          {onFavorite && (
            <Pressable
              style={styles.iconButton}
              onPress={() => onFavorite(seller)}
             
            >
              <Ionicons name="heart-outline" size={20} color={colors.neutral[500]} />
            </Pressable>
          )}
          {onShare && (
            <Pressable
              style={styles.iconButton}
              onPress={() => onShare(seller)}
             
            >
              <Ionicons name="share-outline" size={20} color={colors.neutral[500]} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  storeLogoContainer: {
    marginRight: 12,
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
  },
  storeLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginRight: 6,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: 4,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  ratingText: {
    fontSize: 12,
    color: colors.neutral[700],
    fontWeight: '600',
    marginLeft: 4,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral[800],
  },
  originalPrice: {
    fontSize: 14,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savingsText: {
    fontSize: 12,
    color: colors.brand.amberDeep,
    fontWeight: '600',
  },
  rewardsRow: {
    marginBottom: 6,
  },
  rewardsText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  deliveryText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: colors.brand.amberDark,
    fontWeight: '600',
  },
  actionsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  viewDealButton: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  viewDealText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  iconButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(SellerComparisonCard);
