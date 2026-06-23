/**
 * VibeCard Component
 * Circular/rounded card for mood-based shopping
 * Used in Fashion and other applicable categories
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VibeCardProps } from '@/types/categoryTypes';
import { colors } from '@/constants/theme';

// Rez Brand Colors
const COLORS = {
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
};

const VibeCard: React.FC<VibeCardProps> = ({ vibe, onPress }) => {
  // Create a lighter shade for gradient
  const lighterColor = vibe.color + '30'; // 30% opacity

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress?.(vibe)}
     
    >
      <LinearGradient
        colors={[lighterColor, vibe.color + '50']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{vibe.icon}</Text>
        </View>
        <Text style={styles.name}>{vibe.name}</Text>
        <Text style={styles.description} numberOfLines={1}>{vibe.description}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 110,
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
    minHeight: 110,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  description: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default React.memo(VibeCard);
