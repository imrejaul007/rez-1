// Navigation Shortcuts Component
// Horizontal scrollable shortcuts for quick access to key features

import { colors } from '@/constants/theme';
import React from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

interface Shortcut {
  icon: string;
  label: string;
  route: string;
  badge?: string;
}

const shortcuts: Shortcut[] = [
  { icon: '👑', label: 'Premium', route: '/subscription/plans', badge: 'NEW' },
  { icon: '📄', label: 'Upload', route: '/bill-upload', badge: 'HOT' },
  { icon: '🎁', label: 'Refer', route: '/referral' },
  { icon: '🎮', label: 'Games', route: '/games' },
  { icon: '🎯', label: 'Tasks', route: '/challenges' },
  { icon: '💳', label: 'Voucher', route: '/my-vouchers' },
  { icon: '⭐', label: 'Reviews', route: '/my-reviews' },
  { icon: '🏆', label: 'Badges', route: '/profile/achievements' },
];

function NavigationShortcuts() {
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {shortcuts.map((shortcut, index) => (
        <Pressable
          key={index}
          style={styles.shortcut}
          onPress={() => router.push(shortcut.route as any)}
          accessibilityLabel={shortcut.label}
          accessibilityRole="button"
        >
          {shortcut.badge && (
            <View style={[
              styles.badge,
              shortcut.badge === 'HOT' ? styles.hotBadge : styles.newBadge
            ]}>
              <ThemedText style={[
                styles.badgeText,
                shortcut.badge === 'HOT' ? styles.hotBadgeText : styles.newBadgeText
              ]}>{shortcut.badge}</ThemedText>
            </View>
          )}
          <View style={styles.iconContainer}>
            <ThemedText style={styles.icon}>{shortcut.icon}</ThemedText>
          </View>
          <ThemedText style={styles.label}>{shortcut.label}</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 12,
  },
  shortcut: {
    alignItems: 'center',
    marginHorizontal: 8,
    padding: 8,
    position: 'relative',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.15)',
    shadowColor: colors.brand.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.navyDark,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  newBadge: {
    backgroundColor: colors.brand.green,
  },
  hotBadge: {
    backgroundColor: colors.brand.goldWarm,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  newBadgeText: {
    color: 'white',
  },
  hotBadgeText: {
    color: colors.brand.navyDark,
  },
});

export default React.memo(NavigationShortcuts);
