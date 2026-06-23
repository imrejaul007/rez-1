/**
 * Food & Dining Module - DishCard Component
 * Displays a popular dish with image, price, store name, and rating.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';
import { colors } from '@/constants/theme';

interface FoodDish {
  _id?: string;
  id?: string;
  name: string;
  images?: { url: string }[];
  image?: string;
  pricing?: { salePrice?: number; basePrice?: number };
  price?: number;
  store?: { _id?: string; id?: string; name?: string };
  ratings?: { average?: number };
  [key: string]: any;
}

interface DishCardProps {
  dish: FoodDish;
  currencySymbol: string;
}

const DishCard: React.FC<DishCardProps> = ({ dish, currencySymbol }) => {
  const router = useRouter();
  const imgUri = dish.images?.[0]?.url || dish.image;
  const price = dish.pricing?.salePrice || dish.pricing?.basePrice || dish.price;
  const storeName = dish.store?.name;
  const rating = dish.ratings?.average;
  const [imgErr, setImgErr] = useState(false);

  return (
    <Pressable
      style={styles.dishCard}
      onPress={() => router.push(`/product-page?id=${dish._id || dish.id}&storeId=${dish.store?._id || dish.store?.id || ''}` as any)}
     
      accessibilityLabel={`${dish.name}${price ? `, ${currencySymbol}${price}` : ''}${storeName ? `, from ${storeName}` : ''}`}
      accessibilityRole="button"
    >
      {imgUri && !imgErr ? (
        <CachedImage source={{ uri: imgUri }} style={styles.dishImage} contentFit="cover" cachePolicy="memory-disk" onError={() => setImgErr(true)} />
      ) : (
        <View style={[styles.dishImage, { backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="fast-food-outline" size={28} color={COLORS.textSecondary} />
        </View>
      )}
      <View style={styles.dishInfo}>
        <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
        {price ? <Text style={styles.dishPrice}>{currencySymbol}{price}</Text> : null}
        {storeName ? <Text style={styles.dishStore} numberOfLines={1}>{storeName}</Text> : null}
        {rating ? (
          <View style={styles.dishRatingRow}>
            <Ionicons name="star" size={10} color={COLORS.primaryGold} />
            <Text style={styles.dishRatingText}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dishCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  dishImage: {
    width: 140,
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dishInfo: {
    padding: 8,
  },
  dishName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  dishPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryGold,
    marginBottom: 2,
  },
  dishStore: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dishRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dishRatingText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default React.memo(DishCard);
