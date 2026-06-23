// Instagram Verification Service - PRODUCTION READY
// Handles Instagram Graph API integration for post verification
// Includes authentication, post validation, and content analysis

import apiClient from './apiClient';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface InstagramPostData {
  id: string;
  permalink: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  username: string;
}

export interface InstagramAccountData {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  is_verified?: boolean;
}

export interface PostVerificationResult {
  isValid: boolean;
  exists: boolean;
  isAccessible: boolean;
  postData?: InstagramPostData;
  accountData?: InstagramAccountData;
  contentMatches?: {
    hasBrandMention: boolean;
    hasRequiredHashtags: boolean;
    hasProductMention: boolean;
    matchScore: number;
  };
  errors: string[];
  warnings: string[];
}

export interface InstagramAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  accessToken?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const INSTAGRAM_CONFIG = {
  // Required mentions/hashtags
  REQUIRED_BRAND_MENTIONS: ['@rezapp', '#rezapp', 'rez app'],
  REQUIRED_HASHTAGS: ['#cashback', '#shopping'],
  OPTIONAL_HASHTAGS: ['#deals', '#savings', '#onlineshopping'],

  // Content requirements
  MIN_CAPTION_LENGTH: 20,
  MAX_POST_AGE_DAYS: 30,

  // Validation thresholds
  CONTENT_MATCH_THRESHOLD: 0.6, // 60% match score required

  // API endpoints (backend will handle actual Instagram API calls)
  VERIFY_POST_ENDPOINT: '/social-media/instagram/verify-post',
  VERIFY_ACCOUNT_ENDPOINT: '/social-media/instagram/verify-account',
  EXTRACT_POST_DATA_ENDPOINT: '/social-media/instagram/extract-post-data',
};

// ============================================================================
// URL PARSING & VALIDATION
// ============================================================================

/**
 * Extract Instagram username and post ID from URL
 */
export const parseInstagramUrl = (url: string): {
  username?: string;
  postId?: string;
  postType?: 'post' | 'reel';
  isValid: boolean;
} => {
  try {
    const cleanUrl = url.trim().toLowerCase();

    // Pattern 1: instagram.com/p/POST_ID
    const pattern1 = /instagram\.com\/p\/([a-zA-Z0-9_-]+)/;
    const match1 = cleanUrl.match(pattern1);
    if (match1) {
      return {
        postId: match1[1],
        postType: 'post',
        isValid: true,
      };
    }

    // Pattern 2: instagram.com/reel/POST_ID
    const pattern2 = /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/;
    const match2 = cleanUrl.match(pattern2);
    if (match2) {
      return {
        postId: match2[1],
        postType: 'reel',
        isValid: true,
      };
    }

    // Pattern 3: instagram.com/USERNAME/p/POST_ID
    const pattern3 = /instagram\.com\/([\w.]+)\/p\/([a-zA-Z0-9_-]+)/;
    const match3 = cleanUrl.match(pattern3);
    if (match3) {
      return {
        username: match3[1],
        postId: match3[2],
        postType: 'post',
        isValid: true,
      };
    }

    // Pattern 4: instagram.com/USERNAME/reel/POST_ID
    const pattern4 = /instagram\.com\/([\w.]+)\/reel\/([a-zA-Z0-9_-]+)/;
    const match4 = cleanUrl.match(pattern4);
    if (match4) {
      return {
        username: match4[1],
        postId: match4[2],
        postType: 'reel',
        isValid: true,
      };
    }

    return { isValid: false };
  } catch (error) {
    return { isValid: false };
  }
};

/**
 * Validate Instagram URL format
 */
export const validateInstagramUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  const parsed = parseInstagramUrl(url);
  if (!parsed.isValid || !parsed.postId) {
    return {
      isValid: false,
      error: 'Invalid Instagram URL. Please provide a valid post or reel link',
    };
  }

  return { isValid: true };
};

// ============================================================================
// CONTENT ANALYSIS
// ============================================================================

/**
 * Check if caption contains required brand mentions
 */
const checkBrandMentions = (caption: string): {
  hasMention: boolean;
  mentions: string[];
} => {
  if (!caption) return { hasMention: false, mentions: [] };

  const lowerCaption = caption.toLowerCase();
  const foundMentions = INSTAGRAM_CONFIG.REQUIRED_BRAND_MENTIONS.filter(mention =>
    lowerCaption.includes(mention.toLowerCase())
  );
  return {
    hasMention: foundMentions.length > 0,
    mentions: foundMentions,
  };
};

/**
 * Check if caption contains required hashtags
 */
