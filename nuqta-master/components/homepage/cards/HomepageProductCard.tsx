import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { HomepageProduct } from '@/services/productApi';
import { colors } from '@/constants/theme';

interface HomepageProductCardProps {
  product: HomepageProduct;
  showDistance?: boolean;
  width?: number;
}

function HomepageProductCard({
  product,
  showDistance = false,
  width = 160,
}: HomepageProductCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/product-page?cardId=${product._id || product.id}&cardType=product`);
  };

  // Format delivery fee
  const formatDeliveryFee = (fee: number) => {
    if (fee === 0) return 'Free delivery';
    return `$${fee.toFixed(2)} delivery fee`;
  };

  // Format distance
  const formatDistance = (distance: number | null | undefined) => {
    if (distance === null || distance === undefined) return '';
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)} km away`;
  };

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
    >
      <ThemedView style={styles.card}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={product.image || 'https://via.placeholder.com/160x120?text=No+Image'}
            style={styles.image}
            contentFit="cover"
          />
          {/* Distance Badge (for In Your Area section) */}
          {showDistance && product.store?.distance !== null && product.store?.distance !== undefined && (
            <View style={styles.distanceBadge}>
              <ThemedText style={styles.distanceBadgeText}>
                {formatDistance(product.store.distance)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.content}>
          <ThemedText style={styles.productName} numberOfLines={1}>
            {product.name}
          </ThemedText>

          <ThemedText style={styles.deliveryTime} numberOfLines={1}>
            {product.store?.deliveryTime || '30-45 min'}
          </ThemedText>

          <ThemedText style={styles.deliveryFee} numberOfLines={1}>
            {formatDeliveryFee(product.store?.deliveryFee || 0)}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceBadgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B21B6', // Purple color like in the screenshot
    marginBottom: 4,
  },
  deliveryTime: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  deliveryFee: {
    fontSize: 12,
    color: colors.neutral[500],
  },
});

export default memo(HomepageProductCard);
