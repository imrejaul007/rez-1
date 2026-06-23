/**
 * SectionListSkeleton - For pages with multiple collapsible sections
 *
 * Layout: section headers + nested items
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function SectionBlock() {
  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <SkeletonLoader width="60%" height={16} borderRadius={4} />
        <SkeletonLoader width={20} height={20} borderRadius={4} />
      </View>

      {/* Section Items */}
      {[1, 2].map((i) => (
        <View key={i} style={styles.item}>
          <SkeletonLoader width="85%" height={14} borderRadius={4} />
          <SkeletonLoader width="55%" height={12} borderRadius={4} style={styles.itemSubtext} />
        </View>
      ))}
    </View>
  );
}

function SectionListSkeleton({ sections = 5 }: { sections?: number }) {
  return (
    <View style={styles.container}>
      {/* Page Title */}
      <SkeletonLoader width={160} height={22} borderRadius={6} style={styles.title} />

      {/* Search Bar (optional) */}
      <SkeletonLoader width="100%" height={44} borderRadius={12} style={styles.searchBar} />

      {Array.from({ length: sections }).map((_, i) => (
        <SectionBlock key={i} />
      ))}
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
  title: {
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  item: {
    paddingVertical: 10,
    paddingLeft: 8,
  },
  itemSubtext: {
    marginTop: 4,
  },
});

export default React.memo(SectionListSkeleton);
