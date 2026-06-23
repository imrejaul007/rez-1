/**
 * CardGridSkeleton - Generic 2-column card grid
 *
 * For: offers, deals, outlets, saved items, mall pages, flash sales
 */

import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonLoader width="100%" height={120} borderRadius={10} />
      <View style={styles.cardContent}>
        <SkeletonLoader width="85%" height={14} borderRadius={4} style={styles.cardTitle} />
        <SkeletonLoader width="60%" height={12} borderRadius={4} style={styles.cardSubtitle} />
        <SkeletonLoader width={70} height={16} borderRadius={4} style={styles.cardPrice} />
      </View>
    </View>
  );
}

function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <SkeletonLoader width={140} height={20} borderRadius={6} style={styles.header} />

      <View style={styles.grid}>
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    marginBottom: 6,
  },
  cardSubtitle: {
    marginBottom: 8,
  },
  cardPrice: {
    marginTop: 2,
  },
});

export default React.memo(CardGridSkeleton);
