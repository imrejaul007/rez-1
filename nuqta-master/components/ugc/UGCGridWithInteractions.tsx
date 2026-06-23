import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import UGCGrid from '@/components/UGCGrid';
import { UGCContent } from '@/types/reviews';
import { useUGCInteractions } from '@/hooks/useUGCInteractions';
import { useIsAuthenticated } from '@/stores/selectors';
import { useRouter } from 'expo-router';

interface UGCGridWithInteractionsProps {
  ugcContent: UGCContent[];
  onContentPress?: (content: UGCContent) => void;
}

/**
 * UGCGrid with integrated like and bookmark functionality
 * Handles authentication, optimistic updates, and backend synchronization
 */
function UGCGridWithInteractions({
  ugcContent,
  onContentPress,
}: UGCGridWithInteractionsProps) {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const {
    toggleLike,
    toggleBookmark,
    isLiked,
    isBookmarked,
    getLikeCount,
    initializeState,
  } = useUGCInteractions();

  // Initialize interaction state when content changes
  useEffect(() => {
    initializeState(ugcContent);
  }, [ugcContent, initializeState]);

  // Merge local interaction state with UGC content
  const enrichedContent = useMemo(() => {
    return ugcContent.map((item) => ({
      ...item,
      isLiked: isLiked(item.id),
      isBookmarked: isBookmarked(item.id),
      likes: getLikeCount(item.id),
    }));
  }, [ugcContent, isLiked, isBookmarked, getLikeCount]);

  const handleLikeContent = (contentId: string) => {
    if (!isAuthenticated) {
      // Redirect to sign-in
      router.push('/sign-in');
      return;
    }
    toggleLike(contentId);
  };

  const handleBookmarkContent = (contentId: string) => {
    if (!isAuthenticated) {
      // Redirect to sign-in
      router.push('/sign-in');
      return;
    }
    toggleBookmark(contentId);
  };

  return (
    <View>
      <UGCGrid
        ugcContent={enrichedContent}
        onContentPress={onContentPress}
        onLikeContent={handleLikeContent}
        onBookmarkContent={handleBookmarkContent}
      />
    </View>
  );
}

export default React.memo(UGCGridWithInteractions);
