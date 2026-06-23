// Agent Card Component
// Displays agent information and status

import React from 'react';
import { View, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import type { SupportAgent } from '@/types/supportChat.types';
import { colors } from '@/constants/theme';

interface AgentCardProps {
  agent: SupportAgent;
  showDetails?: boolean;
}

function AgentCard({ agent, showDetails = false }: AgentCardProps) {
  const getStatusColor = () => {
    switch (agent.status) {
      case 'online':
        return colors.successScale[400];
      case 'away':
        return colors.warningScale[400];
      case 'busy':
        return colors.error;
      case 'offline':
        return colors.neutral[500];
      default:
        return colors.neutral[500];
    }
  };

  const getStatusText = () => {
    switch (agent.status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'online':
        return 'checkmark-circle';
      case 'away':
        return 'time';
      case 'busy':
        return 'busy';
      case 'offline':
        return 'remove-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {agent.avatar ? (
          <CachedImage source={{ uri: agent.avatar }} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarText}>
              {agent.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon() as any} size={12} color="white" />
        </View>
      </View>

      <View style={styles.info}>
        <ThemedText style={styles.name}>{agent.name}</ThemedText>
        <ThemedText style={styles.title}>{agent.title}</ThemedText>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <ThemedText style={styles.statusText}>{getStatusText()}</ThemedText>
          {agent.isTyping && (
            <>
              <ThemedText style={styles.separator}>•</ThemedText>
              <ThemedText style={styles.typingText}>typing...</ThemedText>
            </>
          )}
        </View>

        {showDetails && (
          <View style={styles.details}>
            {agent.department && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={14} color={colors.neutral[500]} />
                <ThemedText style={styles.detailText}>{agent.department}</ThemedText>
              </View>
            )}

            {agent.rating && (
              <View style={styles.detailRow}>
                <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                <ThemedText style={styles.detailText}>
                  {agent.rating.toFixed(1)} rating
                </ThemedText>
              </View>
            )}

            {agent.responseTime && (
              <View style={styles.detailRow}>
                <Ionicons name="timer-outline" size={14} color={colors.neutral[500]} />
                <ThemedText style={styles.detailText}>
                  ~{Math.round(agent.responseTime / 60)}min response
                </ThemedText>
              </View>
            )}

            {agent.languages && agent.languages.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="language-outline" size={14} color={colors.neutral[500]} />
                <ThemedText style={styles.detailText}>
                  {agent.languages.join(', ')}
                </ThemedText>
              </View>
            )}
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
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successScale[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  separator: {
    fontSize: 12,
    color: colors.neutral[300],
    marginHorizontal: 6,
  },
  typingText: {
    fontSize: 12,
    color: colors.successScale[400],
    fontStyle: 'italic',
  },
  details: {
    marginTop: 8,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
});

export default React.memo(AgentCard);
