/**
 * useFeedRealtime Hook
 * Manages real-time activity feed updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import {
  SocketEvents,
  SocialNewPostPayload,
  SocialLikePayload,
  SocialCommentPayload,
  SocialFollowPayload,
} from '@/types/socket.types';
import type { Activity } from '@/services/activityFeedApi';

interface UseFeedRealtimeOptions {
  onNewPost?: (activity: Activity) => void;
  onLikeUpdate?: (activityId: string, likesCount: number) => void;
  onCommentUpdate?: (activityId: string, commentsCount: number) => void;
  onFollowUpdate?: (userId: string, isFollowing: boolean) => void;
  autoLoadNewPosts?: boolean;
}

interface FeedRealtimeState {
  newPostsCount: number;
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useFeedRealtime(
  activities: Activity[],
  currentUserId?: string,
  options: UseFeedRealtimeOptions = {}
) {
  const { socket, state: socketState } = useSocket();
  const [feedState, setFeedState] = useState<FeedRealtimeState>({
    newPostsCount: 0,
    isConnected: socketState.connected,
    lastUpdate: null,
  });

  const [updatedActivities, setUpdatedActivities] = useState<Activity[]>(activities);
  const [pendingPosts, setPendingPosts] = useState<Activity[]>([]);
  const lastPostTimestamp = useRef<string | null>(null);

  // Store options in ref to avoid recreating callbacks on every render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Update activities when initial data changes
  useEffect(() => {
    setUpdatedActivities(activities);
    if (activities.length > 0) {
      lastPostTimestamp.current = activities[0].createdAt;
    }
  }, [activities]);

  // Update connection state
  useEffect(() => {
    setFeedState(prev => ({
      ...prev,
      isConnected: socketState.connected,
    }));
  }, [socketState.connected]);

  // Handle new post
  const handleNewPost = useCallback((payload: SocialNewPostPayload) => {

    // Don't add if it's from current user (they'll see it anyway)
    if (payload.userId === currentUserId) return;

    // Create activity object from payload
    const newActivity: Activity = {
      _id: payload.activityId,
      user: {
        _id: payload.userId,
        name: payload.username,
        profilePicture: undefined,
      },
      type: payload.type,
      feedContent: payload.content,
      hasLiked: false,
      hasCommented: false,
      createdAt: payload.timestamp,
      updatedAt: payload.timestamp,
    };

    if (optionsRef.current.autoLoadNewPosts) {
      // Add directly to feed
      setUpdatedActivities(prev => [newActivity, ...prev]);
      setFeedState(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));
    } else {
      // Add to pending posts
      setPendingPosts(prev => [newActivity, ...prev]);
      setFeedState(prev => ({
        ...prev,
        newPostsCount: prev.newPostsCount + 1,
        lastUpdate: new Date(),
      }));
    }

    // Trigger callback
    if (optionsRef.current.onNewPost) {
      optionsRef.current.onNewPost(newActivity);
    }
  }, [currentUserId]);

  // Handle like update
  const handleLike = useCallback((payload: SocialLikePayload) => {

    setUpdatedActivities(prev =>
      prev.map(activity => {
        if (activity._id === payload.activityId) {
          return {
            ...activity,
            hasLiked: payload.userId === currentUserId ? !activity.hasLiked : activity.hasLiked,
          };
        }
        return activity;
      })
    );
    setFeedState(prev => ({
      ...prev,
      lastUpdate: new Date(),
    }));

    // Trigger callback
    if (optionsRef.current.onLikeUpdate) {
      optionsRef.current.onLikeUpdate(payload.activityId, payload.likesCount);
    }
  }, [currentUserId]);

  // Handle comment update
  const handleComment = useCallback((payload: SocialCommentPayload) => {

    setUpdatedActivities(prev =>
      prev.map(activity => {
        if (activity._id === payload.activityId) {
          return {
            ...activity,
            hasCommented: payload.userId === currentUserId ? true : activity.hasCommented,
          };
        }
        return activity;
      })
    );
    setFeedState(prev => ({
      ...prev,
      lastUpdate: new Date(),
    }));

    // Trigger callback
    if (optionsRef.current.onCommentUpdate) {
      optionsRef.current.onCommentUpdate(payload.activityId, payload.commentsCount);
    }
  }, [currentUserId]);

  // Handle follow update
  const handleFollow = useCallback((payload: SocialFollowPayload) => {

    // If current user followed someone, filter out their posts or mark them
    if (payload.followerId === currentUserId) {
      setFeedState(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));

      // Trigger callback
      if (optionsRef.current.onFollowUpdate) {
        optionsRef.current.onFollowUpdate(payload.followingId, true);
      }
    }

    // If someone followed current user
    if (payload.followingId === currentUserId) {

    }
  }, [currentUserId]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!socket) return;

    // Subscribe to social feed events
    socket.on(SocketEvents.SOCIAL_NEW_POST, handleNewPost);
    socket.on(SocketEvents.SOCIAL_LIKE, handleLike);
    socket.on(SocketEvents.SOCIAL_COMMENT, handleComment);
    socket.on(SocketEvents.SOCIAL_FOLLOW, handleFollow);

    // Cleanup on unmount
    return () => {
      socket.off(SocketEvents.SOCIAL_NEW_POST, handleNewPost);
      socket.off(SocketEvents.SOCIAL_LIKE, handleLike);
      socket.off(SocketEvents.SOCIAL_COMMENT, handleComment);
      socket.off(SocketEvents.SOCIAL_FOLLOW, handleFollow);

    };
  }, [socket, handleNewPost, handleLike, handleComment, handleFollow]);

  // Load pending posts
  const loadPendingPosts = useCallback(() => {
    if (pendingPosts.length > 0) {
      setUpdatedActivities(prev => [...pendingPosts, ...prev]);
      setPendingPosts([]);
      setFeedState(prev => ({
        ...prev,
        newPostsCount: 0,
      }));
    }
  }, [pendingPosts]);

  // Clear new posts count
  const clearNewPostsCount = useCallback(() => {
    setFeedState(prev => ({
      ...prev,
      newPostsCount: 0,
    }));
  }, []);

  return {
    activities: updatedActivities,
    newPostsCount: feedState.newPostsCount,
    isConnected: feedState.isConnected,
    lastUpdate: feedState.lastUpdate,
    pendingPosts,
    loadPendingPosts,
    clearNewPostsCount,
  };
}

export default useFeedRealtime;
