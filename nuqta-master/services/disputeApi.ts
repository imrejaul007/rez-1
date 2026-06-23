import apiClient, { ApiResponse } from './apiClient';

// ─── Types ──────────────────────────────────────────────────

export interface DisputeEvidence {
  submittedBy: string;
  submitterType: 'user' | 'merchant' | 'admin';
  description: string;
  attachments: string[];
  submittedAt: string;
}

export interface DisputeTimeline {
  action: string;
  performedBy?: string;
  performerType: 'user' | 'merchant' | 'admin' | 'system';
  details?: string;
  timestamp: string;
}

export interface Dispute {
  _id: string;
  disputeNumber: string;
  user: string | { _id: string; fullName?: string };
  targetType: 'order' | 'transaction' | 'transfer';
  targetId: string;
  targetRef: string;
  store?: string | { _id: string; name?: string };
  reason: string;
  description: string;
  amount: number;
  currency: string;
  status: 'open' | 'under_review' | 'escalated' | 'resolved_refund' | 'resolved_reject' | 'auto_resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence: DisputeEvidence[];
  timeline: DisputeTimeline[];
  resolution?: {
    decision: 'refund' | 'reject' | 'partial_refund';
    amount: number;
    reason: string;
    resolvedAt: string;
  };
  merchantResponse?: {
    response: string;
    attachments: string[];
    respondedAt: string;
  };
  rewardLocked: boolean;
  autoResolveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeRequest {
  targetType: 'order' | 'transaction' | 'transfer';
  targetId: string;
  reason: string;
  description: string;
  evidence?: {
    description: string;
    attachments: string[];
  };
}

export interface DisputeListResponse {
  disputes: Dispute[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Service ────────────────────────────────────────────────

class DisputeApiService {
  private baseUrl = '/disputes';

  async createDispute(data: CreateDisputeRequest): Promise<ApiResponse<Dispute>> {
    return apiClient.post<Dispute>(this.baseUrl, data);
  }

  async getMyDisputes(page: number = 1, limit: number = 20): Promise<ApiResponse<DisputeListResponse>> {
    return apiClient.get<DisputeListResponse>(this.baseUrl, { page, limit });
  }

  async getDispute(id: string): Promise<ApiResponse<Dispute>> {
    return apiClient.get<Dispute>(`${this.baseUrl}/${id}`);
  }

  async addEvidence(id: string, description: string, attachments: string[]): Promise<ApiResponse<Dispute>> {
    return apiClient.post<Dispute>(`${this.baseUrl}/${id}/evidence`, {
      description,
      attachments,
    });
  }
}

const disputeApi = new DisputeApiService();
export default disputeApi;
