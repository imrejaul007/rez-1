import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SocialActionsProps {
  videoId: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  onLike: () => Promise<void>;
  onComment: () => void;
  onShare: () => void;
  onBookmark: () => Promise<void>;
}

function SocialActions({
  videoId,
  likes,
  comments,
  shares,
  isLiked,
  isBookmarked,
  onLike,
  onComment,
  onShare,
  onBookmark,
}: SocialActionsProps) {
  const [liking, setLiking] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const isMounted = useIsMounted();

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const bookmarkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const handleLike = async () => {
    if (liking) return;

    setLiking(true);

    // Animate heart
    likeScale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );

    try {
      await onLike();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarking) return;

    setBookmarking(true);

    // Animate bookmark
    bookmarkScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );

    try {
      await onBookmark();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setBookmarking(false);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  return (
    <View style={styles.container}>
      {/* Like Button */}
      <Pressable
        style={styles.actionButton}
        onPress={handleLike}
        disabled={liking}
       
      >
        <Animated.View style={likeAnimStyle}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={isLiked ? colors.error : colors.background.primary}
          />
        </Animated.View>
        <ThemedText style={styles.actionText}>{formatCount(likes)}</ThemedText>
      </Pressable>

      {/* Comment Button */}
      <Pressable
        style={styles.actionButton}
        onPress={onComment}
       
      >
        <Ionicons name="chatbubble-outline" size={30} color={colors.background.primary} />
        <ThemedText style={styles.actionText}>{formatCount(comments)}</ThemedText>
      </Pressable>

      {/* Bookmark Button */}
      <Pressable
        style={styles.actionButton}
        onPress={handleBookmark}
        disabled={bookmarking}
       
      >
        <Animated.View style={bookmarkAnimStyle}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={30}
            color={isBookmarked ? colors.warningScale[400] : colors.background.primary}
          />
        </Animated.View>
      </Pressable>

      {/* Share Button */}
      <Pressable
        style={styles.actionButton}
        onPress={onShare}
       
      >
        <Ionicons name="share-social-outline" size={30} color={colors.background.primary} />
        <ThemedText style={styles.actionText}>{formatCount(shares)}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 240, // Above product section
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(SocialActions);
