/**
 * MapViewSkeleton - For map-based pages
 *
 * Layout: map area (60% height) + bottom sheet with list items
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function MapViewSkeleton() {
  return (
    <View style={styles.container}>
      {/* Map Area */}
      <SkeletonLoader width="100%" height={SCREEN_HEIGHT * 0.55} borderRadius={0} />

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.handleWrapper}>
          <SkeletonLoader width={40} height={4} borderRadius={2} />
        </View>

        {/* Search Bar */}
        <SkeletonLoader width="100%" height={44} borderRadius={12} style={styles.searchBar} />

        {/* List Items */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.listItem}>
            <SkeletonLoader width={48} height={48} borderRadius={10} />
            <View style={styles.itemText}>
              <SkeletonLoader width="75%" height={14} borderRadius={4} />
              <SkeletonLoader width="50%" height={12} borderRadius={4} style={styles.itemSubtext} />
            </View>
            <SkeletonLoader width={50} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handleWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  searchBar: {
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  itemSubtext: {
    marginTop: 2,
  },
});

export default React.memo(MapViewSkeleton);
