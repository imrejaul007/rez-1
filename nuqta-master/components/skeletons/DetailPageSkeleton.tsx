/**
 * DetailPageSkeleton - For detail screens (article, post, event, review, booking, image, UGC)
 *
 * Layout: header image + title + metadata lines + body text blocks
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function DetailPageSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header Image */}
      <SkeletonLoader width="100%" height={220} borderRadius={0} />

      <View style={styles.content}>
        {/* Title */}
        <SkeletonLoader width="85%" height={24} borderRadius={6} style={styles.title} />
        <SkeletonLoader width="55%" height={24} borderRadius={6} style={styles.titleLine2} />

        {/* Metadata row */}
        <View style={styles.metaRow}>
          <SkeletonLoader width={32} height={32} variant="circle" />
          <View style={styles.metaText}>
            <SkeletonLoader width={120} height={14} borderRadius={4} />
            <SkeletonLoader width={80} height={12} borderRadius={4} style={styles.metaDate} />
          </View>
        </View>

        {/* Divider */}
        <SkeletonLoader width="100%" height={1} borderRadius={0} style={styles.divider} />

        {/* Body text lines */}
        <SkeletonLoader width="100%" height={14} borderRadius={4} style={styles.bodyLine} />
        <SkeletonLoader width="95%" height={14} borderRadius={4} style={styles.bodyLine} />
        <SkeletonLoader width="88%" height={14} borderRadius={4} style={styles.bodyLine} />
        <SkeletonLoader width="100%" height={14} borderRadius={4} style={styles.bodyLine} />
        <SkeletonLoader width="72%" height={14} borderRadius={4} style={styles.bodyLine} />

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Secondary content block */}
        <SkeletonLoader width="100%" height={14} borderRadius={4} style={styles.bodyLine} />
        <SkeletonLoader width="90%" height={14} borderRadius={4} style={styles.bodyLine} />
        <SkeletonLoader width="65%" height={14} borderRadius={4} style={styles.bodyLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: 16,
  },
  title: {
    marginTop: 16,
    marginBottom: 6,
  },
  titleLine2: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    marginLeft: 10,
    gap: 4,
  },
  metaDate: {
    marginTop: 2,
  },
  divider: {
    marginBottom: 20,
  },
  bodyLine: {
    marginBottom: 10,
  },
  spacer: {
    height: 16,
  },
});

export default React.memo(DetailPageSkeleton);
