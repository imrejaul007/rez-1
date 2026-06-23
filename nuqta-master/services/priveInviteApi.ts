/**
 * Privé Invite API Service
 *
 * Frontend API service for all Privé invite system endpoints.
 */

import apiClient, { ApiResponse } from './apiClient';

export interface PriveAccessStatus {
  hasAccess: boolean;
  accessSource: 'invite' | 'admin_whitelist' | 'auto_qualify' | 'none';
  effectiveTier: string;
  isWhitelisted: boolean;
  reputation: {
    score: number;
    tier: string;
    isEligible: boolean;
  };
}

export interface InviteCode {
  id: string;
  code: string;
  usageCount: number;
  maxUses: number;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
}

export interface InviteStats {
  totalInvites: number;
  activeInvites: number;
  pendingCodes: number;
  totalCoinsEarned: number;
  successRate: number;
  activeCodes: InviteCode[];
  canGenerate: boolean;
  canGenerateReason?: string;
  maxCodes: number;
  remainingCodes: number;
  tier: string;
  isWhitelisted: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  tier: string;
  totalInvites: number;
  activeInvites: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  myRank?: {
    rank: number;
    totalInvites: number;
  };
}

class PriveInviteApi {
  /**
   * Check if user has Privé access (lightweight, for nav guard)
   */
  async checkAccess(): Promise<ApiResponse<PriveAccessStatus>> {
    return apiClient.get<PriveAccessStatus>('/prive/access');
  }

  /**
   * Generate a new invite code
   */
  async generateCode(): Promise<ApiResponse<{
    code: string;
    expiresAt: string;
    maxUses: number;
    usageCount: number;
  }>> {
    return apiClient.post('/prive/invites/generate');
  }

  /**
   * Validate an invite code without applying
   */
  async validateCode(code: string): Promise<ApiResponse<{
    valid: boolean;
    reason?: string;
    creator?: { name: string; tier: string };
  }>> {
    return apiClient.post('/prive/invites/validate', { code });
  }

  /**
   * Apply an invite code to get Privé access
   */
  async applyCode(code: string): Promise<ApiResponse<{
    hasAccess: boolean;
    inviterReward: number;
    inviteeReward: number;
  }>> {
    return apiClient.post('/prive/invites/apply', { code });
  }

  /**
   * Get invite dashboard stats
   */
  async getInviteStats(): Promise<ApiResponse<InviteStats>> {
    return apiClient.get<InviteStats>('/prive/invites/stats');
  }

  /**
   * Get user's active invite codes
   */
  async getInviteCodes(): Promise<ApiResponse<{ codes: InviteCode[] }>> {
    return apiClient.get<{ codes: InviteCode[] }>('/prive/invites/codes');
  }

  /**
   * Get invite leaderboard
   */
  async getLeaderboard(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<LeaderboardResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const query = queryParams.toString();
    return apiClient.get<LeaderboardResponse>(`/prive/invites/leaderboard${query ? `?${query}` : ''}`);
  }
}

export default new PriveInviteApi();
