/**
 * Tier Benefits Card Component
 * Displays current tier and associated benefits
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { TierConfig, LoyaltyTier } from '@/types/loyaltyRedemption.types';
import { colors } from '@/constants/theme';

interface TierBenefitsCardProps {
  tierConfig: TierConfig;
  currentPoints: number;
  pointsToNextTier: number;
  nextTier: LoyaltyTier | null;
  onViewAllTiers?: () => void;
}

function TierBenefitsCard({
  tierConfig,
  currentPoints,
  pointsToNextTier,
  nextTier,
  onViewAllTiers,
}: TierBenefitsCardProps) {
  const getTierGradient = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'Bronze':
        return ['#CD7F32', '#A0522D'] as const;
      case 'Silver':
        return ['#C0C0C0', '#A8A8A8'] as const;
      case 'Gold':
        return [colors.brand.goldBright, '#FFA500'] as const;
      case 'Platinum':
        return ['#E5E4E2', '#A9A9A9'] as const;
      case 'Diamond':
        return ['#B9F2FF', '#00CED1'] as const;
      default:
        return [colors.brand.purpleLight, colors.brand.purple] as const;
    }
  };

  const getBenefitIcon = (type: string): any => {
    switch (type) {
      case 'discount':
        return 'pricetag';
      case 'freeDelivery':
        return 'car';
      case 'earlyAccess':
        return 'time';
      case 'exclusive':
        return 'star';
      case 'priority':
        return 'flash';
      case 'bonus':
        return 'gift';
      default:
        return 'checkmark-circle';
    }
  };

  const progress = tierConfig.maxPoints === Infinity
    ? 100
    : ((currentPoints - tierConfig.minPoints) / (tierConfig.maxPoints - tierConfig.minPoints)) * 100;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getTierGradient(tierConfig.name)}
        style={styles.tierCard}
      >
        <View style={styles.tierHeader}>
          <View style={styles.tierBadge}>
            <Ionicons name="star" size={32} color={colors.background.primary} />
          </View>
          <View style={styles.tierInfo}>
            <ThemedText style={styles.tierLabel}>Current Tier</ThemedText>
            <ThemedText style={styles.tierName}>{tierConfig.name}</ThemedText>
          </View>
        </View>

        <View style={styles.pointsContainer}>
          <Ionicons name="diamond" size={20} color={colors.background.primary} />
          <ThemedText style={styles.currentPoints}>{currentPoints}</ThemedText>
          <ThemedText style={styles.pointsLabel}>points</ThemedText>
        </View>

        {nextTier && (
          <>
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <ThemedText style={styles.progressText}>
                  {pointsToNextTier} points to {nextTier}
                </ThemedText>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
              </View>
            </View>
          </>
        )}
      </LinearGradient>

      <View style={styles.benefitsCard}>
        <View style={styles.benefitsHeader}>
          <ThemedText style={styles.benefitsTitle}>Your Benefits</ThemedText>
          {onViewAllTiers && (
            <Pressable onPress={onViewAllTiers}>
              <ThemedText style={styles.viewAllText}>View All Tiers</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.benefitsList}>
          {tierConfig.benefits.map((benefit, index) => (
            <View key={benefit.id} style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${tierConfig.color}15` }]}>
                <Ionicons
                  name={getBenefitIcon(benefit.type)}
                  size={20}
                  color={tierConfig.color}
                />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
                <ThemedText style={styles.benefitDescription}>{benefit.description}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {tierConfig.discountPercentage > 0 && (
          <View style={styles.discountBanner}>
            <Ionicons name="pricetag" size={20} color={colors.successScale[400]} />
            <ThemedText style={styles.discountText}>
              Extra {tierConfig.discountPercentage}% discount on all orders
            </ThemedText>
          </View>
        )}

        {tierConfig.earningMultiplier > 1 && (
          <View style={styles.multiplierBanner}>
            <Ionicons name="flash" size={20} color={colors.warningScale[400]} />
            <ThemedText style={styles.multiplierText}>
              {tierConfig.earningMultiplier}x points on every purchase
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  tierCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background.primary,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  currentPoints: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.background.primary,
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 4,
  },
  benefitsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  benefitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  viewAllText: {
    fontSize: 14,
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.green,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  discountText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.successScale[700],
  },
  multiplierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  multiplierText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
});

export default React.memo(TierBenefitsCard);
