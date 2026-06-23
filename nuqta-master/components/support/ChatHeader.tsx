// Chat Header Component
// Enhanced header for chat screen with agent info, status, and menu

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { SupportAgent } from '@/types/supportChat.types';
import { colors } from '@/constants/theme';

interface ChatHeaderProps {
  agent: SupportAgent | null;
  isTyping?: boolean;
  queuePosition?: number | null;
  ticketStatus?: string;
  onBack: () => void;
  onEndChat?: () => void;
  onCall?: () => void;
  accessibilityLabel?: string;
}

function ChatHeader({
  agent,
  isTyping,
  queuePosition,
  ticketStatus,
  onBack,
  onEndChat,
  onCall,
}: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = () => {
    if (!agent) return colors.neutral[500];

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
    if (!agent) {
      if (queuePosition && queuePosition > 0) {
        return `Queue position ${queuePosition}`;
      }
      return 'Finding an agent...';
    }
    if (isTyping) return 'typing...';

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
        return agent.status;
    }
  };

  const isClosed = ticketStatus === 'closed' || ticketStatus === 'resolved';

  return (
    <>
      <LinearGradient colors={[colors.successScale[400], colors.successScale[700]]} style={styles.container}>
        <View style={styles.content}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <View style={styles.buttonInner}>
              <Ionicons name="arrow-back" size={22} color="white" />
            </View>
          </Pressable>

          <View style={styles.centerContent}>
            {agent ? (
              <>
                {agent.avatar ? (
                  <CachedImage source={{ uri: agent.avatar }} style={styles.avatar} cachePolicy="memory-disk" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <ThemedText style={styles.avatarText}>
                      {agent.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              </>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="chatbubbles" size={20} color="white" />
              </View>
            )}

            <View style={styles.textContent}>
              <ThemedText style={styles.name}>
                {agent ? agent.name : 'Support Agent'}
              </ThemedText>
              <View style={styles.statusRow}>
                {isTyping && (
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                )}
                <ThemedText
                  style={[
                    styles.status,
                    isTyping && styles.statusTyping,
                  ]}
                >
                  {isClosed ? 'Chat ended' : getStatusText()}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            {onCall && agent && agent.status === 'online' && !isClosed && (
              <Pressable onPress={onCall} style={styles.actionButton}>
                <View style={styles.buttonInner}>
                  <Ionicons name="call-outline" size={20} color="white" />
                </View>
              </Pressable>
            )}

            <Pressable onPress={() => setShowMenu(true)} style={styles.actionButton}>
              <View style={styles.buttonInner}>
                <Ionicons name="ellipsis-vertical" size={20} color="white" />
              </View>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Dropdown Menu */}
      <Modal
        visible={showMenu}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            {onEndChat && !isClosed && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onEndChat();
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.successScale[400]} />
                <ThemedText style={styles.menuItemText}>End Chat</ThemedText>
              </Pressable>
            )}
            {onCall && agent && agent.status === 'online' && !isClosed && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onCall();
                }}
              >
                <Ionicons name="call-outline" size={20} color={colors.infoScale[400]} />
                <ThemedText style={styles.menuItemText}>Request Call</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close-outline" size={20} color={colors.neutral[500]} />
              <ThemedText style={styles.menuItemText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  buttonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  statusDot: {
    position: 'absolute',
    left: 32,
    top: 32,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  textContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusTyping: {
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    marginLeft: 4,
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[800],
  },
});

export default React.memo(ChatHeader);
