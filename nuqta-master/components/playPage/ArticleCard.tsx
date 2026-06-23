import React from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Article } from '@/types/article.types';
import { colors } from '@/constants/theme';

// ReZ Design System Colors
const COLORS = {
  primary: colors.brand.green,
  primaryDark: colors.brand.teal,
  gold: colors.brand.goldWarm,
  text: colors.brand.navyDark,
};

const { width: screenWidth } = Dimensions.get('window');

interface ArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
  style?: any;
}

function ArticleCard({ article, onPress, style }: ArticleCardProps) {
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
      onPress={() => onPress(article)}
     
      accessibilityLabel={`Article: ${article.title}. ${article.viewCount} views`}
      accessibilityRole="button"
      accessibilityHint="Double tap to read article"
    >
      <View style={styles.imageContainer}>
        {/* Cover Image */}
        {article.coverImage && !imageError ? (
          <CachedImage
            source={{ uri: article.coverImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholderContainer]}>
            <Ionicons name="document-text" size={40} color={COLORS.primary} />
            <ThemedText style={styles.placeholderText}>Article</ThemedText>
          </View>
        )}

        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
          style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* View count badge (top-left) */}
        <View style={styles.viewCountContainer}>
          <View style={styles.viewCountPill}>
            <Ionicons name="eye" size={10} color={colors.background.primary} />
            <ThemedText style={styles.viewCountText}>
              {article.viewCount}
            </ThemedText>
          </View>
        </View>

        {/* Content overlay (bottom) */}
        <View style={styles.contentOverlay}>
          {/* Title */}
          <ThemedText
            style={styles.title}
            numberOfLines={2}
          >
            {article.title}
          </ThemedText>

          {/* Read more button */}
          <View style={styles.readMoreContainer}>
            <ThemedText style={styles.readMoreText}>Read more</ThemedText>
            <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.2)',
  },
  imageContainer: {
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
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 8,
    minHeight: 70, // Fixed height to prevent misalignment
  },
  title: {
    color: colors.background.primary,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
    height: 32, // Fixed height for 2 lines (16 * 2)
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.25)',
  },
  readMoreText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default React.memo(ArticleCard);
