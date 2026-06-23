// @ts-nocheck
// Conversation List Component
// Displays list of all conversations

import { colors } from '@/constants/theme';
import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PROFILE_COLORS } from '@/types/profile.types';
import { Conversation } from '@/types/messaging.types';
import { useRouter } from 'expo-router';

interface ConversationListProps {
  conversations: Conversation[];
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onLoadMore?: () => void;
  ListEmptyComponent?: React.ReactElement;
}

function ConversationList({
  conversations,
  loading = false,
  onRefresh,
  refreshing = false,
  onLoadMore,
  ListEmptyComponent,
}: ConversationListProps) {
  const router = useRouter();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: '/store/[id]/chat' as any,
      params: {
        id: conversation.storeId,
        conversationId: conversation.id,
        storeName: conversation.storeName,
      },
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const lastMessage = item.lastMessage;
    const isUnread = item.unreadCount > 0;

    return (
      <Pressable
        style={[styles.conversationItem, isUnread && styles.conversationItemUnread]}
        onPress={() => handleConversationPress(item)}
       
      >
        {/* Store Avatar */}
        <View style={styles.avatarContainer}>
          {item.storeAvatar ? (
            <CachedImage source={{ uri: item.storeAvatar }} style={styles.avatar} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ThemedText style={styles.avatarText}>
                {item.storeName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}

          {/* Online Indicator */}
          {item.isStoreOnline && (
            <View style={styles.onlineIndicator} />
          )}

          {/* Unread Badge */}
          {isUnread && (
            <View style={styles.unreadBadge}>
              <ThemedText style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Conversation Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText style={[styles.storeName, isUnread && styles.storeNameUnread]}>
              {item.storeName}
            </ThemedText>
            {lastMessage && (
              <ThemedText style={styles.timestamp}>
                {formatTimestamp(lastMessage.createdAt)}
              </ThemedText>
            )}
          </View>

          {/* Last Message */}
          {lastMessage && (
            <View style={styles.lastMessageContainer}>
              {lastMessage.senderType === 'customer' && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={lastMessage.status === 'read' ? PROFILE_COLORS.primary : '#999'}
                  style={styles.readIcon}
                />
              )}
              <ThemedText
                style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {lastMessage.type === 'image' && '📷 Photo'}
                {lastMessage.type === 'file' && '📎 File'}
                {lastMessage.type === 'location' && '📍 Location'}
                {lastMessage.type === 'text' && lastMessage.content}
              </ThemedText>
            </View>
          )}

          {/* Order Context */}
          {item.orderContext && (
            <View style={styles.orderContext}>
              <Ionicons name="receipt-outline" size={12} color={PROFILE_COLORS.primary} />
              <ThemedText style={styles.orderContextText}>
                Order #{item.orderContext.orderNumber}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </Pressable>
    );
  };

  return (
    <FlashList
      data={conversations}
      renderItem={renderConversation}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={ListEmptyComponent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      estimatedItemSize={80}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  conversationItemUnread: {
    backgroundColor: PROFILE_COLORS.primary + '05',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: PROFILE_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PROFILE_COLORS.success,
    borderWidth: 2,
    borderColor: 'white',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PROFILE_COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    flex: 1,
  },
  storeNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readIcon: {
    marginRight: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.midGray,
    flex: 1,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: colors.darkGray,
  },
  orderContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  orderContextText: {
    fontSize: 11,
    color: PROFILE_COLORS.primary,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 84,
  },
});

export default React.memo(ConversationList);
