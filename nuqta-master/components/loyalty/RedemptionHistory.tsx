// @ts-nocheck
/**
 * Redemption History Component
 * Shows past redemptions and vouchers
 */

import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { RedemptionRecord } from '@/types/loyaltyRedemption.types';
import { colors } from '@/constants/theme';

interface RedemptionHistoryProps {
  redemptions: RedemptionRecord[];
  onViewDetails?: (redemption: RedemptionRecord) => void;
}

function RedemptionHistory({ redemptions, onViewDetails }: RedemptionHistoryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.successScale[400];
      case 'used':
        return colors.neutral[500];
      case 'expired':
        return colors.error;
      case 'cancelled':
        return colors.warningScale[400];
      default:
        return colors.neutral[500];
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'active':
        return 'checkmark-circle';
      case 'used':
        return 'checkmark-done-circle';
      case 'expired':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'ellipse';
    }
  };

  const renderRedemption = ({ item }: { item: RedemptionRecord }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <Pressable
        style={styles.redemptionCard}
        onPress={() => onViewDetails?.(item)}
       
      >
        <View style={styles.redemptionIcon}>
          <Ionicons name="gift" size={24} color={colors.brand.purpleLight} />
        </View>

        <View style={styles.redemptionContent}>
          <ThemedText style={styles.redemptionTitle}>{item.reward.title}</ThemedText>
          <ThemedText style={styles.redemptionDate}>
            {new Date(item.redeemedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>

          {item.code && (
            <View style={styles.codeContainer}>
              <ThemedText style={styles.codeLabel}>Code:</ThemedText>
              <ThemedText style={styles.codeValue}>{item.code}</ThemedText>
            </View>
          )}

          {item.expiresAt && item.status === 'active' && (
            <View style={styles.expiryInfo}>
              <Ionicons name="time-outline" size={14} color={colors.warningScale[400]} />
              <ThemedText style={styles.expiryText}>
                Expires {new Date(item.expiresAt).toLocaleDateString()}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.redemptionRight}>
          <View style={styles.pointsBadge}>
            <Ionicons name="diamond" size={14} color={colors.warningScale[400]} />
            <ThemedText style={styles.pointsText}>{item.pointsSpent}</ThemedText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={getStatusIcon(item.status)} size={14} color={statusColor} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  if (redemptions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={64} color={colors.neutral[300]} />
        <ThemedText style={styles.emptyTitle}>No redemptions yet</ThemedText>
        <ThemedText style={styles.emptyText}>
          Your redeemed rewards will appear here
        </ThemedText>
      </View>
    );
  }

  return (
    <FlashList
      data={redemptions}
      renderItem={renderRedemption}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      estimatedItemSize={80}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  redemptionCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  redemptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  redemptionContent: {
    flex: 1,
  },
  redemptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  redemptionDate: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginRight: 4,
  },
  codeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
    color: colors.brand.amberDark,
  },
  redemptionRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[500],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});

export default React.memo(RedemptionHistory);
