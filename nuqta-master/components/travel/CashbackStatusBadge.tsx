// CashbackStatusBadge Component
// Displays cashback lifecycle status for travel bookings

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CashbackStatus } from '@/services/serviceBookingApi';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';

interface CashbackStatusBadgeProps {
  status: CashbackStatus;
  amount: number;
  verificationDays?: number;
  creditedAt?: string;
  currencySymbol?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<CashbackStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  pending: {
    label: 'Cashback Pending',
    color: '#94A3B8',
    bgColor: colors.tint.slate,
    icon: 'hourglass-outline',
  },
  held: {
    label: 'Verifying',
    color: colors.warningScale[400],
    bgColor: colors.tint.amber,
    icon: 'time-outline',
  },
  credited: {
    label: 'Cashback Credited',
    color: colors.success,
    bgColor: colors.successScale[50],
    icon: 'checkmark-circle',
  },
  clawed_back: {
    label: 'Cashback Reversed',
    color: colors.error,
    bgColor: colors.errorScale[50],
    icon: 'close-circle',
  },
};

function CashbackStatusBadge({
  status,
  amount,
  verificationDays,
  creditedAt,
  currencySymbol: currencySymbolProp,
  compact = false,
}: CashbackStatusBadgeProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = currencySymbolProp ?? getCurrencySymbol();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  // Build label with dynamic info
  let displayLabel = config.label;
  if (status === 'held' && verificationDays) {
    displayLabel = `Verifying (${verificationDays}d)`;
  }
  if (status === 'credited' && creditedAt) {
    const creditDate = new Date(creditedAt);
    displayLabel = `Credited ${creditDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={12} color={config.color} />
        <Text style={[styles.compactText, { color: config.color }]}>
          {currencySymbol}{amount.toLocaleString()}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor, borderLeftColor: config.color }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Ionicons name="gift" size={20} color={config.color} />
          <View>
            <Text style={styles.amountText}>
              {currencySymbol}{amount.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.badgeText, { color: config.color }]}>{displayLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default React.memo(CashbackStatusBadge);
