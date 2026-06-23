import React, { useState, useEffect, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import learningApi, { LearningContent } from '@/services/learningApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ============================================
// EXPLAINER VIDEO CONFIG
// Replace this URL with the real explainer video
// ============================================
const EXPLAINER_VIDEO = {
  // YouTube video ID — replace with real explainer video ID
  youtubeId: 'ScMzIvxBSi4',
  title: `What is ${BRAND.APP_NAME}?`,
  description: `Watch this quick explainer to learn how ${BRAND.APP_NAME} helps you earn coins on every purchase.`,
};

// ============================================
// VIDEO EMBED (Web: iframe, Native: opens YouTube)
// ============================================

function ExplainerVideo() {
  const embedUrl = `https://www.youtube.com/embed/${EXPLAINER_VIDEO.youtubeId}?rel=0&modestbranding=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${EXPLAINER_VIDEO.youtubeId}`;

  const handleOpenVideo = useCallback(() => {
    Linking.openURL(watchUrl).catch(() => {});
  }, [watchUrl]);

  return (
    <View style={styles.videoSection}>
      <Text style={styles.videoTitle}>{EXPLAINER_VIDEO.title}</Text>
      <Text style={styles.videoDescription}>{EXPLAINER_VIDEO.description}</Text>

      {Platform.OS === 'web' ? (
        <View style={styles.videoWrapper}>
          <iframe
            src={embedUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 12,
            } as any}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={EXPLAINER_VIDEO.title}
          />
        </View>
      ) : (
        <Pressable
          style={styles.videoThumbnail}
          onPress={handleOpenVideo}
         
        >
          <View style={styles.playButtonContainer}>
            <Ionicons name="play-circle" size={56} color={colors.background.primary} />
          </View>
          <Text style={styles.tapToWatchText}>Tap to watch on YouTube</Text>
        </Pressable>
      )}
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const LearnMaximiseSection = () => {
  const router = useRouter();
  const [content, setContent] = useState<LearningContent[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await learningApi.getContent();
        if (response?.data?.content) {
          if (!isMounted()) return;
          setContent(response.data.content);
        }
      } catch (err) {
        // Silent fail - section shows explainer video regardless
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const navigateToContent = (slug: string) => {
    router.push(`/learn/${slug}` as any);
  };

  const completedCount = content.filter(c => c.rewardClaimed).length;
  const totalCoins = content.reduce((sum, c) => sum + c.coinReward, 0);
  const earnedCoins = content
    .filter(c => c.rewardClaimed)
    .reduce((sum, c) => sum + c.coinReward, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.tint.blue, colors.tint.purpleLight]}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={28} color={colors.infoScale[400]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Learn & Maximise</Text>
            <Text style={styles.subtitle}>
              {loading
                ? 'Loading...'
                : content.length > 0
                  ? `${completedCount}/${content.length} completed \u00B7 ${earnedCoins}/${totalCoins} coins`
                  : 'Become an earning pro'
              }
            </Text>
          </View>
        </View>

        {/* Explainer Video — always visible */}
        <ExplainerVideo />

        {/* Topics List (from API, if any) */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.infoScale[400]} />
          </View>
        ) : content.length > 0 ? (
          <View style={styles.topicsList}>
            {content.map((item) => (
              <Pressable
                key={item._id}
                style={styles.topicItem}
                onPress={() => navigateToContent(item.slug)}
              >
                <View style={styles.topicLeft}>
                  {item.rewardClaimed ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.successScale[400]} />
                  ) : (
                    <Ionicons
                      name={item.contentType === 'video' ? 'videocam-outline' : 'document-text-outline'}
                      size={18}
                      color={colors.neutral[500]}
                    />
                  )}
                  <Text
                    style={[
                      styles.topicTitle,
                      item.rewardClaimed && styles.topicTitleCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </View>
                <View style={styles.topicRight}>
                  {!item.rewardClaimed && (
                    <Text style={styles.coinBadge}>+{item.coinReward}</Text>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.infoScale[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  // ---- Video Section ----
  videoSection: {
    marginBottom: 16,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 12,
    lineHeight: 18,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  videoThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playButtonContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToWatchText: {
    fontSize: 13,
    color: colors.neutral[300],
    marginTop: 10,
    fontWeight: '500',
  },

  // ---- Loading ----
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // ---- Topics List ----
  topicsList: {
    gap: 8,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.neutral[50],
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  topicTitle: {
    fontSize: 14,
    color: colors.neutral[800],
    fontWeight: '500',
    flex: 1,
  },
  topicTitleCompleted: {
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  topicRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[400],
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});

export default React.memo(LearnMaximiseSection);
