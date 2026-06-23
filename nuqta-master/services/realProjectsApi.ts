// Real API implementation for Projects (Phase 5 - Social Earning)
import apiClient, { ApiResponse } from './apiClient';

export interface Project {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: 'review' | 'social_share' | 'ugc_content' | 'store_visit' | 'survey' | 'photo' | 'video' | 'data_collection' | 'mystery_shopping' | 'referral';
  type: 'video' | 'photo' | 'text' | 'visit' | 'checkin' | 'survey' | 'rating' | 'social' | 'referral';
  brand?: string;
  sponsor?: {
    _id: string;
    name: string;
    logo?: string;
  };
  requirements: {
    minWords?: number;
    minDuration?: number;
    maxDuration?: number;
    minPhotos?: number;
    location?: {
      required: boolean;
      specific?: string;
      radius?: number;
    };
    demographics?: {
      minAge?: number;
      maxAge?: number;
      gender?: 'male' | 'female' | 'any';
    };
  };
  reward: {
    amount: number;
    currency: string;
    type: 'fixed' | 'variable' | 'milestone';
    bonusMultiplier?: number;
    milestones?: Array<{
      target: number;
      bonus: number;
    }>;
    paymentMethod: 'wallet' | 'bank' | 'upi';
    paymentSchedule: 'immediate' | 'daily' | 'weekly' | 'monthly';
  };
  limits: {
    maxCompletions?: number;
    totalBudget?: number;
    dailyBudget?: number;
    maxCompletionsPerUser?: number;
    expiryDate?: string;
    startDate?: string;
  };
  instructions: string[];
  examples?: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'expired' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  analytics: {
    totalViews: number;
    totalApplications: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    avgCompletionTime: number;
    avgQualityScore: number;
    totalPayout: number;
    conversionRate: number;
    approvalRate: number;
  };
  isFeatured: boolean;
  isSponsored: boolean;
  createdBy: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export const realProjectsApi = {
  /**
   * Get all projects with filtering and pagination
   */
  async getProjects(params?: {
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    creator?: string;
    status?: string;
    search?: string;
    sortBy?: 'newest' | 'popular' | 'trending' | 'difficulty_easy' | 'difficulty_hard';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ projects: Project[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.append('category', params.category);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.creator) queryParams.append('creator', params.creator);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/projects?${queryParams.toString()}`);
  },

  /**
   * Get featured projects
   */
  async getFeaturedProjects(limit?: number): Promise<ApiResponse<Project[]>> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', String(limit));

    return apiClient.get(`/projects/featured?${queryParams.toString()}`);
  },

  /**
   * Get projects by category
   */
  async getProjectsByCategory(
    category: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<{ projects: Project[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/projects/category/${category}?${queryParams.toString()}`);
  },

  /**
   * Get single project by ID
   */
  async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
    return apiClient.get(`/projects/${projectId}`);
  },

  /**
   * Like/Unlike a project (requires authentication)
   */
  async toggleProjectLike(projectId: string): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
    return apiClient.post(`/projects/${projectId}/like`);
  },

  /**
   * Add comment to project (requires authentication)
   */
  async addProjectComment(projectId: string, comment: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/projects/${projectId}/comments`, { comment });
  },

  /**
   * Apply to a project (requires authentication)
   */
  async applyToProject(projectId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/projects/${projectId}/apply`);
  },

  /**
   * Submit work for a project (requires authentication)
   */
  async submitProjectWork(
    projectId: string,
    data: {
      contentType: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
      content: string | string[];
      metadata?: any;
    }
  ): Promise<ApiResponse<any>> {
    return apiClient.post(`/projects/${projectId}/submit`, data);
  },

  /**
   * Get user's project submissions (requires authentication)
   */
  async getMySubmissions(params?: {
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ submissions: any[]; pagination: any }>> {
    const queryParams = new URLSearchParams();

    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/projects/my-submissions?${queryParams.toString()}`);
  },

  /**
   * Get user's project earnings (requires authentication)
   */
  async getMyEarnings(): Promise<ApiResponse<{ totalEarned: number; pendingPayment: number; projects: number }>> {
    return apiClient.get('/projects/my-earnings');
  },
};

export default realProjectsApi;