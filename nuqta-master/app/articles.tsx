// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Article } from '@/types/article.types';
import ArticleCard from '@/components/playPage/ArticleCard';
import articlesService from '@/services/articlesApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function ArticlesPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Backend state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const categories = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
    { id: 'beauty', label: 'Beauty', icon: 'sparkles-outline' },
    { id: 'lifestyle', label: 'Lifestyle', icon: 'home-outline' },
    { id: 'tech', label: 'Tech', icon: 'phone-portrait-outline' },
  ];

  // Fetch articles from backend
  const fetchArticles = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(undefined);

      const response = await articlesService.getArticles({
        page: 1,
        limit: 50,
        sortBy: 'newest',
        isPublished: true,
        category: selectedCategory === 'all' ? undefined : selectedCategory as any,
      });

      if (response.success && response.data.articles) {
        if (!isMounted()) return;
        setArticles(response.data.articles);
      } else {
        throw new Error(response.message || 'Failed to fetch articles');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load articles');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedCategory]);

  // Fetch on mount and when category changes
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles(true);
  }, [fetchArticles]);

  // Filter articles based on search
  const filteredArticles = useMemo(() => articles.filter((article) => {
    const matchesSearch = article.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }), [articles, searchQuery]);

  const handleArticlePress = useCallback((article: Article) => {
    router.push(`/article/${article.id}`);
  }, [router]);

  const handleCreateArticle = useCallback(() => {
    router.push('/article/create');
  }, [router]);

  const renderArticleCard = useCallback(({ item }: { item: Article }) => (
    <View style={{ width: CARD_WIDTH }}>
      <ArticleCard
        article={item}
        onPress={handleArticlePress}
      />
    </View>
  ), [handleArticlePress]);

  return (
    <View style={styles.container}>
      {/* Animated Header with Glassmorphism */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, colors.brand.purpleMedium, '#C084FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              {/* Back Button */}
              <Pressable
                style={styles.backButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
               
              >
                <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
              </Pressable>

              {/* Title */}
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>Articles</ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  {filteredArticles.length} articles
                </ThemedText>
              </View>

              {/* Create Button */}
              <Pressable
                style={styles.createButton}
               
                onPress={handleCreateArticle}
              >
                <Ionicons name="add" size={24} color={Colors.text.inverse} />
              </Pressable>
            </View>
          </BlurView>
        ) : (
          <View style={styles.headerContent}>
            {/* Back Button */}
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>

            {/* Title */}
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Articles</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                {filteredArticles.length} articles
              </ThemedText>
            </View>

            {/* Create Button */}
            <Pressable
              style={styles.createButton}
             
              onPress={handleCreateArticle}
            >
              <Ionicons name="add" size={24} color={Colors.text.inverse} />
            </Pressable>
          </View>
        )}
      </LinearGradient>

      {/* Search Bar with Glassmorphism */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.brand.purpleLight}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.categoryPill,
              selectedCategory === category.id && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
           
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={selectedCategory === category.id ? Colors.text.inverse : Colors.brand.purpleLight}
            />
            <ThemedText
              style={[
                styles.categoryPillText,
                selectedCategory === category.id && styles.categoryPillTextActive,
              ]}
            >
              {category.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Loading State */}
      {loading && (
        <CardGridSkeleton />
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Oops!</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchArticles()}
           
          >
            <LinearGradient
              colors={[Colors.brand.purpleLight, colors.brand.purpleMedium]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButtonGradient}
            >
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Articles Grid */}
      {!loading && !error && (
        <FlashList
          data={filteredArticles}
          renderItem={renderArticleCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={200}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.brand.purpleLight]}
              tintColor={Colors.brand.purpleLight}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                style={styles.emptyGradient}
              >
                <Ionicons name="document-text-outline" size={64} color="#C084FC" />
                <ThemedText style={styles.emptyTitle}>No Articles Found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Try adjusting your search or filters
                </ThemedText>
              </LinearGradient>
            </View>
          )}
        />
      )}


      {/* FAB for Create Article */}
      <Pressable
        style={styles.fab}
        onPress={handleCreateArticle}
       
      >
        <LinearGradient
          colors={[Colors.brand.purpleLight, colors.brand.purpleMedium, '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="create-outline" size={24} color="white" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.lg,
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerBlur: {
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.secondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    height: 50,
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  clearButton: {
    padding: Spacing.xs,
  },
  categoriesContainer: {
    maxHeight: 60,
    backgroundColor: Colors.background.secondary,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    gap: 10,
    paddingBottom: Spacing.md,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillActive: {
    backgroundColor: Colors.brand.purpleLight,
    borderColor: Colors.brand.purpleLight,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryPillText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  categoryPillTextActive: {
    color: Colors.text.inverse,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  gridContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: BorderRadius['2xl'],
    width: SCREEN_WIDTH - 64,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.tertiary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    width: 200,
    height: 50,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default withErrorBoundary(ArticlesPage, 'Articles');
