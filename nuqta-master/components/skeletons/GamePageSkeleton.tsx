/**
 * GamePageSkeleton - For game screens (spin wheel, scratch card, quiz, memory, etc.)
 *
 * Layout: header + center prize area + action button
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function GamePageSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header area */}
      <View style={styles.header}>
        <SkeletonLoader width={160} height={22} borderRadius={6} />
        <SkeletonLoader width="80%" height={14} borderRadius={4} style={styles.subtitle} />
      </View>

      {/* Prize indicator */}
      <View style={styles.prizeRow}>
        <SkeletonLoader width={70} height={28} borderRadius={8} />
        <SkeletonLoader width={90} height={14} borderRadius={4} />
      </View>

      {/* Center game area */}
      <View style={styles.gameArea}>
        <SkeletonLoader
          width={SCREEN_WIDTH * 0.6}
          height={SCREEN_WIDTH * 0.6}
          variant="circle"
        />
      </View>

      {/* Action button */}
      <SkeletonLoader width="80%" height={52} borderRadius={26} style={styles.button} />

      {/* Info text */}
      <SkeletonLoader width={200} height={12} borderRadius={4} style={styles.infoText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 20,
  },
  subtitle: {
    marginTop: 8,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  gameArea: {
    marginVertical: 24,
    alignItems: 'center',
  },
  button: {
    marginTop: 24,
    alignSelf: 'center',
  },
  infoText: {
    marginTop: 16,
    alignSelf: 'center',
  },
});

export default React.memo(GamePageSkeleton);
