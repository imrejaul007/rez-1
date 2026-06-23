/**
 * PriveQuickActions - Dynamic 2x4 grid of quick action buttons
 * Filtered by minimum tier from PriveContext
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  minTier?: string; // minimum tier required to show this action
}

const TIER_RANK: Record<string, number> = { none: 0, entry: 1, signature: 2, elite: 3 };

const ALL_QUICK_ACTIONS: QuickAction[] = [
  { id: 'wallet', label: 'Wallet', icon: '◈', route: '/prive/wallet' },
  { id: 'earnings', label: 'Earnings', icon: '↑', route: '/prive/earnings' },
  { id: 'redeem', label: 'Redeem', icon: '◇', route: '/prive/redeem' },
  { id: 'invite', label: 'Invite', icon: '✦', route: '/prive/invite-dashboard' },
  { id: 'missions', label: 'Missions', icon: '🎯', route: '/prive/missions' },
  { id: 'benefits', label: 'Benefits', icon: '⬡', route: '/prive/benefits' },
  { id: 'analytics', label: 'Analytics', icon: '📊', route: '/prive/analytics', minTier: 'signature' },
  { id: 'alerts', label: 'Alerts', icon: '🔔', route: '/prive/notifications' },
];

interface PriveQuickActionsProps {
  currentTier?: string;
}

export const PriveQuickActions: React.FC<PriveQuickActionsProps> = ({ currentTier = 'entry' }) => {
  const router = useRouter();
  const userRank = TIER_RANK[currentTier] || 0;

  const actions = ALL_QUICK_ACTIONS.filter(a => {
    if (!a.minTier) return true;
    return userRank >= (TIER_RANK[a.minTier] || 0);
  });

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          style={styles.actionItem}
          onPress={() => router.push(action.route as any)}
         
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>{action.icon}</Text>
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: PRIVE_SPACING.lg,
    paddingVertical: PRIVE_SPACING.xl,
    rowGap: PRIVE_SPACING.lg,
  },
  actionItem: {
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    width: '22%',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIVE_COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  actionIconText: {
    fontSize: 20,
    color: PRIVE_COLORS.gold.primary,
  },
  actionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default React.memo(PriveQuickActions);
