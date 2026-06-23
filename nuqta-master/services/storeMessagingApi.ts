// Store Messaging API Service
// Handles all messaging-related API calls

import apiClient, { ApiResponse } from './apiClient';
import {
  Conversation,
  ConversationFilter,
  Message,
  SendMessageRequest,
  StoreAvailability,
  MessageAttachment,
} from '@/types/messaging.types';

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  summary: {
    totalConversations: number;
    unreadCount: number;
    activeConversations: number;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  conversation: Conversation;
}

class StoreMessagingService {
  // Get all conversations for the current user
  async getConversations(filter: ConversationFilter = {}): Promise<ApiResponse<ConversationsResponse>> {

    return apiClient.get('/messages/conversations', filter);
  }

  // Get a specific conversation
  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {

    return apiClient.get(`/messages/conversations/${conversationId}`);
  }

  // Create or get conversation with a store
  async getOrCreateConversation(
    storeId: string,
    orderId?: string
  ): Promise<ApiResponse<Conversation>> {

    return apiClient.post('/messages/conversations', {
      storeId,
      orderId,
    });
  }

  // Get messages in a conversation
  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ApiResponse<MessagesResponse>> {

    return apiClient.get(`/messages/conversations/${conversationId}/messages`, {
      page,
      limit,
    });
  }

  // Send a text message
  async sendMessage(data: SendMessageRequest): Promise<ApiResponse<Message>> {

    // If no conversationId, create conversation first
    if (!data.conversationId) {
      const convResponse = await this.getOrCreateConversation(data.storeId, data.orderId);
      if (convResponse.success && convResponse.data) {
        data.conversationId = convResponse.data.id;
      } else {
        return {
          success: false,
          error: 'Failed to create conversation',
        };
      }
    }

    return apiClient.post(`/messages/conversations/${data.conversationId}/messages`, {
      content: data.content,
      type: data.type || 'text',
      replyToMessageId: data.replyToMessageId,
      location: data.location,
    });
  }

  // Send message with attachments
  async sendMessageWithAttachments(
    conversationId: string,
    content: string,
    attachments: File[]
  ): Promise<ApiResponse<Message>> {

    const formData = new FormData();
    formData.append('content', content);
    formData.append('type', 'image'); // or determine from file type

    attachments.forEach((file, index) => {
      formData.append(`attachments`, file);
    });

    return apiClient.post(
      `/messages/conversations/${conversationId}/messages`,
      formData
    );
  }

  // Mark message as read
  async markMessageAsRead(conversationId: string, messageId: string): Promise<ApiResponse<void>> {

    return apiClient.patch(`/messages/conversations/${conversationId}/messages/${messageId}/read`);
  }

  // Mark all messages in conversation as read
  async markConversationAsRead(conversationId: string): Promise<ApiResponse<void>> {

    return apiClient.patch(`/messages/conversations/${conversationId}/read`);
  }

  // Archive conversation
  async archiveConversation(conversationId: string): Promise<ApiResponse<Conversation>> {

    return apiClient.patch(`/messages/conversations/${conversationId}/archive`);
  }

  // Unarchive conversation
  async unarchiveConversation(conversationId: string): Promise<ApiResponse<Conversation>> {

    return apiClient.patch(`/messages/conversations/${conversationId}/unarchive`);
  }

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {

    return apiClient.delete(`/messages/conversations/${conversationId}`);
  }

  // Get store availability status
  async getStoreAvailability(storeId: string): Promise<ApiResponse<StoreAvailability>> {

    return apiClient.get(`/stores/${storeId}/availability`);
  }

  // Send typing indicator
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    // This is typically handled via WebSocket, but can have HTTP fallback

    // No API call needed - handled by socket
  }

  // Search messages
  async searchMessages(
    query: string,
    conversationId?: string
  ): Promise<ApiResponse<Message[]>> {

    return apiClient.get('/messages/search', {
      query,
      conversationId,
    });
  }

  // Report message
  async reportMessage(
    messageId: string,
    reason: string,
    details?: string
  ): Promise<ApiResponse<void>> {

    return apiClient.post(`/messages/${messageId}/report`, {
      reason,
      details,
    });
  }

  // Block store
  async blockStore(storeId: string): Promise<ApiResponse<void>> {

    return apiClient.post(`/stores/${storeId}/block`);
  }

  // Unblock store
  async unblockStore(storeId: string): Promise<ApiResponse<void>> {

    return apiClient.post(`/stores/${storeId}/unblock`);
  }

  // Get unread count
  async getUnreadCount(): Promise<ApiResponse<{ total: number; byStore: Record<string, number> }>> {

    return apiClient.get('/messages/unread/count');
  }

  // Create support ticket from conversation
  async createSupportTicket(
    conversationId: string,
    subject: string,
    category: string
  ): Promise<ApiResponse<any>> {

    return apiClient.post('/support/tickets', {
      conversationId,
      subject,
      category,
    });
  }

  // Get automated response suggestions
  async getAutoResponseSuggestions(
    storeId: string,
    query: string
  ): Promise<ApiResponse<string[]>> {

    return apiClient.get(`/stores/${storeId}/auto-responses`, {
      query,
    });
  }
}

// Create singleton instance
const storeMessagingService = new StoreMessagingService();

export default storeMessagingService;
