/**
 * Prive Campaign API Service
 *
 * Handles all API calls for the Prive social cashback campaign system.
 * Supports listing, detail, join, submit (with FormData upload), status, and earnings.
 */

import apiClient, { ApiResponse } from './apiClient';

// ── Types ──

export interface CampaignRequirements {
  minPurchaseAmount?: number;
  postTypes: string[];
  mustTagBrand: boolean;
  minimumFollowers?: number;
  hashtagRequired?: string;
}

export interface CampaignReward {
  coinAmount: number;
  cashbackPercent?: number;
  cashbackMax?: number;
  cashbackCap?: number;
  estimatedEarning?: string;
}

export interface PriveCampaign {
  _id: string;
  title: string;
  description: string;
  merchantId: { _id: string; name: string; logo?: string };
  /** Flattened convenience fields (populated by backend or computed client-side) */
  merchantName?: string;
  merchantLogo?: string;
  taskType: 'dine_post' | 'buy_post' | 'visit_post' | 'event_post';
  taskSteps: string[];
  requirements: CampaignRequirements;
  reward: CampaignReward;
  minPriveTier: 'entry' | 'signature' | 'elite';
  slots: number;
  slotsUsed: number;
  slotsRemaining: number;
  budget: number;
  budgetUsed: number;
  budgetRemaining: number;
  validFrom: string;
  validTo: string;
  status: string;
  userStatus?: 'eligible' | 'joined' | 'submitted' | 'approved' | 'rejected' | 'slots_full' | 'expired' | 'tier_insufficient';
  userSubmissionStatus?: string | null;
  examplePosts?: string[];
  endsInHours?: number;
}

export interface CampaignSubmission {
  _id: string;
  campaignId: string;
  campaignTitle?: string;
  userId: string;
  postUrl: string;
  postScreenshotUrl?: string;
  orderId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rejectionReason?: string;
  reviewerNote?: string;
  coinsEarned: number;
  cashbackIssued: number | boolean;
  cashbackAmount?: number;
  submittedAt: string;
  reviewedAt?: string;
}

export interface CampaignEarning {
  _id: string;
  type: string;
  campaignTitle: string;
  merchantName: string;
  cashbackAmount: number;
  coinsAmount: number;
  status: string;
  creditedAt: string;
}

export interface CampaignListResponse {
  campaigns: PriveCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CampaignEarningsResponse {
  summary: {
    totalCashbackEarned: number;
    totalCoinsEarned: number;
    campaignsCompleted: number;
    pendingCashback: number;
    thisMonth: number;
  };
  earnings: CampaignEarning[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ── API Service ──

class PriveCampaignApi {
  /**
   * List campaigns with optional filters and pagination
   */
  async getCampaigns(params?: {
    type?: string;
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
  }): Promise<ApiResponse<CampaignListResponse>> {
    return apiClient.get('/prive/campaigns', params);
  }

  /**
   * Get single campaign detail
   */
  async getCampaignById(id: string): Promise<ApiResponse<{ campaign: PriveCampaign }>> {
    return apiClient.get(`/prive/campaigns/${id}`);
  }

  /**
   * Join a campaign (reserves a slot)
   */
  async joinCampaign(id: string): Promise<ApiResponse<{
    joined: boolean;
    campaignId: string;
    message: string;
    submissionDeadline: string;
  }>> {
    return apiClient.post(`/prive/campaigns/${id}/join`);
  }

  /**
   * Submit a social media post (supports both JSON and FormData for screenshot upload)
   */
  async submitPost(
    id: string,
    data: FormData | { postUrl: string; postScreenshotUrl?: string; orderId?: string; notes?: string }
  ): Promise<ApiResponse<{
    submission: {
      _id: string;
      campaignId: string;
      status: string;
      submittedAt: string;
      estimatedReviewTime: string;
      coinsAlreadyEarned: number;
      pendingCashback: number;
    };
  }>> {
    if (data instanceof FormData) {
      return apiClient.uploadFile(`/prive/campaigns/${id}/submit`, data);
    }
    return apiClient.post(`/prive/campaigns/${id}/submit`, data);
  }

  /**
   * Get submission status for a campaign
   */
  async getSubmissionStatus(id: string): Promise<ApiResponse<{ submission: CampaignSubmission }>> {
    return apiClient.get(`/prive/campaigns/${id}/status`);
  }

  /**
   * Get campaign earnings history
   */
  async getCampaignEarnings(params?: {
    page?: number;
    limit?: number;
    month?: string;
  }): Promise<ApiResponse<CampaignEarningsResponse>> {
    return apiClient.get('/prive/campaigns/earnings', params);
  }
}

const priveCampaignApi = new PriveCampaignApi();
export default priveCampaignApi;
