import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CreatorInfoProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  isVerified?: boolean;
  isFollowing: boolean;
  onCreatorPress: () => void;
  onFollowPress: () => Promise<void>;
}

function CreatorInfo({
  creatorId,
  creatorName,
  creatorAvatar,
  isVerified = false,
  isFollowing,
  onCreatorPress,
  onFollowPress,
}: CreatorInfoProps) {
  const [following, setFollowing] = React.useState(false);
  const isMounted = useIsMounted();

  const handleFollow = async () => {
    if (following) return;

    setFollowing(true);
    try {
      await onFollowPress();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setFollowing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.creatorButton}
        onPress={onCreatorPress}
       
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {creatorAvatar ? (
            <CachedImage
              source={{ uri: creatorAvatar }}
              style={styles.avatar}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color={colors.brand.purpleLight} />
            </View>
          )}
        </View>

        {/* Creator Name */}
        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.creatorName} numberOfLines={1}>
              {creatorName}
            </ThemedText>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={16} color={colors.infoScale[400]} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Follow Button */}
      {!isFollowing && (
        <Pressable
          style={styles.followButton}
          onPress={handleFollow}
          disabled={following}
         
        >
          <LinearGradient
            colors={[colors.brand.purpleLight, colors.brand.purpleMedium]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.followGradient}
          >
            <Ionicons name="person-add-outline" size={14} color={colors.background.primary} />
            <ThemedText style={styles.followText}>Follow</ThemedText>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    bottom: 240, // Above product section
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    maxWidth: 220,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorName: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  followButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  followGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  followText: {
    color: colors.background.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default React.memo(CreatorInfo);
