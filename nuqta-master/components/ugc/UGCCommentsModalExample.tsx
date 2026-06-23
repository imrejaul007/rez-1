/**
 * UGCCommentsModal Integration Example
 *
 * This file demonstrates how to integrate the UGCCommentsModal
 * component into your UGC content pages.
 */

import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UGCCommentsModal from './UGCCommentsModal';

/**
 * Example 1: Basic Integration
 *
 * Shows how to add a comments button to your UGC content
 * and open the comments modal.
 */
export function BasicCommentsExample() {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(24);

  return (
    <View>
      {/* Comments Button */}
      <Pressable
        style={styles.commentsButton}
        onPress={() => setShowComments(true)}
      >
        <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
        <Text style={styles.commentsButtonText}>{commentCount}</Text>
      </Pressable>

      {/* Comments Modal */}
      <UGCCommentsModal
        visible={showComments}
        contentId="ugc-content-123"
        contentType="video"
        contentThumbnail="https://example.com/thumbnail.jpg"
        contentCaption="Check out this amazing product!"
        initialCommentCount={commentCount}
        onClose={() => setShowComments(false)}
        onCommentCountChange={(count) => setCommentCount(count)}
      />
    </View>
  );
}

/**
 * Example 2: Integration with SocialActions Component
 *
 * Shows how to add comments to your existing social actions bar
 */
export function SocialActionsWithComments({
  contentId,
  contentType,
  thumbnail,
  caption,
  likes,
  comments,
  shares,
  isLiked,
  onLike,
  onShare,
}: {
  contentId: string;
  contentType: 'image' | 'video';
  thumbnail?: string;
  caption?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  onLike: () => void;
  onShare: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(comments);

  return (
    <View style={styles.socialActions}>
      {/* Like Button */}
      <Pressable style={styles.actionButton} onPress={onLike}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={32}
          color={isLiked ? '#EF4444' : '#FFF'}
        />
        <Text style={styles.actionText}>{likes}</Text>
      </Pressable>

      {/* Comments Button */}
      <Pressable
        style={styles.actionButton}
        onPress={() => setShowComments(true)}
      >
        <Ionicons name="chatbubble-outline" size={30} color="#FFF" />
        <Text style={styles.actionText}>{commentCount}</Text>
      </Pressable>

      {/* Share Button */}
      <Pressable style={styles.actionButton} onPress={onShare}>
        <Ionicons name="share-social-outline" size={30} color="#FFF" />
        <Text style={styles.actionText}>{shares}</Text>
      </Pressable>

      {/* Comments Modal */}
      <UGCCommentsModal
        visible={showComments}
        contentId={contentId}
        contentType={contentType}
        contentThumbnail={thumbnail}
        contentCaption={caption}
        initialCommentCount={commentCount}
        onClose={() => setShowComments(false)}
        onCommentCountChange={setCommentCount}
      />
    </View>
  );
}

/**
 * Example 3: Full UGC Detail Page Integration
 *
 * Complete example showing comments in a UGC detail screen
 */
export function UGCDetailPageExample() {
  const [showComments, setShowComments] = useState(false);
  const [ugcData] = useState({
    _id: 'ugc-123',
    type: 'video' as const,
    url: 'https://example.com/video.mp4',
    thumbnail: 'https://example.com/thumbnail.jpg',
    caption: 'Amazing product review! Check this out!',
    comments: 156,
    likes: 2340,
    shares: 45,
    isLiked: false,
  });

  const handleOpenComments = () => {
    setShowComments(true);
  };

  return (
    <View style={styles.container}>
      {/* Video/Image Display */}
      <View style={styles.mediaContainer}>
        {/* Your media player component here */}
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>{ugcData.caption}</Text>
        <Pressable onPress={handleOpenComments}>
          <Text style={styles.viewCommentsLink}>
            View all {ugcData.comments} comments
          </Text>
        </Pressable>
      </View>

      {/* Comments Modal */}
      <UGCCommentsModal
        visible={showComments}
        contentId={ugcData._id}
        contentType={ugcData.type}
        contentThumbnail={ugcData.thumbnail}
        contentCaption={ugcData.caption}
        initialCommentCount={ugcData.comments}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

/**
 * Example 4: Auto-open Comments from Deep Link
 *
 * Shows how to open comments automatically from a notification
 * or deep link
 */
export function DeepLinkCommentsExample({
  contentId,
  openCommentsOnMount = false,
}: {
  contentId: string;
  openCommentsOnMount?: boolean;
}) {
  const [showComments, setShowComments] = useState(openCommentsOnMount);

  return (
    <View>
      {/* Your content here */}

      <UGCCommentsModal
        visible={showComments}
        contentId={contentId}
        contentType="video"
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#111',
  },
  captionContainer: {
    padding: 16,
    backgroundColor: '#FFF',
  },
  caption: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 8,
  },
  viewCommentsLink: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
  commentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 24,
  },
  commentsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  socialActions: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

/**
 * INTEGRATION CHECKLIST
 *
 * ✅ Import UGCCommentsModal from '@/components/ugc'
 * ✅ Add state for modal visibility: useState(false)
 * ✅ Add state for comment count (optional): useState(initialCount)
 * ✅ Add button/trigger to open modal: onPress={() => setVisible(true)}
 * ✅ Add UGCCommentsModal component with required props
 * ✅ Handle onClose to close modal: onClose={() => setVisible(false)}
 * ✅ (Optional) Handle onCommentCountChange to update local count
 * ✅ Ensure ToastProvider wraps your app (for notifications)
 *
 * REQUIRED PROPS:
 * - visible: boolean
 * - contentId: string
 * - contentType: 'image' | 'video'
 * - onClose: () => void
 *
 * OPTIONAL PROPS:
 * - contentThumbnail?: string
 * - contentCaption?: string
 * - initialCommentCount?: number
 * - onCommentCountChange?: (count: number) => void
 */
