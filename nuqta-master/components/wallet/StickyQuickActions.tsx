/**
 * StickyQuickActions - Glass/blur sticky action bar
 * Becomes sticky at top when scrolled past its natural position
 */
import React from 'react';
import { View, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
}

const ACTIONS: QuickAction[] = [
  { id: 'transactions', icon: 'receipt', label: 'History', route: '/earnings-history', color: colors.nileBlue },
  { id: 'transfer', icon: 'swap-horizontal', label: 'Transfer', route: '/wallet/transfer', color: colors.brand.indigo },
  { id: 'split', icon: 'people', label: 'Split Bill', route: '/wallet/bill-split', color: colors.brand.teal || '#0D9488' },
  { id: 'expiry', icon: 'time', label: 'Expiry', route: '/wallet/expiry-tracker', color: colors.warning },
  { id: 'gift-cards', icon: 'card', label: 'Gift Cards', route: '/wallet/gift-cards', color: colors.lightMustard },
  { id: 'gift', icon: 'gift', label: 'Gift', route: '/wallet/gift', color: colors.brand.pink },
  { id: 'drops', icon: 'calendar', label: 'Drops', route: '/wallet/scheduled-drops', color: colors.brand.purpleLight },
];

interface StickyQuickActionsProps {
  isSticky?: boolean;
  style?: any;
}

export const StickyQuickActions: React.FC<StickyQuickActionsProps> = ({ isSticky, style }) => {
  const router = useRouter();

  return (
    <View style={[
      styles.container,
      isSticky && styles.containerSticky,
      style,
    ]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={styles.actionItem}
            onPress={() => router.push(action.route as any)}
           
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon} size={18} color={action.color} />
            </View>
            <ThemedText style={styles.label}>{action.label}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: Colors.background.primary,
  },
  containerSticky: {
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.85)',
      android: 'rgba(255,255,255,0.95)',
      default: 'rgba(255,255,255,0.92)',
    }),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
    ...Shadows.subtle,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: 10,
  },
  actionItem: {
    alignItems: 'center',
    minWidth: 62,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
});

export default React.memo(StickyQuickActions);
