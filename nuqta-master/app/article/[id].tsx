// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { ThemedText } from '@/components/ThemedText';
import { Article } from '@/types/article.types';
import articlesService from '@/services/articlesApi';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ArticleDetailPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const isCreateMode = id === 'create';
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(!isCreateMode);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Fetch article from backend
  useEffect(() => {
    if (!isCreateMode && id) {
      fetchArticle();
    }
  }, [id, isCreateMode]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      const [response, engagementRes] = await Promise.all([
        articlesService.getArticleById(id as string),
        articlesService.getArticleEngagement(id as string).catch(() => null),
      ]);

      if (response.success && response.data.article) {
        if (!isMounted()) return;
        setArticle(response.data.article as any);
        if (engagementRes?.success && engagementRes.data?.userInteraction) {
          setIsLiked(engagementRes.data.userInteraction.liked);
          setIsBookmarked(engagementRes.data.userInteraction.bookmarked);
        }
      } else {
        if (!isMounted()) return;
        setError('Article not found');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load article');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.brand.purpleLight, colors.brand.purpleMedium, '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}

            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Article</ThemedText>
            </View>
          </View>
        </LinearGradient>
        <DetailPageSkeleton />
      </View>
    );
  }

  // Error or not found state
  if (!article && !isCreateMode) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.brand.purpleLight, colors.brand.purpleMedium, '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Article</ThemedText>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color={Colors.border.default} />
          <ThemedText style={styles.errorTitle}>{error || 'Article not found'}</ThemedText>
          <ThemedText style={styles.errorSubtitle}>
            The article you're looking for doesn't exist or has been removed.
          </ThemedText>
          <Pressable
            style={styles.backToListButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purpleMedium]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.backToListGradient}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text.inverse} />
              <ThemedText style={styles.backToListText}>Go Back</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating Back Button */}
      <Pressable
        style={styles.floatingBackButton}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
       
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)']}
          style={styles.floatingBackGradient}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </LinearGradient>
      </Pressable>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Cover Image */}
        {article?.coverImage && (
          <View style={styles.heroImageContainer}>
            <CachedImage
              source={article.coverImage}
              style={styles.heroImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
              style={styles.heroGradient}
            />
          </View>
        )}

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Category Badge */}
          {article?.category && (
            <View style={styles.categoryBadge}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                style={styles.categoryBadgeGradient}
              >
                <ThemedText style={styles.categoryText}>
                  {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                </ThemedText>
              </LinearGradient>
            </View>
          )}

          {/* Title */}
          <ThemedText style={styles.articleTitle}>{article?.title}</ThemedText>

          {/* Author & Meta Info */}
          {article?.author && (
            <View style={styles.authorSection}>
              <View style={styles.authorContainer}>
                {article.author.avatar ? (
                  <CachedImage
                    source={article.author.avatar}
                    style={styles.authorAvatar}
                  />
                ) : (
                  <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={20} color={Colors.brand.purpleLight} />
                  </View>
                )}
                <View style={styles.authorInfo}>
                  <ThemedText style={styles.authorName}>
                    {article.author.name}
                  </ThemedText>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                    <ThemedText style={styles.metaText}>
                      {article.readTime || '5 min read'}
                    </ThemedText>
                    <ThemedText style={styles.metaDot}>•</ThemedText>
                    <Ionicons name="eye-outline" size={14} color={Colors.text.tertiary} />
                    <ThemedText style={styles.metaText}>{article.viewCount}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.actionButton}
                  onPress={async () => {
                    if (!article) return;
                    const prevLiked = isLiked;
                    setIsLiked(!prevLiked);
                    try {
                      const res = await articlesService.toggleArticleLike(id as string);
                      if (res.success && res.data) {
                        setIsLiked(res.data.liked);
                      }
                    } catch {
                      setIsLiked(prevLiked);
                    }
                  }}
                >
                  <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={Colors.error} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={async () => {
                    if (!article) return;
                    const prevBookmarked = isBookmarked;
                    setIsBookmarked(!prevBookmarked);
                    try {
                      const res = await articlesService.toggleArticleBookmark(id as string);
                      if (res.success && res.data) {
                        setIsBookmarked(res.data.bookmarked);
                      }
                    } catch {
                      setIsBookmarked(prevBookmarked);
                    }
                  }}
                >
                  <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={Colors.brand.purpleLight} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={async () => {
                    if (!article) return;
                    try {
                      await Share.share({
                        message: article.title,
                        url: (article as any).url || '',
                      });
                      articlesService.shareArticle(id as string).catch(() => {});
                    } catch {
                      // user cancelled or share failed
                    }
                  }}
                >
                  <Ionicons name="share-social-outline" size={24} color={Colors.info} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Article Content with Markdown Rendering */}
          {article?.content && (
            <View style={styles.contentSection}>
              <MarkdownRenderer content={article.content} />
            </View>
          )}

          {/* Tags */}
          {article?.tags && article.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsDivider} />
              <ThemedText style={styles.tagsLabel}>Related Topics</ThemedText>
              <View style={styles.tagsContainer}>
                {article.tags.map((tag, index) => (
                  <Pressable key={tag} style={styles.tag}>
                    <Ionicons name="pricetag" size={14} color={Colors.brand.purpleLight} />
                    <ThemedText style={styles.tagText}>
                      {tag.replace(/-/g, ' ')}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
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
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: Spacing.base,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingBackGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  articleContainer: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: -24,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  categoryBadgeGradient: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  categoryText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.brand.purpleLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  articleTitle: {
    ...Typography.display,
    color: Colors.text.primary,
    lineHeight: 40,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  authorSection: {
    marginBottom: Spacing.xl,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  metaDot: {
    ...Typography.bodySmall,
    color: Colors.border.default,
    marginHorizontal: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginBottom: Spacing.xl,
  },
  contentSection: {
    marginBottom: Spacing['2xl'],
  },
  tagsSection: {
    marginBottom: Spacing.xl,
  },
  tagsDivider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginBottom: Spacing.xl,
  },
  tagsLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  tagText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
    textTransform: 'capitalize',
  },
  bottomSpacing: {
    height: 40,
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
  errorSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backToListButton: {
    width: 200,
    height: 50,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  backToListGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backToListText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(ArticleDetailPage, 'ArticleId');
