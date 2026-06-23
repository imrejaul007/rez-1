/**
 * WalletQuickActions Component
 *
 * Displays quick action buttons for wallet features like P2P transfer,
 * gift coins, expiry tracker, gift cards, and scheduled drops.
 */

import React from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface WalletQuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
  description?: string;
}

const WALLET_ACTIONS: WalletQuickAction[] = [
  {
    id: 'transfer',
    icon: 'swap-horizontal',
    label: 'Transfer',
    route: '/wallet/transfer',
    color: colors.brand.indigo,
    description: 'Send coins to friends',
  },
  {
    id: 'gift',
    icon: 'gift',
    label: 'Gift Coins',
    route: '/wallet/gift',
    color: colors.brand.pink,
    description: 'Gift coins to others',
  },
  {
    id: 'expiry',
    icon: 'time',
    label: 'Expiry',
    route: '/wallet/expiry-tracker',
    color: colors.warning,
    description: 'Track coin expiry',
  },
  {
    id: 'gift-cards',
    icon: 'card',
    label: 'Gift Cards',
    route: '/wallet/gift-cards',
    color: colors.lightMustard,
    description: 'Buy gift cards',
  },
  {
    id: 'drops',
    icon: 'calendar',
    label: 'Drops',
    route: '/wallet/scheduled-drops',
    color: colors.brand.purpleLight,
    description: 'Scheduled rewards',
  },
];

interface WalletQuickActionsProps {
  style?: any;
  showTitle?: boolean;
}

export const WalletQuickActions: React.FC<WalletQuickActionsProps> = ({
  style,
  showTitle = true,
}) => {
  const router = useRouter();

  const handleActionPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, style]}>
      {showTitle && (
        <View style={styles.header}>
          <ThemedText style={styles.title}>Quick Actions</ThemedText>
          <ThemedText style={styles.subtitle}>Manage your wallet</ThemedText>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsContainer}
      >
        {WALLET_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={styles.actionCard}
            onPress={() => handleActionPress(action.route)}
           
            accessibilityLabel={action.label}
            accessibilityHint={action.description}
            accessibilityRole="button"
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon} size={20} color={action.color} />
            </View>
            <ThemedText style={styles.actionLabel} numberOfLines={1}>
              {action.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  header: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  actionsContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minWidth: 68,
    ...Shadows.subtle,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: Colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default React.memo(WalletQuickActions);
