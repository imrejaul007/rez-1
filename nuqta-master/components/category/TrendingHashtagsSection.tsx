/**
 * TrendingHashtagsSection Component
 * Horizontal scroll of trending hashtag chips
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrendingHashtagsSectionProps, TrendingHashtag } from '@/types/categoryTypes';
import { colors } from '@/constants/theme';

// Rez Brand Colors
const COLORS = {
  primaryGreen: colors.lightMustard,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
};

interface HashtagChipProps {
  hashtag: TrendingHashtag;
  onPress?: (hashtag: TrendingHashtag) => void;
}

const HashtagChip: React.FC<HashtagChipProps> = ({ hashtag, onPress }) => {
  return (
    <Pressable
      style={[styles.chip, { backgroundColor: hashtag.color + '15' }]}
      onPress={() => onPress?.(hashtag)}
     
    >
      <Text style={[styles.chipText, { color: hashtag.color }]}>{hashtag.tag}</Text>
      <View style={[styles.countBadge, { backgroundColor: hashtag.color }]}>
        <Text style={styles.countText}>{hashtag.itemCount}</Text>
      </View>
    </Pressable>
  );
};

const TrendingHashtagsSection: React.FC<TrendingHashtagsSectionProps> = ({
  hashtags,
  categorySlug,
  onHashtagPress,
}) => {
  if (!hashtags || hashtags.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={20} color={colors.brand.pink} />
        <Text style={styles.headerTitle}>Trending Now</Text>
      </View>

      {/* Hashtag Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hashtags.map((hashtag) => (
          <HashtagChip
            key={hashtag.id}
            hashtag={hashtag}
            onPress={onHashtagPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default React.memo(TrendingHashtagsSection);
