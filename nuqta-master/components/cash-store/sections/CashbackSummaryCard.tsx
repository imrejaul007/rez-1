/**
 * CashbackSummaryCard Component
 *
 * Displays the user's cashback summary with total, pending, confirmed, and available amounts
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface CashbackSummaryCardProps {
  total: number;
  pending: number;
  confirmed: number;
  available: number;
  isLoading?: boolean;
}

const CashbackSummaryCard: React.FC<CashbackSummaryCardProps> = ({
  total,
  pending,
  confirmed,
  available,
  isLoading = false,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const handlePress = () => {
    router.push('/account/cashback' as any);
  };

  const formatAmount = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(locale)}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.nileBlue, '#243f55']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonAmount} />
            <View style={styles.skeletonRow} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={[colors.nileBlue, '#243f55']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.label}>Total Cashback</Text>
              <Text style={styles.totalAmount}>{formatAmount(total)}</Text>
            </View>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValue}>{formatAmount(pending)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Confirmed</Text>
              <Text style={styles.statValue}>{formatAmount(confirmed)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={styles.statValue}>{formatAmount(available)}</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: -0.5,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  // Skeleton styles
  skeletonContainer: {
    gap: 12,
  },
  skeletonTitle: {
    width: 100,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  skeletonAmount: {
    width: 150,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  skeletonRow: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginTop: 16,
  },
});

export default memo(CashbackSummaryCard);
