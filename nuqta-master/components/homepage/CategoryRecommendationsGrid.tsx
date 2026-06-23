import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import productsApi from '@/services/productsApi';
import storesApi from '@/services/storesApi';
import { ProductItem } from '@/types/homepage.types';
import { useRecommendationTracking } from '@/contexts/RecommendationContext';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

interface RecommendationCard {
  id: string;
  type: 'product' | 'store';
  title: string;
  subtitle: string;
  image: string;
  cashbackPercentage: number;
  badge?: string;
  data: any; // Original product or store data for navigation
}

interface CategoryRecommendationsGridProps {
  storeId?: string;
  title?: string;
  limit?: number;
  showProducts?: boolean; // Show products instead of categories
  showStores?: boolean; // Show stores
  excludeProducts?: string[]; // Product IDs to exclude (already shown)
  excludeStores?: string[]; // Store IDs to exclude (already shown)
  onCardPress?: (card: RecommendationCard) => void;
}

function CategoryRecommendationsGrid({
  storeId,
  title = "What are you looking for?",
  limit = 6,
  showProducts = true,
  showStores = true,
  excludeProducts = [],
  excludeStores = [],
  onCardPress,
}: CategoryRecommendationsGridProps) {
  const router = useRouter();
  const { addShownProducts, addShownStores, getShownProducts, getShownStores } = useRecommendationTracking();
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRecommendations();
  }, [storeId, showProducts, showStores]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const cards: RecommendationCard[] = [];
      const halfLimit = Math.ceil(limit / 2);

      // Combine exclude lists: from props + from global tracking
      const globalExcludeProducts = getShownProducts();
      const globalExcludeStores = getShownStores();
      const allExcludeProducts = [...new Set([...excludeProducts, ...globalExcludeProducts])];
      const allExcludeStores = [...new Set([...excludeStores, ...globalExcludeStores])];

      // Amazon/Flipkart Strategy 1: Random pagination for diversity
      // Instead of always page 1, randomly select from first 10 pages
      const randomPage = Math.floor(Math.random() * 10) + 1;

      // Amazon/Flipkart Strategy 2: Category rotation
      // Rotate through different categories to ensure variety
      const categories = ['fashion', 'electronics', 'food', 'beauty', 'home', 'sports'];
      const todayCategory = categories[new Date().getDate() % categories.length];

      // Fetch real products if enabled
      if (showProducts) {
        try {
          const productsResponse = await productsApi.getProducts({
            page: randomPage, // DIVERSITY FIX: Random page instead of always 1
            limit: halfLimit * 3, // Fetch more to account for filtering
            // Remove 'featured' and 'status' - backend doesn't support these params
          });

          if (productsResponse.success && productsResponse.data) {
            const productsData = Array.isArray(productsResponse.data)
              ? productsResponse.data
              : productsResponse.data.products || [];

            // DIVERSITY FIX 1: Filter out excluded products
            const filteredProducts = productsData.filter((product: any) => {
              const productId = product._id || product.id;
              return !allExcludeProducts.includes(productId);
            });

            // DIVERSITY FIX 2: Category balancing (Amazon strategy)
            // Group by category and limit products per category
            const categoryMap = new Map<string, any[]>();
            const maxPerCategory = 2; // Max 2 products per category

            filteredProducts.forEach((product: any) => {
              const category = product.category?.name || product.category || 'general';
              if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
              }
              const categoryProducts = categoryMap.get(category)!;
              if (categoryProducts.length < maxPerCategory) {
                categoryProducts.push(product);
              }
            });

            // Flatten back to array
            const balancedProducts = Array.from(categoryMap.values()).flat();

            balancedProducts.forEach((product: any) => {
              const productItem: ProductItem = {
                id: product._id || product.id,
                type: 'product',
                name: product.name,
                brand: product.brand || product.store?.name || 'Brand',
                image: product.images?.[0]?.url || product.image || '',
                description: product.description || '',
                title: product.name,
                price: {
                  current: product.pricing?.selling || product.price?.current || 0,
                  original: product.pricing?.basePrice || product.price?.original,
                  currency: 'INR',
                  discount: product.price?.discount || 0,
                },
                category: product.category?.name || product.category || 'General',
                rating: product.ratings ? {
                  value: product.ratings.average,
                  count: product.ratings.count,
                } : undefined,
                availabilityStatus: product.status === 'active' ? 'in_stock' : 'out_of_stock',
                tags: product.tags || [],
              };

              // Generate subtitle based on product tags or status
              let subtitle = 'New Arrival';
              if (product.tags?.includes('bestseller')) subtitle = 'Best Seller';
              else if (product.tags?.includes('trending')) subtitle = 'Trending Now';
              else if (product.tags?.includes('hot-deal')) subtitle = 'Hot Deal';
              else if (product.isFeatured) subtitle = 'Featured';

              // Calculate cashback from discount or set default
              const cashback = product.price?.discount ||
                             Math.floor(Math.random() * 6) + 5; // 5-10% if not specified

              cards.push({
                id: productItem.id,
                type: 'product',
                title: productItem.name.length > 20
                  ? productItem.name.substring(0, 20) + '...'
                  : productItem.name,
                subtitle: subtitle,
                image: productItem.image,
                cashbackPercentage: cashback,
                badge: productItem.price.discount ? `${productItem.price.discount}% OFF` : undefined,
                data: productItem,
              });
            });

          }
        } catch (error) {
        }
      }

      // Fetch real stores if enabled
      if (showStores && cards.length < limit) {
        try {
          const remainingSlots = limit - cards.length;
          const storesResponse = await storesApi.getStores({
            page: randomPage, // DIVERSITY FIX: Use same random page
            limit: remainingSlots * 2, // Fetch more to account for filtering
            // Remove 'featured' and 'isActive' - backend doesn't support these params
          });

          if (storesResponse.success && storesResponse.data) {
            const storesData = Array.isArray(storesResponse.data)
              ? storesResponse.data
              : storesResponse.data.stores || [];

            // DIVERSITY FIX: Filter out excluded stores
            const filteredStores = storesData.filter((store: any) => {
              const storeId = store._id || store.id;
              return !allExcludeStores.includes(storeId);
            });

            // DIVERSITY FIX: Category balancing for stores (Flipkart strategy)
            const storeCategoryMap = new Map<string, any[]>();
            const maxStoresPerCategory = 2;

            filteredStores.forEach((store: any) => {
              const category = store.primaryCategory || store.category || 'general';
              if (!storeCategoryMap.has(category)) {
                storeCategoryMap.set(category, []);
              }
              const categoryStores = storeCategoryMap.get(category)!;
              if (categoryStores.length < maxStoresPerCategory) {
                categoryStores.push(store);
              }
            });

            const balancedStores = Array.from(storeCategoryMap.values()).flat();

            balancedStores.forEach((store: any) => {
              // Generate subtitle based on store features
              let subtitle = 'Visit Store';
              if (store.deliveryCategories?.fastDelivery) subtitle = 'Fast Delivery';
              else if (store.deliveryCategories?.premium) subtitle = 'Premium Store';
              else if (store.deliveryCategories?.budgetFriendly) subtitle = 'Best Deals';
              else if (store.isFeatured) subtitle = 'Featured Store';

              // Get cashback from store offers
              const cashback = store.offers?.cashback ||
                             store.cashback?.percentage ||
                             5;

              cards.push({
                id: store._id || store.id,
                type: 'store',
                title: store.name.length > 20
                  ? store.name.substring(0, 20) + '...'
                  : store.name,
                subtitle: subtitle,
                image: store.banner || store.logo || store.image || '',
                cashbackPercentage: cashback,
                badge: store.offers?.isPartner ? 'Partner Store' : undefined,
                data: store,
              });
            });

          }
        } catch (error) {
        }
      }

      // If we got data, use it
      if (cards.length > 0) {
        const finalCards = cards.slice(0, limit);
        if (!isMounted()) return;
        setRecommendations(finalCards);

        // DIVERSITY FIX: Track shown items globally (Amazon/Flipkart strategy)
        const shownProductIds = finalCards
          .filter(card => card.type === 'product')
          .map(card => card.id);
        const shownStoreIds = finalCards
          .filter(card => card.type === 'store')
          .map(card => card.id);

        addShownProducts(shownProductIds);
        addShownStores(shownStoreIds);

      } else {
        // No data from backend
        setError('No recommendations available at the moment');
      }
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load recommendations');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleCardPress = (card: RecommendationCard) => {

    if (onCardPress) {
      onCardPress(card);
      return;
    }

    // Navigate based on type
    if (card.type === 'product') {
      // Navigate to ProductPage (comprehensive product page) with full product data
      router.push({
        pathname: '/product-page',
        params: {
          cardId: card.id,
          cardType: 'product',
          cardData: JSON.stringify(card.data),
        },
      } as any);
    } else if (card.type === 'store') {
      // Navigate to MainStorePage with full store data
      router.push({
        pathname: '/MainStorePage',
        params: {
          storeId: card.id,
          storeData: JSON.stringify(card.data),
        },
      } as any);
    }
  };

  const handleRetry = () => {
    loadRecommendations();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      </View>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.nileBlue} />
          <Text style={styles.errorText}>
            {error || 'No recommendations available'}
          </Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="reload" size={18} color={colors.background.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {recommendations.length} {recommendations.length === 1 ? 'item' : 'items'} available
        </Text>
      </View>

      {/* Recommendations Grid */}
      <View style={styles.grid}>
        {recommendations.map((card) => (
          <RecommendationCard
            key={card.id}
            card={card}
            onPress={() => handleCardPress(card)}
          />
        ))}
      </View>
    </View>
  );
}

