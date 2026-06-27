// @ts-nocheck
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UGCContent } from '@/types/reviews';
import { colors } from '@/constants/theme';
import { useToastStore } from '@/stores/toastStore';
import ugcApi from '@/services/ugcApi';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface UGCGridProps {
  ugcContent: UGCContent[];
  onContentPress?: (content: UGCContent) => void;
  onLikeContent?: (contentId: string) => void;
  onBookmarkContent?: (contentId: string) => void;
}

interface ContentState {
  isLiked: boolean;
  isBookmarked: boolean;
  likes: number;
}

const UGCGrid: React.FC<UGCGridProps> = ({
  ugcContent,
  onContentPress,
  onLikeContent,
  onBookmarkContent }) => {
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 64) / 2;

  // Local state for optimistic updates
  const [contentStates, setContentStates] = useState<Record<string, ContentState>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Toast notifications
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);

  // Ref for request race condition prevention
  const requestIdRef = useRef(0);

  // Initialize content states from initial data
  useEffect(() => {
    const states: Record<string, ContentState> = {};
    ugcContent.forEach((item) => {
      states[item.id] = {
        isLiked: item.isLiked,
        isBookmarked: item.isBookmarked || false,
        likes: item.likes,
      };
    });
    setContentStates(states);
  }, [ugcContent]);

  const getContentState = useCallback((contentId: string): ContentState => {
    return contentStates[contentId] || { isLiked: false, isBookmarked: false, likes: 0 };
  }, [contentStates]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w`;
    return `${Math.ceil(diffDays / 30)}m`;
  };

  const formatLikeCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleLikePress = useCallback(async (item: UGCContent) => {
    if (processingIds.has(item.id)) return;

    const currentRequestId = ++requestIdRef.current;
    const previousState = getContentState(item.id);

    try {
      // Add to processing set
      setProcessingIds((prev) => new Set(prev).add(item.id));

      // Optimistic update
      const newLiked = !previousState.isLiked;
      const newLikes = newLiked ? previousState.likes + 1 : Math.max(0, previousState.likes - 1);

      setContentStates((prev) => ({
        ...prev,
        [item.id]: {
          ...previousState,
          isLiked: newLiked,
          likes: newLikes,
        },
      }));

      // Call parent's handler
      onLikeContent?.(item.id);

      // API call
      const response = await ugcApi.toggleLike(item.id);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed values
        setContentStates((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            isLiked: response.data!.isLiked,
            likes: response.data!.likes,
          },
        }));

        showSuccess(
          response.data!.isLiked ? 'Added to favorites' : 'Removed from favorites',
          2000
        );
      } else {
        throw new Error(response.error || 'Failed to update like');
      }
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setContentStates((prev) => ({
        ...prev,
        [item.id]: previousState,
      }));

      showError('Failed to update like', 3000);
    } finally {
      // Remove from processing set
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [processingIds, getContentState, onLikeContent, showSuccess, showError]);

  const handleBookmarkPress = useCallback(async (item: UGCContent) => {
    if (processingIds.has(`bookmark-${item.id}`)) return;

    const currentRequestId = ++requestIdRef.current;
    const previousState = getContentState(item.id);

    try {
      // Add to processing set
      setProcessingIds((prev) => new Set(prev).add(`bookmark-${item.id}`));

      // Optimistic update
      const newBookmarked = !previousState.isBookmarked;

      setContentStates((prev) => ({
        ...prev,
        [item.id]: {
          ...previousState,
          isBookmarked: newBookmarked,
        },
      }));

      // Call parent's handler
      onBookmarkContent?.(item.id);

      // API call
      const response = await ugcApi.toggleBookmark(item.id);

      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.success && response.data) {
        // Update with server-confirmed value
        setContentStates((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            isBookmarked: response.data!.isBookmarked,
          },
        }));

        showSuccess(
          response.data!.isBookmarked ? 'Bookmarked' : 'Bookmark removed',
          2000
        );
      } else {
        throw new Error(response.error || 'Failed to update bookmark');
      }
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setContentStates((prev) => ({
        ...prev,
        [item.id]: previousState,
      }));

      showError('Failed to update bookmark', 3000);
    } finally {
      // Remove from processing set
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(`bookmark-${item.id}`);
        return next;
      });
    }
  }, [processingIds, getContentState, onBookmarkContent, showSuccess, showError]);

  const renderUGCItem = ({ item }: { item: UGCContent }) => {
    const likeScaleAnim = useSharedValue(1);
    const bookmarkScaleAnim = useSharedValue(1);

    const likeScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScaleAnim.value }] }));
    const bookmarkScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookmarkScaleAnim.value }] }));

    const state = getContentState(item.id);

    const handleLike = () => {
      likeScaleAnim.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withSpring(1, { friction: 3, tension: 100 }),
      );
      handleLikePress(item);
    };

    const handleBookmark = () => {
      bookmarkScaleAnim.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withSpring(1, { friction: 3, tension: 100 }),
      );
      handleBookmarkPress(item);
    };

    return (
    <Pressable
      style={styles.ugcItem}
      onPress={() => onContentPress?.(item)}

      accessibilityLabel={`${item.contentType === 'video' ? 'Video' : 'Photo'} by ${item.userName}. ${state.likes} likes${item.caption ? '. ' + item.caption : ''}`}
      accessibilityRole="button"
      accessibilityHint="Opens full content view"
    >
      <View style={styles.imageContainer}>
        <CachedImage source={item.uri} style={styles.ugcImage} />

        {/* Content type indicator */}
        {item.contentType === 'video' && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={24} color={colors.background.primary} />
          </View>
        )}

        {/* User info overlay */}
        <View style={styles.userOverlay}>
          <CachedImage source={item.userAvatar} style={styles.userAvatar} />
          <ThemedText style={styles.userName}>{item.userName}</ThemedText>
        </View>

        {/* Bookmark button (top-right) */}
        <Pressable
          style={styles.bookmarkButton}
          onPress={handleBookmark}
          accessibilityLabel={`${state.isBookmarked ? 'Remove bookmark' : 'Bookmark'} post`}
          accessibilityRole="button"
          accessibilityState={{ selected: state.isBookmarked }}
          accessibilityHint={`Double tap to ${state.isBookmarked ? 'remove bookmark' : 'bookmark this post'}`}
        >
          <Animated.View style={bookmarkScaleStyle}>
            <Ionicons
              name={state.isBookmarked ? "bookmark" : "bookmark-outline"}
              size={20}
              color={state.isBookmarked ? colors.brand.purple : colors.background.primary}
            />
          </Animated.View>
        </Pressable>

        {/* Like button (bottom-left) */}
        <Pressable
          style={styles.likeButton}
          onPress={handleLike}
          accessibilityLabel={`${state.isLiked ? 'Unlike' : 'Like'} post. ${formatLikeCount(state.likes)} likes`}
          accessibilityRole="button"
          accessibilityState={{ selected: state.isLiked }}
          accessibilityHint={`Double tap to ${state.isLiked ? 'remove like' : 'like this post'}`}
        >
          <Animated.View style={[likeScaleStyle, { flexDirection: "row", alignItems: "center" }]}>
            <Ionicons
              name={state.isLiked ? "heart" : "heart-outline"}
              size={18}
              color={state.isLiked ? colors.error : colors.background.primary}
            />
            {state.likes > 0 && (
              <ThemedText style={styles.likeCount}>{formatLikeCount(state.likes)}</ThemedText>
            )}
          </Animated.View>
        </Pressable>
      </View>

      {/* Content info */}
      <View style={styles.contentInfo}>
        {item.caption && (
          <ThemedText style={styles.caption} numberOfLines={2}>
            {item.caption}
          </ThemedText>
        )}

        <View style={styles.contentStats}>
          <View style={styles.likesContainer}>
            <Ionicons name="heart" size={12} color={colors.error} />
            <ThemedText style={styles.likesText}>{state.likes}</ThemedText>
          </View>
          <ThemedText style={styles.dateText}>{formatDate(item.date)}</ThemedText>
        </View>

        {/* Product tags */}
        {item.productTags && item.productTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.productTags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <ThemedText style={styles.tagText}>{tag}</ThemedText>
              </View>
            ))}
            {item.productTags.length > 2 && (
              <ThemedText style={styles.moreTagsText}>
                +{item.productTags.length - 2}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    </Pressable>
    );
  };

  // Convert to simple View with manual grid layout to work better inside ScrollView
  if (ugcContent.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={48} color={colors.neutral[300]} />
        <ThemedText style={styles.emptyText}>
          No UGC content available yet
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>
          User generated content will appear here when customers share photos and videos
        </ThemedText>
      </View>
    );
  }

  // Group items into rows of 2
  const rows = [];
  for (let i = 0; i < ugcContent.length; i += 2) {
    rows.push(ugcContent.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item) => (
            <View key={item.id} style={[styles.ugcItemWrapper, { width: itemWidth }]}>
              {renderUGCItem({ item })}
            </View>
          ))}
          {/* Add spacer if odd number of items in last row */}
          {row.length === 1 && <View style={{ width: itemWidth }} />}
        </View>
      ))}
    </View>
    );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 8 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 200 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12 },
  ugcItemWrapper: {
    // Width is set dynamically
  },
  ugcItem: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    width: '100%' },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1 },
  ugcImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12 },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12 },
  userOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12 },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6 },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary },
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4 },
  likeButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4 },
  likeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
    marginLeft: 4,
    letterSpacing: 0.2 },
  contentInfo: {
    padding: 12 },
  caption: {
    fontSize: 12,
    color: colors.neutral[700],
    lineHeight: 16,
    marginBottom: 8 },
  contentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 },
  likesText: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500' },
  dateText: {
    fontSize: 11,
    color: colors.neutral[400] },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4 },
  tag: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4 },
  tagText: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '500' },
  moreTagsText: {
    fontSize: 10,
    color: colors.neutral[400],
    fontWeight: '500' },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' },
  emptySubtext: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20 } });

export default React.memo(UGCGrid);
