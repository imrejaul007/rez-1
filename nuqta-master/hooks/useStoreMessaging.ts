// useStoreMessaging Hook
// Custom hook for managing store messaging with real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import storeMessagingService from '@/services/storeMessagingApi';
import {
  Conversation,
  Message,
  SendMessageRequest,
  TypingIndicator,
  MessagingSocketEvents,
  MessageReceivedPayload,
  MessageSentPayload,
  MessageDeliveredPayload,
  MessageReadPayload,
  TypingPayload,
  StoreOnlinePayload,
} from '@/types/messaging.types';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface UseStoreMessagingOptions {
  conversationId?: string;
  storeId?: string;
  orderId?: string;
  autoLoad?: boolean;
}

interface UseStoreMessagingReturn {
  // State
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  typingUsers: TypingIndicator[];
  isStoreOnline: boolean;
  hasMore: boolean;

  // Actions
  sendMessage: (content: string, type?: Message['type']) => Promise<void>;
  sendMessageWithAttachments: (content: string, attachments: File[]) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  refresh: () => Promise<void>;
  archiveConversation: () => Promise<void>;
  deleteConversation: () => Promise<void>;

  // Utils
  getConversation: () => Promise<void>;
}

export function useStoreMessaging(options: UseStoreMessagingOptions = {}): UseStoreMessagingReturn {
  const {
    conversationId: initialConversationId,
    storeId,
    orderId,
    autoLoad = true,
  } = options;

  const { socket } = useSocket();

  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isStoreOnline, setIsStoreOnline] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<any>(null); // Use any for cross-platform compatibility

  // Load conversation
  const getConversation = useCallback(async () => {
    if (!conversationId && !storeId) {
      setError('No conversation ID or store ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let conv: Conversation | null = null;

      // Get or create conversation
      if (conversationId) {
        const response = await storeMessagingService.getConversation(conversationId);
        if (response.success && response.data) {
          conv = response.data;
        }
      } else if (storeId) {
        const response = await storeMessagingService.getOrCreateConversation(storeId, orderId);
        if (response.success && response.data) {
          conv = response.data;
          setConversationId(response.data.id);
        }
      }

      if (conv) {
        setConversation(conv);
        setIsStoreOnline(conv.isStoreOnline);

        // Join socket room for real-time updates
        if (socket && socket.connected) {
          socket.emit(MessagingSocketEvents.JOIN_CONVERSATION, { conversationId: conv.id });
        }
      } else {
        setError('Failed to load conversation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId, storeId, orderId, socket]);

  // Load messages
  const loadMessages = useCallback(async (page: number = 1) => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await storeMessagingService.getMessages(conversationId, page, 50);

      if (response.success && response.data) {
        const newMessages = response.data.messages;

        if (page === 1) {
          setMessages(newMessages);
        } else {
          // Prepend older messages
          setMessages(prev => [...newMessages, ...prev]);
        }

        setHasMore(response.data.pagination.current < response.data.pagination.pages);
        setCurrentPage(page);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadMessages(currentPage + 1);
  }, [currentPage, hasMore, loading, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (content: string, type: Message['type'] = 'text') => {
    if (!content.trim() || !conversationId) return;

    setSending(true);
    setError(null);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: 'current-user', // Should be actual user ID
      senderType: 'customer',
      senderName: 'You',
      type,
      content: content.trim(),
      status: 'sending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const request: SendMessageRequest = {
        conversationId,
        storeId: conversation?.storeId || storeId || '',
        content: content.trim(),
        type,
        orderId,
      };

      const response = await storeMessagingService.sendMessage(request);

      if (response.success && response.data) {
        // Replace temp message with real message
        setMessages(prev =>
          prev.map(msg => msg.id === tempMessage.id ? response.data! : msg)
        );
      } else {
        // Mark as failed
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessage.id ? { ...msg, status: 'failed' as MessageStatus } : msg
          )
        );
        setError(response.error || 'Failed to send message');
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id ? { ...msg, status: 'failed' as MessageStatus } : msg
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [conversationId, conversation, storeId, orderId]);

  // Send message with attachments
  const sendMessageWithAttachments = useCallback(async (content: string, attachments: File[]) => {
    if (!conversationId || attachments.length === 0) return;

    setSending(true);
    setError(null);

    try {
      const response = await storeMessagingService.sendMessageWithAttachments(
        conversationId,
        content,
        attachments
      );
      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data!]);
      } else {
        setError(response.error || 'Failed to send message with attachments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message with attachments');
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      await storeMessagingService.markConversationAsRead(conversationId);

      // Update local state
      setConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
      setMessages(prev =>
        prev.map(msg => ({
          ...msg,
          status: msg.status === 'delivered' ? 'read' as MessageStatus : msg.status,
          readAt: msg.status === 'delivered' ? new Date().toISOString() : msg.readAt,
        }))
      );
    } catch (_err) {
      // silently handle
    }
  }, [conversationId]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    socket.emit(MessagingSocketEvents.TYPING_START, { conversationId });

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    socket.emit(MessagingSocketEvents.TYPING_STOP, { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, conversationId]);

  // Archive conversation
  const archiveConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await storeMessagingService.archiveConversation(conversationId);
      if (response.success && response.data) {
        setConversation(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive conversation');
    }
  }, [conversationId]);

  // Delete conversation
  const deleteConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      await storeMessagingService.deleteConversation(conversationId);
      setConversation(null);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  }, [conversationId]);

  // Refresh
  const refresh = useCallback(async () => {
    await getConversation();
    if (conversationId) {
      await loadMessages(1);
    }
  }, [conversationId, getConversation, loadMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Message received
    const handleMessageReceived = (payload: MessageReceivedPayload) => {
      if (payload.conversationId === conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(msg => msg.id === payload.message.id)) {
            return prev;
          }
          return [...prev, payload.message];
        });

        // Auto-mark as read if user is viewing the conversation
        markAsRead();
      }
    };

    // Message delivered
    const handleMessageDelivered = (payload: MessageDeliveredPayload) => {
      if (payload.conversationId === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === payload.messageId
              ? { ...msg, status: 'delivered' as MessageStatus, deliveredAt: payload.deliveredAt }
              : msg
          )
        );
      }
    };

    // Message read
    const handleMessageRead = (payload: MessageReadPayload) => {
      if (payload.conversationId === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === payload.messageId
              ? { ...msg, status: 'read' as MessageStatus, readAt: payload.readAt }
              : msg
          )
        );
      }
    };

    // Typing indicator
    const handleTyping = (payload: TypingPayload) => {
      if (payload.conversationId === conversationId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(t => t.userId !== payload.userId);
          if (payload.isTyping) {
            return [...filtered, {
              conversationId: payload.conversationId,
              userId: payload.userId,
              userName: payload.userName,
              isTyping: true,
              timestamp: new Date().toISOString(),
            }];
          }
          return filtered;
        });
      }
    };

    // Store online/offline
    const handleStoreOnline = (payload: StoreOnlinePayload) => {
      if (payload.storeId === conversation?.storeId) {
        setIsStoreOnline(payload.isOnline);
        setConversation(prev =>
          prev ? { ...prev, isStoreOnline: payload.isOnline } : null
        );
      }
    };

    socket.on(MessagingSocketEvents.MESSAGE_RECEIVED, handleMessageReceived);
    socket.on(MessagingSocketEvents.MESSAGE_DELIVERED, handleMessageDelivered);
    socket.on(MessagingSocketEvents.MESSAGE_READ, handleMessageRead);
    socket.on(MessagingSocketEvents.TYPING_START, handleTyping);
    socket.on(MessagingSocketEvents.TYPING_STOP, handleTyping);
    socket.on(MessagingSocketEvents.STORE_ONLINE, handleStoreOnline);
    socket.on(MessagingSocketEvents.STORE_OFFLINE, handleStoreOnline);

    return () => {
      socket.off(MessagingSocketEvents.MESSAGE_RECEIVED, handleMessageReceived);
      socket.off(MessagingSocketEvents.MESSAGE_DELIVERED, handleMessageDelivered);
      socket.off(MessagingSocketEvents.MESSAGE_READ, handleMessageRead);
      socket.off(MessagingSocketEvents.TYPING_START, handleTyping);
      socket.off(MessagingSocketEvents.TYPING_STOP, handleTyping);
      socket.off(MessagingSocketEvents.STORE_ONLINE, handleStoreOnline);
      socket.off(MessagingSocketEvents.STORE_OFFLINE, handleStoreOnline);

      // Leave conversation room
      socket.emit(MessagingSocketEvents.LEAVE_CONVERSATION, { conversationId });
    };
  }, [socket, conversationId, conversation, markAsRead]);

  // Initial load
  useEffect(() => {
    if (autoLoad && (conversationId || storeId)) {
      getConversation();
    }
  }, [autoLoad, conversationId, storeId]);

  // Load messages when conversation is set
  useEffect(() => {
    if (conversationId) {
      loadMessages(1);
    }
  }, [conversationId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    typingUsers,
    isStoreOnline,
    hasMore,
    sendMessage,
    sendMessageWithAttachments,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    refresh,
    archiveConversation,
    deleteConversation,
    getConversation,
  };
}
