/**
 * RecentlyViewedSection Component
 * Displays a horizontal scrollable list of recently viewed stores and products
 * Production-ready with proper styling matching the app's design system
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RecentlyViewedItem } from '@/types/recentlyViewed.types';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface RecentlyViewedSectionProps {
  items: RecentlyViewedItem[];
  isLoading?: boolean;
  onViewAll?: () => void;
  maxItems?: number;
}

const CARD_WIDTH = 170;
const CARD_GAP = 12;
const IMAGE_HEIGHT = 140;

// Memoized Card Component for performance
const RecentlyViewedCard = memo(({
  item,
  onPress,
  currencySymbol,
  locale,
}: {
  item: RecentlyViewedItem;
  onPress: () => void;
  currencySymbol: string;
  locale: string;
}) => {
  const formattedRating = item.rating.value > 0 ? item.rating.value.toFixed(1) : '0.0';
  const hasCashback = item.cashbackPercentage && item.cashbackPercentage > 0;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
     
      accessibilityLabel={`View ${item.name}`}
      accessibilityRole="button"
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <CachedImage
            source={item.image}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name={item.type === 'store' ? 'storefront-outline' : 'cube-outline'}
              size={40}
              color={colors.neutral[400]}
            />
          </View>
        )}

        {/* Gradient overlay for better text visibility */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.imageGradient}
        />

        {/* Type Badge */}
        <View style={[
          styles.typeBadge,
          item.type === 'store' ? styles.storeBadge : styles.productBadge
        ]}>
          <Ionicons
            name={item.type === 'store' ? 'storefront' : 'pricetag'}
            size={10}
            color={colors.background.primary}
          />
          <Text style={styles.typeBadgeText}>
            {item.type === 'store' ? 'Store' : 'Product'}
          </Text>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Name */}
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Rating Row */}
        <View style={styles.ratingRow}>
          <Text style={styles.ratingValue}>{formattedRating}</Text>
          <Ionicons name="star" size={12} color={colors.lightMustard} />
          {item.rating.count > 0 && (
            <Text style={styles.ratingCount}>({item.rating.count})</Text>
          )}
        </View>

        {/* Price Row - only for products */}
        {item.type === 'product' && item.price && item.price.current > 0 ? (
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>
              {currencySymbol}{item.price.current.toLocaleString(locale)}
            </Text>
            {item.price.original && item.price.original > item.price.current && (
              <Text style={styles.originalPrice}>
                {currencySymbol}{item.price.original.toLocaleString(locale)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.priceRowPlaceholder} />
        )}

        {/* Cashback Badge */}
        {hasCashback && (
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>
              Upto {item.cashbackPercentage}% cash back
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

RecentlyViewedCard.displayName = 'RecentlyViewedCard';

const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  items,
  isLoading = false,
  onViewAll,
  maxItems = 10,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  // Handle item press - navigate to appropriate detail page
  const handleItemPress = useCallback((item: RecentlyViewedItem) => {
    if (item.type === 'store') {
      router.push({
        pathname: '/MainStorePage',
        params: { storeId: item.id },
      } as any);
    } else {
      router.push({
        pathname: '/product-page',
        params: { cardId: item.id, cardType: 'product' },
      } as any);
    }
  }, [router]);

  // Don't render if no items and not loading
  if (!isLoading && items.length === 0) {
    return null;
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <View style={styles.wrapper}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Recently Viewed</Text>
        {onViewAll && items.length > 0 && (
          <Pressable
            onPress={onViewAll}
            style={styles.viewAllButton}
            accessibilityLabel="View all recently viewed items"
            accessibilityRole="button"
          >
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        )}
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lightMustard} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        /* Horizontal Scroll of Cards */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_GAP}
          snapToAlignment="start"
        >
          {displayItems.map((item) => (
            <RecentlyViewedCard
              key={`${item.type}-${item.id}`}
              item={item}
              onPress={() => handleItemPress(item)}
              currencySymbol={currencySymbol}
              locale={locale}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.2,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.lightMustard,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.neutral[400],
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  storeBadge: {
    backgroundColor: colors.lightMustard,
  },
  productBadge: {
    backgroundColor: colors.lightMustard,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
    letterSpacing: 0.2,
  },
  cardContent: {
    padding: 12,
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  ratingCount: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: colors.neutral[500],
    flex: 1,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 18,
  },
  priceRowPlaceholder: {
    minHeight: 18,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nileBlue,
  },
});

export default memo(RecentlyViewedSection);
