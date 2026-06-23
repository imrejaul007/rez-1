// @ts-nocheck
// Earning Projects API Service
// Handles earning opportunities, tasks, and user earnings

import apiClient, { ApiResponse } from './apiClient';

export interface EarningProject {
  _id: string;
  title: string;
  description: string;
  payment: number;
  duration: string;
  status: 'available' | 'in_progress' | 'in_review' | 'completed' | 'expired';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requirements: string[];
  thumbnail?: string;
  company?: {
    name: string;
    logo?: string;
    verified?: boolean;
  };
  tags?: string[];
  maxParticipants?: number;
  currentParticipants?: number;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEarnings {
  totalEarned: number;
  pendingEarnings: number;
  availableBalance: number;
  breakdown: {
    projects: number;
    referrals: number;
    shareAndEarn: number;
    bonuses: number;
  };
  currency: string;
}

export interface ProjectStats {
  completeNow: number;
  inReview: number;
  completed: number;
  totalProjects: number;
}

export interface EarningNotification {
  _id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedProject?: string;
  createdAt: string;
}

export interface EarningCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  projectCount: number;
  averagePayment: number;
  isActive: boolean;
}

export interface ReferralInfo {
  totalReferrals: number;
  totalEarningsFromReferrals: number;
  pendingReferrals: number;
  referralBonus: number;
  referralCode: string;
  referralLink: string;
}

class EarningProjectsApi {
  /**
   * Get available earning projects
   */
  async getProjects(params?: {
    status?: string;
    category?: string;
    difficulty?: string;
    minPayment?: number;
    maxPayment?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    projects: EarningProject[];
    total: number;
    page: number;
    pages: number;
  }>> {
    try {
      // Use the correct backend endpoint: /api/projects
      // Only set excludeUserSubmissions=true when fetching available projects (not when fetching user's submissions)
      // Don't exclude when viewing "in-review" or "completed" projects
      const isFetchingUserSubmissions = params?.userSubmissionStatus || params?.status === 'in-review' || params?.status === 'completed';
      const requestParams = {
        ...params,
        status: params?.status || 'active',
        // Only exclude user submissions when fetching available projects, not when viewing user's submissions
        ...(isFetchingUserSubmissions ? {} : { excludeUserSubmissions: 'true' }),
      };
      
      
      const response = await apiClient.get<{
        projects: any[];
        pagination: {
          total: number;
          page: number;
          totalPages: number;
        };
      }>('/projects', requestParams);

      if (response.success && response.data) {
        // Transform backend project format to frontend format
        const transformedProjects: EarningProject[] = (response.data.projects || []).map((p: any) => ({
          _id: p._id,
          title: p.title,
          description: p.description || p.shortDescription || '',
          payment: p.reward?.amount || 0,
          duration: `${p.estimatedTime || 0} min`,
          status: p.status === 'active' ? 'available' : 'expired',
          category: p.category || 'other',
          difficulty: p.difficulty || 'easy',
          requirements: p.requirements ? Object.keys(p.requirements).map(key => `${key}: ${p.requirements[key]}`) : [],
          tags: p.tags || [],
          maxParticipants: p.limits?.maxCompletions,
          currentParticipants: p.analytics?.totalSubmissions || 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));

        return {
          success: true,
          data: {
            projects: transformedProjects,
            total: response.data.pagination?.total || 0,
            page: response.data.pagination?.page || 1,
            pages: response.data.pagination?.totalPages || 1,
          },
          message: 'Projects retrieved successfully',
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Get project details
   */
  async getProjectById(projectId: string): Promise<ApiResponse<EarningProject>> {
    try {
      return await apiClient.get(`/earning-projects/${projectId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start a project
   */
  async startProject(projectId: string): Promise<ApiResponse<{
    message: string;
    projectStatus: string;
  }>> {
    // Validate projectId is a valid MongoDB ObjectId (24 hex characters)
    if (!projectId || !/^[0-9a-fA-F]{24}$/.test(projectId)) {
      throw new Error('Invalid project ID format. Project ID must be a valid MongoDB ObjectId.');
    }

    try {
      // Send empty body for "start" - content is optional
      return await apiClient.post(`/earning-projects/${projectId}/start`, {});
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Complete a project
   */
  async completeProject(projectId: string, data?: any): Promise<ApiResponse<{
    message: string;
    earnedAmount: number;
  }>> {
    try {
      return await apiClient.post(`/earning-projects/${projectId}/complete`, data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's earnings summary
   */
  async getUserEarnings(): Promise<ApiResponse<UserEarnings>> {
    try {
      return await apiClient.get('/earnings/summary');
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Get user's project statistics
   */
  async getProjectStats(): Promise<ApiResponse<ProjectStats>> {
    try {
      return await apiClient.get('/earnings/project-stats');
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Get earning notifications
   */
  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<ApiResponse<EarningNotification[]>> {
    try {
      return await apiClient.get('/earnings/notifications', params);
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<{
    message: string;
  }>> {
    try {
      return await apiClient.patch(`/earnings/notifications/${notificationId}/read`);
    } catch (error) {
      return {
        success: true,
        data: { message: 'Notification marked as read' },
        message: 'Success'
      };
    }
  }

  /**
   * Get earning categories
   */
  async getCategories(): Promise<ApiResponse<EarningCategory[]>> {
    try {
      return await apiClient.get('/earning-projects/categories');
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Get referral information
   */
  async getReferralInfo(): Promise<ApiResponse<ReferralInfo>> {
    try {
      return await apiClient.get('/earnings/referral-info');
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Withdraw earnings
   */
  async withdrawEarnings(amount: number, method: string): Promise<ApiResponse<{
    message: string;
    transactionId: string;
  }>> {
    try {
      return await apiClient.post('/earnings/withdraw', { amount, method });
    } catch (error) {
      throw error;
    }
  }

}

// Create singleton instance
const earningProjectsApi = new EarningProjectsApi();

export default earningProjectsApi;
