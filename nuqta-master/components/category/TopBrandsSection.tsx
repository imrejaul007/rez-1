/**
 * TopBrandsSection Component
 * Horizontal scrollable brand cards with cashback info
 * Adapted from Rez_v-2-main FashionBrandCard
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getBrandsForCategory, Brand } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';

interface TopBrandsSectionProps {
  categorySlug: string;
  brands?: Brand[];
  onBrandPress?: (brand: Brand) => void;
}

const BrandCard = memo(({
  brand,
  onPress,
}: {
  brand: Brand;
  onPress: () => void;
}) => (
  <Pressable
    style={styles.brandCard}
    onPress={onPress}
   
    accessibilityLabel={`${brand.name} brand`}
    accessibilityRole="button"
  >
    <View style={styles.logoContainer}>
      <Text style={styles.logo}>{brand.logo}</Text>
    </View>

    <Text style={styles.brandName} numberOfLines={1}>{brand.name}</Text>

    <View style={styles.cashbackBadge}>
      <Text style={styles.cashbackText}>{brand.cashback}% cashback</Text>
    </View>

    {brand.tag && (
      <View style={[
        styles.tagBadge,
        brand.tag === 'Premium' && styles.tagPremium,
        brand.tag === 'Trending' && styles.tagTrending,
        brand.tag === 'Popular' && styles.tagPopular,
      ]}>
        <Text style={[
          styles.tagText,
          brand.tag === 'Premium' && styles.tagTextPremium,
          brand.tag === 'Trending' && styles.tagTextTrending,
          brand.tag === 'Popular' && styles.tagTextPopular,
        ]}>{brand.tag}</Text>
      </View>
    )}

    <View style={styles.ratingRow}>
      <Text style={styles.ratingStar}>★</Text>
      <Text style={styles.ratingValue}>{brand.rating.toFixed(1)}</Text>
    </View>
  </Pressable>
));

BrandCard.displayName = 'BrandCard';

const TopBrandsSection: React.FC<TopBrandsSectionProps> = ({
  categorySlug,
  brands,
  onBrandPress,
}) => {
  const router = useRouter();
  const displayBrands = brands || getBrandsForCategory(categorySlug);

  const handlePress = useCallback((brand: Brand) => {
    if (onBrandPress) {
      onBrandPress(brand);
    } else {
      // Navigate to brand page - using brand name as the route param
      router.push({
        pathname: '/brand/[name]',
        params: { name: brand.id },
      } as any);
    }
  }, [router, onBrandPress]);

  if (!displayBrands || displayBrands.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Top Brands</Text>
        <Pressable
          style={styles.seeAllButton}
          onPress={() => router.push(`/brands?category=${categorySlug}` as any)}
          accessibilityLabel="See all brands"
        >
          <Text style={styles.seeAllText}>View All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayBrands.map((brand) => (
          <BrandCard
            key={brand.id}
            brand={brand}
            onPress={() => handlePress(brand)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.4,
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  brandCard: {
    width: 120,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logo: {
    fontSize: 28,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 6,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  tagBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  tagPremium: {
    backgroundColor: colors.tint.amberLight,
  },
  tagTrending: {
    backgroundColor: colors.tint.blueLight,
  },
  tagPopular: {
    backgroundColor: colors.pinkMist,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  tagTextPremium: {
    color: colors.warningScale[700],
  },
  tagTextTrending: {
    color: colors.brand.blue,
  },
  tagTextPopular: {
    color: colors.deepPink,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingStar: {
    fontSize: 12,
    color: '#FFB800',
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[500],
  },
});

export default memo(TopBrandsSection);