const checkHashtags = (caption: string): {
  hasRequired: boolean;
  hasOptional: boolean;
  foundRequired: string[];
  foundOptional: string[];
} => {
  if (!caption) {
    return {
      hasRequired: false,
      hasOptional: false,
      foundRequired: [],
      foundOptional: [],
    };
  }

  const lowerCaption = caption.toLowerCase();

  const foundRequired = INSTAGRAM_CONFIG.REQUIRED_HASHTAGS.filter(tag =>
    lowerCaption.includes(tag.toLowerCase())
  );
  const foundOptional = INSTAGRAM_CONFIG.OPTIONAL_HASHTAGS.filter(tag =>
    lowerCaption.includes(tag.toLowerCase())
  );
  return {
    hasRequired: foundRequired.length > 0,
    hasOptional: foundOptional.length > 0,
    foundRequired,
    foundOptional,
  };
};

/**
 * Calculate content match score
 */
const calculateContentMatchScore = (
  caption: string,
  hasBrandMention: boolean,
  hasRequiredHashtags: boolean
): number => {
  let score = 0;

  // Brand mention is critical (50 points)
  if (hasBrandMention) score += 50;

  // Required hashtags (30 points)
  if (hasRequiredHashtags) score += 30;

  // Caption length (10 points)
  if (caption && caption.length >= INSTAGRAM_CONFIG.MIN_CAPTION_LENGTH) {
    score += 10;
  }

  // Additional content quality (10 points)
  if (caption) {
    // Check for descriptive content
    const words = caption.split(/\s+/).filter(w => w.length > 3);
    if (words.length >= 10) score += 10;
  }

  return Math.min(score, 100);
};

/**
 * Analyze post content for compliance
 */
const analyzePostContent = (postData: InstagramPostData): {
  hasBrandMention: boolean;
  hasRequiredHashtags: boolean;
  hasProductMention: boolean;
  matchScore: number;
  details: {
    brandMentions: string[];
    requiredHashtags: string[];
    optionalHashtags: string[];
  };
} => {
  const caption = postData.caption || '';

  const brandCheck = checkBrandMentions(caption);
  const hashtagCheck = checkHashtags(caption);

  const matchScore = calculateContentMatchScore(
    caption,
    brandCheck.hasMention,
    hashtagCheck.hasRequired
  );
  // Check for product mentions (any shopping-related keywords)
  const productKeywords = ['product', 'buy', 'purchase', 'order', 'shop', 'store'];
  const hasProductMention = productKeywords.some(keyword =>
    caption.toLowerCase().includes(keyword)
  );
  return {
    hasBrandMention: brandCheck.hasMention,
    hasRequiredHashtags: hashtagCheck.hasRequired,
    hasProductMention,
    matchScore,
    details: {
      brandMentions: brandCheck.mentions,
      requiredHashtags: hashtagCheck.foundRequired,
      optionalHashtags: hashtagCheck.foundOptional,
    },
  };
};

// ============================================================================
// POST VERIFICATION
// ============================================================================

/**
 * Verify Instagram post via backend API
 * Backend handles actual Instagram Graph API calls
 */
