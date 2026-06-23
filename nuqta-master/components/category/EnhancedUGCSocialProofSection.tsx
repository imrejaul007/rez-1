/**
 * EnhancedUGCSocialProofSection Component
 * User-generated content gallery with photos, hashtags, likes, and comments
 * Based on reference design from Rez_v-2-main
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EnhancedUGCSocialProofSectionProps, UGCPost } from '@/types/categoryTypes';
import { colors } from '@/constants/theme';

// Rez Brand Colors
const COLORS = {
  primaryGreen: colors.lightMustard,
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.background.primary,
  cardBg: colors.neutral[50],
};

interface UGCPostCardProps {
  post: UGCPost;
  onPress?: (post: UGCPost) => void;
  isLarge?: boolean;
}

const UGCPostCard: React.FC<UGCPostCardProps> = ({ post, onPress, isLarge = false }) => {
  return (
    <Pressable
      style={[styles.postCard, isLarge && styles.postCardLarge]}
      onPress={() => onPress?.(post)}
     
    >
      {/* Image */}
      <CachedImage
        source={post.image}
        style={styles.postImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.postGradient}
      />

      {/* Hashtag Badge */}
      <View style={styles.hashtagBadge}>
        <Text style={styles.hashtagText}>{post.hashtag}</Text>
      </View>

      {/* User Info & Stats */}
      <View style={styles.postFooter}>
        <View style={styles.userInfo}>
          <CachedImage
            source={post.userAvatar}
            style={styles.userAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={styles.userName}>{post.userName}</Text>
          {post.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryGreen} />
          )}
        </View>
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={14} color={colors.error} />
            <Text style={styles.statText}>{post.likes}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={12} color={COLORS.white} />
            <Text style={styles.statText}>{post.comments}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const EnhancedUGCSocialProofSection: React.FC<EnhancedUGCSocialProofSectionProps> = ({
  categorySlug,
  categoryName,
  posts,
  title = 'Real Shoppers, Real Style',
  subtitle = 'See how others are shopping - Get inspired!',
  onPostPress,
  onSharePress,
  onViewAllPress,
}) => {
  const router = useRouter();

  if (!posts || posts.length === 0) {
    return null;
  }

  // Create a 2-column masonry-style layout
  const leftColumnPosts = posts.filter((_, i) => i % 2 === 0);
  const rightColumnPosts = posts.filter((_, i) => i % 2 === 1);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="images-outline" size={20} color={COLORS.primaryGreen} />
          <View>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Pressable
          onPress={onViewAllPress}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primaryGreen} />
        </Pressable>
      </View>

      {/* 2-Column Masonry Grid */}
      <View style={styles.masonryGrid}>
        {/* Left Column */}
        <View style={styles.column}>
          {leftColumnPosts.slice(0, 3).map((post, index) => (
            <UGCPostCard
              key={post.id}
              post={post}
              onPress={onPostPress}
              isLarge={index === 0}
            />
          ))}
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          {rightColumnPosts.slice(0, 3).map((post, index) => (
            <UGCPostCard
              key={post.id}
              post={post}
              onPress={onPostPress}
              isLarge={index === 1}
            />
          ))}
        </View>
      </View>

      {/* Share CTA */}
      <Pressable
        style={styles.shareCTA}
        onPress={onSharePress}
       
      >
        <Ionicons name="camera-outline" size={18} color={COLORS.primaryGreen} />
        <Text style={styles.shareCTAText}>Share your experience & earn coins!</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.primaryGreen} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  masonryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  postCard: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  postCardLarge: {
    height: 220,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  hashtagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hashtagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  postFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  shareCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  shareCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
});

export default React.memo(EnhancedUGCSocialProofSection);
