// @ts-nocheck
/**
 * TrendingHashtags Component
 * Horizontal scrollable trending hashtag chips
 * Adapted from Rez_v-2-main trending pattern
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import categoryMetadataApi, { TrendingHashtag } from '@/services/categoryMetadataApi';
import { getTrendingHashtagsForCategory } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface TrendingHashtagsProps {
  categorySlug: string;
  hashtags?: TrendingHashtag[];
  onHashtagPress?: (hashtag: TrendingHashtag) => void;
}

const HashtagChip = memo(({
  hashtag,
  onPress,
}: {
  hashtag: TrendingHashtag;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.hashtagChip, { backgroundColor: `${hashtag.color}12` }]}
    onPress={onPress}
   
    accessibilityLabel={`Trending ${hashtag.tag}`}
    accessibilityRole="button"
  >
    <Text style={[styles.hashtagText, { color: hashtag.color }]}>{hashtag.tag}</Text>
    {hashtag.trending && (
      <View style={styles.trendingIndicator}>
        <Ionicons name="trending-up" size={12} color={hashtag.color} />
      </View>
    )}
    <Text style={styles.countText}>{hashtag.count.toLocaleString()}</Text>
  </Pressable>
));

HashtagChip.displayName = 'HashtagChip';

const TrendingHashtags: React.FC<TrendingHashtagsProps> = ({
  categorySlug,
  hashtags,
  onHashtagPress,
}) => {
  const router = useRouter();
  const [apiHashtags, setApiHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (hashtags) {
      setApiHashtags(hashtags);
      setLoading(false);
      return;
    }

    const fetchHashtags = async () => {
      try {
        setLoading(true);
        const response = await categoryMetadataApi.getHashtags(categorySlug);
        if (response.success && response.data?.hashtags?.length > 0) {
          if (!isMounted()) return;
          setApiHashtags(response.data.hashtags);
        } else {
          // Fallback to dummy data if API returns empty
          const fallbackHashtags = getTrendingHashtagsForCategory(categorySlug);
          setApiHashtags(fallbackHashtags);
        }
      } catch (err) {
        // Fallback to dummy data on error
        const fallbackHashtags = getTrendingHashtagsForCategory(categorySlug);
        if (!isMounted()) return;
        setApiHashtags(fallbackHashtags);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchHashtags();
  }, [categorySlug, hashtags]);

  const displayHashtags = hashtags || apiHashtags;

  const handlePress = useCallback((hashtag: TrendingHashtag) => {
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    } else {
      router.push({
        pathname: '/search',
        params: { q: hashtag.tag, category: categorySlug },
      } as any);
    }
  }, [router, categorySlug, onHashtagPress]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.error} />
      </View>
    );
  }

  if (!displayHashtags || displayHashtags.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trending-up" size={18} color={colors.error} />
          <Text style={styles.sectionTitle}>Trending Now</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayHashtags.map((hashtag) => (
          <HashtagChip
            key={hashtag.id}
            hashtag={hashtag}
            onPress={() => handlePress(hashtag)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04)',
      },
    }),
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  hashtagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trendingIndicator: {
    marginLeft: 2,
  },
  countText: {
    fontSize: 11,
    color: colors.neutral[400],
    fontWeight: '500',
  },
});

export default memo(TrendingHashtags);