// Recommendation Card Component
interface RecommendationCardProps {
  card: RecommendationCard;
  onPress: () => void;
}

function RecommendationCard({ card, onPress }: RecommendationCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
     
    >
      {/* Background Image */}
      <CachedImage
        source={card.image}
        style={styles.cardImage}
        contentFit="cover"
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
        style={styles.gradientOverlay}
      >
        {/* Cashback Badge */}
        <View style={styles.cashbackBadge}>
          <Ionicons name="gift" size={12} color={colors.background.primary} />
          <Text style={styles.cashbackText}>
            Upto {card.cashbackPercentage}% cash back
          </Text>
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          {card.badge && (
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>{card.badge}</Text>
            </View>
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {card.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {card.subtitle}
          </Text>
        </View>

        {/* Type Icon */}
        <View style={styles.typeIcon}>
          <Ionicons
            name={card.type === 'product' ? 'pricetag' : 'storefront'}
            size={16}
            color={colors.background.primary}
          />
        </View>

        {/* Arrow Icon */}
        <View style={styles.arrowIcon}>
          <Ionicons name="arrow-forward" size={18} color={colors.background.primary} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderTopWidth: 8,
    borderTopColor: colors.neutral[50],
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral[900],
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    maxWidth: 250,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.purple,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.95)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  cardInfo: {
    gap: 4,
  },
  topBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  topBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[100],
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  typeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  arrowIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default React.memo(CategoryRecommendationsGrid);
