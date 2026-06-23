// Queue Position Component
// Shows user's position in support queue

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import type { QueueInfo } from '@/types/supportChat.types';
import { colors } from '@/constants/theme';

interface QueuePositionProps {
  queueInfo: QueueInfo;
}

function QueuePosition({ queueInfo }: QueuePositionProps) {
  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) {
      return 'Less than a minute';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
      return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `~${hours} hour${hours > 1 ? 's' : ''}`;
    }

    return `~${hours}h ${remainingMinutes}m`;
  };

  const getQueueMessage = (): string => {
    if (queueInfo.position === 1) {
      return "You're next in line!";
    }

    if (queueInfo.position <= 3) {
      return "You'll be connected soon";
    }

    if (queueInfo.availableAgents === 0) {
      return 'Waiting for available agent';
    }

    return 'Please wait';
  };

  const getQueueColor = (): string => {
    if (queueInfo.position === 1) return colors.successScale[400];
    if (queueInfo.position <= 3) return colors.infoScale[400];
    if (queueInfo.position <= 5) return colors.warningScale[400];
    return colors.neutral[500];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${getQueueColor()}20` }]}>
          <Ionicons name="people" size={24} color={getQueueColor()} />
        </View>
        <ThemedText style={styles.title}>Waiting in Queue</ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.positionCard}>
          <View style={styles.positionRow}>
            <View style={styles.positionBadge}>
              <ThemedText style={styles.positionNumber}>
                {queueInfo.position}
              </ThemedText>
            </View>
            <View style={styles.positionInfo}>
              <ThemedText style={styles.positionLabel}>
                Position in queue
              </ThemedText>
              <ThemedText style={styles.positionMessage}>
                {getQueueMessage()}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={20} color={colors.neutral[500]} />
            <View style={styles.statInfo}>
              <ThemedText style={styles.statLabel}>Est. wait time</ThemedText>
              <ThemedText style={styles.statValue}>
                {formatWaitTime(queueInfo.estimatedWaitTime)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.stat}>
            <Ionicons name="people-outline" size={20} color={colors.neutral[500]} />
            <View style={styles.statInfo}>
              <ThemedText style={styles.statLabel}>In queue</ThemedText>
              <ThemedText style={styles.statValue}>
                {queueInfo.totalInQueue} {queueInfo.totalInQueue === 1 ? 'person' : 'people'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.agentInfo}>
          <View style={styles.agentStatus}>
            <View
              style={[
                styles.agentDot,
                { backgroundColor: queueInfo.availableAgents > 0 ? colors.successScale[400] : colors.neutral[500] },
              ]}
            />
            <ThemedText style={styles.agentText}>
              {queueInfo.availableAgents} agent{queueInfo.availableAgents !== 1 ? 's' : ''} available
            </ThemedText>
          </View>
          <ThemedText style={styles.agentSubtext}>
            {queueInfo.busyAgents} currently assisting
          </ThemedText>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={getQueueColor()} />
          <ThemedText style={styles.loadingText}>
            Connecting you to an agent...
          </ThemedText>
        </View>
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb-outline" size={16} color={colors.warningScale[400]} />
        <ThemedText style={styles.tipText}>
          While you wait, you can browse our FAQs for instant answers
        </ThemedText>
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  content: {
    gap: 16,
  },
  positionCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successScale[400],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  positionNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  positionInfo: {
    flex: 1,
  },
  positionLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  positionMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 12,
  },
  agentInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  agentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  agentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  agentSubtext: {
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tint.amber,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: colors.brand.amberDark,
    lineHeight: 18,
  },
});

export default React.memo(QueuePosition);
