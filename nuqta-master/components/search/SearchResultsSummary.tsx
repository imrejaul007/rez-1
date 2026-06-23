import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SearchResultsSummary as SearchResultsSummaryType } from '@/types/search.types';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface SearchResultsSummaryProps {
  query: string;
  summary: SearchResultsSummaryType;
}

function SearchResultsSummary({ query, summary }: SearchResultsSummaryProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toLocaleString(locale)}`;
  };

  if (!summary) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Results for '{query}'</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.statText}>
          {summary.sellerCount} {summary.sellerCount === 1 ? 'seller' : 'sellers'}
        </Text>
        <Text style={styles.statText}>
          Prices start from {formatPrice(summary.minPrice)}
        </Text>
        <Text style={styles.statText}>
          Earn up to {formatPrice(summary.maxCashback)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerRow: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
});


export default React.memo(SearchResultsSummary);
