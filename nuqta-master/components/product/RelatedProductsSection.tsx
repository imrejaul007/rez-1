import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { useRelatedProducts, RelatedProduct } from '@/hooks/useRelatedProducts';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

/**
 * RelatedProductsSection Component
 *
 * Displays related/similar products in a horizontal scrollable section
 * Integrates with backend API to fetch recommendations
 */
interface RelatedProductsSectionProps {
  productId: string;
  title?: string;
  type?: 'similar' | 'frequently-bought' | 'bundles';
  limit?: number;
  onProductPress?: (productId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 170;

export const RelatedProductsSection: React.FC<RelatedProductsSectionProps> = ({
  productId,
  title = 'Similar Products',
  type = 'similar',
  limit = 6,
  onProductPress,
}) => {
  const router = useRouter();

  // Fetch related products
  const { products, isLoading, error, hasProducts, refresh } = useRelatedProducts({
    productId,
    type,
    limit,
    autoLoad: true,
  });

  /**
   * Handle product card press
   */
  const handleProductPress = (product: RelatedProduct) => {
    if (onProductPress) {
      onProductPress(product.id);
    } else {
      // Navigate to product detail page
      router.push(`/product-page?cardId=${product.id}&cardType=product` as any);
    }
  };

  // Don't render if no products and not loading
  if (!isLoading && !hasProducts && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {hasProducts && (
          <Pressable
            style={styles.viewAllButton}
            onPress={() => {
              // TODO: Navigate to category/search page with filter
            }}
           
          >
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.lightMustard} />
          </Pressable>
        )}
      </View>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lightMustard} />
          <ThemedText style={styles.loadingText}>Loading recommendations...</ThemedText>
        </View>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Ionicons name="reload" size={16} color={colors.lightMustard} />
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Products List */}
      {hasProducts && !isLoading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
          snapToAlignment="start"
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => handleProductPress(product)}
              isFirst={index === 0}
              isLast={index === products.length - 1}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

/**
 * ProductCard Component
 * Individual product card in the horizontal scroll
 */
interface ProductCardProps {
  product: RelatedProduct;
  onPress: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, isFirst, isLast }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  // Safely parse rating and price as numbers
  const rating = typeof product.rating === 'number' ? product.rating : parseFloat(product.rating as any) || 0;
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price as any) || 0;
  const originalPrice = typeof product.originalPrice === 'number' ? product.originalPrice : parseFloat(product.originalPrice as any) || 0;
  const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : parseInt(product.reviewCount as any) || 0;

  return (
    <Pressable
      style={[
        styles.card,
        isFirst && styles.cardFirst,
        isLast && styles.cardLast,
      ]}
      onPress={onPress}
     
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <CachedImage 
          source={product.image} 
          style={styles.image} 
          contentFit="cover"
        />

        {/* Discount Badge */}
        {product.discount && product.discount > 0 && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{product.discount}% OFF</ThemedText>
          </View>
        )}

        {/* Cashback Badge */}
        {product.cashback && (
          <View style={styles.cashbackBadge}>
            <Ionicons name="gift-outline" size={11} color={colors.background.primary} />
            <ThemedText style={styles.cashbackText}>Cashback</ThemedText>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Category */}
        {product.category && (
          <ThemedText style={styles.category} numberOfLines={1}>
            {product.category}
          </ThemedText>
        )}

        {/* Brand */}
        {product.brand && (
          <ThemedText style={styles.brand} numberOfLines={1}>
            {product.brand}
          </ThemedText>
        )}

        {/* Name */}
        <ThemedText style={styles.name} numberOfLines={2}>
          {product.name}
        </ThemedText>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={colors.warningScale[400]} />
          <ThemedText style={styles.rating}>{rating.toFixed(1)}</ThemedText>
          <ThemedText style={styles.reviewCount}>({reviewCount})</ThemedText>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <ThemedText style={styles.price}>{currencySymbol}{price.toLocaleString()}</ThemedText>
          {originalPrice > 0 && (
            <ThemedText style={styles.originalPrice}>
              {currencySymbol}{originalPrice.toLocaleString()}
            </ThemedText>
          )}
        </View>

        {/* Earnable Coins Badge */}
        {price > 0 && (
          <View style={styles.coinsBadge}>
            <ThemedText style={styles.coinsText}>
              +{Math.floor(price * 0.1)} {BRAND.COIN_NAME}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 24,
    paddingHorizontal: 0,
    marginTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.lightMustard,
    letterSpacing: 0.2,
  },

  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },

  // Scroll Content
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },

  // Product Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginRight: 16,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  cardFirst: {
    // First card already has left padding from scrollContent
  },
  cardLast: {
    marginRight: 20,
  },

  // Image
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.neutral[50],
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  cashbackBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cashbackText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.2,
  },

  // Info
  infoContainer: {
    padding: 14,
    paddingTop: 12,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lightMustard,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  brand: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
    marginBottom: 5,
    lineHeight: 16,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 20,
    marginBottom: 8,
    minHeight: 40,
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.neutral[400],
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },

  // Earnable coins badge
  coinsBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.tint.amber,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.tint.amberLight,
  },
  coinsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warningScale[400],
    letterSpacing: 0.2,
  },
});

export default React.memo(RelatedProductsSection);
