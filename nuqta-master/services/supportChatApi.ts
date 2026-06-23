// @ts-nocheck
// Support Chat API Service
// Handles all support chat backend communications

import apiClient from './apiClient';
import type {
  SupportTicket,
  ChatMessage,
  SupportAgent,
  QueueInfo,
  FAQSuggestion,
  CreateTicketRequest,
  CreateTicketResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetTicketHistoryResponse,
  GetMessagesResponse,
  RateConversationRequest,
  CloseTicketRequest,
  UploadAttachmentResponse,
  GetFAQSuggestionsRequest,
  GetFAQSuggestionsResponse,
  MessageAttachment,
  ConversationRating,
  AgentAvailability,
  BusinessHours,
  ChatStatistics,
  UserSupportHistory,
  CallRequest,
  CoBrowsingSession,
  ConversationTransfer,
  IssueCategory,
} from '@/types/supportChat.types';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Map frontend IssueCategory values to backend-accepted category values
const CATEGORY_MAP: Record<IssueCategory, string> = {
  order_tracking: 'order',
  refund_request: 'refund',
  account_issue: 'account',
  payment_problem: 'payment',
  technical_issue: 'technical',
  product_inquiry: 'product',
  delivery_problem: 'delivery',
  general_inquiry: 'other',
  complaint: 'other',
  other: 'other',
};

const ENDPOINTS = {
  // Ticket management
  TICKETS: '/support/tickets',
  TICKET_DETAIL: (id: string) => `/support/tickets/${id}`,
  CLOSE_TICKET: (id: string) => `/support/tickets/${id}/close`,
  REOPEN_TICKET: (id: string) => `/support/tickets/${id}/reopen`,

  // Messages
  MESSAGES: (ticketId: string) => `/support/tickets/${ticketId}/messages`,
  SEND_MESSAGE: (ticketId: string) => `/support/tickets/${ticketId}/messages`,
  DELETE_MESSAGE: (ticketId: string, messageId: string) =>
    `/support/tickets/${ticketId}/messages/${messageId}`,
  MARK_READ: (ticketId: string) => `/support/tickets/${ticketId}/read`,

  // Attachments
  UPLOAD_ATTACHMENT: '/support/attachments',

  // Agent
  AGENTS: '/support/agents',
  AGENT_DETAIL: (id: string) => `/support/agents/${id}`,
  AGENT_AVAILABILITY: '/support/agents/availability',
  REQUEST_AGENT: '/support/request-agent',
  TRANSFER_AGENT: (ticketId: string) => `/support/tickets/${ticketId}/transfer`,

  // Rating
  RATE_CONVERSATION: (ticketId: string) => `/support/tickets/${ticketId}/rate`,

  // FAQ
  FAQ_SEARCH: '/support/faq/search',
  FAQ_SUGGESTIONS: '/support/faq/suggestions',
  FAQ_HELPFUL: (faqId: string) => `/support/faq/${faqId}/helpful`,

  // Queue
  QUEUE_INFO: '/support/queue',
  QUEUE_POSITION: (ticketId: string) => `/support/queue/${ticketId}`,

  // Call/Video
  REQUEST_CALL: (ticketId: string) => `/support/tickets/${ticketId}/call`,
  ACCEPT_CALL: (callId: string) => `/support/calls/${callId}/accept`,
  REJECT_CALL: (callId: string) => `/support/calls/${callId}/reject`,
  END_CALL: (callId: string) => `/support/calls/${callId}/end`,

  // Co-browsing
  REQUEST_COBROWSING: (ticketId: string) => `/support/tickets/${ticketId}/cobrowsing`,
  ACCEPT_COBROWSING: (sessionId: string) => `/support/cobrowsing/${sessionId}/accept`,
  END_COBROWSING: (sessionId: string) => `/support/cobrowsing/${sessionId}/end`,

  // Business info
  BUSINESS_HOURS: '/support/business-hours',

  // Statistics
  STATISTICS: '/support/statistics',
  USER_HISTORY: '/support/user/history',

  // Transcript
  REQUEST_TRANSCRIPT: (ticketId: string) => `/support/tickets/${ticketId}/transcript`,
};

class SupportChatApi {
  // ==================== Ticket Management ====================

