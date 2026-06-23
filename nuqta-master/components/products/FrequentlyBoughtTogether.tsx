// FrequentlyBoughtTogether Component
// Displays products frequently bought together with the current product

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { BundleItem } from '@/services/recommendationApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FrequentlyBoughtTogetherProps {
  bundles: BundleItem[];
  loading?: boolean;
  onAddToCart?: (products: any[]) => void;
  onProductPress?: (productId: string) => void;
}

// Helper function to extract price from product (handles multiple formats)
const getProductPrice = (product: any): number => {
  return product.pricing?.selling ||
    product.pricing?.original ||
    product.price?.current ||
    product.price?.selling ||
    product.price?.original ||
    (typeof product.price === 'number' ? product.price : 0);
};

// Helper function to extract original price
const getOriginalPrice = (product: any): number => {
  return product.pricing?.original ||
    product.pricing?.compare ||
    product.price?.original ||
    product.price?.compare ||
    getProductPrice(product);
};

// Helper function to extract image URL
const getProductImage = (product: any): string => {
  if (product.image) return product.image;
  if (product.images && product.images.length > 0) {
    const firstImg = product.images[0];
    return typeof firstImg === 'string' ? firstImg : firstImg?.url || '';
  }
  return 'https://via.placeholder.com/100';
};

// Helper function to get product ID
const getProductId = (product: any): string => {
  return product.id || product._id || '';
};

// Helper function to get cashback percentage
const getCashbackPercentage = (product: any): number => {
  return product.cashback?.percentage || product.cashbackPercentage || 5;
};

