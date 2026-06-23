/**
 * Reward Card Component
 * Displays a single reward option with redemption controls
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { RewardItem } from '@/types/loyaltyRedemption.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface RewardCardProps {
  reward: RewardItem;
  canRedeem: boolean;
  onRedeem: (reward: RewardItem) => void;
  userPoints?: number;
  tierColor?: string;
  compact?: boolean;
}

function RewardCard({
  reward,
  canRedeem,
  onRedeem,
  userPoints = 0,
  tierColor = colors.brand.purpleLight,
  compact = false,
}: RewardCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const getTypeIcon = (type: string): any => {
    switch (type) {
      case 'discountVoucher':
      case 'percentageDiscount':
        return 'pricetag';
      case 'freeProduct':
        return 'gift';
      case 'freeDelivery':
        return 'car';
      case 'earlyAccess':
        return 'time';
      case 'exclusiveProduct':
        return 'star';
      case 'partnerReward':
        return 'people';
      case 'cashCredit':
        return 'cash';
      case 'charityDonation':
        return 'heart';
      default:
        return 'diamond';
    }
  };

  const getValueDisplay = () => {
    if (reward.type === 'percentageDiscount') {
      return `${reward.value}% OFF`;
    }
    if (reward.type === 'discountVoucher' || reward.type === 'cashCredit') {
      return `${currencySymbol}${reward.value}`;
    }
    return reward.value;
  };

  const pointsNeeded = Math.max(0, reward.points - userPoints);

  if (compact) {
    return (
      <Pressable
        style={[styles.compactCard, !canRedeem && styles.cardDisabled]}
        onPress={() => canRedeem && onRedeem(reward)}
       
        disabled={!canRedeem}
      >
        <View style={[styles.compactIcon, { backgroundColor: `${tierColor}15` }]}>
          <Ionicons name={getTypeIcon(reward.type)} size={24} color={tierColor} />
        </View>

        <View style={styles.compactInfo}>
          <ThemedText style={styles.compactTitle} numberOfLines={1}>
            {reward.title}
          </ThemedText>
          <View style={styles.compactFooter}>
            <View style={styles.pointsBadge}>
              <Ionicons name="diamond" size={12} color={colors.warningScale[400]} />
              <ThemedText style={styles.pointsText}>{reward.points}</ThemedText>
            </View>
            {reward.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={10} color={colors.warningScale[400]} />
              </View>
            )}
          </View>
        </View>

        {canRedeem && (
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.card, !canRedeem && styles.cardDisabled]}
      onPress={() => canRedeem && onRedeem(reward)}
     
      disabled={!canRedeem}
    >
      {reward.featured && (
        <View style={styles.featuredCorner}>
          <Ionicons name="star" size={16} color={colors.background.primary} />
        </View>
      )}

      {reward.image ? (
        <CachedImage source={{ uri: reward.image }} style={styles.rewardImage} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <LinearGradient
          colors={[`${tierColor}20`, `${tierColor}10`]}
          style={styles.iconContainer}
        >
          <Ionicons name={getTypeIcon(reward.type)} size={40} color={tierColor} />
        </LinearGradient>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {reward.title}
          </ThemedText>

          {reward.category && (
            <View style={[styles.categoryBadge, { backgroundColor: `${tierColor}15` }]}>
              <ThemedText style={[styles.categoryText, { color: tierColor }]}>
                {reward.category}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={styles.description} numberOfLines={2}>
          {reward.description}
        </ThemedText>

        <View style={styles.valueContainer}>
          <View style={styles.valueBox}>
            <ThemedText style={styles.valueLabel}>Value</ThemedText>
            <ThemedText style={styles.valueAmount}>{getValueDisplay()}</ThemedText>
          </View>

          <View style={styles.pointsContainer}>
            <Ionicons name="diamond" size={16} color={colors.warningScale[400]} />
            <ThemedText style={styles.pointsAmount}>{reward.points}</ThemedText>
            <ThemedText style={styles.pointsLabel}>points</ThemedText>
          </View>
        </View>

        {!canRedeem && pointsNeeded > 0 && (
          <View style={styles.insufficientBadge}>
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <ThemedText style={styles.insufficientText}>
              Need {pointsNeeded} more points
            </ThemedText>
          </View>
        )}

        {reward.stockRemaining !== undefined && reward.stockRemaining > 0 && reward.stockRemaining <= 10 && (
          <View style={styles.stockWarning}>
            <Ionicons name="warning" size={14} color={colors.warningScale[400]} />
            <ThemedText style={styles.stockText}>
              Only {reward.stockRemaining} left
            </ThemedText>
          </View>
        )}

        {!reward.available && (
          <View style={styles.unavailableBadge}>
            <ThemedText style={styles.unavailableText}>Coming Soon</ThemedText>
          </View>
        )}

        {reward.validUntil && (
          <View style={styles.validityInfo}>
            <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
            <ThemedText style={styles.validityText}>
              Valid until {new Date(reward.validUntil).toLocaleDateString()}
            </ThemedText>
          </View>
        )}
      </View>

      {canRedeem && (
        <Pressable
          style={[styles.redeemButton, { backgroundColor: tierColor }]}
          onPress={() => onRedeem(reward)}
        >
          <ThemedText style={styles.redeemButtonText}>Redeem Now</ThemedText>
          <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  featuredCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.warningScale[400],
    width: 40,
    height: 40,
    borderBottomLeftRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rewardImage: {
    width: '100%',
    height: 160,
  },
  iconContainer: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 12,
    lineHeight: 20,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[100],
  },
  valueBox: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warningScale[400],
  },
  pointsLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  insufficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  insufficientText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  stockText: {
    fontSize: 13,
    color: colors.brand.amberDark,
    fontWeight: '600',
  },
  unavailableBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  validityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validityText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  featuredBadge: {
    backgroundColor: colors.tint.amberLight,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(RewardCard);