  /**
   * Create a new support ticket
   */
  async createTicket(request: CreateTicketRequest): Promise<CreateTicketResponse | null> {
    try {
      // Map frontend field names/values to what the backend expects
      const backendPayload: Record<string, any> = {
        subject: request.subject,
        category: CATEGORY_MAP[request.category] || 'other',
        message: request.initialMessage, // Backend expects 'message', not 'initialMessage'
        priority: request.priority || 'medium',
      };

      // Map related entity from metadata if present
      if (request.metadata?.orderId) {
        backendPayload.relatedEntity = {
          type: 'order',
          id: request.metadata.orderId,
        };
      } else if (request.metadata?.productId) {
        backendPayload.relatedEntity = {
          type: 'product',
          id: request.metadata.productId,
        };
      }

      const response = await apiClient.post<any>(
        ENDPOINTS.TICKETS,
        backendPayload
      );

      if (response.success && response.data) {
        // Backend returns { ticket } with _id — map to frontend SupportTicket shape
        const raw = response.data.ticket || response.data;
        const ticket: any = {
          ...raw,
          id: raw._id || raw.id,
          status: raw.status || 'open',
          messages: (raw.messages || []).map((msg: any) => ({
            id: msg._id || msg.id || `msg_${Date.now()}_${Math.random()}`,
            ticketId: raw._id || raw.id,
            content: msg.message || msg.content,
            sender: msg.senderType === 'agent' ? 'agent' : msg.senderType === 'system' ? 'system' : 'user',
            type: 'text',
            timestamp: msg.timestamp || new Date().toISOString(),
            read: msg.isRead || false,
            delivered: true,
          })),
        };

        // Build assigned agent if populated
        if (raw.assignedTo && typeof raw.assignedTo === 'object') {
          ticket.assignedAgent = {
            id: raw.assignedTo._id || raw.assignedTo.id,
            name: raw.assignedTo.fullName || `${raw.assignedTo.profile?.firstName || ''} ${raw.assignedTo.profile?.lastName || ''}`.trim() || 'Support Agent',
            status: 'online',
          };
        }

        return { ticket } as CreateTicketResponse;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to create ticket:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error creating ticket:', error);
      return null;
    }
  }

  /**
   * Get ticket details
   */
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.TICKET_DETAIL(ticketId)
      );

