// RewardsBreakdownCard - Unified post-order rewards display
// Shows earned rewards, progress bar, and checklist of earnable actions

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { RewardChecklistItem } from '@/hooks/usePostOrderRewards';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface RewardsBreakdownCardProps {
  totalEarned: number;
  totalPossible: number;
  progressPercent: number;
  checklistItems: RewardChecklistItem[];
  onReviewPress: () => void;
  onSharePress: () => void;
  currencySymbol?: string;
}

const COIN_IMAGE = BRAND.COIN_IMAGE;

function RewardsBreakdownCard({
  totalEarned,
  totalPossible,
  progressPercent,
  checklistItems,
  onReviewPress,
  onSharePress,
  currencySymbol = '',
}: RewardsBreakdownCardProps) {
  const progressAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 400 });

    // Width uses reanimated
    const timer = setTimeout(() => {
      progressAnim.value = withTiming(progressPercent, { duration: 800 });
    }, 300);

    return () => { clearTimeout(timer); };
  }, [progressPercent]);

  const progressWidthStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(progressAnim.value, 0), 100)}%`,
  }));

  const getItemIcon = (item: RewardChecklistItem): keyof typeof Ionicons.glyphMap => {
    switch (item.id) {
      case 'cashback': return 'wallet';
      case 'review': return 'star';
      case 'share': return 'share-social';
      default: return 'gift';
    }
  };

  const getItemAction = (item: RewardChecklistItem) => {
    switch (item.id) {
      case 'review': return onReviewPress;
      case 'share': return onSharePress;
      default: return undefined;
    }
  };

  const renderStatusBadge = (item: RewardChecklistItem) => {
    if (item.isLoading) {
      return (
        <View style={styles.statusBadgeLoading}>
          <ActivityIndicator size="small" color={colors.secondary[500]} />
        </View>
      );
    }

    switch (item.status) {
      case 'completed':
        return (
          <View style={styles.statusBadgeCompleted}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        );
      case 'available': {
        const action = getItemAction(item);
        return action ? (
          <Pressable
            style={styles.statusBadgeAvailable}
            onPress={action}
           
            accessibilityRole="button"
          >
            <Text style={styles.statusBadgeAvailableText}>
              {item.id === 'share' ? 'Share' : 'Review'}
            </Text>
          </Pressable>
        ) : null;
      }
      case 'locked':
        return (
          <View style={styles.statusBadgeLocked}>
            <Ionicons name="lock-closed" size={14} color={colors.neutral[400]} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.container, fadeStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CachedImage source={COIN_IMAGE} style={styles.headerCoinImage} contentFit="contain" />
          <Text style={styles.headerTitle}>Your Rewards</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalEarnedValue}>{totalEarned}</Text>
          <Text style={styles.totalEarnedLabel}>{BRAND.CURRENCY_CODE} earned</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, progressWidthStyle]} />
        </View>
        <Text style={styles.progressText}>
          {totalEarned} of {totalPossible} {BRAND.CURRENCY_CODE} earned
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Earn More Label */}
      <Text style={styles.earnMoreLabel}>Earn More Coins</Text>

      {/* Checklist */}
      {checklistItems.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.checklistItem,
            index === checklistItems.length - 1 && styles.checklistItemLast,
          ]}
        >
          {/* Icon Circle */}
          <View
            style={[
              styles.itemIconCircle,
              item.status === 'completed' && styles.itemIconCircleCompleted,
              item.status === 'locked' && styles.itemIconCircleLocked,
            ]}
          >
            {item.status === 'completed' ? (
              <Ionicons name="checkmark" size={18} color={colors.success} />
            ) : (
              <Ionicons
                name={getItemIcon(item)}
                size={18}
                color={item.status === 'locked' ? colors.neutral[400] : colors.secondary[500]}
              />
            )}
          </View>

          {/* Content */}
          <View style={styles.itemContent}>
            <Text
              style={[
                styles.itemLabel,
                item.status === 'locked' && styles.itemLabelLocked,
              ]}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.itemDescription,
                item.status === 'locked' && styles.itemDescriptionLocked,
              ]}
            >
              {item.description}
            </Text>
          </View>

          {/* Coin Amount + Status */}
          <View style={styles.itemRight}>
            {item.status !== 'completed' && item.id !== 'cashback' && (
              <View style={styles.coinBadge}>
                <CachedImage source={COIN_IMAGE} style={styles.coinBadgeImage} contentFit="contain" />
                <Text style={styles.coinBadgeText}>+{item.coinAmount}</Text>
              </View>
            )}
            {renderStatusBadge(item)}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
    width: '100%',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.secondary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCoinImage: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.background.primary,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalEarnedValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[500],
    lineHeight: 26,
  },
  totalEarnedLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Progress
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  progressText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  // Earn More
  earnMoreLabel: {
    ...typography.overline,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  // Checklist
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  checklistItemLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.lg,
  },
  // Icon Circle
  itemIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIconCircleCompleted: {
    backgroundColor: '#E8FFF3',
  },
  itemIconCircleLocked: {
    backgroundColor: colors.neutral[100],
  },
  // Content
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  itemLabelLocked: {
    color: colors.neutral[400],
  },
  itemDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  itemDescriptionLocked: {
    color: colors.neutral[400],
  },
  // Right side
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coinBadgeImage: {
    width: 16,
    height: 16,
  },
  coinBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary[500],
  },
  // Status badges
  statusBadgeCompleted: {
    padding: 2,
  },
  statusBadgeAvailable: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  statusBadgeAvailableText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary[500],
  },
  statusBadgeLocked: {
    padding: 4,
  },
  statusBadgeLoading: {
    padding: 4,
  },
});

export default React.memo(RewardsBreakdownCard);
