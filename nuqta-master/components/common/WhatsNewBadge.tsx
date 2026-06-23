import React from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  View,
  Text,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface WhatsNewBadgeProps {
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'green' | 'blue' | 'gold';
}

const WhatsNewBadge: React.FC<WhatsNewBadgeProps> = ({ onPress, style, variant = 'green' }) => {
  const badgeColors = {
    green: { bg: '#064E3B', border: colors.successScale[700] },
    blue: { bg: '#0C4A6E', border: colors.brand.sky },
    gold: { bg: '#78350F', border: colors.warning },
  };

  const variantColors = badgeColors[variant];

  return (
    <Pressable
      onPress={onPress}

      style={[styles.badge, { backgroundColor: variantColors.bg, borderColor: variantColors.border }, style]}
      accessibilityRole="button"
      accessibilityLabel="What's New"
    >
      <View style={styles.content}>
        <Text style={styles.star}>✦</Text>
        <ThemedText style={styles.text}>What's New</ThemedText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 999,
    borderWidth: 1,
  },
  content: {
    position: 'relative',
  },
  star: {
    position: 'absolute',
    top: 7,
    right: 0,
    fontSize: 4,
    color: colors.text.white,
  },
  text: {
    color: colors.text.white,
    fontSize: 6,
    fontWeight: '600',
  },
});

export default React.memo(WhatsNewBadge);
