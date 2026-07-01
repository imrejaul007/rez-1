/**
 * Session Service
 * Wraps REZ Session Manager API via the API gateway (/api/sessions).
 */

import apiClient, { ApiResponse } from './apiClient';
import { ENDPOINTS } from '@/config/env';
import logger from '@/utils/logger';

export interface SessionContext {
  variables?: Record<string, any>;
  memory?: MemoryEntry[];
  attachments?: Attachment[];
  userProfile?: UserProfile;
}

export interface SessionConfig {
  maxMessages?: number;
  maxTokens?: number;
  contextWindow?: number;
  autoSave?: boolean;
  expirationMinutes?: number;
}

export interface MemoryEntry {
  id?: string;
  type: 'fact' | 'preference' | 'action' | 'result';
  content: string;
  source: 'user' | 'agent' | 'system';
  importance?: number;
}

export interface Attachment {
  type: 'file' | 'image' | 'document' | 'link';
  name: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  traits?: Record<string, any>;
}

export interface Session {
  id: string;
  userId: string;
  agentId: string;
  context: SessionContext;
  messages: Message[];
  state: SessionState;
  metadata: {
    config: SessionConfig;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  lastActivityAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface SessionState {
  status: 'active' | 'paused' | 'completed' | 'expired';
  currentTask?: TaskInfo;
  progress?: number;
  tags: string[];
}

export interface TaskInfo {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
}

export interface SessionSummary {
  id: string;
  userId: string;
  agentId: string;
  messageCount: number;
  lastMessageAt: string;
  status: string;
  createdAt: string;
}

export interface CreateSessionParams {
  userId: string;
  agentId: string;
  context?: SessionContext;
  config?: SessionConfig;
}

export interface AddMessageParams {
  role: 'user' | 'agent' | 'system';
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

const SESSIONS_BASE = '/sessions';

class SessionService {
  /**
   * Create a new AI agent session
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      SESSIONS_BASE,
      params,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create session');
    }

    return response.data;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    const response = await apiClient.get<ApiResponse<Session>>(
      `${SESSIONS_BASE}/${sessionId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get session');
    }

    return response.data;
  }

  /**
   * List sessions with optional filters
   */
  async listSessions(filters?: {
    userId?: string;
    agentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sessions: SessionSummary[]; total: number }> {
    const params: Record<string, string | number> = {};

    if (filters?.userId) params.userId = filters.userId;
    if (filters?.agentId) params.agentId = filters.agentId;
    if (filters?.status) params.status = filters.status;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await apiClient.get<ApiResponse<{ sessions: SessionSummary[]; total: number }>>(
      SESSIONS_BASE,
      params,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to list sessions');
    }

    return response.data;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `${SESSIONS_BASE}/${sessionId}`,
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete session');
    }
  }

  /**
   * Add a message to a session
   */
  async addMessage(sessionId: string, params: AddMessageParams): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>(
      `${SESSIONS_BASE}/${sessionId}/messages`,
      params,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add message');
    }

    return response.data;
  }

  /**
   * Get messages from a session
   */
  async getMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(
      `${SESSIONS_BASE}/${sessionId}/messages`,
      limit ? { limit } : undefined,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get messages');
    }

    return response.data;
  }

  /**
   * Pause a session
   */
  async pauseSession(sessionId: string): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      `${SESSIONS_BASE}/${sessionId}/pause`,
      {},
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to pause session');
    }

    return response.data;
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      `${SESSIONS_BASE}/${sessionId}/resume`,
      {},
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to resume session');
    }

    return response.data;
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      `${SESSIONS_BASE}/${sessionId}/complete`,
      {},
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to complete session');
    }

    return response.data;
  }

  /**
   * Add memory to a session
   */
  async addMemory(
    sessionId: string,
    type: MemoryEntry['type'],
    content: string,
    source: MemoryEntry['source'],
    importance?: number,
  ): Promise<MemoryEntry> {
    const response = await apiClient.post<ApiResponse<MemoryEntry>>(
      `${SESSIONS_BASE}/${sessionId}/memory`,
      { type, content, source, importance },
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add memory');
    }

    return response.data;
  }

  /**
   * Get memory from a session
   */
  async getMemory(sessionId: string, type?: MemoryEntry['type']): Promise<MemoryEntry[]> {
    const response = await apiClient.get<ApiResponse<MemoryEntry[]>>(
      `${SESSIONS_BASE}/${sessionId}/memory`,
      type ? { type } : undefined,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get memory');
    }

    return response.data;
  }

  /**
   * Create an AI chat session with the REZ Session Manager.
   * This is a specialized session for the AI Assistant.
   */
  async createAIChatSession(userId: string, agentId: string = 'ai-assistant'): Promise<Session> {
    const params: CreateSessionParams = {
      userId,
      agentId,
      context: {
        variables: {
          surface: 'ai-assistant',
          platform: 'mobile',
        },
      },
      config: {
        maxMessages: 50,
        autoSave: true,
        expirationMinutes: 1440, // 24 hours
      },
    };

    const response = await apiClient.post<ApiResponse<Session>>(
      SESSIONS_BASE,
      params,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create AI chat session');
    }

    return response.data;
  }

  /**
   * Add a message to an AI chat session and sync with backend AI.
   * This combines session persistence with AI response generation.
   */
  async addAIChatMessage(
    sessionId: string,
    userId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<{ sessionMessage: Message; aiReply?: Message }> {
    // Add the user message to the session
    const sessionMessage = await this.addMessage(sessionId, {
      role: 'user',
      content,
      metadata,
    });

    // Get AI response from the backend
    let aiReply: Message | undefined;
    try {
      // Import aiSupportService dynamically to avoid circular dependency
      const { aiSupportService } = await import('./b/aiSupportService');
      const response = await aiSupportService.sendMessage({
        sessionId,
        message: content,
        context: { surface: 'ai-assistant' },
      });

      // Add the AI reply to the session
      aiReply = await this.addMessage(sessionId, {
        role: 'agent',
        content: response.reply.content,
        metadata: {
          intent: response.intent?.intent,
          quickReplies: response.reply.quickReplies,
        },
      });
    } catch (error) {
      // AI response failed - log but don't throw since user message was saved
      logger.warn('session_ai_reply_failed', { error: String(error) }, 'B Features');
    }

    return { sessionMessage, aiReply };
  }

  /**
   * Get AI chat session history for resuming conversations.
   */
  async getAIChatHistory(sessionId: string, limit: number = 50): Promise<{
    session: Session;
    messages: Message[];
  }> {
    const session = await this.getSession(sessionId);
    const messages = await this.getMessages(sessionId, limit);

    return { session, messages };
  }

  /**
   * List all AI chat sessions for a user.
   */
  async listAIChatSessions(userId: string, page: number = 1, limit: number = 20): Promise<{
    sessions: SessionSummary[];
    total: number;
  }> {
    return this.listSessions({
      userId,
      agentId: 'ai-assistant',
      page,
      limit,
    });
  }

  /**
   * Resume an existing AI chat session by loading its messages.
   * Returns the session and messages if found, null if session doesn't exist or is expired.
   */
  async resumeAIChatSession(sessionId: string): Promise<{
    session: Session;
    messages: Message[];
  } | null> {
    try {
      return await this.getAIChatHistory(sessionId);
    } catch (error) {
      // Session not found or expired
      return null;
    }
  }

  /**
   * Direct health check against the session manager (ops / diagnostics).
   * API traffic should go through the gateway via apiClient above.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${ENDPOINTS.sessionManager}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const sessionService = new SessionService();
export default sessionService;
