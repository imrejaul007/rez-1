// Message Bubble Component
// Displays individual message in chat

import { colors } from '@/constants/theme';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PROFILE_COLORS } from '@/types/profile.types';
import { Message } from '@/types/messaging.types';
import { useGetCurrencySymbol } from '@/stores/selectors';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onLongPress?: () => void;
  onImagePress?: (url: string) => void;
}

function MessageBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  showTimestamp = true,
  onLongPress,
  onImagePress,
}: MessageBubbleProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStatus = () => {
    if (!isOwnMessage) return null;

    const statusIcons = {
      sending: 'time-outline',
      sent: 'checkmark',
      delivered: 'checkmark-done',
      read: 'checkmark-done',
      failed: 'alert-circle',
    };

    const statusColors = {
      sending: '#999',
      sent: '#999',
      delivered: '#999',
      read: PROFILE_COLORS.primary,
      failed: PROFILE_COLORS.error,
    };

    return (
      <Ionicons
        name={statusIcons[message.status] as any}
        size={14}
        color={statusColors[message.status]}
        style={styles.statusIcon}
      />
    );
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <View style={styles.attachmentsContainer}>
        {message.attachments.map((attachment, index) => {
          if (attachment.type === 'image') {
            return (
              <Pressable
                key={attachment.id}
                onPress={() => onImagePress?.(attachment.url)}
              >
                <CachedImage
                  source={{ uri: attachment.url }}
                  style={styles.imageAttachment}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </Pressable>
            );
          }

          return (
            <View key={attachment.id} style={styles.fileAttachment}>
              <Ionicons name="document-attach" size={20} color={PROFILE_COLORS.primary} />
              <ThemedText style={styles.fileName} numberOfLines={1}>
                {attachment.filename}
              </ThemedText>
            </View>
          );
        })}
      </View>
    );
  };

  const renderOrderReference = () => {
    if (!message.orderReference) return null;

    return (
      <View style={styles.orderReference}>
        <Ionicons name="receipt-outline" size={16} color={PROFILE_COLORS.primary} />
        <View style={styles.orderReferenceContent}>
          <ThemedText style={styles.orderReferenceTitle}>
            Order #{message.orderReference.orderNumber}
          </ThemedText>
          <ThemedText style={styles.orderReferenceStatus}>
            {message.orderReference.status} • {currencySymbol}{message.orderReference.total.toLocaleString()}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderReplyTo = () => {
    if (!message.replyTo) return null;

    return (
      <View style={styles.replyToContainer}>
        <View style={styles.replyToBorder} />
        <View>
          <ThemedText style={styles.replyToName}>{message.replyTo.senderName}</ThemedText>
          <ThemedText style={styles.replyToContent} numberOfLines={2}>
            {message.replyTo.content}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      {/* Avatar */}
      {showAvatar && !isOwnMessage && (
        <View style={styles.avatarContainer}>
          {message.senderAvatar ? (
            <CachedImage source={{ uri: message.senderAvatar }} style={styles.avatar} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ThemedText style={styles.avatarText}>
                {message.senderName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Message Content */}
      <Pressable
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
          message.status === 'failed' && styles.failedBubble,
        ]}
        onLongPress={onLongPress}
       
      >
        {/* Reply To */}
        {renderReplyTo()}

        {/* Order Reference */}
        {renderOrderReference()}

        {/* Attachments */}
        {renderAttachments()}

        {/* Message Text */}
        {message.content && (
          <ThemedText
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {message.content}
          </ThemedText>
        )}

        {/* Timestamp and Status */}
        {showTimestamp && (
          <View style={styles.footer}>
            <ThemedText
              style={[
                styles.timestamp,
                isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
              ]}
            >
              {formatTime(message.createdAt)}
            </ThemedText>
            {renderStatus()}
          </View>
        )}
      </Pressable>

      {/* Spacer for own messages */}
      {showAvatar && isOwnMessage && <View style={styles.avatarContainer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 32,
    marginHorizontal: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: PROFILE_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownBubble: {
    backgroundColor: PROFILE_COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  failedBubble: {
    backgroundColor: PROFILE_COLORS.error + '20',
    borderWidth: 1,
    borderColor: PROFILE_COLORS.error,
  },
  replyToContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  replyToBorder: {
    width: 3,
    backgroundColor: PROFILE_COLORS.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  replyToName: {
    fontSize: 12,
    fontWeight: '600',
    color: PROFILE_COLORS.primary,
    marginBottom: 2,
  },
  replyToContent: {
    fontSize: 12,
    color: colors.midGray,
  },
  orderReference: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  orderReferenceContent: {
    marginLeft: 8,
    flex: 1,
  },
  orderReferenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkGray,
  },
  orderReferenceStatus: {
    fontSize: 11,
    color: colors.midGray,
    marginTop: 2,
  },
  attachmentsContainer: {
    marginBottom: 6,
  },
  imageAttachment: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 13,
    color: colors.darkGray,
    marginLeft: 8,
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: colors.darkGray,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimestamp: {
    color: '#999',
  },
  statusIcon: {
    marginLeft: 2,
  },
});

export default React.memo(MessageBubble);
