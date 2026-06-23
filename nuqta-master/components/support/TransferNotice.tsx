// Transfer Notice Component
// Shows notification when conversation is transferred

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import type { ConversationTransfer } from '@/types/supportChat.types';
import { colors } from '@/constants/theme';

interface TransferNoticeProps {
  transfer: ConversationTransfer;
}

function TransferNotice({ transfer }: TransferNoticeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="swap-horizontal" size={20} color={colors.infoScale[400]} />
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Conversation Transferred</ThemedText>
        <ThemedText style={styles.message}>
          {transfer.fromAgentName} has transferred you to {transfer.toAgentName}
          {transfer.reason && ` - ${transfer.reason}`}
        </ThemedText>
        {transfer.accepted ? (
          <View style={styles.status}>
            <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
            <ThemedText style={styles.statusTextAccepted}>
              {transfer.toAgentName} has accepted
            </ThemedText>
          </View>
        ) : (
          <View style={styles.status}>
            <Ionicons name="time" size={16} color={colors.warningScale[400]} />
            <ThemedText style={styles.statusTextPending}>
              Waiting for {transfer.toAgentName} to join...
            </ThemedText>
          </View>
        )}
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tint.blue,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: colors.neutral[800],
    lineHeight: 20,
    marginBottom: 8,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTextAccepted: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  statusTextPending: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
});

export default React.memo(TransferNotice);
