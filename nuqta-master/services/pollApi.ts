// Poll API Service
// Handles voting on polls and earning coins

import apiClient from './apiClient';

export interface PollOption {
  id: string;
  text: string;
  imageUrl?: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  category?: string;
  store?: { _id: string; name: string; logo?: string };
  totalVotes: number;
  coinsPerVote: number;
  isDaily: boolean;
  tags: string[];
  startsAt: string;
  endsAt: string;
  hasVoted: boolean;
  userVote?: string | null;
  createdAt: string;
}

export interface VoteResult {
  pollId: string;
  optionId: string;
  totalVotes: number;
  options: PollOption[];
  coinReward?: {
    coinsAwarded: number;
    status: string;
    message: string;
  } | null;
}

export interface PollVoteHistory {
  id: string;
  optionId: string;
  coinsAwarded: number;
  createdAt: string;
  poll: {
    id: string;
    title: string;
    description?: string;
    options: PollOption[];
    totalVotes: number;
    isDaily: boolean;
    status: string;
  } | null;
}

export interface PollPagination {
  current: number;
  pages: number;
  total: number;
  hasMore: boolean;
}

class PollApiService {
  /**
   * Get active polls
   */
  async getActivePolls(
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { polls: Poll[]; pagination: PollPagination }; error?: string }> {
    try {
      const response = await apiClient.get<{ polls: Poll[]; pagination: PollPagination }>(
        `/polls/active?page=${page}&limit=${limit}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch polls' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch polls' };
    }
  }

  /**
   * Get today's daily poll
   */
  async getDailyPoll(): Promise<{ success: boolean; data?: { poll: Poll | null }; error?: string }> {
    try {
      const response = await apiClient.get<{ poll: Poll | null }>('/polls/daily');
      if (response.success) {
        return { success: true, data: response.data ? { poll: response.data.poll } : { poll: null } };
      }
      return { success: false, error: response.message || 'Failed to fetch daily poll' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch daily poll' };
    }
  }

  /**
   * Get poll detail
   */
  async getPollDetail(id: string): Promise<{ success: boolean; data?: { poll: Poll }; error?: string }> {
    try {
      const response = await apiClient.get<{ poll: Poll }>(`/polls/${id}`);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch poll' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch poll' };
    }
  }

  /**
   * Cast a vote on a poll
   */
  async vote(
    pollId: string,
    optionId: string
  ): Promise<{ success: boolean; data?: VoteResult; message?: string; error?: string }> {
    try {
      const response = await apiClient.post<VoteResult>(`/polls/${pollId}/vote`, { optionId });
      if (response.success && response.data) {
        return { success: true, data: response.data, message: response.message };
      }
      return { success: false, error: response.message || 'Failed to vote' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to vote' };
    }
  }

  /**
   * Get user's vote history
   */
  async getMyVotes(
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { votes: PollVoteHistory[]; pagination: PollPagination }; error?: string }> {
    try {
      const response = await apiClient.get<{ votes: PollVoteHistory[]; pagination: PollPagination }>(
        `/polls/my-votes?page=${page}&limit=${limit}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch vote history' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch vote history' };
    }
  }
}

export const pollApi = new PollApiService();
export default pollApi;
