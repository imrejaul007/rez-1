// Earnings Statistics Card Component
// Displays key earnings statistics

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EarningsStatistics } from '@/services/earningsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface EarningsStatsCardProps {
  stats: EarningsStatistics;
}

const EarningsStatsCard: React.FC<EarningsStatsCardProps> = ({ stats }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const statItems = [
    {
      icon: 'trending-up',
      label: 'Daily Avg',
      value: `${currencySymbol}${stats.dailyAverage.toFixed(2)}`,
      color: colors.lightMustard,
    },
    {
      icon: 'calendar',
      label: 'Weekly Avg',
      value: `${currencySymbol}${stats.weeklyAverage.toFixed(2)}`,
      color: colors.infoScale[400],
    },
    {
      icon: 'calendar-outline',
      label: 'Monthly Avg',
      value: `${currencySymbol}${stats.monthlyAverage.toFixed(2)}`,
      color: colors.brand.purpleLight,
    },
    {
      icon: 'receipt',
      label: 'Transactions',
      value: stats.transactionCount.toString(),
      color: colors.warningScale[400],
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings Statistics</Text>

      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default React.memo(EarningsStatsCard);
