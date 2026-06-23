// @ts-nocheck
/**
 * Store Info Card
 * 
 * Displays store details with membership badge and rewards banner
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StoreMembership, MembershipTier } from '@/types/storePayment.types';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface StoreInfoCardProps {
  storeName: string;
  storeLogo?: string;
  storeCategory?: string;
  membership?: StoreMembership | null;
}

const TIER_COLORS: Record<MembershipTier, { bg: string; text: string; icon: string }> = {
  new: { bg: colors.neutral[100], text: colors.neutral[700], icon: 'person-outline' },
  bronze: { bg: '#FDF2E9', text: colors.brand.amberDeep, icon: 'medal-outline' },
  silver: { bg: colors.neutral[100], text: colors.neutral[600], icon: 'medal' },
  gold: { bg: colors.tint.amberLight, text: colors.brand.amberDeep, icon: 'trophy' },
};

export const StoreInfoCard: React.FC<StoreInfoCardProps> = ({
  storeName,
  storeLogo,
  storeCategory,
  membership,
}) => {
  const tierStyle = membership ? TIER_COLORS[membership.tier] : TIER_colors.new;

  return (
    <View style={styles.container}>
      <View style={styles.storeRow}>
        <View style={styles.logoContainer}>
          {storeLogo ? (
            <CachedImage source={{ uri: storeLogo }} style={styles.logo} cachePolicy="memory-disk" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="storefront" size={24} color={colors.neutral[400]} />
            </View>
          )}
        </View>
        
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{storeName}</Text>
          {storeCategory && (
            <Text style={styles.storeCategory}>{storeCategory}</Text>
          )}
        </View>

        {membership && (
          <View style={[styles.membershipBadge, { backgroundColor: tierStyle.bg }]}>
            <Ionicons name={tierStyle.icon as any} size={14} color={tierStyle.text} />
            <Text style={[styles.membershipText, { color: tierStyle.text }]}>
              {membership.tierName}
            </Text>
          </View>
        )}
      </View>

      {/* Rewards Banner */}
      <LinearGradient
        colors={[colors.primary[500], colors.primary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.rewardsBanner}
      >
        <Ionicons name="gift" size={16} color={colors.background.primary} />
        <Text style={styles.rewardsText}>
          You're earning rewards on this purchase!
        </Text>
        {membership?.benefits.cashbackBonus && membership.benefits.cashbackBonus > 0 && (
          <View style={styles.bonusBadge}>
            <Text style={styles.bonusText}>+{membership.benefits.cashbackBonus}%</Text>
          </View>
        )}
      </LinearGradient>

      {/* Membership Progress */}
      {membership && membership.nextTier && membership.visitsToNextTier > 0 && (
        <View style={styles.progressRow}>
          <Ionicons name="trending-up" size={14} color={colors.infoScale[500]} />
          <Text style={styles.progressText}>
            {membership.visitsToNextTier} more visits to become a {membership.nextTier}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    marginRight: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    ...typography.h4,
    color: colors.text.primary,
  },
  storeCategory: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  membershipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  rewardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  rewardsText: {
    ...typography.bodySmall,
    color: colors.background.primary,
    flex: 1,
  },
  bonusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bonusText: {
    ...typography.caption,
    color: colors.background.primary,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.xs,
  },
  progressText: {
    ...typography.caption,
    color: colors.infoScale[600],
  },
});

export default React.memo(StoreInfoCard);
