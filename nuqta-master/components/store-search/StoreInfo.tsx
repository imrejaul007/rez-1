import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { StoreInfoProps } from '@/types/store-search';
import { 
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS,
  STORE_STATUS 
} from '@/constants/search-constants';
import { formatDistance, getStoreStatusText, getStoreStatusColor } from '@/utils/storeTransformers';
import { storeSearchService } from '@/services/storeSearchService';
import { colors } from '@/constants/theme';

const StoreInfo: React.FC<StoreInfoProps> = ({
  store,
  onStorePress,
  showFullInfo = true,
}) => {
  const screenWidth = Dimensions.get('window').width;

  // Render rating stars
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons
            key={i}
            name="star"
            size={12}
            color="#FFB800"
            style={styles.starIcon}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={12}
            color="#FFB800"
            style={styles.starIcon}
          />
        );
      } else {
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={12}
            color={colors.neutral[200]}
            style={styles.starIcon}
          />
        );
      }
    }
    return stars;
  };

  // Get store status info
  const statusText = getStoreStatusText(store);
  const statusColor = getStoreStatusColor(store);

  const styles = createStyles(screenWidth);

  const StoreInfoContent = () => (
    <View style={styles.container}>
      {/* Store Name and Rating Row */}
      <View style={styles.headerRow}>
        <View style={styles.storeNameContainer}>
          <ThemedText style={styles.storeName} numberOfLines={2}>
            {store.storeName}
          </ThemedText>
          
          {/* Store Description */}
          {store.description && (
            <ThemedText style={styles.storeDescription} numberOfLines={2}>
              {store.description}
            </ThemedText>
          )}
          
          {/* Rating and Review Count */}
          <View style={styles.ratingRow}>
            {(store.rating > 0 || store.reviewCount > 0) ? (
              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  {renderRating(store.rating || 0)}
                </View>
                <ThemedText style={styles.ratingText}>
                  {(store.rating || 0).toFixed(1)}
                </ThemedText>
                {store.reviewCount > 0 && (
                  <ThemedText style={styles.reviewCountText}>
                    ({store.reviewCount})
                  </ThemedText>
                )}
              </View>
            ) : (
              <ThemedText style={styles.noRatingText}>
                No ratings yet
              </ThemedText>
            )}
          </View>
        </View>

        {/* Store Info Icon - only show when not using wrapper Pressable */}
      </View>

      {/* Store Details Row */}
      {showFullInfo && (
        <View style={styles.detailsRow}>
          {/* Distance and Location */}
          {(store.distance !== undefined || store.location) && (
            <View style={styles.detailItem}>
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.GRAY_500}
                style={styles.detailIcon}
              />
            <ThemedText style={styles.detailText} numberOfLines={1}>
              {store.distance !== null && store.distance !== undefined && store.distance > 0 
                ? `${formatDistance(store.distance)}, ` 
                : ''}{store.location || 'Location not available'}
            </ThemedText>
            </View>
          )}

          {/* Status */}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </ThemedText>
          </View>

          {/* Online Delivery - only show if not already indicated in status */}
          {store.hasOnlineDelivery && statusText !== 'Online available' && (
            <View style={styles.deliveryBadge}>
              <Ionicons
                name="globe-outline"
                size={12}
                color={COLORS.INFO}
                style={styles.deliveryIcon}
              />
              <ThemedText style={styles.deliveryText}>
                Online available
              </ThemedText>
            </View>
          )}

          {/* Estimated Delivery Time */}
          {store.estimatedDelivery && (
            <View style={styles.deliveryTimeBadge}>
              <Ionicons
                name="time-outline"
                size={12}
                color={COLORS.PRIMARY}
                style={styles.deliveryIcon}
              />
              <ThemedText style={styles.deliveryTimeText}>
                {store.estimatedDelivery}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Delivery Categories Badges */}
      {showFullInfo && store.deliveryCategories && (
        <View style={styles.categoriesRow}>
          {Object.entries(store.deliveryCategories).map(([key, value]) => {
            if (!value) return null;
            const categoryInfo = storeSearchService.getCategoryDisplayInfo(key);
            return (
              <View key={key} style={styles.categoryBadge}>
                <ThemedText style={styles.categoryBadgeText}>
                  {categoryInfo.icon} {categoryInfo.name}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}

      {/* Shipping and Delivery Info */}
      {showFullInfo && (
        <View style={styles.shippingRow}>
          {store.hasFreeShipping && (
            <View style={styles.freeShippingBadge}>
              <Ionicons
                name="car-outline"
                size={14}
                color={COLORS.SUCCESS}
                style={styles.shippingIcon}
              />
              <ThemedText style={styles.freeShippingText}>
                Free Shipping
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
  // If onStorePress is provided, make the entire component touchable
  if (onStorePress) {
    return (
      <Pressable
        onPress={onStorePress}
       
        accessibilityRole="button"
        accessibilityLabel={`View ${store.storeName} details`}
      >
        <StoreInfoContent />
      </Pressable>
    );
  }

  return <StoreInfoContent />;
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;

  return StyleSheet.create({
    container: {
      paddingVertical: SPACING.MD,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACING.SM,
    },
    storeNameContainer: {
      flex: 1,
      marginRight: SPACING.SM,
    },
    storeName: {
      fontSize: isTablet ? TYPOGRAPHY.FONT_SIZE_XL : TYPOGRAPHY.FONT_SIZE_LG,
      fontWeight: '700', // Slightly heavier for modern look
      color: COLORS.TEXT_PRIMARY,
      marginBottom: SPACING.XS,
      letterSpacing: -0.3, // Tighter letter spacing for modern typography
    },
    storeDescription: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_NORMAL,
      color: COLORS.TEXT_SECONDARY,
      marginTop: SPACING.XS,
      marginBottom: SPACING.XS,
      lineHeight: 18,
    },
    ratingRow: {
      marginTop: SPACING.XS,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    noRatingText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_NORMAL,
      color: COLORS.TEXT_SECONDARY,
      fontStyle: 'italic',
    },
    starsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: SPACING.XS,
    },
    starIcon: {
      marginRight: 1,
    },
    ratingText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: SPACING.XS,
    },
    reviewCountText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_NORMAL,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: SPACING.XS,
      opacity: 0.7,
    },
    infoButton: {
      padding: SPACING.XS,
    },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: SPACING.XS,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: SPACING.MD,
      marginBottom: SPACING.XS,
    },
    detailIcon: {
      marginRight: SPACING.XS,
    },
    detailText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.SM,
      paddingVertical: SPACING.XS,
      borderRadius: BORDER_RADIUS.MD,
      marginRight: SPACING.SM,
      marginBottom: SPACING.XS,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: SPACING.XS,
    },
    statusText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    },
    deliveryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${COLORS.INFO}15`,
      paddingHorizontal: SPACING.SM,
      paddingVertical: SPACING.XS,
      borderRadius: BORDER_RADIUS.MD,
      marginBottom: SPACING.XS,
    },
    deliveryIcon: {
      marginRight: SPACING.XS,
    },
    deliveryText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: COLORS.INFO,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    },
    shippingRow: {
      marginTop: SPACING.XS,
    },
    freeShippingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    shippingIcon: {
      marginRight: SPACING.XS,
    },
    freeShippingText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: COLORS.SUCCESS,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
    },
    deliveryTimeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${COLORS.PRIMARY}15`,
      paddingHorizontal: SPACING.SM,
      paddingVertical: SPACING.XS,
      borderRadius: BORDER_RADIUS.MD,
      marginRight: SPACING.SM,
      marginBottom: SPACING.XS,
    },
    deliveryTimeText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: COLORS.PRIMARY,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    },
    categoriesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: SPACING.SM,
      gap: SPACING.XS,
    },
    categoryBadge: {
      backgroundColor: `${COLORS.PRIMARY}15`,
      paddingHorizontal: SPACING.SM,
      paddingVertical: SPACING.XS,
      borderRadius: BORDER_RADIUS.MD,
      borderWidth: 1,
      borderColor: `${COLORS.PRIMARY}30`,
    },
    categoryBadgeText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      color: COLORS.PRIMARY,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
    },
  });
};

export default React.memo(StoreInfo);