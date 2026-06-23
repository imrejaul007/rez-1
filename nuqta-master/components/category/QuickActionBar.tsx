/**
 * QuickActionBar Component
 * Horizontal scrollable action buttons for quick navigation
 * Enhanced with better visual design and Rez brand colors
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { quickActionsData, QuickAction } from '@/data/categoryDummyData';
import { colors } from '@/constants/theme';

interface QuickActionBarProps {
  categorySlug?: string;
  onActionPress?: (action: QuickAction) => void;
  actions?: QuickAction[];
}

// Quick action icons mapping for better visuals (legacy fallback)
const ACTION_ICONS: Record<string, string> = {
  offers: 'pricetag',
  cashback: 'wallet',
  exclusive: 'star',
  '60min': 'flash',
  compare: 'git-compare',
  play: 'game-controller',
  reviews: 'star',
  saved: 'heart',
};

// Check if a string is an Ionicons name (not an emoji — Ionicon names are lowercase alphanumeric with hyphens)
function isIonIconName(icon: string): boolean {
  return /^[a-z][a-z0-9-]+$/.test(icon);
}

const QuickActionItem = memo(({
  action,
  onPress,
  index,
}: {
  action: QuickAction;
  onPress: () => void;
  index: number;
}) => {
  const displayName = (action as any).label || action.name;
  const iconValue = action.icon;
  const ionIconName = isIonIconName(iconValue) ? iconValue : ACTION_ICONS[action.id];

  return (
    <Pressable
      style={styles.actionItem}
      onPress={onPress}
     
      accessibilityLabel={displayName}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, { backgroundColor: `${action.color}18` }]}>
        {ionIconName ? (
          <Ionicons name={ionIconName as any} size={22} color={action.color} />
        ) : (
          <Text style={styles.iconEmoji}>{iconValue}</Text>
        )}
      </View>
      <Text style={styles.actionName} numberOfLines={1}>{displayName}</Text>
      {action.id === '60min' && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>New</Text>
        </View>
      )}
    </Pressable>
  );
});

QuickActionItem.displayName = 'QuickActionItem';

const QuickActionBar: React.FC<QuickActionBarProps> = ({
  categorySlug,
  onActionPress,
  actions = quickActionsData,
}) => {
  const router = useRouter();

  // Default route mapping based on action id (fallback when action.route is not set)
  const getDefaultRoute = useCallback((actionId: string, slug?: string): string | null => {
    const catSlug = slug || 'food-dining';
    switch (actionId) {
      case 'offers':
        return `/MainCategory/${catSlug}/offers`;
      case 'cashback':
        return `/MainCategory/${catSlug}/loyalty/coins`;
      case 'exclusive':
        return `/MainCategory/${catSlug}/offers`;
      case '60min':
        return `/MainCategory/${catSlug}/fast-delivery`;
      case 'compare':
        return `/MainCategory/${catSlug}/search`;
      case 'play':
        return '/(tabs)/play';
      case 'reviews':
        return '/explore/reviews';
      case 'saved':
        return '/wishlist';
      default:
        return null;
    }
  }, []);

  const handlePress = useCallback((action: QuickAction) => {
    if (onActionPress) {
      onActionPress(action);
      return;
    }
    // Priority: admin-configured route on action, then default route mapping
    const route = action.route || getDefaultRoute(action.id, categorySlug);
    if (route) {
      router.push(route as any);
    }
  }, [router, onActionPress, categorySlug, getDefaultRoute]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {actions.map((action, index) => (
          <QuickActionItem
            key={action.id}
            action={action}
            index={index}
            onPress={() => handlePress(action)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 12px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 4,
  },
  actionItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconEmoji: {
    fontSize: 22,
  },
  actionName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
    maxWidth: 60,
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.warningScale[400],
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.neutral[800],
  },
});

export default memo(QuickActionBar);
