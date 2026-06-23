import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/DesignSystem';

interface ProcessingOverlayProps {
  visible: boolean;
  message: string;
}

function ProcessingOverlay({ visible, message }: ProcessingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.processingOverlay}>
      <View style={styles.processingContent}>
        <View style={styles.processingSpinner}>
          <Ionicons name="sync" size={48} color={Colors.gold} />
        </View>
        <ThemedText style={styles.processingMessage}>{message}</ThemedText>
        <ThemedText style={styles.processingWarning}>Please don't close the app</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  processingContent: {
    alignItems: 'center',
    padding: 32,
  },
  processingSpinner: {
    marginBottom: 24,
  },
  processingMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  processingWarning: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
});

export default React.memo(ProcessingOverlay);
