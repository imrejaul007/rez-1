import React from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { UGCVideoItem, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import { colors } from '@/constants/theme';

// ReZ Design System Colors
const COLORS = {
  primary: colors.brand.green,
  primaryDark: colors.brand.teal,
  gold: colors.brand.goldWarm,
};

const { width: screenWidth } = Dimensions.get('window');

interface ThumbnailVideoCardProps {
  item: UGCVideoItem;
  onPress: (item: UGCVideoItem) => void;
  showHashtags?: boolean;
  style?: any;
}

function ThumbnailVideoCard({
  item,
  onPress,
  showHashtags = true,
  style
}: ThumbnailVideoCardProps) {
  const [imageError, setImageError] = React.useState(false);

  // Grid card width: ensure equal width for both columns
  const cardWidth = (screenWidth - 44) / 2; // 44 = 16 (left) + 16 (right) + 12 (gap)
  const cardHeight = cardWidth * 1.4; // More compact aspect ratio

  return (
    <Pressable
      style={[
        styles.container,
        {
          width: cardWidth,
          height: cardHeight
        },
        style
      ]}
      onPress={() => onPress(item)}
     
    >
      <View style={styles.thumbnailContainer}>
        {/* Thumbnail Image */}
        {item.thumbnailUrl && !imageError ? (
          <CachedImage
            source={{ uri: item.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholderContainer]}>
            <Ionicons name="videocam" size={40} color={COLORS.primary} />
            <ThemedText style={styles.placeholderText}>Video</ThemedText>
          </View>
        )}

        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={PLAY_PAGE_COLORS.gradient.cardOverlay as any}
          style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* View count badge (top-left) */}
        <View style={styles.viewCountContainer}>
          <View style={styles.viewCountPill}>
            <Ionicons name="eye" size={10} color={colors.background.primary} />
            <ThemedText style={styles.viewCountText}>
              {item.viewCount}
            </ThemedText>
          </View>
        </View>

        {/* Play button overlay (center) */}
        <View style={styles.playButtonContainer}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color={colors.background.primary} />
          </View>
        </View>

        {/* Content overlay (bottom) */}
        <View style={styles.contentOverlay}>
          {/* Description */}
          <ThemedText
            style={styles.description}
            numberOfLines={2}
          >
            {item.description}
          </ThemedText>

          {/* Hashtags */}
          {showHashtags && item.hashtags && item.hashtags.length > 0 && (
            <View style={styles.hashtagsContainer}>
              {item.hashtags.slice(0, 2).map((hashtag, index) => (
                <ThemedText key={index} style={styles.hashtagText} numberOfLines={1}>
                  {hashtag}
                </ThemedText>
              ))}
            </View>
          )}

          {/* Product count badge (bottom-right) */}
          {item.products && item.products.length > 0 && (
            <View style={styles.productCountBadge}>
              <Ionicons name="pricetag" size={10} color={colors.background.primary} />
              <ThemedText style={styles.productCountText}>
                {item.products.length}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: PLAY_PAGE_COLORS.cardBackground,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.2)',
  },
  thumbnailContainer: {
    flex: 1,
    position: 'relative',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    gap: 10,
  },
  placeholderText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewCountContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  viewCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewCountText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 192, 106, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingRight: 50, // Extra space for product badge
    minHeight: 60, // Fixed height to prevent misalignment
  },
  description: {
    color: colors.background.primary,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 14,
    height: 28, // Fixed height for 2 lines (14 * 2)
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  hashtagText: {
    color: colors.background.primary,
    fontSize: 8,
    fontWeight: '600',
    opacity: 0.85,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PLAY_PAGE_COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  productCountText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default React.memo(ThumbnailVideoCard);
