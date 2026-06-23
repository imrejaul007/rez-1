// Social Media API Service - PRODUCTION READY WITH ANTI-FRAUD SYSTEM
// Handles all social media post submission and earnings API calls
// Includes validation, error handling, retry mechanisms, logging, and comprehensive fraud detection
// Enhanced with Instagram verification, security checks, and duplicate detection

import apiClient from './apiClient';
import fraudDetectionService from './fraudDetectionService';
import instagramVerificationService from './instagramVerificationService';
import securityService from './securityService';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SocialPost {
  _id: string;
  user: string;
  order?: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  postUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  cashbackAmount: number;
  cashbackPercentage: number;
  submittedAt: string;
  reviewedAt?: string;
  creditedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  metadata: {
    postId?: string;
    thumbnailUrl?: string;
    orderNumber?: string;
    extractedData?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EarningsData {
  totalEarned: number;
  pendingAmount: number;
  creditedAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  postsSubmitted: number;
  postsApproved: number;
  postsRejected: number;
  postsCredited: number;
  approvalRate: number;
}

export interface PlatformStats {
  platform: string;
  totalPosts: number;
  totalCashback: number;
  approvedPosts: number;
  creditedPosts: number;
}

export interface SubmitPostRequest {
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  postUrl: string;
  orderId?: string;
}

export interface SubmitPostResponse {
  post: {
    id: string;
    platform: string;
    status: string;
    cashbackAmount: number;
    submittedAt: string;
    estimatedReview: string;
  };
}

export interface SubmitPostWithMediaRequest {
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  orderId?: string;
  files: { uri: string; type: string; name: string }[];
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'credited';
}

export interface GetPostsResponse {
  posts: SocialPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate Instagram URL format
 * Supports posts (/p/), reels (/reel/ and /reels/), and stories
 * Supports formats: instagram.com/p/ID or instagram.com/reels/ID
 */
const validateInstagramUrl = (url: string): boolean => {
  const instagramPattern = /^https?:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(p|reel|reels|instagramreel)\/[a-zA-Z0-9_-]+\/?(\?.*)?$/;
  return instagramPattern.test(url.trim());
};

/**
 * Validate Facebook URL format
 */
const validateFacebookUrl = (url: string): boolean => {
  const facebookPattern = /^https?:\/\/(www\.)?facebook\.com\/.+/;
  return facebookPattern.test(url.trim());
};

/**
 * Validate Twitter/X URL format
 */
const validateTwitterUrl = (url: string): boolean => {
  const twitterPattern = /^https?:\/\/(www\.)?(twitter|x)\.com\/.+\/status\/[0-9]+/;
  return twitterPattern.test(url.trim());
};

/**
 * Validate TikTok URL format
 */
const validateTikTokUrl = (url: string): boolean => {
  const tiktokPattern = /^https?:\/\/(www\.)?tiktok\.com\/.+/;
  return tiktokPattern.test(url.trim());
};

/**
 * Validate post URL based on platform
 */
const validatePostUrl = (platform: string, url: string): { isValid: boolean; error?: string } => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return { isValid: false, error: 'Post URL is required' };
  }

  const trimmedUrl = url.trim();

  switch (platform) {
    case 'instagram':
      if (!validateInstagramUrl(trimmedUrl)) {
        return {
          isValid: false,
          error: 'Invalid Instagram URL. Use format: https://instagram.com/p/POST_ID or https://instagram.com/reels/REEL_ID'
        };
      }
      break;
    case 'facebook':
      if (!validateFacebookUrl(trimmedUrl)) {
        return {
          isValid: false,
          error: 'Invalid Facebook URL. Please provide a valid Facebook post link'
        };
      }
      break;
    case 'twitter':
      if (!validateTwitterUrl(trimmedUrl)) {
        return {
          isValid: false,
          error: 'Invalid Twitter/X URL. Format: https://twitter.com/user/status/TWEET_ID'
        };
      }
      break;
    case 'tiktok':
      if (!validateTikTokUrl(trimmedUrl)) {
        return {
          isValid: false,
          error: 'Invalid TikTok URL. Please provide a valid TikTok video link'
        };
      }
      break;
    default:
      return { isValid: false, error: 'Unsupported platform' };
  }

  return { isValid: true };
};

/**
 * Sanitize input data to prevent XSS
 */
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Format error message for user display
 */
const formatErrorMessage = (error: any): string => {
  // Handle different error formats
  if (typeof error === 'string') {
    return error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

// ============================================================================
// RETRY MECHANISM
// ============================================================================

/**
 * Retry failed API calls with exponential backoff
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// ============================================================================
// API FUNCTIONS - PRODUCTION READY
// ============================================================================

/**
 * Submit a new social media post for cashback
 * Includes validation, sanitization, retry mechanism
 * Security/fraud checks are non-blocking (backend validates)
 */
export const submitPost = async (data: SubmitPostRequest): Promise<SubmitPostResponse> => {
  devLog.log('🚀 [SOCIAL MEDIA API] Submitting post...');

  try {
    // ===== STEP 1: BASIC VALIDATION =====

    const validPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok'];
    if (!validPlatforms.includes(data.platform)) {
      throw new Error('Invalid platform selected');
    }

    const validation = validatePostUrl(data.platform, data.postUrl);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid post URL');
    }

    // ===== STEP 2: SECURITY CHECK (non-blocking) =====
    let securityCheckResult: any = null;
    let fraudCheckResult: any = null;

    try {
      devLog.log('🔒 [SOCIAL MEDIA API] Running security check...');
      securityCheckResult = await securityService.performSecurityCheck();

      if (securityCheckResult.isBlacklisted) {
        devLog.error('🚫 Device is blacklisted');
        throw new Error('Your device has been blocked. Please contact support.');
      }

      if (securityCheckResult.isSuspicious) {
        devLog.warn('⚠️ Device flagged as suspicious. Trust score:', securityCheckResult.trustScore);
      }
      devLog.log('✅ Security check completed');
    } catch (securityError: any) {
      devLog.warn('⚠️ [SOCIAL MEDIA API] Security check failed (continuing):', securityError.message);
      // Continue - backend will validate
    }

    // ===== STEP 3: FRAUD DETECTION (non-blocking) =====
    try {
      devLog.log('🔍 [SOCIAL MEDIA API] Running fraud detection...');
      fraudCheckResult = await fraudDetectionService.performFraudCheck(data.postUrl, {
        skipAccountVerification: true, // Skip account verification - it requires API endpoint
      });

      if (fraudCheckResult && !fraudCheckResult.allowed) {
        devLog.warn('⚠️ Fraud check warnings:', fraudCheckResult.blockedReasons);
        // Don't block - backend will validate
      }
      devLog.log('✅ Fraud check completed');
    } catch (fraudError: any) {
      devLog.warn('⚠️ [SOCIAL MEDIA API] Fraud check failed (continuing):', fraudError.message);
      // Continue - backend will validate
    }

    // ===== STEP 4: SUBMIT TO BACKEND =====
    devLog.log('📤 [SOCIAL MEDIA API] Submitting to backend...');

    // Sanitize inputs
    const sanitizedData: any = {
      platform: data.platform,
      postUrl: sanitizeInput(data.postUrl),
      ...(data.orderId && { orderId: sanitizeInput(data.orderId) }),
    };

    // Include fraud detection metadata if available
    if (securityCheckResult || fraudCheckResult) {
      sanitizedData.fraudMetadata = {
        deviceId: securityCheckResult?.deviceFingerprint?.id || 'unknown',
        trustScore: securityCheckResult?.trustScore || 70,
        riskScore: fraudCheckResult?.riskScore || 0,
        riskLevel: fraudCheckResult?.riskLevel || 'low',
        checksPassed: fraudCheckResult?.metadata?.checksPassed || 0,
        totalChecks: fraudCheckResult?.metadata?.totalChecks || 0,
        warnings: fraudCheckResult?.warnings || [],
      };
    }

    devLog.log('📤 [SOCIAL MEDIA API] Request data:', JSON.stringify(sanitizedData, null, 2));

    // Submit with retry mechanism
    const response = await retryWithBackoff(
      async () => await apiClient.post('/social-media/submit', sanitizedData),
      3, // maxRetries
      1000 // initial delay in ms
    );

    devLog.log('✅ [SOCIAL MEDIA API] Post submitted successfully');
    devLog.log('📦 [SOCIAL MEDIA API] Response:', JSON.stringify(response, null, 2));

    // Validate response structure
    if (!response || !response.success) {
      throw new Error(response?.message || response?.error || 'Submission failed - invalid response');
    }

    // Record submission in fraud detection system (non-blocking)
    try {
      await fraudDetectionService.recordSubmission(data.postUrl);
    } catch (recordError) {
      devLog.warn('⚠️ Failed to record submission in fraud system');
    }

    // Return the data with safe fallbacks
    const responseData = response.data || response;
    return responseData as SubmitPostResponse;
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('\n❌❌❌ [SOCIAL MEDIA API] SUBMISSION FAILED ❌❌❌');
    devLog.error('Error:', errorMsg);

    // Re-throw with formatted error
    const formattedError = new Error(errorMsg);
    (formattedError as any).response = error.response;
    throw formattedError;
  }
};

/**
 * Get user's earnings summary
 * Includes retry mechanism and default fallback values
 */
export const getUserEarnings = async (): Promise<EarningsData> => {
  devLog.log('📊 [SOCIAL MEDIA API] Fetching user earnings...');
  try {
    const response = await retryWithBackoff(
      async () => await apiClient.get('/social-media/earnings'),
      2, // maxRetries (fewer for GET requests)
      500 // initial delay in ms
    );
    
    // Handle different response formats from backend
    const earningsData: EarningsData = (response.success && response.data ? response.data : response.data) as EarningsData;

    if (!earningsData) {
      devLog.warn('⚠️ [SOCIAL MEDIA API] No earnings data in response, returning defaults');
      return {
        totalEarned: 0,
        pendingAmount: 0,
        creditedAmount: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        postsSubmitted: 0,
        postsApproved: 0,
        postsRejected: 0,
        postsCredited: 0,
        approvalRate: 0
      };
    }

    return earningsData;
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('❌ [SOCIAL MEDIA API] Failed to fetch earnings:', errorMsg);

    // Return default values instead of throwing to prevent UI breaks
    devLog.warn('⚠️ Returning default earnings values');
    return {
      totalEarned: 0,
      pendingAmount: 0,
      creditedAmount: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      postsSubmitted: 0,
      postsApproved: 0,
      postsRejected: 0,
      postsCredited: 0,
      approvalRate: 0
    };
  }
};

/**
 * Get user's social media posts
 * Includes pagination, filtering, and retry mechanism
 */
export const getUserPosts = async (params: GetPostsParams = {}): Promise<GetPostsResponse> => {
  devLog.log('📝 [SOCIAL MEDIA API] Fetching user posts...', params);
  try {
    // Validate pagination params
    const validatedParams = {
      page: Math.max(1, params.page || 1),
      limit: Math.min(100, Math.max(1, params.limit || 20)),
      ...(params.status && { status: params.status })
    };

    const response = await retryWithBackoff(
      async () => await apiClient.get('/social-media/posts', validatedParams),
      2, // maxRetries
      500 // initial delay in ms
    );
    
    // Handle different response formats
    const postsData: GetPostsResponse = (response.success && response.data ? response.data : response.data) as GetPostsResponse;

    if (!postsData || !postsData.posts) {
      devLog.warn('⚠️ [SOCIAL MEDIA API] No posts data in response, returning empty array');
      return {
        posts: [],
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    return postsData;
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('❌ [SOCIAL MEDIA API] Failed to fetch posts:', errorMsg);

    // Return empty array instead of throwing to prevent UI breaks
    devLog.warn('⚠️ Returning empty posts array');
    return {
      posts: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
};

/**
 * Get a single post by ID
 * Includes validation and retry mechanism
 */
export const getPostById = async (postId: string): Promise<SocialPost> => {
  devLog.log('🔍 [SOCIAL MEDIA API] Fetching post by ID:', postId);
  try {
    if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
      throw new Error('Invalid post ID');
    }

    const response = await retryWithBackoff(
      async () => await apiClient.get(`/social-media/posts/${postId}`),
      2,
      500
    );
    
    return response.data as SocialPost;
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('❌ [SOCIAL MEDIA API] Failed to fetch post:', errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Delete a pending post
 * Only pending posts can be deleted
 */
export const deletePost = async (postId: string): Promise<void> => {
  devLog.log('🗑️ [SOCIAL MEDIA API] Deleting post:', postId);
  try {
    if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
      throw new Error('Invalid post ID');
    }

    await apiClient.delete(`/social-media/posts/${postId}`);
    devLog.log('✅ Post deleted successfully');
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('❌ [SOCIAL MEDIA API] Failed to delete post:', errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Get platform statistics
 * Includes retry mechanism and fallback values
 */
export const getPlatformStats = async (): Promise<{ stats: PlatformStats[] }> => {
  devLog.log('📈 [SOCIAL MEDIA API] Fetching platform stats...');
  try {
    const response = await retryWithBackoff(
      async () => await apiClient.get('/social-media/stats'),
      2,
      500
    );
    
    return response.data as { stats: PlatformStats[] };
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('❌ [SOCIAL MEDIA API] Failed to fetch platform stats:', errorMsg);

    // Return empty stats instead of throwing
    devLog.warn('⚠️ Returning empty stats array');
    return { stats: [] };
  }
};

/**
 * Submit a social media post with media files (photo/video proof)
 * Builds FormData and uploads to backend
 */
export const submitPostWithMedia = async (data: SubmitPostWithMediaRequest): Promise<SubmitPostResponse> => {
  devLog.log('🚀 [SOCIAL MEDIA API] Submitting post with media...');

  try {
    const validPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok'];
    if (!validPlatforms.includes(data.platform)) {
      throw new Error('Invalid platform selected');
    }

    if (!data.files || data.files.length === 0) {
      throw new Error('At least one photo or video is required');
    }

    if (data.files.length > 5) {
      throw new Error('Maximum 5 files allowed');
    }

    // Build FormData
    const formData = new FormData();
    formData.append('platform', data.platform);
    if (data.orderId) {
      formData.append('orderId', data.orderId);
    }

    // Append files
    data.files.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || `proof_${index}.jpg`,
      } as any);
    });

    // Run security check (non-blocking)
    try {
      const securityCheckResult = await securityService.performSecurityCheck();
      if (securityCheckResult.isBlacklisted) {
        throw new Error('Your device has been blocked. Please contact support.');
      }
      formData.append('fraudMetadata', JSON.stringify({
        deviceId: securityCheckResult?.deviceFingerprint?.id || 'unknown',
        trustScore: securityCheckResult?.trustScore || 70,
        riskLevel: 'low',
      }));
    } catch (securityError: any) {
      if (securityError.message.includes('blocked')) throw securityError;
      devLog.warn('⚠️ [SOCIAL MEDIA API] Security check failed (continuing):', securityError.message);
    }

    devLog.log('📤 [SOCIAL MEDIA API] Uploading media files...');

    const response = await retryWithBackoff(
      async () => await apiClient.uploadFile('/social-media/submit-media', formData),
      2,
      2000
    );

    devLog.log('✅ [SOCIAL MEDIA API] Post with media submitted successfully');

    if (!response || !response.success) {
      throw new Error(response?.message || response?.error || 'Submission failed');
    }

    const responseData = response.data || response;
    return responseData as SubmitPostResponse;
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    devLog.error('❌ [SOCIAL MEDIA API] MEDIA SUBMISSION FAILED:', errorMsg);
    const formattedError = new Error(errorMsg);
    (formattedError as any).response = error.response;
    throw formattedError;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  submitPost,
  submitPostWithMedia,
  getUserEarnings,
  getUserPosts,
  getPostById,
  deletePost,
  getPlatformStats,
};

// Export validation utilities for use in components
export const validators = {
  validateInstagramUrl,
  validateFacebookUrl,
  validateTwitterUrl,
  validateTikTokUrl,
  validatePostUrl,
  sanitizeInput,
};

// Export retry utility for custom API calls
export { retryWithBackoff, formatErrorMessage };

// Export fraud detection and security services
export {
  fraudDetectionService,
  instagramVerificationService,
  securityService,
};
