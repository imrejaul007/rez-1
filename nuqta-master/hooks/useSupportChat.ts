// @ts-nocheck
// Use Support Chat Hook
// Complete state management and real-time functionality for live chat support
// READ operations use react-query; WebSocket logic and mutations remain imperative.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '@/contexts/SocketContext';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import supportChatApi from '@/services/supportChatApi';
import { queryKeys } from '@/lib/queryKeys';
import { useTicketHistory, useChatMessages } from '@/hooks/queries/useSupportData';
import { useCreateTicket, useSendMessage } from '@/hooks/mutations/useSupportMutations';
import type {
  SupportTicket,
  ChatMessage,
  SupportAgent,
  QueueInfo,
  FAQSuggestion,
  MessageAttachment,
  CreateTicketRequest,
  SendMessageRequest,
  ConversationRating,
  OfflineMessage,
  UseSupportChatReturn,
} from '@/types/supportChat.types';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

const STORAGE_KEYS = {
  CURRENT_TICKET: 'support_current_ticket',
  TICKET_HISTORY: 'support_ticket_history',
  OFFLINE_MESSAGES: 'support_offline_messages',
  DRAFT_MESSAGE: 'support_draft_message',
};

export function useSupportChat(initialTicketId?: string): UseSupportChatReturn {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // Use the app's existing SocketContext socket (already connected & proven to work)
  const { socket: contextSocket } = useSocket();

  // ==================== React-Query: READ operations ====================

  // Ticket history — react-query driven
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyQueryError,
  } = useTicketHistory(1, 20);

  const ticketHistory: SupportTicket[] = historyData?.tickets ?? [];
  const historyError: string | null = historyQueryError
    ? 'Failed to load ticket history'
    : null;

  // Current ticket state (managed locally — may come from storage, creation, or URL param)
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);

  // Messages for the active ticket — react-query driven (initial load only)
  const {
    data: messagesQueryData,
    isLoading: messagesQueryLoading,
    error: messagesQueryError,
  } = useChatMessages(currentTicket?.id);

  // Local messages state — seeded from react-query, then updated by WebSocket / optimistic sends
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Seed local messages from react-query when the query delivers data
  const lastSyncedTicketId = useRef<string | null>(null);
  useEffect(() => {
    if (
      messagesQueryData?.messages &&
      currentTicket?.id &&
      lastSyncedTicketId.current !== currentTicket.id
    ) {
      setMessages(messagesQueryData.messages);
      lastSyncedTicketId.current = currentTicket.id;
    }
  }, [messagesQueryData, currentTicket?.id]);

  // Derive messagesLoading / messagesError from the query when no local override
  useEffect(() => {
    if (messagesQueryLoading) setMessagesLoading(true);
    else setMessagesLoading(false);
  }, [messagesQueryLoading]);

  useEffect(() => {
    if (messagesQueryError) setMessagesError('Failed to load messages');
    else setMessagesError(null);
  }, [messagesQueryError]);

  // Mutations
  const createTicketMutation = useCreateTicket();
  const sendMessageMutation = useSendMessage();

  // ==================== Local UI State ====================

  const [assignedAgent, setAssignedAgent] = useState<SupportAgent | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);

  const [connected, setConnected] = useState(false);
  // Start as true to block premature ticket creation while loadStoredData runs
  const [connecting, setConnecting] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [faqSuggestions, setFaqSuggestions] = useState<FAQSuggestion[]>([]);

  const [offlineMessages, setOfflineMessages] = useState<OfflineMessage[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeTicketIdRef = useRef<string | null>(null);

  // ==================== Network Status ====================

  const offlineMessagesRef = useRef(offlineMessages);
  offlineMessagesRef.current = offlineMessages;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      if (online && offlineMessagesRef.current.length > 0) {
        processOfflineMessages();
      }
    });

    return () => unsubscribe();
  }, [processOfflineMessages]);

  // ==================== Initialization ====================

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    initializeConnection();

    return () => {
      cleanup();
    };
  }, [authLoading, isAuthenticated]);

  const initializeConnection = async () => {
    try {
      // connecting is already true (initial state)
      await loadStoredData();
      setConnecting(false);
    } catch (error) {
      devLog.error('Failed to initialize support chat:', error);
      setConnecting(false);
    }
  };

  // ==================== Direct Socket Listeners ====================
  // Uses the SocketContext socket which is already connected and proven to work.
  // This is the ONLY mechanism for receiving real-time support events.

  useEffect(() => {
    if (!contextSocket) return;

    const ticketId = currentTicket?.id || activeTicketIdRef.current;
    if (!ticketId) return;

    // Track connection status from the existing socket
    setConnected(contextSocket.connected);

    // Join the ticket room
    contextSocket.emit('join_ticket', { ticketId });

    const handleMessageReceived = (data: any) => {
      // Only process if it's for our ticket
      if (data?.ticketId !== ticketId) return;

      const msg = data?.message || data;
      const message: ChatMessage = {
        id: msg.id || msg._id?.toString?.() || msg._id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ticketId: ticketId,
        content: msg.content || msg.message || '',
        sender: msg.sender || (msg.senderType === 'agent' ? 'agent' : 'user'),
        type: (msg.type as any) || 'text',
        timestamp: msg.timestamp || new Date().toISOString(),
        read: msg.read || false,
        delivered: true,
      };

      setMessages((prev) => {
        // Deduplicate: check by ID match, or by content+sender within 10s window
        const isDuplicate = prev.some((m) => {
          if (m.id === message.id) return true;
          // Also match temp_ optimistic messages by content
          if (m.content === message.content && m.sender === message.sender) {
            const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime());
            return timeDiff < 10000;
          }
          return false;
        });
        if (isDuplicate) return prev;
        return [...prev, message];
      });

      // Auto-mark as read if chat is active
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.hasFocus?.()) {
        supportChatApi.markAsRead(ticketId, [message.id]);
      }
    };

    const handleAgentAssigned = (data: any) => {
      const agent = data?.agent || data;
      if (agent) {
        setAssignedAgent({
          id: agent.id || agent._id || '',
          name: agent.name || agent.fullName || 'Support Agent',
          status: agent.status || 'online',
          avatar: agent.avatar,
        });
        setQueueInfo(null);
      }
    };

    const handleStatusChanged = (data: any) => {
      if (data?.ticketId === ticketId && data?.status) {
        setCurrentTicket((prev) => prev ? { ...prev, status: data.status } : prev);
        if (data.status === 'closed' || data.status === 'resolved') {
          setShowRating(true);
        }
      }
    };

    const handleAgentTypingStart = () => {
      setIsAgentTyping(true);
      // Auto-clear after 5 seconds if stop event is lost
      if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
      agentTypingTimeoutRef.current = setTimeout(() => setIsAgentTyping(false), 5000) as any;
    };
    const handleAgentTypingStop = () => {
      setIsAgentTyping(false);
      if (agentTypingTimeoutRef.current) {
        clearTimeout(agentTypingTimeoutRef.current);
        agentTypingTimeoutRef.current = null;
      }
    };

    const handleMessagesRead = (data: any) => {
      if (data?.ticketId === currentTicket?.id && data?.readBy === 'agent') {
        // Agent read our messages — update all user messages to read: true (blue double ticks)
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === 'user' ? { ...m, read: true } : m
          )
        );
      }
    };

    contextSocket.on('support_message_received', handleMessageReceived);
    contextSocket.on('support_agent_assigned', handleAgentAssigned);
    contextSocket.on('support_ticket_status_changed', handleStatusChanged);
    contextSocket.on('support_agent_typing_start', handleAgentTypingStart);
    contextSocket.on('support_agent_typing_stop', handleAgentTypingStop);
    contextSocket.on('support_messages_read', handleMessagesRead);

    return () => {
      contextSocket.off('support_message_received', handleMessageReceived);
      contextSocket.off('support_agent_assigned', handleAgentAssigned);
      contextSocket.off('support_ticket_status_changed', handleStatusChanged);
      contextSocket.off('support_agent_typing_start', handleAgentTypingStart);
      contextSocket.off('support_agent_typing_stop', handleAgentTypingStop);
      contextSocket.off('support_messages_read', handleMessagesRead);
      // Clear typing timeout on cleanup
      if (agentTypingTimeoutRef.current) {
        clearTimeout(agentTypingTimeoutRef.current);
        agentTypingTimeoutRef.current = null;
      }
      setIsAgentTyping(false);
    };
  }, [contextSocket, currentTicket?.id]);

  // Track socket connection state
  useEffect(() => {
    if (!contextSocket) {
      setConnected(false);
      return;
    }
    setConnected(contextSocket.connected);

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
    };
    const onDisconnect = () => {
      setConnected(false);
      setReconnecting(true);
    };

    contextSocket.on('connect', onConnect);
    contextSocket.on('disconnect', onDisconnect);

    return () => {
      contextSocket.off('connect', onConnect);
      contextSocket.off('disconnect', onDisconnect);
    };
  }, [contextSocket]);

  // ==================== Ticket Management ====================

  const createTicket = async (request: CreateTicketRequest): Promise<SupportTicket | null> => {
    try {
      const response = await createTicketMutation.mutateAsync(request);

      if (response && response.ticket) {
        setCurrentTicket(response.ticket);
        setMessages(response.ticket.messages || []);
        activeTicketIdRef.current = response.ticket.id;
        lastSyncedTicketId.current = response.ticket.id;

        // Set assigned agent from response (auto-assignment happens during creation)
        if ((response.ticket as any).assignedAgent) {
          setAssignedAgent((response.ticket as any).assignedAgent);
        }

        if (response.queueInfo) {
          setQueueInfo(response.queueInfo);
        }

        // Save to storage
        await AsyncStorage.setItem(
          STORAGE_KEYS.CURRENT_TICKET,
          JSON.stringify(response.ticket)
        );

        return response.ticket;
      }

      return null;
    } catch (error) {
      devLog.error('Error creating ticket:', error);
      setMessagesError('Failed to create support ticket');
      return null;
    }
  };

  const closeTicket = async (ticketId: string, reason?: string): Promise<boolean> => {
    try {
      const success = await supportChatApi.closeTicket(ticketId, {
        ticketId,
        reason,
        requestTranscript: true,
      });

      if (success) {
        setCurrentTicket((prev) => prev ? { ...prev, status: 'closed' } : prev);
        setShowRating(true);
        // Clear stored ticket so next visit starts fresh
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_TICKET);
        // Invalidate ticket list so history reflects the closure
        queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets() });
      }

      return success;
    } catch (error) {
      devLog.error('Error closing ticket:', error);
      return false;
    }
  };

  const reopenTicket = async (ticketId: string): Promise<boolean> => {
    try {
      const success = await supportChatApi.reopenTicket(ticketId);

      if (success && currentTicket) {
        setCurrentTicket({
          ...currentTicket,
          status: 'open',
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets() });
      }

      return success;
    } catch (error) {
      devLog.error('Error reopening ticket:', error);
      return false;
    }
  };

  // ==================== Messaging ====================

  const sendMessage = async (
    content: string,
    messageAttachments?: MessageAttachment[]
  ): Promise<boolean> => {
    if (!currentTicket) {
      devLog.error('No active ticket');
      return false;
    }

    if (!content.trim() && (!messageAttachments || messageAttachments.length === 0)) {
      return false;
    }

    // Stop typing indicator immediately on send
    stopTyping();

    const messageRequest: SendMessageRequest = {
      ticketId: currentTicket.id,
      content: content.trim(),
      type: messageAttachments && messageAttachments.length > 0 ? 'image' : 'text',
      attachments: messageAttachments || attachments,
    };

    // If offline, queue the message
    if (!isOnline) {
      return queueOfflineMessage(messageRequest);
    }

    // Optimistically add message to UI
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ticketId: currentTicket.id,
      content: messageRequest.content,
      sender: 'user',
      type: messageRequest.type || 'text',
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false,
      attachments: messageRequest.attachments,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setAttachments([]);

    try {
      const response = await sendMessageMutation.mutateAsync(messageRequest);

      if (response && response.message) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? response.message : msg
          )
        );

        // Update stored ticket with latest messages
        if (currentTicket) {
          const updatedTicket = { ...currentTicket };
          await AsyncStorage.setItem(
            STORAGE_KEYS.CURRENT_TICKET,
            JSON.stringify(updatedTicket)
          );
        }

        return true;
      } else {
        // Remove optimistic message on failure
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id)
        );
        return false;
      }
    } catch (error) {
      devLog.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
      setMessagesError('Failed to send message');
      return false;
    }
  };

  const uploadAttachment = async (
    file: File | Blob,
    type: string
  ): Promise<MessageAttachment | null> => {
    try {
      const response = await supportChatApi.uploadAttachment(
        file,
        type,
        currentTicket?.id
      );

      if (response && response.attachment) {
        return response.attachment;
      }

      return null;
    } catch (error) {
      devLog.error('Error uploading attachment:', error);
      return null;
    }
  };

  const deleteMessage = async (messageId: string): Promise<boolean> => {
    if (!currentTicket) return false;

    try {
      const success = await supportChatApi.deleteMessage(
        currentTicket.id,
        messageId
      );

      if (success) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }

      return success;
    } catch (error) {
      devLog.error('Error deleting message:', error);
      return false;
    }
  };

  // ==================== Typing Indicators ====================

  const startTyping = useCallback(() => {
    if (!currentTicket || !contextSocket) return;

    contextSocket.emit('support-user-typing', { ticketId: currentTicket.id, isTyping: true });

    // Auto-stop typing after 3 seconds of no activity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000) as any;
  }, [currentTicket, contextSocket]);

  const stopTyping = useCallback(() => {
    if (!currentTicket || !contextSocket) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    contextSocket.emit('support-user-typing', { ticketId: currentTicket.id, isTyping: false });
  }, [currentTicket, contextSocket]);

  const markAsRead = useCallback(
    (messageIds: string[]) => {
      if (!currentTicket) return;

      supportChatApi.markAsRead(currentTicket.id, messageIds);

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, read: true } : msg
        )
      );
    },
    [currentTicket]
  );

  // ==================== Agent Interaction ====================

  const requestAgent = async (): Promise<boolean> => {
    if (!currentTicket) return false;

    try {
      const agent = await supportChatApi.requestAgent(currentTicket.id);

      if (agent) {
        setAssignedAgent(agent);
        return true;
      }

      return false;
    } catch (error) {
      devLog.error('Error requesting agent:', error);
      return false;
    }
  };

  const transferToAgent = async (
    agentId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!currentTicket) return false;

    try {
      const transfer = await supportChatApi.transferAgent(
        currentTicket.id,
        agentId,
        reason
      );

      return transfer !== null;
    } catch (error) {
      devLog.error('Error transferring to agent:', error);
      return false;
    }
  };

  // ==================== Rating ====================

  const rateConversation = async (
    rating: ConversationRating,
    comment?: string
  ): Promise<boolean> => {
    if (!currentTicket) return false;

    try {
      const success = await supportChatApi.rateConversation({
        ticketId: currentTicket.id,
        rating,
        comment,
      });

      if (success) {
        setCurrentTicket({
          ...currentTicket,
          rating,
          ratingComment: comment,
        });
        setShowRating(false);
      }

      return success;
    } catch (error) {
      devLog.error('Error rating conversation:', error);
      return false;
    }
  };

  // ==================== FAQ ====================

  const searchFAQ = async (query: string): Promise<FAQSuggestion[]> => {
    try {
      const response = await supportChatApi.searchFAQ({ query });

      if (response && response.suggestions) {
        setFaqSuggestions(response.suggestions);
        return response.suggestions;
      }

      return [];
    } catch (error) {
      devLog.error('Error searching FAQ:', error);
      return [];
    }
  };

  const markFAQHelpful = async (faqId: string, helpful: boolean): Promise<boolean> => {
    try {
      return await supportChatApi.markFAQHelpful(faqId, helpful);
    } catch (error) {
      devLog.error('Error marking FAQ helpful:', error);
      return false;
    }
  };

  // ==================== Calls ====================

  const requestCall = async (type: 'voice' | 'video'): Promise<boolean> => {
    if (!currentTicket) return false;

    try {
      const callRequest = await supportChatApi.requestCall(currentTicket.id, type);
      return callRequest !== null;
    } catch (error) {
      devLog.error('Error requesting call:', error);
      return false;
    }
  };

  const acceptCall = async (callId: string): Promise<boolean> => {
    try {
      return await supportChatApi.acceptCall(callId);
    } catch (error) {
      devLog.error('Error accepting call:', error);
      return false;
    }
  };

  const rejectCall = async (callId: string): Promise<boolean> => {
    try {
      return await supportChatApi.rejectCall(callId);
    } catch (error) {
      devLog.error('Error rejecting call:', error);
      return false;
    }
  };

  // ==================== History ====================

  /**
   * loadTicketHistory now simply tells react-query to refetch.
   * The `page` param is accepted for API compatibility but the primary
   * page is controlled by the useTicketHistory hook above.
   */
  const loadTicketHistory = async (_page: number = 1): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets() });
  };

  /**
   * loadMessages fetches older messages (pagination via `before` cursor)
   * and prepends them to the local messages list.
   * The initial load is handled by useChatMessages react-query hook.
   */
  const loadMessages = async (
    ticketId: string,
    before?: string
  ): Promise<void> => {
    if (!before) {
      // Initial load — just invalidate the react-query cache so it refetches
      queryClient.invalidateQueries({ queryKey: queryKeys.support.messages(ticketId) });
      // Reset the sync tracker so the effect will seed local state again
      lastSyncedTicketId.current = null;
      return;
    }

    // Paginated "load older" — still manual because react-query manages
    // only the initial page; prepending older messages is a cursor operation.
    try {
      setMessagesLoading(true);
      setMessagesError(null);

      const response = await supportChatApi.getMessages(ticketId, before, 50);

      if (response && response.messages) {
        // Prepend older messages
        setMessages((prev) => [...response.messages, ...prev]);
      }
    } catch (error) {
      devLog.error('Error loading messages:', error);
      setMessagesError('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  // ==================== Offline Support ====================

  const queueOfflineMessage = async (
    request: SendMessageRequest
  ): Promise<boolean> => {
    const offlineMsg: OfflineMessage = {
      id: `offline_${Date.now()}`,
      ticketId: request.ticketId,
      message: {
        id: `temp_${Date.now()}`,
        ticketId: request.ticketId,
        content: request.content,
        sender: 'user',
        type: request.type || 'text',
        timestamp: new Date().toISOString(),
        read: false,
        delivered: false,
        attachments: request.attachments,
      },
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'queued',
    };

    setOfflineMessages((prev) => [...prev, offlineMsg]);

    // Save to storage
    await AsyncStorage.setItem(
      STORAGE_KEYS.OFFLINE_MESSAGES,
      JSON.stringify([...offlineMessages, offlineMsg])
    );

    return true;
  };

  const processOfflineMessages = async () => {
    if (offlineMessages.length === 0) return;

    for (const offlineMsg of offlineMessages) {
      if (offlineMsg.status === 'queued' || offlineMsg.status === 'failed') {
        try {
          const request: SendMessageRequest = {
            ticketId: offlineMsg.ticketId,
            content: offlineMsg.message.content,
            type: offlineMsg.message.type,
            attachments: offlineMsg.message.attachments,
          };

          const response = await supportChatApi.sendMessage(request);

          if (response && response.message) {
            setOfflineMessages((prev) =>
              prev.filter((msg) => msg.id !== offlineMsg.id)
            );
          } else {
            setOfflineMessages((prev) =>
              prev.map((msg) =>
                msg.id === offlineMsg.id
                  ? { ...msg, status: 'failed' as const, retryCount: msg.retryCount + 1 }
                  : msg
              )
            );
          }
        } catch (error) {
          devLog.error('Failed to send offline message:', error);
        }
      }
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.OFFLINE_MESSAGES,
      JSON.stringify(offlineMessages)
    );
  };

  // ==================== Connection Management ====================

  const connect = async (): Promise<void> => {
    // Connection is managed by SocketContext
  };

  const disconnect = (): void => {
    if (contextSocket) {
      const ticketId = activeTicketIdRef.current;
      if (ticketId) {
        contextSocket.emit('leave_ticket', { ticketId });
      }
    }
    setConnected(false);
  };

  const reconnect = async (): Promise<void> => {
    disconnect();
    await connect();
  };

  // ==================== UI Helpers ====================

  const clearInput = () => {
    setInputText('');
    setAttachments([]);
  };

  const addAttachment = (attachment: MessageAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
  };

  const toggleRating = () => {
    setShowRating((prev) => !prev);
  };

  const toggleFAQ = () => {
    setShowFAQ((prev) => !prev);
  };

  // ==================== Storage & Persistence ====================

  const loadStoredData = async () => {
    try {
      // Load current ticket from storage
      const storedTicket = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_TICKET);
      if (storedTicket) {
        const ticket = JSON.parse(storedTicket);

        // Only restore if ticket is still active (not closed/resolved)
        if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
          setCurrentTicket(ticket);
          activeTicketIdRef.current = ticket.id;

          if (ticket.assignedAgent) {
            setAssignedAgent(ticket.assignedAgent);
          }

          // Fetch fresh ticket data from the API (storage data may be stale)
          try {
            const freshTicket = await supportChatApi.getTicket(ticket.id);
            if (freshTicket) {
              setCurrentTicket(freshTicket);
              // Messages will be loaded by react-query via useChatMessages
              // but set them from freshTicket as a fast path
              setMessages(freshTicket.messages || []);
              lastSyncedTicketId.current = freshTicket.id || ticket.id;
              if ((freshTicket as any).assignedAgent) {
                setAssignedAgent((freshTicket as any).assignedAgent);
              }
              // Update storage with fresh data
              await AsyncStorage.setItem(
                STORAGE_KEYS.CURRENT_TICKET,
                JSON.stringify(freshTicket)
              );
            } else {
              // Ticket might have been deleted, use stored messages as fallback
              if (ticket.messages) {
                setMessages(ticket.messages);
                lastSyncedTicketId.current = ticket.id;
              }
            }
          } catch {
            // API unavailable, use stored messages
            if (ticket.messages) {
              setMessages(ticket.messages);
              lastSyncedTicketId.current = ticket.id;
            }
          }
        } else {
          // Ticket is closed, clear storage
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_TICKET);
        }
      }

      // Load offline messages
      const storedOffline = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MESSAGES);
      if (storedOffline) {
        setOfflineMessages(JSON.parse(storedOffline));
      }

      // Load draft message
      const storedDraft = await AsyncStorage.getItem(STORAGE_KEYS.DRAFT_MESSAGE);
      if (storedDraft) {
        setInputText(storedDraft);
      }
    } catch (error) {
      devLog.error('Error loading stored data:', error);
    }
  };

  // Auto-save draft message
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (inputText) {
        AsyncStorage.setItem(STORAGE_KEYS.DRAFT_MESSAGE, inputText);
      } else {
        AsyncStorage.removeItem(STORAGE_KEYS.DRAFT_MESSAGE);
      }
    }, 1000) as any;

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [inputText]);

  // ==================== Cleanup ====================

  const cleanup = () => {
    if (contextSocket) {
      const ticketId = activeTicketIdRef.current;
      if (ticketId) {
        contextSocket.emit('leave_ticket', { ticketId });
      }
    }
    activeTicketIdRef.current = null;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (agentTypingTimeoutRef.current) {
      clearTimeout(agentTypingTimeoutRef.current);
      agentTypingTimeoutRef.current = null;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  };

  // Load initial ticket if provided via URL param
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (initialTicketId && !currentTicket) {
      activeTicketIdRef.current = initialTicketId;
      supportChatApi.getTicket(initialTicketId).then((ticket) => {
        if (ticket) {
          setCurrentTicket(ticket);
          setMessages(ticket.messages || []);
          lastSyncedTicketId.current = ticket.id || initialTicketId;

          if ((ticket as any).assignedAgent) {
            setAssignedAgent((ticket as any).assignedAgent);
          }

          // Save to storage for persistence
          AsyncStorage.setItem(
            STORAGE_KEYS.CURRENT_TICKET,
            JSON.stringify(ticket)
          );
        }
      });
    }
  }, [initialTicketId, authLoading, isAuthenticated]);

  // ==================== Return ====================

  return {
    // State
    currentTicket,
    messages,
    messagesLoading,
    messagesError,
    ticketHistory,
    historyLoading,
    historyError,
    assignedAgent,
    isAgentTyping,
    queueInfo,
    connected,
    connecting,
    reconnecting,
    inputText,
    attachments,
    showRating,
    showFAQ,
    faqSuggestions,
    offlineMessages,
    isOnline,

    // Actions
    createTicket,
    closeTicket,
    reopenTicket,
    sendMessage,
    uploadAttachment,
    deleteMessage,
    startTyping,
    stopTyping,
    markAsRead,
    requestAgent,
    transferToAgent,
    rateConversation,
    searchFAQ,
    markFAQHelpful,
    requestCall,
    acceptCall,
    rejectCall,
    loadTicketHistory,
    loadMessages,
    connect,
    disconnect,
    reconnect,
    setInputText,
    clearInput,
    addAttachment,
    removeAttachment,
    toggleRating,
    toggleFAQ,
  };
}

export default useSupportChat;
