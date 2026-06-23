// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { IWhatsNewStory } from '@/types/whatsNew.types';
import whatsNewApi from '@/services/whatsNewApi';
import CachedImage from '@/components/ui/CachedImage';
import { useIsMounted } from '@/hooks/useIsMounted';
import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEWED_KEY = '@whats_new_viewed_ids';
const CIRCLE_SIZE = 56;
const RING_SIZE = CIRCLE_SIZE + 6;

interface StoriesRowProps {
  variant?: 'green' | 'blue' | 'gold';
}

const RING_COLORS: Record<string, [string, string]> = {
  green: ['#10B981', '#059669'],
  blue: ['#0EA5E9', '#0C4A6E'],
  gold: ['#F59E0B', '#92400E'],
};
const SEEN_COLOR = '#D1D5DB';

const StoriesRow: React.FC<StoriesRowProps> = ({ variant = 'green' }) => {
  const router = useRouter();
  const isMounted = useIsMounted();
  const [stories, setStories] = useState<IWhatsNewStory[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const unseenColors = RING_COLORS[variant] || RING_COLORS.green;

  const loadViewedIds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(VIEWED_KEY);
      if (stored) setViewedIds(new Set(JSON.parse(stored)));
    } catch { /* non-blocking */ }
  }, []);

  const markAsViewed = useCallback(async (id: string) => {
    setViewedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(VIEWED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      await loadViewedIds();
      try {
        const res = await whatsNewApi.getStories(true);
        if (!isMounted()) return;
        if (res.success && res.data?.length > 0) {
          setStories(res.data);
        }
      } catch { /* non-blocking */ }
      finally {
        if (isMounted()) setLoading(false);
      }
    };
    load();
  }, [loadViewedIds, isMounted]);

  if (loading && stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={unseenColors[0]} />
      </View>
    );
  }

  if (!loading && stories.length === 0) return null;

  const handlePress = (story: IWhatsNewStory, index: number) => {
    markAsViewed(story._id);
    router.push(`/whats-new?startIndex=${index}` as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((story, index) => {
          const isViewed = viewedIds.has(story._id);
          const isEmoji = story.icon && !story.icon.startsWith('http');

          return (
            <Pressable
              key={story._id}
              onPress={() => handlePress(story, index)}
              style={styles.storyItem}
            >
              {/* Ring — gradient if unseen, grey if seen */}
              <View style={[
                styles.ringOuter,
                isViewed && { backgroundColor: SEEN_COLOR },
              ]}>
                {!isViewed && (
                  <LinearGradient
                    colors={unseenColors}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}

                {/* White gap between ring and circle */}
                <View style={styles.ringInner}>
                  {/* Story circle */}
                  <View style={[
                    styles.circleContent,
                    { backgroundColor: story.slides?.[0]?.backgroundColor || '#1a3a52' },
                  ]}>
                    {isEmoji ? (
                      <Text style={styles.emojiIcon}>{story.icon}</Text>
                    ) : (
                      <CachedImage
                        source={{ uri: story.icon }}
                        style={styles.circleImage}
                        contentFit="cover"
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Label */}
              <Text
                numberOfLines={2}
                style={[
                  styles.label,
                  isViewed && styles.labelViewed,
                ]}
              >
                {story.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  loadingContainer: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 14,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    gap: 4,
    width: RING_SIZE + 8,
  },
  ringOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    padding: 2.5,
    overflow: 'hidden',
  },
  ringInner: {
    flex: 1,
    borderRadius: (CIRCLE_SIZE / 2) + 1,
    backgroundColor: 'white',
    padding: 2,
  },
  circleContent: {
    flex: 1,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  emojiIcon: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    width: RING_SIZE + 8,
  },
  labelViewed: {
    color: '#9CA3AF',
  },
});

export default React.memo(StoriesRow);
