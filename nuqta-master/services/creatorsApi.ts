// Creators API Service
// Handles creator profiles, picks, applications, earnings, and engagement

import apiClient, { ApiResponse } from './apiClient';

// ============================================
// TYPES
// ============================================

export interface Creator {
  id: string;
  profileId?: string;
  name: string;
  avatar: string;
  bio?: string;
  verified: boolean;
  rating: number;
  totalPicks: number;
  totalViews: number;
  totalLikes?: number;
  followers: number;
  tier?: string;
  category?: string;
  tags?: string[];
  isFeatured?: boolean;
}

export interface CreatorProfile extends Creator {
  joinedAt: string;
  coverImage?: string;
  socialLinks?: { platform: string; url: string }[];
  stats: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    followers: number;
    totalConversions?: number;
    totalEarnings?: number;
    engagementRate?: number;
  };
}

export interface CreatorPick {
  id: string;
  title: string;
  description?: string;
  productImage: string;
  videoUrl?: string;
  productPrice: number;
  productBrand: string;
  productId?: string;
  tag: string;
  tags?: string[];
  views: number;
  purchases: number;
  likes?: number;
  shares?: number;
  clicks?: number;
  trendingScore?: number;
  commissionRate?: number;
  estimatedCoins?: number;
  status?: 'draft' | 'pending_merchant' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  moderationStatus?: string;
  isPublished?: boolean;
  merchantApproval?: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    reward?: {
      type: 'rez_coins' | 'branded_coins' | 'none';
      amount: number;
    };
  };
  creator?: {
    id: string;
    profileId?: string;
    name: string;
    avatar?: string;
    verified: boolean;
    tier?: string;
    bio?: string;
    category?: string;
    stats?: any;
  };
  store?: {
    id: string;
    name: string;
    logo?: string;
  };
  createdAt?: string;
}

export interface CreatorStats {
  videos: number;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
  followers: number;
  following: number;
}

export interface MyPick {
  id: string;
  title: string;
  productImage: string;
  videoUrl?: string;
  productPrice: number;
  productBrand: string;
  tags: string[];
  views: number;
  likes: number;
  clicks: number;
  purchases: number;
  earnings: number;
  status: 'draft' | 'pending_merchant' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  moderationStatus: string;
  isPublished: boolean;
  createdAt: string;
  merchantApproval?: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    reward?: {
      type: 'rez_coins' | 'branded_coins' | 'none';
      amount: number;
    };
  };
}

export interface CreatorEarnings {
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  totalConversions: number;
  merchantRewards?: number;
  tier: string;
  commissionRate: number;
  recentConversions: {
    id: string;
    product: string;
    productImage: string;
    buyer: string;
    amount: number;
    commission: number;
    status: string;
    createdAt: string;
  }[];
}

export interface EligibilityResult {
  eligible: boolean;
  requirements: {
    label: string;
    met: boolean;
    current: number;
    required: number;
  }[];
  existingProfile?: {
    status: string;
    rejectionReason?: string;
  };
}

// ============================================
// HELPERS
// ============================================

function mapCreator(creator: any): Creator {
  return {
    id: creator.id || creator._id,
    profileId: creator.profileId,
    name: creator.name || creator.displayName || 'Creator',
    avatar: creator.avatar || '',
    bio: creator.bio || '',
    verified: creator.verified ?? false,
    rating: creator.rating || 4.5,
    totalPicks: creator.totalPicks || 0,
    totalViews: creator.totalViews || 0,
    totalLikes: creator.totalLikes || 0,
    followers: creator.followers || 0,
    tier: creator.tier,
    category: creator.category,
    tags: creator.tags || [],
    isFeatured: creator.isFeatured,
  };
}

