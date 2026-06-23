// @ts-nocheck
import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ProductCardProps } from '@/types/store-search';
import DiscountBadge from './DiscountBadge';
import PaymentIndicator from './PaymentIndicator';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  PRODUCT_GRID
} from '@/constants/search-constants';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import CachedImage from '@/components/ui/CachedImage';
import { colors } from '@/constants/theme';

const ProductCard: React.FC<ProductCardProps> = memo(({
  product,
  store,
  onPress,
  showStore = false,
  size = 'medium',
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [imageError, setImageError] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(product, store);
    }
  }, [onPress, product, store]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Calculate dimensions based on size
  const getSizeDimensions = () => {
    const isTablet = screenWidth > 768;
    const padding = isTablet ? 24 : 16;
    const productPadding = SPACING.XS * 2; // Horizontal padding from ProductGrid
    const imageMargins = SPACING.SM * 2; // Account for left and right image margins
    const availableWidth = screenWidth - (padding * 2);
    const cardWidth = (availableWidth / PRODUCT_GRID.COLUMNS) - productPadding - imageMargins;

    switch (size) {
      case 'small':
        return { width: cardWidth * 0.8, height: cardWidth * 0.8 * 1.15 };
      case 'large':
        return { width: cardWidth * 1.2, height: cardWidth * 1.2 * 1.15 };
      default:
        return { width: cardWidth, height: cardWidth * 1.15 };
    }
  };

  const dimensions = getSizeDimensions();
  const styles = createStyles(dimensions, screenWidth);

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
     
      accessibilityRole="button"
      accessibilityLabel={`${product.name} - ${product.price}`}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <CachedImage
          source={product.imageUrl}
          style={styles.productImage}
          contentFit="cover"
          fallbackIcon="image-outline"
          fallbackIconSize={32}
          showShimmer={true}
          borderRadius={10}
          onError={handleImageError}
        />

        {/* Discount Badge */}
        {product.discountPercentage && product.discountPercentage > 0 && (
          <View style={styles.discountBadgeContainer}>
            <DiscountBadge
              percentage={product.discountPercentage}
              size="small"
            />
          </View>
        )}

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <View style={styles.outOfStockOverlay}>
            <ThemedText style={styles.outOfStockText}>
              Out of Stock
            </ThemedText>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View style={styles.detailsContainer}>
        {/* Top Content - Product Name and Store */}
        <View style={styles.topContent}>
          {/* Product Name */}
          <ThemedText style={styles.productName} numberOfLines={2}>
            {product.name}
          </ThemedText>

          {/* Store Name (if shown) */}
          {showStore && (
            <ThemedText style={styles.storeName} numberOfLines={1}>
              {store.storeName}
            </ThemedText>
          )}
        </View>

        {/* Bottom Content - Price, Rating, Payment */}
        <View style={styles.bottomContent}>
          {/* Price Container */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.currentPrice}>
                {currencySymbol}{product.price.toLocaleString(locale)}
              </ThemedText>
              {product.originalPrice && product.originalPrice > product.price && (
                <ThemedText style={styles.originalPrice}>
                  {currencySymbol}{product.originalPrice.toLocaleString(locale)}
                </ThemedText>
              )}
            </View>

            {/* Rating (if available) */}
            {product.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons
                  name="star"
                  size={12}
                  color="#FFB800"
                  style={styles.ratingIcon}
                />
                <ThemedText style={styles.ratingText}>
                  {product.rating.toFixed(1)}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Rez Pay Indicator */}
          {product.hasRezPay && (
            <View style={styles.paymentIndicatorContainer}>
              <PaymentIndicator
                type="rez_pay"
                size="small"
              />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const createStyles = (
  dimensions: { width: number; height: number },
  screenWidth: number
) => {
  const isTablet = screenWidth > 768;
  // Account for image margins in height calculation
  const imageMargins = SPACING.SM * 2; // top and bottom margins
  const imageHeight = (dimensions.width * PRODUCT_GRID.IMAGE_ASPECT_RATIO) - imageMargins;

  return StyleSheet.create({
    container: {
      width: dimensions.width,
      flex: 1,
      backgroundColor: COLORS.WHITE,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.04)',
      elevation: 2,
      alignSelf: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    imageContainer: {
      position: 'relative',
      height: imageHeight,
      backgroundColor: colors.offWhite,
      margin: SPACING.SM,
      borderRadius: 10,
      overflow: 'hidden',
    },
    productImage: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.GRAY_100,
      borderRadius: 10,
    },
    discountBadgeContainer: {
      position: 'absolute',
      top: SPACING.XS,
      left: SPACING.XS,
      zIndex: 2,
    },
    outOfStockOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3,
      borderRadius: 10,
    },
    outOfStockText: {
      color: COLORS.WHITE,
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
      letterSpacing: 0.5,
    },
    detailsContainer: {
      padding: SPACING.SM,
      paddingTop: SPACING.XS,
      flex: 1,
      justifyContent: 'space-between',
    },
    topContent: {
      flex: 1,
    },
    bottomContent: {},
    productName: {
      fontSize: isTablet ? TYPOGRAPHY.FONT_SIZE_BASE : TYPOGRAPHY.FONT_SIZE_SM,
      fontWeight: '700',
      color: COLORS.TEXT_PRIMARY,
      lineHeight: TYPOGRAPHY.LINE_HEIGHT_TIGHT * (isTablet ? TYPOGRAPHY.FONT_SIZE_BASE : TYPOGRAPHY.FONT_SIZE_SM),
      marginBottom: SPACING.XS,
      letterSpacing: -0.2,
    },
    storeName: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: SPACING.XS,
    },
    priceContainer: {
      marginBottom: SPACING.XS,
      marginTop: 0,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: SPACING.XS,
    },
    currentPrice: {
      fontSize: isTablet ? TYPOGRAPHY.FONT_SIZE_LG : TYPOGRAPHY.FONT_SIZE_BASE,
      fontWeight: '800',
      color: COLORS.TEXT_PRIMARY,
      marginRight: SPACING.SM,
      letterSpacing: -0.3,
    },
    originalPrice: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      color: COLORS.GRAY_400,
      textDecorationLine: 'line-through',
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingIcon: {
      marginRight: 2,
    },
    ratingText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      color: colors.warningScale[700],
      fontWeight: '600',
    },
    paymentIndicatorContainer: {
      alignSelf: 'flex-start',
      marginTop: 2,
    },
  });
};

export default ProductCard;