      if (response.success && response.data) {
        // Backend returns { ticket } with _id — map to frontend shape
        const raw = response.data.ticket || response.data;
        return this.mapTicketToFrontend(raw);
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch ticket:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching ticket:', error);
      return null;
    }
  }

  /**
   * Map a raw backend ticket to frontend SupportTicket shape
   */
  private mapTicketToFrontend(raw: any): SupportTicket {
    const ticket: any = {
      ...raw,
      id: raw._id || raw.id,
      status: raw.status || 'open',
      messages: (raw.messages || []).map((msg: any) => ({
        id: msg._id?.toString?.() || msg._id || msg.id || `msg_${Date.now()}_${Math.random()}`,
        ticketId: raw._id || raw.id,
        content: msg.message || msg.content,
        sender: msg.senderType === 'agent' ? 'agent' : msg.senderType === 'system' ? 'system' : 'user',
        type: 'text',
        timestamp: msg.timestamp || new Date().toISOString(),
        read: msg.isRead || false,
        delivered: true,
      })),
    };

    // Build assigned agent if populated
    if (raw.assignedTo && typeof raw.assignedTo === 'object') {
      ticket.assignedAgent = {
        id: raw.assignedTo._id || raw.assignedTo.id,
        name: raw.assignedTo.fullName || `${raw.assignedTo.profile?.firstName || ''} ${raw.assignedTo.profile?.lastName || ''}`.trim() || 'Support Agent',
        status: 'online',
      };
    }

    return ticket as SupportTicket;
  }

  /**
   * Get ticket history for current user
   */
  async getTicketHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<GetTicketHistoryResponse | null> {
    try {

      const response = await apiClient.get<GetTicketHistoryResponse>(
        ENDPOINTS.TICKETS,
        { page, limit }
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch history:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching history:', error);
      return null;
    }
  }

  /**
   * Close a ticket
   */
  async closeTicket(
    ticketId: string,
    request: CloseTicketRequest
  ): Promise<boolean> {
    try {

      const response = await apiClient.post(
        ENDPOINTS.CLOSE_TICKET(ticketId),
        request
      );
      
      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to close ticket:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error closing ticket:', error);
      return false;
    }
  }

  /**
   * Reopen a closed ticket
   */
  async reopenTicket(ticketId: string): Promise<boolean> {
    try {

      const response = await apiClient.post(ENDPOINTS.REOPEN_TICKET(ticketId));

      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to reopen ticket:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error reopening ticket:', error);
      return false;
    }
  }

  // ==================== Messages ====================

  /**
   * Get messages for a ticket
   */
  async getMessages(
    ticketId: string,
    before?: string,
    limit: number = 50
  ): Promise<GetMessagesResponse | null> {
    try {

      const params: any = { limit };
      if (before) params.before = before;

      const response = await apiClient.get<GetMessagesResponse>(
        ENDPOINTS.MESSAGES(ticketId),
        params
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch messages:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching messages:', error);
      return null;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse | null> {
    try {
      const response = await apiClient.post<any>(
        ENDPOINTS.SEND_MESSAGE(request.ticketId),
        {
          message: request.content,
          type: request.type,
          attachments: request.attachments,
          metadata: request.metadata,
        }
      );

      if (response.success && response.data) {
        // Backend returns { ticket } — extract the last message from the ticket
        const ticket = response.data.ticket || response.data;
        const msgs = ticket?.messages;
        if (msgs && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          const chatMessage = {
            id: lastMsg._id?.toString() || `msg_${Date.now()}`,
            ticketId: request.ticketId,
            content: lastMsg.message || lastMsg.content || request.content,
            sender: 'user' as const,
            type: request.type || 'text',
            timestamp: lastMsg.timestamp || new Date().toISOString(),
            read: false,
            delivered: true,
            attachments: lastMsg.attachments,
          };
          return { message: chatMessage, deliveryStatus: { messageId: chatMessage.id, status: 'delivered', timestamp: chatMessage.timestamp } } as SendMessageResponse;
        }

        // Fallback: construct message from request
        const fallbackMessage = {
          id: `msg_${Date.now()}`,
          ticketId: request.ticketId,
          content: request.content,
          sender: 'user' as const,
          type: request.type || 'text',
          timestamp: new Date().toISOString(),
          read: false,
          delivered: true,
        };
        return { message: fallbackMessage, deliveryStatus: { messageId: fallbackMessage.id, status: 'delivered', timestamp: fallbackMessage.timestamp } } as SendMessageResponse;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to send message:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error sending message:', error);
      return null;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(ticketId: string, messageId: string): Promise<boolean> {
    try {

      const response = await apiClient.delete(
        ENDPOINTS.DELETE_MESSAGE(ticketId, messageId)
      );
      
      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to delete message:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error deleting message:', error);
      return false;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(ticketId: string, messageIds: string[]): Promise<boolean> {
    try {

      const response = await apiClient.post(ENDPOINTS.MARK_READ(ticketId), {
        messageIds,
      });

      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to mark as read:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error marking as read:', error);
      return false;
    }
  }

  // ==================== Attachments ====================

  /**
   * Upload an attachment
   */
  async uploadAttachment(
    file: File | Blob,
    type: string,
    ticketId?: string
  ): Promise<UploadAttachmentResponse | null> {
    try {

      const formData = new FormData();
      formData.append('file', file as any);
      formData.append('type', type);
      if (ticketId) formData.append('ticketId', ticketId);

      const response = await apiClient.uploadFile<UploadAttachmentResponse>(
        ENDPOINTS.UPLOAD_ATTACHMENT,
        formData
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to upload attachment:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error uploading attachment:', error);
      return null;
    }
  }

  // ==================== Agents ====================

  /**
   * Get all available agents
   */
  async getAgents(): Promise<SupportAgent[]> {
    try {

      const response = await apiClient.get<SupportAgent[]>(ENDPOINTS.AGENTS);

      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch agents:', response.error);
        return [];
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching agents:', error);
      return [];
    }
  }

  /**
   * Get agent availability
   */
  async getAgentAvailability(): Promise<AgentAvailability[]> {
    try {

      const response = await apiClient.get<AgentAvailability[]>(
        ENDPOINTS.AGENT_AVAILABILITY
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch availability:', response.error);
        return [];
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching availability:', error);
      return [];
    }
  }

  /**
   * Request an agent for a ticket
   */
  async requestAgent(ticketId: string): Promise<SupportAgent | null> {
    try {

      const response = await apiClient.post<SupportAgent>(
        ENDPOINTS.REQUEST_AGENT,
        { ticketId }
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to request agent:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error requesting agent:', error);
      return null;
    }
  }

  /**
   * Transfer ticket to another agent
   */
  async transferAgent(
    ticketId: string,
    toAgentId: string,
    reason?: string
  ): Promise<ConversationTransfer | null> {
    try {

      const response = await apiClient.post<ConversationTransfer>(
        ENDPOINTS.TRANSFER_AGENT(ticketId),
        { toAgentId, reason }
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to transfer ticket:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error transferring ticket:', error);
      return null;
    }
  }

  // ==================== Rating ====================

  /**
   * Rate a conversation
   */
  async rateConversation(request: RateConversationRequest): Promise<boolean> {
    try {

      const response = await apiClient.post(
        ENDPOINTS.RATE_CONVERSATION(request.ticketId),
        {
          rating: request.rating,
          comment: request.comment,
          tags: request.tags,
        }
      );
      
      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to rate conversation:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error rating conversation:', error);
      return false;
    }
  }

  // ==================== FAQ ====================

  /**
   * Search FAQ articles
   */
  async searchFAQ(
    request: GetFAQSuggestionsRequest
  ): Promise<GetFAQSuggestionsResponse | null> {
    try {

      const response = await apiClient.get<GetFAQSuggestionsResponse>(
        ENDPOINTS.FAQ_SEARCH,
        {
          query: request.query,
          category: request.category,
          limit: request.limit || 5,
        }
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to search FAQ:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error searching FAQ:', error);
      return null;
    }
  }

  /**
   * Get FAQ suggestions based on message content
   */
  async getFAQSuggestions(messageContent: string): Promise<FAQSuggestion[]> {
    try {

      const response = await apiClient.post<FAQSuggestion[]>(
        ENDPOINTS.FAQ_SUGGESTIONS,
        { content: messageContent }
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to get suggestions:', response.error);
        return [];
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Mark FAQ as helpful or not
   */
  async markFAQHelpful(faqId: string, helpful: boolean): Promise<boolean> {
    try {

      const response = await apiClient.post(ENDPOINTS.FAQ_HELPFUL(faqId), {
        helpful,
      });

      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to record feedback:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error recording feedback:', error);
      return false;
    }
  }

  // ==================== Queue ====================

  /**
   * Get current queue information
   */
  async getQueueInfo(): Promise<QueueInfo | null> {
    try {

      const response = await apiClient.get<QueueInfo>(ENDPOINTS.QUEUE_INFO);

      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch queue info:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching queue info:', error);
      return null;
    }
  }

  /**
   * Get queue position for specific ticket
   */
  async getQueuePosition(ticketId: string): Promise<QueueInfo | null> {
    try {

      const response = await apiClient.get<QueueInfo>(
        ENDPOINTS.QUEUE_POSITION(ticketId)
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch position:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching position:', error);
      return null;
    }
  }

  // ==================== Calls ====================

  /**
   * Request a voice/video call
   */
  async requestCall(
    ticketId: string,
    type: 'voice' | 'video'
  ): Promise<CallRequest | null> {
    try {

      const response = await apiClient.post<CallRequest>(
        ENDPOINTS.REQUEST_CALL(ticketId),
        { type }
      );
      
      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to request call:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error requesting call:', error);
      return null;
    }
  }

  /**
   * Accept a call request
   */
  async acceptCall(callId: string): Promise<boolean> {
    try {

      const response = await apiClient.post(ENDPOINTS.ACCEPT_CALL(callId));

      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to accept call:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error accepting call:', error);
      return false;
    }
  }

  /**
   * Reject a call request
   */
  async rejectCall(callId: string): Promise<boolean> {
    try {

      const response = await apiClient.post(ENDPOINTS.REJECT_CALL(callId));

      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to reject call:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error rejecting call:', error);
      return false;
    }
  }

  // ==================== Business Info ====================

  /**
   * Get business hours
   */
  async getBusinessHours(): Promise<BusinessHours | null> {
    try {

      const response = await apiClient.get<BusinessHours>(ENDPOINTS.BUSINESS_HOURS);

      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch business hours:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching business hours:', error);
      return null;
    }
  }

  // ==================== Statistics ====================

  /**
   * Get chat statistics
   */
  async getStatistics(): Promise<ChatStatistics | null> {
    try {

      const response = await apiClient.get<ChatStatistics>(ENDPOINTS.STATISTICS);

      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch statistics:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching statistics:', error);
      return null;
    }
  }

  /**
   * Get user support history
   */
  async getUserHistory(): Promise<UserSupportHistory | null> {
    try {

      const response = await apiClient.get<UserSupportHistory>(ENDPOINTS.USER_HISTORY);

      if (response.success && response.data) {

        return response.data;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to fetch user history:', response.error);
        return null;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error fetching user history:', error);
      return null;
    }
  }

  // ==================== Transcript ====================

  /**
   * Request email transcript
   */
  async requestTranscript(ticketId: string, email?: string): Promise<boolean> {
    try {

      const response = await apiClient.post(
        ENDPOINTS.REQUEST_TRANSCRIPT(ticketId),
        { email }
      );
      
      if (response.success) {

        return true;
      } else {
        devLog.error('❌ [SUPPORT API] Failed to request transcript:', response.error);
        return false;
      }
    } catch (error) {
      devLog.error('❌ [SUPPORT API] Error requesting transcript:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supportChatApi = new SupportChatApi();
export default supportChatApi;
