/**
 * ChatSkeleton - Chat message list skeleton
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface ChatSkeletonProps {
  count?: number;
}

function ChatSkeleton({ count = 5 }: ChatSkeletonProps) {
  return (
    <View style={styles.container} accessibilityLabel="Loading messages" accessibilityRole="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.bubble, i % 2 ? styles.right : styles.left]}>
          <SkeletonLoader width={200} height={14} style={styles.mb} />
          <SkeletonLoader width={140} height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  bubble: { padding: 12, borderRadius: 12, marginVertical: 4, maxWidth: '80%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  mb: { marginBottom: 6 },
});

export default ChatSkeleton;
