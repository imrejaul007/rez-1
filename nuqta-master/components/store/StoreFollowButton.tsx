// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useIsAuthenticated } from '@/stores/selectors';
import { useToast } from '@/hooks/useToast';
import storesApi from '@/services/storesApi';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StoreFollowButtonProps {
  storeId: string;
  storeName?: string;
  initialFollowing?: boolean;
  initialFollowerCount?: number;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'default' | 'compact' | 'icon-only';
  showCount?: boolean;
}

/**
 * StoreFollowButton Component
 *
 * A button component for following/unfollowing stores with backend integration.
 * Features:
 * - Real-time state synchronization with backend
 * - Optimistic updates for instant UI feedback
 * - Rollback on error
 * - Toast notifications
 * - Follower count display with formatting
 * - Multiple variants (default, compact, icon-only)
 * - Authentication check with login prompt
 *
 * @example
 * ```tsx
 * <StoreFollowButton
 *   storeId="store-123"
 *   storeName="Fashion Store"
 *   variant="default"
 *   showCount={true}
 * />
 * ```
 */
function StoreFollowButton({
  storeId,
  storeName = 'this store',
  initialFollowing = false,
  initialFollowerCount = 0,
  onFollowChange,
  variant = 'default',
  showCount = true,
}: StoreFollowButtonProps) {
  const isAuthenticated = useIsAuthenticated();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  // State management
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const isMounted = useIsMounted();

  // Animation values
  const scaleAnim = useSharedValue(1);
  const heartScale = useSharedValue(1);

  // Check follow status on mount if user is authenticated
  useEffect(() => {
    if (isAuthenticated && !hasCheckedStatus) {
      checkFollowStatus();
    }
  }, [isAuthenticated, hasCheckedStatus]);

  /**
   * Check current follow status from backend
   */
  const checkFollowStatus = async () => {
    try {
      const response = await storesApi.checkFollowStatus(storeId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setIsFollowing(response.data.following);
        setHasCheckedStatus(true);
      }
    } catch (error) {
      // Silently fail - use initial values
    }
  };

  /**
   * Format follower count for display
   * Examples: 1234 -> "1.2K", 1234567 -> "1.2M"
   */
  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  /**
   * Animate button press
   */
  const animatePress = () => {
    scaleAnim.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));
  };

  /**
   * Animate heart icon
   */
  const animateHeart = (shouldAnimate: boolean) => {
    if (shouldAnimate) {
      heartScale.value = withSequence(withTiming(1.3, { duration: 200 }), withTiming(1, { duration: 200 }));
    }
  };

  /**
   * Handle follow/unfollow toggle
   */
  const handleFollowToggle = async () => {
    // Check authentication
    if (!isAuthenticated) {
      showError('Please sign in to follow stores');
      // Navigate to sign-in after a short delay
      setTimeout(() => {
        router.push('/sign-in');
      }, 1000);
      return;
    }

    // Prevent multiple simultaneous requests
    if (isLoading) {
      return;
    }

    // Store previous state for rollback
    const previousFollowing = isFollowing;
    const previousCount = followerCount;

    // Optimistic update - instant UI feedback
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    setFollowerCount((prev) => (newFollowing ? prev + 1 : Math.max(0, prev - 1)));

    // Animate
    animatePress();
    animateHeart(newFollowing);

    // Call onFollowChange callback
    onFollowChange?.(newFollowing);

    try {
      setIsLoading(true);

      // Make API call
      if (newFollowing) {
        const response = await storesApi.followStore(storeId);

        if (!response.success) {
          throw new Error(response.error || 'Failed to follow store');
        }

        showSuccess(`Now following ${storeName}`);
      } else {
        const response = await storesApi.unfollowStore(storeId);

        if (!response.success) {
          throw new Error(response.error || 'Failed to unfollow store');
        }

        showSuccess(`Unfollowed ${storeName}`);
      }

    } catch (error: any) {

      // Rollback optimistic update
      if (!isMounted()) return;
      setIsFollowing(previousFollowing);
      setFollowerCount(previousCount);
      onFollowChange?.(previousFollowing);

      // Show error message
      const errorMessage = error?.message || 'Failed to update. Please try again.';
      showError(errorMessage);

    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  /**
   * Render icon-only variant
   */
  if (variant === 'icon-only') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={[
            styles.iconOnlyButton,
            isFollowing && styles.iconOnlyButtonFollowing,
          ]}
          onPress={handleFollowToggle}
          disabled={isLoading}
         
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? `Unfollow ${storeName}` : `Follow ${storeName}`}
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.text.white : colors.brand.purple} />
          ) : (
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={20}
                color={isFollowing ? colors.text.white : colors.brand.purple}
              />
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  /**
   * Render compact variant
   */
  if (variant === 'compact') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={[
            styles.compactButton,
            isFollowing && styles.compactButtonFollowing,
            isLoading && styles.buttonLoading,
          ]}
          onPress={handleFollowToggle}
          disabled={isLoading}
         
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? `Unfollow ${storeName}` : `Follow ${storeName}`}
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.text.white : colors.brand.purple} />
          ) : (
            <>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={isFollowing ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isFollowing ? colors.text.white : colors.brand.purple}
                />
              </Animated.View>
              <Text
                style={[
                  styles.compactButtonText,
                  isFollowing && styles.compactButtonTextFollowing,
                ]}
                numberOfLines={1}
              >
                {isHovered && isFollowing ? 'Unfollow' : isFollowing ? 'Following' : 'Follow'}
              </Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  /**
   * Render default variant (full button with text and count)
   */
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.defaultButton,
          isFollowing && styles.defaultButtonFollowing,
          isLoading && styles.buttonLoading,
        ]}
        onPress={handleFollowToggle}
        disabled={isLoading}
       
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        accessibilityRole="button"
        accessibilityLabel={
          isFollowing
            ? `Unfollow ${storeName}. ${followerCount} followers`
            : `Follow ${storeName}. ${followerCount} followers`
        }
        accessibilityState={{ disabled: isLoading }}
        accessibilityHint="Double tap to toggle follow status"
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={isFollowing ? colors.text.white : colors.brand.purple} />
            <Text
              style={[
                styles.defaultButtonText,
                isFollowing && styles.defaultButtonTextFollowing,
              ]}
            >
              Loading...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.defaultButtonContent}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={isFollowing ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFollowing ? colors.text.white : colors.brand.purple}
                />
              </Animated.View>
              <Text
                style={[
                  styles.defaultButtonText,
                  isFollowing && styles.defaultButtonTextFollowing,
                ]}
                numberOfLines={1}
              >
                {isHovered && isFollowing ? 'Unfollow' : isFollowing ? 'Following' : 'Follow'}
              </Text>
            </View>
            {showCount && followerCount > 0 && (
              <View
                style={[
                  styles.followerCountBadge,
                  isFollowing && styles.followerCountBadgeFollowing,
                ]}
              >
                <Text
                  style={[
                    styles.followerCountText,
                    isFollowing && styles.followerCountTextFollowing,
                  ]}
                >
                  {formatFollowerCount(followerCount)}
                </Text>
              </View>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Icon-only variant
  iconOnlyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    borderWidth: 1.5,
    borderColor: colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconOnlyButtonFollowing: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },

  // Compact variant
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    borderWidth: 1.5,
    borderColor: colors.brand.purple,
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactButtonFollowing: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  compactButtonTextFollowing: {
    color: colors.text.white,
  },

  // Default variant
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.brand.purple,
    minWidth: 140,
    minHeight: 44, // Minimum touch target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  defaultButtonFollowing: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  defaultButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  defaultButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  defaultButtonTextFollowing: {
    color: colors.text.white,
  },

  // Loading state
  buttonLoading: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Follower count badge
  followerCountBadge: {
    backgroundColor: colors.tint.purple,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  followerCountBadgeFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  followerCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  followerCountTextFollowing: {
    color: colors.text.white,
  },
});

export default React.memo(StoreFollowButton);
