// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// ArticleDetailScreen.tsx - Modern Article Reader with Markdown Support
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
  ScrollView,
  StatusBar,
  Share,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartActions, useGetCurrencySymbol } from '@/stores/selectors';
import { DiscoverArticle, DiscoverProduct } from '@/types/discover.types';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ReZ Brand Colors

// Simple Markdown-like content renderer
const renderContent = (content: string) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} style={markdownStyles.list}>
          {listItems.map((item, idx) => (
            <View key={idx} style={markdownStyles.listItem}>
              <Text style={markdownStyles.bullet}>•</Text>
              <Text style={markdownStyles.listText}>{parseBoldText(item)}</Text>
            </View>
          ))}
        </View>
      );
      listItems = [];
    }
    inList = false;
  };

  // Parse bold text within a string
  const parseBoldText = (text: string): React.ReactNode => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return text;

    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <Text key={idx} style={markdownStyles.bold}>{part}</Text>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      flushList();
      elements.push(<View key={`space-${index}`} style={markdownStyles.spacer} />);
      return;
    }

    // H1 - Main heading
    if (trimmedLine.startsWith('# ')) {
      flushList();
      const text = trimmedLine.substring(2);
      elements.push(
        <Text key={`h1-${index}`} style={markdownStyles.h1}>{text}</Text>
      );
      return;
    }

    // H2 - Section heading
    if (trimmedLine.startsWith('## ')) {
      flushList();
      const text = trimmedLine.substring(3);
      elements.push(
        <Text key={`h2-${index}`} style={markdownStyles.h2}>{text}</Text>
      );
      return;
    }

    // H3 - Subsection heading
    if (trimmedLine.startsWith('### ')) {
      flushList();
      const text = trimmedLine.substring(4);
      elements.push(
        <Text key={`h3-${index}`} style={markdownStyles.h3}>{text}</Text>
      );
      return;
    }

    // List item
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      inList = true;
      listItems.push(trimmedLine.substring(2));
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmedLine)) {
      inList = true;
      listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <Text key={`p-${index}`} style={markdownStyles.paragraph}>
        {parseBoldText(trimmedLine)}
      </Text>
    );
  });

  // Flush any remaining list
  flushList();

  return elements;
};

const markdownStyles = StyleSheet.create({
  h1: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    lineHeight: 32,
  },
  h2: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.lg,
    marginBottom: 10,
    lineHeight: 28,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  paragraph: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  bold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  list: {
    marginVertical: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingRight: Spacing.base,
  },
  bullet: {
    ...Typography.bodyLarge,
    color: Colors.success,
    marginRight: 10,
    fontWeight: '700',
  },
  listText: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  spacer: {
    height: 8,
  },
});

function ArticleDetailScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // State
  const [article, setArticle] = useState<DiscoverArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Engagement state
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Contexts
  const { addItem } = useCartActions();

  // Parse params
  useEffect(() => {
    if (params.item && typeof params.item === 'string') {
      try {
        const parsedItem = JSON.parse(params.item) as DiscoverArticle;
        setArticle(parsedItem);
        setLikesCount(parsedItem.engagement?.likes || 0);
        setLoading(false);
      } catch (err) {
        setError('Failed to load article');
        setLoading(false);
      }
    } else {
      setError('No article data provided');
      setLoading(false);
    }
  }, [params.item]);

  // Handle like toggle
  const handleLike = useCallback(() => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
  }, [isLiked]);

  // Handle bookmark toggle
  const handleBookmark = useCallback(() => {
    setIsBookmarked(prev => !prev);
  }, []);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!article) return;
    try {
      await Share.share({
        message: `Check out this article on ${BRAND.APP_NAME}: ${article.title}`,
        title: article.title,
      });
    } catch (error) {
      // silently handle
    }
  }, [article]);

  // Navigate to product
  const handleProductPress = useCallback((product: DiscoverProduct) => {
    router.push(`/product-page?cardId=${product._id}&cardType=product&source=article`);
  }, [router]);

  // Add to cart
  const handleAddToCart = useCallback(async (product: DiscoverProduct) => {
    try {
      await addItem({ productId: product._id, quantity: 1 });
    } catch (error) {
      // silently handle
    }
  }, [addItem]);

  // Format count
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get author display info
  const getAuthorInfo = useMemo(() => {
    if (!article?.author) return { name: '', avatar: null };
    const name = article.author.name || article.author.username || '';
    const rawAvatar = article.author.avatar || article.author.profile?.avatar;
    const avatar = rawAvatar && !rawAvatar.includes('ui-avatars.com') ? rawAvatar : null;
    return { name, avatar };
  }, [article]);

  // Get image URL - skip if it looks like a video
  const imageUrl = useMemo(() => {
    if (!article?.featuredImage) return null;
    const url = article.featuredImage;
    // Skip video URLs
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('video')) {
      return null;
    }
    return url;
  }, [article]);

  const hasProducts = article?.products && article.products.length > 0;

  // Rendered content
  const renderedContent = useMemo(() => {
    if (!article) return null;
    // Combine excerpt and content
    const fullContent = [article.excerpt, article.content].filter(Boolean).join('\n\n');
    return renderContent(fullContent);
  }, [article]);

  // Deep-link parameter validation guard
  if (!params.item || typeof params.item !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (error || !article) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>{error || 'Article not found'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Floating Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
         
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerButton}
            onPress={handleBookmark}
           
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isBookmarked ? Colors.gold : Colors.text.primary}
            />
          </Pressable>
          <Pressable
            style={styles.headerButton}
            onPress={handleShare}
           
          >
            <Ionicons name="share-outline" size={22} color={Colors.text.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Featured Image */}
        {imageUrl && (
          <View style={styles.imageContainer}>
            {!imageLoaded && !imageError && (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator size="large" color={Colors.info} />
              </View>
            )}
            {!imageError && (
              <CachedImage
                source={imageUrl}
                style={[styles.featuredImage, !imageLoaded && styles.hiddenImage]}
                contentFit="cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageLoaded(true);
                  setImageError(true);
                }}
              />
            )}
            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.imageGradient}
            />
          </View>
        )}

        {/* Article Content */}
        <View style={styles.contentContainer}>
          {/* Category Badge */}
          <View style={styles.categoryRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{article.category}</Text>
            </View>
            {article.readTime && (
              <View style={styles.readTimeBadge}>
                <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                <Text style={styles.readTimeText}>{article.readTime} min read</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Author & Date Row */}
          <View style={styles.authorRow}>
            {getAuthorInfo.avatar && (
              <CachedImage source={getAuthorInfo.avatar} style={styles.authorAvatar} />
            )}
            <View style={styles.authorInfo}>
              {getAuthorInfo.name ? (
                <Text style={styles.authorName}>{getAuthorInfo.name}</Text>
              ) : null}
              <Text style={styles.dateText}>
                {formatDate(article.publishedAt || article.createdAt)}
              </Text>
            </View>
          </View>

          {/* Engagement Stats */}
          <View style={styles.statsRow}>
            <Pressable style={styles.statItem} onPress={handleLike}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? colors.error : Colors.text.tertiary}
              />
              <Text style={styles.statText}>{formatCount(likesCount)}</Text>
            </Pressable>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color={Colors.text.tertiary} />
              <Text style={styles.statText}>{formatCount(article.engagement?.views || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bookmark-outline" size={20} color={Colors.text.tertiary} />
              <Text style={styles.statText}>{formatCount(article.engagement?.bookmarks || 0)}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Article Body - Rendered Markdown */}
          <View style={styles.articleBody}>
            {renderedContent}
          </View>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsSectionTitle}>Related Topics</Text>
              <View style={styles.tagsContainer}>
                {article.tags.map((tag, index) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Products Section */}
          {hasProducts && (
            <View style={styles.productsSection}>
              <View style={styles.productsSectionHeader}>
                <Ionicons name="bag-handle" size={22} color={Colors.success} />
                <Text style={styles.productsSectionTitle}>Shop Featured Products</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsScrollContainer}
              >
                {article.products.map((product, index) => (
                  <Pressable
                    key={product._id || index}
                    style={styles.productCard}
                    onPress={() => handleProductPress(product)}
                   
                  >
                    <CachedImage
                      source={product.image || product.images?.[0]}
                      style={styles.productImage}
                      contentFit="cover"
                    />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name || product.title}
                      </Text>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>
                          {currencySymbol}{product.salePrice || product.price}
                        </Text>
                        {product.salePrice && product.price > product.salePrice && (
                          <Text style={styles.productOriginalPrice}>
                            {currencySymbol}{product.price}
                          </Text>
                        )}
                      </View>
                      {product.cashbackPercent && product.cashbackPercent > 0 && (
                        <View style={styles.cashbackBadge}>
                          <Text style={styles.cashbackText}>
                            {product.cashbackPercent}% Cashback
                          </Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      style={styles.addToCartButton}
                      onPress={() => handleAddToCart(product)}
                     
                    >
                      <Ionicons name="add" size={20} color={Colors.text.inverse} />
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  backButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.info,
    borderRadius: BorderRadius['2xl'],
  },
  backButtonText: {
    color: Colors.background.primary,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 220,
    backgroundColor: Colors.background.secondary,
    position: 'relative',
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    zIndex: 10,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[200],
  },
  hiddenImage: {
    opacity: 0,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  categoryBadge: {
    backgroundColor: Colors.info,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  categoryBadgeText: {
    color: Colors.background.primary,
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readTimeText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.nileBlue,
    lineHeight: 34,
    marginBottom: Spacing.base,
    letterSpacing: -0.3,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: Spacing.lg,
  },
  articleBody: {
    marginBottom: Spacing.xl,
  },
  tagsSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tagsSectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  tagText: {
    ...Typography.bodySmall,
    color: Colors.info,
    fontWeight: '500',
  },
  productsSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  productsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    gap: 10,
  },
  productsSectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  productsScrollContainer: {
    gap: Spacing.md,
  },
  productCard: {
    width: 160,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.background.secondary,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 6,
    lineHeight: 18,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  productPrice: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.success,
  },
  productOriginalPrice: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  cashbackBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.success,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 60,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

export default withErrorBoundary(ArticleDetailScreen, 'ArticleDetailScreen');
