// @ts-nocheck
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRecommendations } from '@/hooks/useHomepage';
import { RecommendationItem } from '@/types/homepage.types';
import { useHomepageNavigation } from '@/hooks/useHomepage';
import { SectionSkeleton } from '@/components/homepage/skeletons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { formatPrice as formatPriceUtil } from '@/utils/priceFormatter';
import { colors } from '@/constants/theme';

const CARD_GAP = 12;

interface PickedForYouProps {
  onViewAllPress?: () => void;
  limit?: number;
}

const MATCH_COLORS = {
  high: { bg: colors.successScale[100], text: colors.successScale[700], ring: colors.success },   // 90%+
  medium: { bg: colors.tint.amberLight, text: colors.brand.amberDark, ring: colors.warningScale[400] }, // 70-89%
  low: { bg: '#E0E7FF', text: '#3730A3', ring: colors.brand.indigo },    // <70%
};

function getMatchTheme(score: number) {
  if (score >= 90) return MATCH_COLORS.high;
  if (score >= 70) return MATCH_COLORS.medium;
  return MATCH_COLORS.low;
}

const PickedForYou: React.FC<PickedForYouProps> = ({
  onViewAllPress,
  limit = 2
}) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 16 * 2 - CARD_GAP) / 2;
  const { section, loading, error } = useRecommendations();
  const { handleItemPress } = useHomepageNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Extract products from section, limit to specified number
  const products = useMemo(() => {
    if (!section?.items || section.items.length === 0) {
      return [];
    }

    const recommendationItems = section.items.slice(0, limit).map((item) => {
      if ('recommendationReason' in item && 'recommendationScore' in item) {
        return item as RecommendationItem;
      }

      const productItem = item as any;
      return {
        ...productItem,
        recommendationReason: productItem.recommendationReason || 'Recommended for you',
        recommendationScore: productItem.recommendationScore || (productItem.rating?.value ? parseFloat(String(productItem.rating.value)) / 5 : 0.85),
        personalizedFor: productItem.personalizedFor || productItem.category?.toLowerCase() || 'general',
      } as RecommendationItem;
    });

    return recommendationItems;
  }, [section?.items, limit]);

  // Determine dynamic subtitle based on personalization status
  const subtitle = useMemo(() => {
    if (!products || products.length === 0) {
      return 'Based on your shopping history';
    }

    const isPersonalized = products.some((item: any) =>
      item.personalizedFor && item.personalizedFor !== 'general' && item.personalizedFor !== null
    );

    const hasLocationData = products.some((item: any) =>
      item.recommendationReason?.toLowerCase().includes('near you')
    );

    if (isPersonalized && hasLocationData) {
      return 'Based on your location & shopping history';
    } else if (isPersonalized) {
      return 'Based on your shopping history';
    } else {
      return 'Popular items you might like';
    }
  }, [products]);

  const getMatchPercentage = (score: number): number => {
    return Math.round(score * 100);
  };

  const formatPrice = (price: RecommendationItem['price'], currency?: string): string => {
    const curr = currency || 'INR';
    if (typeof price === 'number') {
      return formatPriceUtil(price, curr, false) || `${currencySymbol}${price}`;
    }
    if (price?.current) {
      const priceCurrency = price.currency || curr;
      return formatPriceUtil(price.current, priceCurrency, false) || `${currencySymbol}${price.current}`;
    }
    return `${currencySymbol}0`;
  };

  const getOriginalPrice = (price: RecommendationItem['price'], currency?: string): string | null => {
    if (typeof price === 'object' && price.original && price.current && price.original > price.current) {
      const curr = price.currency || currency || 'INR';
      return formatPriceUtil(price.original, curr, false) || `${currencySymbol}${price.original}`;
    }
    return null;
  };

  const getSavings = (price: RecommendationItem['price']): number | null => {
    if (typeof price === 'object' && price.original && price.current) {
      const discount = Math.round(((price.original - price.current) / price.original) * 100);
      if (discount > 0) return discount;
    }
    if (typeof price === 'object' && price.discount) {
      return price.discount;
    }
    return null;
  };

  const handleProductPress = (item: RecommendationItem) => {
    handleItemPress('just_for_you', item);
  };

  const handleViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      router.push('/recommendations');
    }
  };

  const isLoading = loading || (!section && !error);
  const hasNoItems = !section?.items || section.items.length === 0;

  if (isLoading || (hasNoItems && !error)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="sparkles" size={16} color={colors.background.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Picked For You</Text>
              <Text style={styles.subtitleText}>Loading recommendations...</Text>
            </View>
          </View>
          <View style={styles.aiTag}>
            <Ionicons name="flash" size={10} color={colors.warningScale[400]} />
            <Text style={styles.aiTagText}>AI Powered</Text>
          </View>
        </View>
        <SectionSkeleton
          cardType="recommendation"
          cardWidth={cardWidth}
          spacing={12}
          numCards={2}
          showIndicator={false}
        />
      </View>
    );
  }

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="sparkles" size={16} color={colors.background.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Picked For You</Text>
            <Text style={styles.subtitleText}>{subtitle}</Text>
          </View>
        </View>
        <Pressable onPress={handleViewAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.nileBlue} />
        </Pressable>
      </View>

      {/* Product Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.productsContainer}
        snapToInterval={cardWidth + CARD_GAP}
        decelerationRate="fast"
      >
        {products.map((product) => {
          const matchPercentage = getMatchPercentage(product.recommendationScore);
          const matchTheme = getMatchTheme(matchPercentage);
          const priceText = formatPrice(product.price);
          const originalPrice = getOriginalPrice(product.price);
          const savingsPercent = getSavings(product.price);
          const productName = product.name || product.title || 'Product';
          const productImage = product.image || product.images?.[0];

          return (
            <Pressable
              key={product.id}
              onPress={() => handleProductPress(product)}
             
              style={[styles.productCard, { width: cardWidth }]}
            >
              {/* Image Area */}
              <View style={styles.imageContainer}>
                {productImage ? (
                  <CachedImage
                    source={productImage}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={['#F0F4F8', colors.slateLight]}
                    style={styles.placeholderImage}
                  >
                    <Ionicons name="cube-outline" size={36} color="#94A3B8" />
                  </LinearGradient>
                )}

                {/* Match Badge - top-left pill */}
                <View style={[styles.matchBadge, { backgroundColor: matchTheme.bg }]}>
                  <View style={[styles.matchDot, { backgroundColor: matchTheme.ring }]} />
                  <Text style={[styles.matchBadgeText, { color: matchTheme.text }]}>
                    {matchPercentage}% match
                  </Text>
                </View>

                {/* Discount Tag - top-right */}
                {savingsPercent && (
                  <View style={styles.discountTag}>
                    <Text style={styles.discountTagText}>{savingsPercent}% OFF</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {productName}
                </Text>
                <Text style={styles.productReason} numberOfLines={1}>
                  {product.recommendationReason || 'Recommended for you'}
                </Text>

                {/* Price Row */}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{priceText}</Text>
                  {originalPrice && (
                    <Text style={styles.originalPrice}>{originalPrice}</Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.nileBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
    marginTop: 1,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  // ── Cards ──
  productsContainer: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  productCard: {
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 16px rgba(26,58,82,0.08)',
      },
    }),
  },
  // ── Image ──
  imageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: colors.tint.coolGray,
    position: 'relative',
    overflow: 'hidden',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  // ── Match Badge ──
  matchBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Discount Tag ──
  discountTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.error,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // ── Info ──
  productInfo: {
    padding: 12,
    gap: 3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
    lineHeight: 19,
  },
  productReason: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
});

export default React.memo(PickedForYou);
