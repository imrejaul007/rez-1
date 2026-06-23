/**
 * PriveBalanceCard - Coin balance with breakdown
 * Shows total balance, ReZ/Privé/Branded coins, and monthly earnings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';
import { BRAND } from '@/constants/brand';

interface PriveBalanceCardProps {
  totalCoins: number;
  rezCoins: number;
  priveCoins: number;
  brandedCoins: number;
  monthlyEarnings: number;
}

export const PriveBalanceCard: React.FC<PriveBalanceCardProps> = ({
  totalCoins,
  rezCoins,
  priveCoins,
  brandedCoins,
  monthlyEarnings,
}) => {
  const router = useRouter();

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push('/prive/wallet' as any)}
     
    >
      <LinearGradient
        colors={['#1A1A1A', '#141414']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.label}>TOTAL BALANCE</Text>
          <Text style={styles.viewWallet}>View Wallet →</Text>
        </View>

        <Text style={styles.totalBalance}>{formatNumber(totalCoins)}</Text>
        <Text style={styles.coinsLabel}>coins</Text>

        <View style={styles.coinBreakdown}>
          <View style={styles.coinType}>
            <View style={[styles.coinDot, { backgroundColor: PRIVE_COLORS.gold.primary }]} />
            <Text style={styles.coinTypeText}>{formatNumber(rezCoins)} {BRAND.APP_NAME}</Text>
          </View>
          <View style={styles.coinType}>
            <View style={[styles.coinDot, { backgroundColor: '#B8860B' }]} />
            <Text style={styles.coinTypeText}>{formatNumber(priveCoins)} Privé</Text>
          </View>
          <View style={styles.coinType}>
            <View style={[styles.coinDot, { backgroundColor: '#8B7355' }]} />
            <Text style={styles.coinTypeText}>{formatNumber(brandedCoins)} Branded</Text>
          </View>
        </View>

        <View style={styles.monthlyEarnings}>
          <Text style={styles.monthlyLabel}>This month</Text>
          <Text style={styles.monthlyValue}>+{formatNumber(monthlyEarnings)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: PRIVE_SPACING.xl,
    marginTop: PRIVE_SPACING.lg,
    borderRadius: PRIVE_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.transparent.gold20,
  },
  gradient: {
    padding: PRIVE_SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.sm,
  },
  label: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
  },
  viewWallet: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
  },
  totalBalance: {
    fontSize: 42,
    fontWeight: '200',
    color: PRIVE_COLORS.gold.primary,
    letterSpacing: -1,
  },
  coinsLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  coinBreakdown: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.lg,
    paddingTop: PRIVE_SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white08,
  },
  coinType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
  },
  coinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  coinTypeText: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
  },
  monthlyEarnings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: PRIVE_SPACING.md,
    paddingTop: PRIVE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white08,
  },
  monthlyLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  monthlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
});

export default React.memo(PriveBalanceCard);
