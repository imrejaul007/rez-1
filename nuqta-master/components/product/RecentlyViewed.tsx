import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  originalPrice?: number;
  discount?: number;
}

interface RecentlyViewedProps {
  products: Product[];
  onProductPress?: (product: Product) => void;
}

function RecentlyViewed({ products, onProductPress }: RecentlyViewedProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (!products || products.length === 0) {
    return null;
  }

  const handlePress = (product: Product) => {
    if (onProductPress) {
      onProductPress(product);
    } else {
      router.push({
        pathname: '/product-page',
        params: { cardId: product.id, cardType: 'product' },
      } as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Viewed</Text>
        <Text style={styles.count}>{products.length} items</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((product) => (
          <Pressable
            key={product.id}
            style={styles.productCard}
            onPress={() => handlePress(product)}
            accessibilityLabel={`View ${product.name}`}
            accessibilityRole="button"
          >
            <View style={styles.imageContainer}>
              {product.image ? (
                <CachedImage
                  source={{ uri: product.image }}
                  style={styles.productImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imageText}>📷</Text>
                </View>
              )}
              {product.discount && product.discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}% OFF</Text>
                </View>
              )}
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>

              <View style={styles.priceContainer}>
                <Text style={styles.productPrice}>{currencySymbol}{product.price}</Text>
                {product.originalPrice && product.originalPrice > product.price && (
                  <Text style={styles.originalPrice}>{currencySymbol}{product.originalPrice}</Text>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  count: {
    fontSize: 13,
    color: colors.midGray,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: 140,
  },
  imageContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  imageText: {
    fontSize: 48,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  productInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 13,
    color: '#1a1a1a',
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
});

export default React.memo(RecentlyViewed);