function mapPick(pick: any): CreatorPick {
  return {
    id: pick.id || pick._id,
    title: pick.title || 'Product Pick',
    description: pick.description,
    productImage: pick.productImage || pick.image || '',
    videoUrl: pick.videoUrl,
    productPrice: pick.productPrice || 0,
    productBrand: pick.productBrand || '',
    productId: pick.productId,
    tag: pick.tag || '#trending',
    tags: pick.tags || [],
    views: pick.views || 0,
    purchases: pick.purchases || 0,
    likes: pick.likes || 0,
    clicks: pick.clicks || 0,
    trendingScore: pick.trendingScore || 0,
    commissionRate: pick.commissionRate,
    estimatedCoins: pick.estimatedCoins,
    status: pick.status,
    moderationStatus: pick.moderationStatus,
    isPublished: pick.isPublished,
    merchantApproval: pick.merchantApproval,
    creator: pick.creator ? {
      id: pick.creator.id || pick.creator._id,
      profileId: pick.creator.profileId,
      name: pick.creator.name || '',
      avatar: pick.creator.avatar,
      verified: pick.creator.verified ?? false,
      tier: pick.creator.tier,
      bio: pick.creator.bio,
      category: pick.creator.category,
      stats: pick.creator.stats,
    } : undefined,
    store: pick.store,
    createdAt: pick.createdAt,
  };
}

// ============================================
// CREATORS API SERVICE
// ============================================

class CreatorsApiService {

  // ==========================================
  // PUBLIC — Featured & Trending
  // ==========================================

