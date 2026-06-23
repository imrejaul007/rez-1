// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  titleEmojis?: string;
  subtitle: string;
  itemName: string;
  saveAmount: string;
  coinsEarned: string;
  ctaText: string;
  ctaColor: string;
  gradientColors: [string, string];
  onPress?: () => void;
}

// Props for dynamic product/service data from backend
interface FeaturedProductData {
  productId: string;
  name: string;
  image: string;
  originalPrice: number;
  sellingPrice: number;
  savings: number;
  cashbackCoins: number;
  storeName: string;
  storeId: string;
}

interface FeatureTryCardsProps {
  lockProduct?: FeaturedProductData | null;
  trendingService?: FeaturedProductData | null;
  isLoading?: boolean;
  onProductLockPress?: () => void;
  onServiceBookingPress?: () => void;
}

// Helper function to format currency - returns number string without symbol
const formatCurrencyValue = (amount: number, locale: string): string => {
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  }
  return amount.toLocaleString(locale);
};

// Helper function to format coins
const formatCoins = (coins: number, locale: string): string => {
  if (coins >= 1000) {
    return `${(coins / 1000).toFixed(1)}K`;
  }
  return coins.toLocaleString(locale);
};

const FeatureTryCards: React.FC<FeatureTryCardsProps> = ({
  lockProduct,
  trendingService,
  isLoading = false,
  onProductLockPress,
  onServiceBookingPress,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  // Build cards array based on available data
  const cards: FeatureCard[] = [];

  // Add product lock card if data available or use fallback
  if (lockProduct || !isLoading) {
    cards.push({
      id: 'product-lock',
      icon: '🎧',
      title: 'Try',
      titleEmojis: '🔥',
      subtitle: 'Lock price, visit store or get delivered',
      itemName: lockProduct?.name || 'Featured Product',
      saveAmount: lockProduct ? `${currencySymbol}${formatCurrencyValue(lockProduct.savings, locale)}` : `${currencySymbol}5,000`,
      coinsEarned: lockProduct ? formatCoins(lockProduct.cashbackCoins, locale) : '2,499',
      ctaText: 'Try Now',
      ctaColor: colors.brand.purpleMedium, // Purple
      gradientColors: [colors.lavenderMist, colors.lightPeach], // Lavender Mist to Light Peach
      onPress: onProductLockPress || (() => {
        if (lockProduct?.productId) {
          router.push(`/product-page?cardId=${lockProduct.productId}&cardType=product` as any);
        } else {
          router.push('/product-lock');
        }
      }),
    });
  }

  // Add service booking card if data available or use fallback
  if (trendingService || !isLoading) {
    cards.push({
      id: 'service-booking',
      icon: '💇‍♀️',
      title: 'Try',
      titleEmojis: '✨✨',
      subtitle: 'Choose date, time & professional',
      itemName: trendingService?.name || 'Trending Service',
      saveAmount: trendingService ? `${currencySymbol}${formatCurrencyValue(trendingService.savings, locale)}` : `${currencySymbol}1,000`,
      coinsEarned: trendingService ? formatCoins(trendingService.cashbackCoins, locale) : '250',
      ctaText: 'Book Now',
      ctaColor: colors.lightPeach, // Light Peach
      gradientColors: [colors.lightPeach, colors.brand.sand], // Light Peach gradient
      onPress: onServiceBookingPress || (() => {
        if (trendingService?.productId) {
          router.push(`/service/${trendingService.productId}`);
        } else {
          router.push('/service-booking');
        }
      }),
    });
  }

  // Render loading skeleton
  const renderSkeletonCard = (index: number, gradientColors: [string, string]) => (
    <View key={`skeleton-${index}`} style={styles.cardContainer}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardGradient}
      >
        <View style={[styles.iconContainer, styles.skeletonIcon]} />
        <View style={styles.contentContainer}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonItemName} />
          <View style={styles.offerRow}>
            <View style={styles.skeletonOffer} />
            <View style={styles.skeletonCta} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderCard = (card: FeatureCard) => (
    <Pressable
      key={card.id}
     
      onPress={card.onPress}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={card.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardGradient}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{card.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>
              {card.title}
              {card.titleEmojis && ` ${card.titleEmojis} `}
              {card.id === 'product-lock' ? 'Lock Product Feature' : 'Service Booking'}
            </Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitleText}>{card.subtitle}</Text>

          {/* Item Name */}
          <Text style={styles.itemNameText}>{card.itemName}</Text>

          {/* Offer Row */}
          <View style={styles.offerRow}>
            <Text style={styles.offerText}>
              Save {card.saveAmount} + Earn {card.coinsEarned} coins
            </Text>
            <Pressable
              onPress={card.onPress}
             
              style={styles.ctaButton}
            >
              <Text style={[styles.ctaText, { color: card.ctaColor }]}>
                {card.ctaText}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={card.ctaColor}
              />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );

  // Show loading skeletons while loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderSkeletonCard(0, [colors.lavenderMist, colors.lightPeach])}
        {renderSkeletonCard(1, [colors.linen, colors.lightPeach])}
      </View>
    );
  }

  // Don't render if no cards available
  if (cards.length === 0) {
    return null;
  }

  return <View style={styles.container}>{cards.map(renderCard)}</View>;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 12,
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 120,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800], // Dark grey
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    color: colors.neutral[500], // Light grey
    marginTop: 2,
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800], // Dark grey
    marginTop: 4,
  },
  offerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  offerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard, // Mustard
    flex: 1,
    marginRight: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Skeleton styles
  skeletonIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  skeletonTitle: {
    width: '80%',
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
  },
  skeletonSubtitle: {
    width: '60%',
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
    marginTop: 2,
  },
  skeletonItemName: {
    width: '50%',
    height: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonOffer: {
    width: '55%',
    height: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
  },
  skeletonCta: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
  },
});

export default React.memo(FeatureTryCards);