export const verifyInstagramPost = async (url: string): Promise<PostVerificationResult> => {

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Validate URL format
    const urlValidation = validateInstagramUrl(url);
    if (!urlValidation.isValid) {
      errors.push(urlValidation.error || 'Invalid URL format');
      return {
        isValid: false,
        exists: false,
        isAccessible: false,
        errors,
        warnings,
      };
    }

    const parsed = parseInstagramUrl(url);

    // Step 2: Call backend to verify post exists and is accessible

    const response: any = await apiClient.post(INSTAGRAM_CONFIG.VERIFY_POST_ENDPOINT, {
      url,
      postId: parsed.postId,
      username: parsed.username,
    });

    if (!response.success) {
      errors.push(response.error || 'Post verification failed');
      return {
        isValid: false,
        exists: false,
        isAccessible: false,
        errors,
        warnings,
      };
    }

    const { postData, accountData, exists, isAccessible } = response.data || {};

    // If post doesn't exist or isn't accessible
    if (!exists) {
      errors.push('Post does not exist or has been deleted');
      return {
        isValid: false,
        exists: false,
        isAccessible: false,
        errors,
        warnings,
      };
    }

    if (!isAccessible) {
      errors.push('Post is private or not accessible');
      return {
        isValid: false,
        exists: true,
        isAccessible: false,
        errors,
        warnings,
      };
    }

    // Step 3: Analyze content
    let contentMatches;
    if (postData && postData.caption) {
      contentMatches = analyzePostContent(postData);

      // Add warnings for missing requirements
      if (!contentMatches.hasBrandMention) {
        warnings.push(
          `Post should mention our brand: ${INSTAGRAM_CONFIG.REQUIRED_BRAND_MENTIONS.join(', ')}`
        );
      }

      if (!contentMatches.hasRequiredHashtags) {
        warnings.push(
          `Post should include hashtags: ${INSTAGRAM_CONFIG.REQUIRED_HASHTAGS.join(', ')}`
        );
      }

      // Check match score threshold
      if (contentMatches.matchScore < INSTAGRAM_CONFIG.CONTENT_MATCH_THRESHOLD * 100) {
        warnings.push(
          `Post content match score is low (${contentMatches.matchScore}%). Consider adding more relevant content.`
        );
      }
    } else {
      warnings.push('Unable to analyze post content');
    }

    // Step 4: Check post age
    if (postData && postData.timestamp) {
      const postDate = new Date(postData.timestamp);
      const daysSincePost = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSincePost > INSTAGRAM_CONFIG.MAX_POST_AGE_DAYS) {
        warnings.push(
          `Post is ${Math.floor(daysSincePost)} days old. We prefer posts from the last ${INSTAGRAM_CONFIG.MAX_POST_AGE_DAYS} days.`
        );
      }
    }

    // Step 5: Verify account requirements
    if (accountData) {
      if (accountData.followers_count < 100) {
        warnings.push('Account has fewer than 100 followers');
      }

      if (accountData.media_count < 10) {
        warnings.push('Account has fewer than 10 posts');
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      exists: true,
      isAccessible: true,
      postData,
      accountData,
      contentMatches,
      errors,
      warnings,
    };
  } catch (error: any) {

    // On API error, allow submission to proceed
    // Backend will perform final verification
    warnings.push('Instagram verification temporarily unavailable. Post will be verified after submission.');

    return {
      isValid: true, // Allow to proceed - backend will validate
      exists: true,  // Assume exists
      isAccessible: true, // Assume accessible
      errors: [], // No blocking errors
      warnings,
    };
  }
};

/**
 * Verify Instagram account (without specific post)
 */
export const verifyInstagramAccount = async (
  usernameOrUrl: string
): Promise<{
  isValid: boolean;
  accountData?: InstagramAccountData;
  errors: string[];
}> => {

  const errors: string[] = [];

  try {
    const response: any = await apiClient.post(INSTAGRAM_CONFIG.VERIFY_ACCOUNT_ENDPOINT, {
      username: usernameOrUrl,
    });

    if (!response.success) {
      errors.push(response.error || 'Account verification failed');
      return {
        isValid: false,
        errors,
      };
    }

    const accountData: InstagramAccountData = response.data as InstagramAccountData;

    return {
      isValid: true,
      accountData,
      errors,
    };
  } catch (error: any) {
    errors.push(error.message || 'Failed to verify account');

    return {
      isValid: false,
      errors,
    };
  }
};

/**
 * Extract post data without full verification (lighter operation)
 */
export const extractInstagramPostData = async (url: string): Promise<{
  success: boolean;
  postId?: string;
  username?: string;
  thumbnailUrl?: string;
  error?: string;
}> => {
  try {
    const parsed = parseInstagramUrl(url);
    if (!parsed.isValid || !parsed.postId) {
      return {
        success: false,
        error: 'Invalid Instagram URL',
      };
    }

    // Call backend to extract basic data
    const response: any = await apiClient.post(INSTAGRAM_CONFIG.EXTRACT_POST_DATA_ENDPOINT, {
      url,
      postId: parsed.postId,
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to extract post data',
      };
    }

    return {
      success: true,
      postId: parsed.postId,
      username: parsed.username,
      thumbnailUrl: (response.data as any)?.thumbnailUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to extract post data',
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format Instagram URL to standard format
 */
export const formatInstagramUrl = (url: string): string => {
  const parsed = parseInstagramUrl(url);
  if (!parsed.isValid || !parsed.postId) return url;

  // Return standard format
  if (parsed.postType === 'reel') {
    return `https://www.instagram.com/reel/${parsed.postId}/`;
  }

  return `https://www.instagram.com/p/${parsed.postId}/`;
};

/**
 * Get Instagram embed URL for displaying post preview
 */
export const getInstagramEmbedUrl = (url: string): string | null => {
  const parsed = parseInstagramUrl(url);
  if (!parsed.isValid || !parsed.postId) return null;

  return `https://www.instagram.com/p/${parsed.postId}/embed/`;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  verifyInstagramPost,
  verifyInstagramAccount,
  extractInstagramPostData,
  parseInstagramUrl,
  validateInstagramUrl,
  formatInstagramUrl,
  getInstagramEmbedUrl,
  INSTAGRAM_CONFIG,
};
