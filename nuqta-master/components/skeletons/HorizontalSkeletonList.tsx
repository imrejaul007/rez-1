/**
 * HorizontalSkeletonList - Horizontal FlatList with skeleton cards
 *
 * Generic, reusable for any card type
 *
 * Usage:
 * <HorizontalSkeletonList
 *   SkeletonComponent={UGCCardSkeleton}
 *   count={4}
 *   cardWidth={200}
 * />
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

interface HorizontalSkeletonListProps {
  SkeletonComponent: React.ComponentType<any>;
  count?: number;
  cardWidth?: number;
  gap?: number;
  paddingHorizontal?: number;
}

function HorizontalSkeletonList({
  SkeletonComponent,
  count = 4,
  cardWidth = 200,
  gap = 14,
  paddingHorizontal = 20,
}: HorizontalSkeletonListProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal, gap },
      ]}
      scrollEnabled={false}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ width: cardWidth }}>
          <SkeletonComponent cardWidth={cardWidth} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 8,
  },
});

export default React.memo(HorizontalSkeletonList);