function FrequentlyBoughtTogether({
  bundles,
  loading = false,
  onAddToCart,
  onProductPress
}: FrequentlyBoughtTogetherProps) {
  const [selectedBundle, setSelectedBundle] = useState(0);
  const bundleScrollRef = useRef<ScrollView>(null);
  const bundleWidth = SCREEN_WIDTH - 32; // Account for horizontal margins

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Frequently Bought Together</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
        </View>
      </View>
    );
  }

  if (!bundles || bundles.length === 0) {
    return null;
  }

  // Handle scroll to update selected bundle
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (bundleWidth - 4)); // Account for margins
    if (newIndex >= 0 && newIndex < bundles.length && newIndex !== selectedBundle) {
      setSelectedBundle(newIndex);
    }
  };

  // Handle pagination dot press
  const handleDotPress = (index: number) => {
    setSelectedBundle(index);
    bundleScrollRef.current?.scrollTo({ x: index * (bundleWidth - 4), animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Frequently Bought Together</Text>
        {bundles.length > 1 && (
          <Text style={styles.subtitle}>
            Swipe to see {bundles.length} bundles
          </Text>
        )}
      </View>

      {/* Swipeable Bundle Container */}
      <ScrollView
        ref={bundleScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={bundleWidth - 4}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
      >
        {bundles.map((bundle, bundleIndex) => (
          <BundleCard
            key={bundleIndex}
            bundle={bundle}
            bundleWidth={bundleWidth}
            onAddToCart={onAddToCart}
            onProductPress={onProductPress}
          />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      {bundles.length > 1 && (
        <View style={styles.paginationContainer}>
          {bundles.map((_, index) => (
            <Pressable
              key={index}
              style={[
                styles.paginationDot,
                index === selectedBundle && styles.paginationDotActive
              ]}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Separate BundleCard component for each bundle
interface BundleCardProps {
  bundle: BundleItem;
  bundleWidth: number;
  onAddToCart?: (products: any[]) => void;
  onProductPress?: (productId: string) => void;
}

function BundleCard({ bundle, bundleWidth, onAddToCart, onProductPress }: BundleCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Calculate prices using helper functions
  const calculatedOriginalPrice = bundle.products.reduce(
    (sum, p) => sum + getOriginalPrice(p),
    0
  );

  const calculatedSellingPrice = bundle.products.reduce(
    (sum, p) => sum + getProductPrice(p),
    0
  );

  // Use backend values if available, otherwise calculate
  const originalPrice = calculatedOriginalPrice || calculatedSellingPrice;
  const combinedPrice = bundle.combinedPrice || calculatedSellingPrice;
  const savings = bundle.savings || (originalPrice - combinedPrice);

  const savingsPercentage = originalPrice > 0
    ? Math.round((savings / originalPrice) * 100)
    : 0;

  // Calculate total ReZ coins (10% of combined price)
  const totalRezCoins = Math.floor(combinedPrice * 0.1);

  // Calculate total cashback
  const totalCashback = bundle.products.reduce((sum, p) => {
    const price = getProductPrice(p);
    const cashbackPercent = getCashbackPercentage(p);
    return sum + Math.floor(price * cashbackPercent / 100);
  }, 0);

  return (
    <View style={[styles.bundleContainer, { width: bundleWidth - 8 }]}>
      {/* Frequency Badge */}
      {bundle.frequency > 0 && (
        <View style={styles.frequencyBadge}>
          <Ionicons name="people" size={12} color={colors.neutral[500]} />
          <Text style={styles.frequencyText}>
            {bundle.frequency} bought together
          </Text>
        </View>
      )}

      {/* Products Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsRow}
      >
        {bundle.products.map((product, index) => (
          <React.Fragment key={getProductId(product) || index}>
            <BundleProductCard
              product={product}
              onPress={() => onProductPress?.(getProductId(product))}
            />
            {index < bundle.products.length - 1 && (
              <View style={styles.plusIcon}>
                <Ionicons name="add" size={20} color={colors.lightMustard} />
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>

      <View style={styles.priceSection}>
        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Bundle Price:</Text>
          <View style={styles.priceGroup}>
            {originalPrice > combinedPrice && (
              <Text style={styles.originalPrice}>{currencySymbol}{Math.round(originalPrice)}</Text>
            )}
            <Text style={styles.price}>{currencySymbol}{Math.round(combinedPrice)}</Text>
          </View>
        </View>

        {/* Savings Row */}
        {savings > 0 && (
          <View style={styles.savingsRow}>
            <View style={styles.savingsBadge}>
              <Ionicons name="pricetag" size={14} color={colors.lightMustard} />
              <Text style={styles.savingsText}>
                Save {currencySymbol}{Math.round(savings)} ({savingsPercentage}%)
              </Text>
            </View>
          </View>
        )}

        {/* Rewards Row - Nuqta Coins & Cashback */}
        <View style={styles.rewardsContainer}>
          <View style={styles.rewardItem}>
            <View style={styles.rewardIconBg}>
              <Ionicons name="wallet-outline" size={16} color={colors.lightMustard} />
            </View>
            <View>
              <Text style={styles.rewardValue}>{totalRezCoins} coins</Text>
              <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
            </View>
          </View>
          <View style={styles.rewardDivider} />
          <View style={styles.rewardItem}>
            <View style={[styles.rewardIconBg, { backgroundColor: colors.tint.amberLight }]}>
              <Ionicons name="card-outline" size={16} color={colors.warningScale[400]} />
            </View>
            <View>
              <Text style={[styles.rewardValue, { color: colors.warningScale[400] }]}>{currencySymbol}{totalCashback}</Text>
              <Text style={styles.rewardLabel}>Cashback</Text>
            </View>
          </View>
        </View>

        {/* Add to Cart Button */}
        {onAddToCart && (
          <Pressable
            style={styles.addButton}
            onPress={() => onAddToCart(bundle.products)}
           
          >
            <Ionicons name="cart" size={20} color={colors.background.primary} />
            <Text style={styles.addButtonText}>Add All to Cart</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface BundleProductCardProps {
  product: any;
  onPress?: () => void;
}

function BundleProductCard({ product, onPress }: BundleProductCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const price = getProductPrice(product);
  const originalPrice = getOriginalPrice(product);
  const imageUrl = getProductImage(product);
  const discount = product.pricing?.discount ||
    (originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0);

  return (
    <Pressable
      style={styles.productCard}
      onPress={onPress}
     
    >
      <View style={styles.productImageContainer}>
        <CachedImage
          source={imageUrl}
          style={styles.productImage}
          contentFit="cover"
        />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name || product.title || 'Product'}
        </Text>
        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>{currencySymbol}{Math.round(price)}</Text>
          {originalPrice > price && (
            <Text style={styles.productOriginalPrice}>{currencySymbol}{Math.round(originalPrice)}</Text>
          )}
        </View>
        {product.ratings && (
          <View style={styles.productRating}>
            <Ionicons name="star" size={10} color={colors.warningScale[400]} />
            <Text style={styles.ratingText}>
              {(product.ratings.average || 0).toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    marginVertical: 8,
    marginHorizontal: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 12
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    fontStyle: 'italic'
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  bundleContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12
  },
  frequencyText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500'
  },
  productsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingLeft: 4,
    gap: 12
  },
  productCard: {
    width: 130,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200]
  },
  productImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: colors.neutral[100],
    position: 'relative'
  },
  productImage: {
    width: '100%',
    height: '100%'
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary
  },
  productInfo: {
    padding: 10,
    gap: 4
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[800],
    minHeight: 32
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.lightMustard
  },
  productOriginalPrice: {
    fontSize: 11,
    color: colors.neutral[400],
    textDecorationLine: 'line-through'
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[800]
  },
  plusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.linen,
    justifyContent: 'center',
    alignItems: 'center'
  },
  priceSection: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 16,
    gap: 12
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700]
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.lightMustard
  },
  originalPrice: {
    fontSize: 16,
    color: colors.neutral[400],
    textDecorationLine: 'line-through'
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.linen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.linen
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard
  },
  rewardsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200]
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center'
  },
  rewardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.linen,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.lightMustard
  },
  rewardLabel: {
    fontSize: 11,
    color: colors.neutral[500]
  },
  rewardDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 8
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lightMustard,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: colors.lightMustard,
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300]
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: colors.lightMustard
  }
});

export default React.memo(FrequentlyBoughtTogether);
