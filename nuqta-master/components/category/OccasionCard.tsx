// @ts-nocheck
/**
 * OccasionCard Component
 * Card for occasion-based shopping with discount badge and tags
 * Used in Fashion and other applicable categories
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OccasionCardProps } from '@/types/categoryTypes';
import { colors } from '@/constants/theme';

// Rez Brand Colors
const COLORS = {
  primaryGreen: colors.lightMustard,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
};

// Tag color mapping
const TAG_COLORS: Record<string, string> = {
  'Hot': colors.error,
  'Trending': colors.brand.purpleLight,
  'Coming Soon': colors.warningScale[400],
  'Special': colors.brand.pink,
  'Student': colors.infoScale[400],
  'New': colors.lightMustard,
};

const OccasionCard: React.FC<OccasionCardProps> = ({ occasion, onPress }) => {
  const lighterColor = occasion.color + '20';
  const tagColor = occasion.tag ? TAG_COLORS[occasion.tag] || COLORS.primaryGreen : null;

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress?.(occasion)}
     
    >
      <LinearGradient
        colors={[lighterColor, occasion.color + '40']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Tag Badge */}
        {occasion.tag && (
          <View style={[styles.tagBadge, { backgroundColor: tagColor }]}>
            <Text style={styles.tagText}>{occasion.tag}</Text>
          </View>
        )}

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: occasion.color + '30' }]}>
          <Text style={styles.icon}>{occasion.icon}</Text>
        </View>

        {/* Name */}
        <Text style={styles.name}>{occasion.name}</Text>

        {/* Discount */}
        {occasion.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>Up to {occasion.discount}% Off</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradient: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    minHeight: 130,
    justifyContent: 'center',
    position: 'relative',
  },
  tagBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  icon: {
    fontSize: 24,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  discountBadge: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default React.memo(OccasionCard);
