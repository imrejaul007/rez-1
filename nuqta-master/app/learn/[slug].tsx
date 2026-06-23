import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import learningApi, { LearningContent } from '@/services/learningApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

const LearnDetailPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [content, setContent] = useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  // Track time spent on this page
  const startTimeRef = useRef(Date.now());

  const fetchContent = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError('');
      const response = await learningApi.getContentBySlug(slug);
      if (response?.data?.content) {
        if (!isMounted()) return;
        setContent(response.data.content);
      } else {
        if (!isMounted()) return;
        setError('Content not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load content');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchContent();
    startTimeRef.current = Date.now();
  }, [fetchContent]);

  const handleComplete = async () => {
    if (!content || content.rewardClaimed || completing) return;

    const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const minRequired = Math.ceil(content.estimatedMinutes * 60 * 0.3);

    if (timeSpentSeconds < minRequired) {
      const remaining = minRequired - timeSpentSeconds;
      platformAlertSimple(
        'Keep Reading',
        `Please spend at least ${remaining} more seconds on this content to earn your reward.`
      );
      return;
    }

    try {
      setCompleting(true);
      const response = await learningApi.completeContent(content._id, timeSpentSeconds);
      const result = response?.data;

      if (result?.alreadyClaimed) {
        platformAlertSimple('Already Claimed', 'You have already earned the reward for this content.');
      } else if (result?.coinsAwarded && result.coinsAwarded > 0) {
        platformAlertSimple('Reward Earned!', `You earned ${result.coinsAwarded} coins!`);
      } else {
        platformAlertSimple('Completed', 'Content marked as completed.');
      }

      // Refresh to update completion state
      await fetchContent();
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to complete content');
    } finally {
      if (!isMounted()) return;
      setCompleting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      'coin-system': 'Coin System',
      'earning-tips': 'Earning Tips',
      'platform-guide': 'Platform Guide',
      'coin-types': 'Coin Types',
    };
    return labels[cat] || cat;
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'coin-system': Colors.info,
      'earning-tips': Colors.success,
      'platform-guide': Colors.brand.purpleLight,
      'coin-types': Colors.warning,
    };
    return colors[cat] || Colors.text.tertiary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !content) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Content not found'}</Text>
        <Pressable style={styles.retryButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const catColor = getCategoryColor(content.category);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Learn</Text>
        </View>
        <View style={styles.headerRight}>
          {content.rewardClaimed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>
            {getCategoryLabel(content.category)}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.contentTitle}>{content.title}</Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.metaText}>{content.estimatedMinutes} min read</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="gift-outline" size={16} color={Colors.warning} />
            <Text style={styles.metaText}>{content.coinReward} coins</Text>
          </View>
          {content.contentType === 'video' && (
            <View style={styles.metaItem}>
              <Ionicons name="videocam-outline" size={16} color={Colors.brand.purpleLight} />
              <Text style={styles.metaText}>Video</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body Content - Rendered as plain text paragraphs */}
        {content.body ? (
          <View style={styles.bodyContainer}>
            {content.body.split('\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return <View key={idx} style={styles.paragraphSpacer} />;

              // Heading detection (markdown-style)
              if (trimmed.startsWith('### ')) {
                return (
                  <Text key={idx} style={styles.heading3}>
                    {trimmed.replace('### ', '')}
                  </Text>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <Text key={idx} style={styles.heading2}>
                    {trimmed.replace('## ', '')}
                  </Text>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <Text key={idx} style={styles.heading1}>
                    {trimmed.replace('# ', '')}
                  </Text>
                );
              }

              // Bullet points
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bullet}>{'\u2022'}</Text>
                    <Text style={styles.bulletText}>{trimmed.slice(2)}</Text>
                  </View>
                );
              }

              // Regular paragraph
              return (
                <Text key={idx} style={styles.paragraph}>
                  {trimmed}
                </Text>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noContent}>No content available yet.</Text>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {content.rewardClaimed ? (
          <View style={styles.claimedBar}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.claimedText}>
              Completed - {content.coinReward} coins earned
            </Text>
          </View>
        ) : (
          <Pressable
            style={[styles.completeButton, completing && styles.completeButtonDisabled]}
            onPress={handleComplete}
            disabled={completing}
          >
            <LinearGradient
              colors={[Colors.info, Colors.info]}
              style={styles.completeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {completing ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Ionicons name="gift-outline" size={20} color={Colors.text.inverse} />
                  <Text style={styles.completeText}>
                    Mark Complete & Earn {content.coinReward} Coins
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.info,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  completedBadge: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  categoryText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  contentTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 32,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background.secondary,
    marginBottom: Spacing.lg,
  },
  bodyContainer: {
    gap: Spacing.xs,
  },
  paragraphSpacer: {
    height: 12,
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  heading2: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  bullet: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginRight: Spacing.sm,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  paragraph: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  noContent: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 40,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  claimedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.successScale[50],
  },
  claimedText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.success,
  },
  completeButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  completeText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(LearnDetailPage, 'LearnSlug');