  async getFeaturedCreators(limit: number = 6): Promise<ApiResponse<{
    creators: Creator[];
    total: number;
  }>> {
    try {
      const response = await apiClient.get<any>('/creators/featured', { limit });

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            creators: (data.creators || []).map(mapCreator),
            total: data.total || 0,
          },
        };
      }

      return { success: true, data: { creators: [], total: 0 } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getTrendingPicks(limit: number = 10, category?: string): Promise<ApiResponse<{
    picks: CreatorPick[];
    total: number;
  }>> {
    try {
      const params: any = { limit };
      if (category) params.category = category;

      const response = await apiClient.get<any>('/creators/trending-picks', params);

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            picks: (data.picks || []).map(mapPick),
            total: data.total || 0,
          },
        };
      }

      return { success: true, data: { picks: [], total: 0 } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // PUBLIC — All Creators (with filters)
  // ==========================================

  async getApprovedCreators(params: {
    limit?: number;
    page?: number;
    category?: string;
    sort?: string;
    search?: string;
  } = {}): Promise<ApiResponse<{
    creators: Creator[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    try {
      const response = await apiClient.get<any>('/creators/all', params);

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            creators: (data.creators || []).map(mapCreator),
            total: data.total || 0,
            page: data.page || 1,
            totalPages: data.totalPages || 1,
          },
        };
      }

      return { success: true, data: { creators: [], total: 0, page: 1, totalPages: 1 } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // PUBLIC — Single Creator Profile
  // ==========================================

  async getCreatorById(id: string): Promise<ApiResponse<CreatorProfile>> {
    try {
      const response = await apiClient.get<any>(`/creators/${id}`);

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            ...mapCreator(data),
            joinedAt: data.joinedAt || data.createdAt || '',
            coverImage: data.coverImage,
            socialLinks: data.socialLinks || [],
            stats: {
              totalVideos: data.stats?.totalPicks || data.stats?.totalVideos || 0,
              totalViews: data.stats?.totalViews || 0,
              totalLikes: data.stats?.totalLikes || 0,
              totalShares: data.stats?.totalShares || 0,
              followers: data.stats?.totalFollowers || data.stats?.followers || 0,
              totalConversions: data.stats?.totalConversions,
              totalEarnings: data.stats?.totalEarnings,
              engagementRate: data.stats?.engagementRate,
            },
          },
        };
      }

      return { success: false, error: response.error || 'Creator not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getCreatorPicks(creatorId: string, limit: number = 10): Promise<ApiResponse<{
    picks: CreatorPick[];
    total: number;
  }>> {
    try {
      const response = await apiClient.get<any>(`/creators/${creatorId}/picks`, { limit });

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            picks: (data.picks || []).map(mapPick),
            total: data.total || 0,
          },
        };
      }

      return { success: true, data: { picks: [], total: 0 } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getCreatorStats(creatorId: string): Promise<ApiResponse<CreatorStats>> {
    try {
      const response = await apiClient.get<any>(`/creators/${creatorId}/stats`);

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            videos: data.videos || 0,
            views: data.views || 0,
            likes: data.likes || 0,
            shares: data.shares || 0,
            comments: data.comments || 0,
            engagementRate: data.engagementRate || 0,
            followers: data.followers || 0,
            following: data.following || 0,
          },
        };
      }

      return { success: false, error: response.error || 'Failed to fetch stats' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // PUBLIC — Single Pick Detail
  // ==========================================

  async getPickById(pickId: string): Promise<ApiResponse<CreatorPick>> {
    try {
      const response = await apiClient.get<any>(`/creators/picks/${pickId}`);

      if (response.success && response.data) {
        return { success: true, data: mapPick(response.data) };
      }

      return { success: false, error: response.error || 'Pick not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // ENGAGEMENT TRACKING
  // ==========================================

  async trackPickView(pickId: string): Promise<void> {
    try {
      await apiClient.post(`/creators/picks/${pickId}/view`, {});
    } catch (error) {
      // Silent fail for tracking
    }
  }

  async trackPickClick(pickId: string): Promise<void> {
    try {
      await apiClient.post(`/creators/picks/${pickId}/click`, {});
    } catch (error) {
      // Silent fail for tracking
    }
  }

  async togglePickLike(pickId: string): Promise<ApiResponse<{ isLiked: boolean }>> {
    try {
      const response = await apiClient.post<any>(`/creators/picks/${pickId}/like`, {});
      if (response.success && response.data) {
        return { success: true, data: { isLiked: response.data.isLiked } };
      }
      return { success: false, error: response.error || 'Failed to toggle like' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async togglePickBookmark(pickId: string): Promise<ApiResponse<{ isBookmarked: boolean }>> {
    try {
      const response = await apiClient.post<any>(`/creators/picks/${pickId}/bookmark`, {});
      if (response.success && response.data) {
        return { success: true, data: { isBookmarked: response.data.isBookmarked } };
      }
      return { success: false, error: response.error || 'Failed to toggle bookmark' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // AUTHENTICATED — Creator Application
  // ==========================================

  async checkEligibility(): Promise<ApiResponse<EligibilityResult>> {
    try {
      const response = await apiClient.get<any>('/creators/eligibility');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to check eligibility' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async applyAsCreator(data: {
    displayName: string;
    bio: string;
    category: string;
    tags?: string[];
    socialLinks?: { platform: string; url: string }[];
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>('/creators/apply', data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Application failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // AUTHENTICATED — My Profile
  // ==========================================

  async getMyCreatorProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>('/creators/my-profile');
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateMyProfile(data: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
    tags?: string[];
    socialLinks?: { platform: string; url: string }[];
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put<any>('/creators/my-profile', data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Update failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // AUTHENTICATED — My Picks
  // ==========================================

  async submitPick(data: {
    productId: string;
    title: string;
    description?: string;
    image?: string;
    videoUrl?: string;
    tags?: string[];
    videoId?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>('/creators/my-picks', data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to submit pick' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getMyPicks(params: {
    limit?: number;
    page?: number;
    status?: string;
  } = {}): Promise<ApiResponse<{ picks: MyPick[]; total: number }>> {
    try {
      const response = await apiClient.get<any>('/creators/my-picks', params);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: true, data: { picks: [], total: 0 } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteMyPick(pickId: string): Promise<ApiResponse<{ deleted: boolean; archived: boolean }>> {
    try {
      const response = await apiClient.delete<any>(`/creators/my-picks/${pickId}`);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to delete pick' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateMyPick(pickId: string, data: {
    title?: string;
    description?: string;
    tags?: string[];
    image?: string;
    videoUrl?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.patch<any>(`/creators/my-picks/${pickId}`, data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to update pick' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // AUTHENTICATED — My Earnings
  // ==========================================

  async getMyEarnings(): Promise<ApiResponse<CreatorEarnings>> {
    try {
      const response = await apiClient.get<any>('/creators/my-earnings');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to fetch earnings' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const creatorsApi = new CreatorsApiService();

export default creatorsApi;
export { creatorsApi };
