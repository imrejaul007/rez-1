/**
 * ChatSkeleton - For messaging/chat screens
 *
 * Layout: alternating left/right message bubbles
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function ChatSkeleton() {
  return (
    <View style={styles.container}>
      {/* Chat Header */}
      <View style={styles.header}>
        <SkeletonLoader width={40} height={40} variant="circle" />
        <View style={styles.headerText}>
          <SkeletonLoader width={120} height={16} borderRadius={4} />
          <SkeletonLoader width={60} height={12} borderRadius={4} style={styles.status} />
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messages}>
        {/* Incoming */}
        <View style={styles.incomingRow}>
          <SkeletonLoader width="65%" height={40} borderRadius={16} />
        </View>
        <View style={styles.incomingRow}>
          <SkeletonLoader width="45%" height={32} borderRadius={16} />
        </View>

        {/* Outgoing */}
        <View style={styles.outgoingRow}>
          <SkeletonLoader width="55%" height={36} borderRadius={16} />
        </View>

        {/* Incoming */}
        <View style={styles.incomingRow}>
          <SkeletonLoader width="70%" height={56} borderRadius={16} />
        </View>

        {/* Outgoing */}
        <View style={styles.outgoingRow}>
          <SkeletonLoader width="50%" height={32} borderRadius={16} />
        </View>
        <View style={styles.outgoingRow}>
          <SkeletonLoader width="60%" height={40} borderRadius={16} />
        </View>

        {/* Incoming */}
        <View style={styles.incomingRow}>
          <SkeletonLoader width="40%" height={32} borderRadius={16} />
        </View>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <SkeletonLoader width="80%" height={44} borderRadius={22} />
        <SkeletonLoader width={44} height={44} variant="circle" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  headerText: {
    marginLeft: 12,
    gap: 4,
  },
  status: {
    marginTop: 2,
  },
  messages: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  incomingRow: {
    alignItems: 'flex-start',
  },
  outgoingRow: {
    alignItems: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral[100],
  },
});

export default React.memo(ChatSkeleton);
