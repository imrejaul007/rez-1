import React, { useState, useEffect } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { checkFollowStatus, toggleFollow } from '../../services/activityFeedApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  style?: any;
}

const FollowButton: React.FC<FollowButtonProps> = ({ userId, onFollowChange, style }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadFollowStatus();
  }, [userId]);

  const loadFollowStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const status = await checkFollowStatus(userId);
      if (!isMounted()) return;
      setIsFollowing(status);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsCheckingStatus(false);
    }
  };

  const handleToggleFollow = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const result = await toggleFollow(userId);
      if (!isMounted()) return;
      setIsFollowing(result.following);

      if (onFollowChange) {
        onFollowChange(result.following);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Pressable
        style={[styles.button, styles.buttonLoading, style]}
        disabled
      >
        <ActivityIndicator size="small" color={colors.midGray} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.button,
        isFollowing ? styles.buttonFollowing : styles.buttonNotFollowing,
        style
      ]}
      onPress={handleToggleFollow}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isFollowing ? colors.midGray : colors.background.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isFollowing ? styles.buttonTextFollowing : styles.buttonTextNotFollowing
          ]}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonLoading: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  buttonNotFollowing: {
    backgroundColor: colors.brand.ios,
    borderWidth: 0
  },
  buttonFollowing: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  buttonTextNotFollowing: {
    color: colors.background.primary
  },
  buttonTextFollowing: {
    color: colors.midGray
  }
});

export default React.memo(FollowButton);
