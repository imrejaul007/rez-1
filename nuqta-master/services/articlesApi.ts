/**
 * Articles API Service
 * Handles article content management, engagement, and interactions
 *
 * This service provides comprehensive article functionality including:
 * - CRUD operations for articles
 * - Search and filtering
 * - Category and author-based queries
 * - Engagement features (likes, bookmarks, shares)
 * - Trending and featured content
 */

import apiClient, { ApiResponse } from './apiClient';
import type { Article } from '../types/article.types';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Article query parameters for filtering and pagination
 */
export interface ArticlesQuery {
  /** Current page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Filter by category */
  category?: 'fashion' | 'beauty' | 'lifestyle' | 'tech' | 'general';
  /** Filter by author ID */
  author?: string;
  /** Search query string */
  search?: string;
  /** Filter by tags */
  tags?: string[];
  /** Sort order */
  sortBy?: 'newest' | 'oldest' | 'popular' | 'trending' | 'views' | 'readTime';
  /** Sort direction */
  order?: 'asc' | 'desc';
  /** Filter by published status */
  isPublished?: boolean;
  /** Filter by date range - from */
  dateFrom?: string;
  /** Filter by date range - to */
  dateTo?: string;
  /** Filter by associated product */
  productId?: string;
}

/**
 * Paginated articles response
 */
export interface ArticlesResponse {
  articles: Article[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: {
    categories: Array<{ name: string; count: number }>;
    authors: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
  };
}

/**
 * Article creation/update input
 */
export interface ArticleInput {
  /** Article title */
  title: string;
  /** Short excerpt/summary */
  excerpt?: string;
  /** Full article content (Markdown/HTML) */
  content: string;
  /** Cover image URL or file */
  coverImage?: string | File;
  /** Article category */
  category: string;
  /** Associated tags */
  tags: string[];
  /** Associated product ID */
  productId?: string;
  /** Product name for display */
  productName?: string;
  /** Publish status */
  isPublished?: boolean;
}

/**
 * Article engagement statistics
 */
export interface ArticleEngagement {
  /** Article ID */
  articleId: string;
  /** Number of views */
  views: number;
  /** Number of likes */
  likes: number;
  /** Number of shares */
  shares: number;
  /** Number of bookmarks */
  bookmarks: number;
  /** Number of comments */
  comments: number;
  /** User's interaction status */
  userInteraction?: {
    liked: boolean;
    bookmarked: boolean;
    shared: boolean;
  };
}

/**
 * Article comment interface
 */
export interface ArticleComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  replies: ArticleComment[];
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Service Class
// ============================================================================

class ArticlesService {
  /**
   * Get all articles with filtering and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Promise with articles response including pagination
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticles({
   *   category: 'fashion',
   *   page: 1,
   *   limit: 10,
   *   sortBy: 'newest'
   * });
   * ```
   */
  async getArticles(params?: ArticlesQuery): Promise<ApiResponse<ArticlesResponse>> {
    try {
      devLog.log('📰 [Articles API] Getting articles with params:', params);
      return await apiClient.get('/articles', params);
    } catch (error) {
      devLog.error('❌ [Articles API] Error getting articles:', error);
      throw error;
    }
  }

  /**
   * Get single article by ID
   *
   * @param articleId - The article ID
   * @returns Promise with article data
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticleById('article-123');
   * ```
   */
  async getArticleById(articleId: string): Promise<ApiResponse<Article>> {
    try {
      devLog.log(`📰 [Articles API] Getting article by ID: ${articleId}`);
      return await apiClient.get(`/articles/${articleId}`);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error getting article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Get articles by category
   *
   * @param category - The category slug
   * @param params - Additional query parameters
   * @returns Promise with filtered articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticlesByCategory('fashion', {
   *   page: 1,
   *   limit: 20,
   *   sortBy: 'popular'
   * });
   * ```
   */
  async getArticlesByCategory(
    category: string,
    params?: Omit<ArticlesQuery, 'category'>
  ): Promise<ApiResponse<ArticlesResponse>> {
    try {
      devLog.log(`📰 [Articles API] Getting articles by category: ${category}`);
      return await apiClient.get(`/articles/category/${category}`, params);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error getting articles by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get articles by author
   *
   * @param authorId - The author's user ID
   * @param params - Additional query parameters
   * @returns Promise with author's articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticlesByAuthor('user-123', {
   *   page: 1,
   *   limit: 10
   * });
   * ```
   */
  async getArticlesByAuthor(
    authorId: string,
    params?: Omit<ArticlesQuery, 'author'>
  ): Promise<ApiResponse<ArticlesResponse>> {
    try {
      devLog.log(`📰 [Articles API] Getting articles by author: ${authorId}`);
      return await apiClient.get(`/articles/author/${authorId}`, params);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error getting articles by author ${authorId}:`, error);
      throw error;
    }
  }

  /**
   * Get trending articles based on engagement and recency
   *
   * @param limit - Maximum number of articles to return
   * @param timeframe - Time window for trending calculation
   * @returns Promise with trending articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getTrendingArticles(10, '7d');
   * ```
   */
  async getTrendingArticles(
    limit: number = 20,
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<ApiResponse<Article[]>> {
    try {
      devLog.log(`📰 [Articles API] Getting trending articles (limit: ${limit}, timeframe: ${timeframe})`);
      return await apiClient.get('/articles/trending', { limit, timeframe });
    } catch (error) {
      devLog.error('❌ [Articles API] Error getting trending articles:', error);
      throw error;
    }
  }

  /**
   * Get featured articles (editor's picks)
   *
   * @param limit - Maximum number of articles to return
   * @returns Promise with featured articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getFeaturedArticles(5);
   * ```
   */
  async getFeaturedArticles(limit: number = 10): Promise<ApiResponse<Article[]>> {
    try {
      devLog.log(`📰 [Articles API] Getting featured articles (limit: ${limit})`);
      return await apiClient.get('/articles/featured', { limit });
    } catch (error) {
      devLog.error('❌ [Articles API] Error getting featured articles:', error);
      throw error;
    }
  }

  /**
   * Search articles by title, content, or tags
   *
   * @param query - Search query string
   * @param filters - Additional filters to apply
   * @returns Promise with search results
   *
   * @example
   * ```typescript
   * const response = await articlesApi.searchArticles('sustainable fashion', {
   *   category: 'fashion',
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async searchArticles(
    query: string,
    filters?: Omit<ArticlesQuery, 'search'>
  ): Promise<ApiResponse<ArticlesResponse>> {
    try {
      devLog.log(`📰 [Articles API] Searching articles with query: "${query}"`);
      return await apiClient.get('/articles/search', {
        search: query,
        ...filters
      });
    } catch (error) {
      devLog.error('❌ [Articles API] Error searching articles:', error);
      throw error;
    }
  }

  /**
   * Create a new article (requires authentication)
   *
   * @param articleData - Article creation data
   * @returns Promise with created article
   *
   * @example
   * ```typescript
   * const response = await articlesApi.createArticle({
   *   title: 'My Fashion Article',
   *   content: 'Article content here...',
   *   category: 'fashion',
   *   tags: ['#style', '#trends'],
   *   isPublished: true
   * });
   * ```
   */
  async createArticle(articleData: ArticleInput): Promise<ApiResponse<Article>> {
    try {
      devLog.log('📰 [Articles API] Creating new article:', articleData.title);

      // If cover image is a file, use multipart form data
      if (articleData.coverImage instanceof File) {
        const formData = new FormData();
        formData.append('coverImage', articleData.coverImage);

        // Append other fields
        Object.entries(articleData).forEach(([key, value]) => {
          if (key !== 'coverImage' && value !== undefined) {
            formData.append(
              key,
              typeof value === 'object' ? JSON.stringify(value) : String(value)
            );
          }
        });

        return await apiClient.uploadFile('/articles', formData);
      }

      // Otherwise, use regular JSON post
      return await apiClient.post('/articles', articleData);
    } catch (error) {
      devLog.error('❌ [Articles API] Error creating article:', error);
      throw error;
    }
  }

  /**
   * Update an existing article (requires authentication and ownership)
   *
   * @param articleId - The article ID to update
   * @param articleData - Updated article data
   * @returns Promise with updated article
   *
   * @example
   * ```typescript
   * const response = await articlesApi.updateArticle('article-123', {
   *   title: 'Updated Title',
   *   content: 'Updated content...'
   * });
   * ```
   */
  async updateArticle(
    articleId: string,
    articleData: Partial<ArticleInput>
  ): Promise<ApiResponse<Article>> {
    try {
      devLog.log(`📰 [Articles API] Updating article: ${articleId}`);

      // If cover image is a file, use multipart form data
      if (articleData.coverImage instanceof File) {
        const formData = new FormData();
        formData.append('coverImage', articleData.coverImage);

        // Append other fields
        Object.entries(articleData).forEach(([key, value]) => {
          if (key !== 'coverImage' && value !== undefined) {
            formData.append(
              key,
              typeof value === 'object' ? JSON.stringify(value) : String(value)
            );
          }
        });

        return await apiClient.uploadFile(`/articles/${articleId}`, formData);
      }

      // Otherwise, use PATCH
      return await apiClient.patch(`/articles/${articleId}`, articleData);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error updating article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an article (requires authentication and ownership)
   *
   * @param articleId - The article ID to delete
   * @returns Promise with deletion confirmation
   *
   * @example
   * ```typescript
   * const response = await articlesApi.deleteArticle('article-123');
   * ```
   */
  async deleteArticle(articleId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      devLog.log(`📰 [Articles API] Deleting article: ${articleId}`);
      return await apiClient.delete(`/articles/${articleId}`);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error deleting article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle like/unlike on an article (requires authentication)
   *
   * @param articleId - The article ID to like/unlike
   * @returns Promise with like status and count
   *
   * @example
   * ```typescript
   * const response = await articlesApi.toggleArticleLike('article-123');
   * devLog.log(response.data.liked); // true or false
   * devLog.log(response.data.likeCount); // total likes
   * ```
   */
  async toggleArticleLike(
    articleId: string
  ): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
    try {
      devLog.log(`📰 [Articles API] Toggling like for article: ${articleId}`);
      return await apiClient.post(`/articles/${articleId}/like`);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error toggling like for article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle bookmark/unbookmark on an article (requires authentication)
   *
   * @param articleId - The article ID to bookmark/unbookmark
   * @returns Promise with bookmark status
   *
   * @example
   * ```typescript
   * const response = await articlesApi.toggleArticleBookmark('article-123');
   * devLog.log(response.data.bookmarked); // true or false
   * ```
   */
  async toggleArticleBookmark(
    articleId: string
  ): Promise<ApiResponse<{ bookmarked: boolean }>> {
    try {
      devLog.log(`📰 [Articles API] Toggling bookmark for article: ${articleId}`);
      return await apiClient.post(`/articles/${articleId}/bookmark`);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error toggling bookmark for article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's bookmarked articles (requires authentication)
   *
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise with bookmarked articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getBookmarkedArticles(1, 20);
   * ```
   */
  async getBookmarkedArticles(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<ArticlesResponse>> {
    try {
      devLog.log('📰 [Articles API] Getting bookmarked articles');
      return await apiClient.get('/articles/bookmarks', { page, limit });
    } catch (error) {
      devLog.error('❌ [Articles API] Error getting bookmarked articles:', error);
      throw error;
    }
  }

  /**
   * Increment share count for an article
   *
   * @param articleId - The article ID
   * @param platform - Share platform (optional)
   * @returns Promise with updated share count
   *
   * @example
   * ```typescript
   * const response = await articlesApi.shareArticle('article-123', 'facebook');
   * devLog.log(response.data.shareCount);
   * ```
   */
  async shareArticle(
    articleId: string,
    platform?: 'facebook' | 'twitter' | 'whatsapp' | 'copy_link'
  ): Promise<ApiResponse<{ shareCount: number; shareUrl: string }>> {
    try {
      devLog.log(`📰 [Articles API] Sharing article: ${articleId} on ${platform || 'unknown'}`);
      return await apiClient.post(`/articles/${articleId}/share`, { platform });
    } catch (error) {
      devLog.error(`❌ [Articles API] Error sharing article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Record article view (analytics)
   *
   * @param articleId - The article ID
   * @param readTime - Time spent reading in seconds
   * @returns Promise with view confirmation
   *
   * @example
   * ```typescript
   * const response = await articlesApi.recordView('article-123', 120);
   * ```
   */
  async recordView(
    articleId: string,
    readTime?: number
  ): Promise<ApiResponse<void>> {
    try {
      devLog.log(`📰 [Articles API] Recording view for article: ${articleId}`);
      return await apiClient.post(`/articles/${articleId}/view`, { readTime });
    } catch (error) {
      devLog.error(`❌ [Articles API] Error recording view for article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Get article engagement statistics
   *
   * @param articleId - The article ID
   * @returns Promise with engagement data
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticleEngagement('article-123');
   * ```
   */
  async getArticleEngagement(
    articleId: string
  ): Promise<ApiResponse<ArticleEngagement>> {
    try {
      devLog.log(`📰 [Articles API] Getting engagement for article: ${articleId}`);
      return await apiClient.get(`/articles/${articleId}/engagement`);
    } catch (error) {
      devLog.error(`❌ [Articles API] Error getting engagement for article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Get article comments
   *
   * @param articleId - The article ID
   * @param page - Page number
   * @param limit - Items per page
   * @param sort - Sort order
   * @returns Promise with comments
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticleComments('article-123', 1, 20, 'newest');
   * ```
   */
  async getArticleComments(
    articleId: string,
    page: number = 1,
    limit: number = 20,
    sort: 'newest' | 'oldest' | 'popular' = 'newest'
  ): Promise<ApiResponse<{
    comments: ArticleComment[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    try {
      devLog.log(`📰 [Articles API] Getting comments for article: ${articleId}`);
      return await apiClient.get(`/articles/${articleId}/comments`, {
        page,
        limit,
        sort
      });
    } catch (error) {
      devLog.error(`❌ [Articles API] Error getting comments for article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Add comment to article (requires authentication)
   *
   * @param articleId - The article ID
   * @param content - Comment content
   * @param parentId - Parent comment ID for replies
   * @returns Promise with created comment
   *
   * @example
   * ```typescript
   * const response = await articlesApi.addArticleComment('article-123', 'Great article!');
   * ```
   */
  async addArticleComment(
    articleId: string,
    content: string,
    parentId?: string
  ): Promise<ApiResponse<ArticleComment>> {
    try {
      devLog.log(`📰 [Articles API] Adding comment to article: ${articleId}`);
      return await apiClient.post(`/articles/${articleId}/comments`, {
        content,
        parentId
      });
    } catch (error) {
      devLog.error(`❌ [Articles API] Error adding comment to article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Get related articles based on tags and category
   *
   * @param articleId - The article ID
   * @param limit - Maximum number of related articles
   * @returns Promise with related articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getRelatedArticles('article-123', 5);
   * ```
   */
  async getRelatedArticles(
    articleId: string,
    limit: number = 5
  ): Promise<ApiResponse<Article[]>> {
    try {
      devLog.log(`📰 [Articles API] Getting related articles for: ${articleId}`);
      return await apiClient.get(`/articles/${articleId}/related`, { limit });
    } catch (error) {
      devLog.error(`❌ [Articles API] Error getting related articles for ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Get recommended articles for user (requires authentication)
   *
   * @param limit - Maximum number of recommendations
   * @returns Promise with recommended articles
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getRecommendedArticles(10);
   * ```
   */
  async getRecommendedArticles(
    limit: number = 10
  ): Promise<ApiResponse<Article[]>> {
    try {
      devLog.log('📰 [Articles API] Getting recommended articles');
      return await apiClient.get('/articles/recommendations', { limit });
    } catch (error) {
      devLog.error('❌ [Articles API] Error getting recommended articles:', error);
      throw error;
    }
  }

  /**
   * Get all article categories
   *
   * @returns Promise with categories list
   *
   * @example
   * ```typescript
   * const response = await articlesApi.getArticleCategories();
   * ```
   */
  async getArticleCategories(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    articleCount: number;
  }>>> {
    try {
      devLog.log('📰 [Articles API] Getting article categories');
      return await apiClient.get('/articles/categories');
    } catch (error) {
      devLog.error('❌ [Articles API] Error getting article categories:', error);
      throw error;
    }
  }

  /**
   * Report an article (requires authentication)
   *
   * @param articleId - The article ID to report
   * @param reason - Report reason
   * @param details - Additional details
   * @returns Promise with report confirmation
   *
   * @example
   * ```typescript
   * const response = await articlesApi.reportArticle(
   *   'article-123',
   *   'inappropriate',
   *   'Contains offensive content'
   * );
   * ```
   */
  async reportArticle(
    articleId: string,
    reason: 'inappropriate' | 'misleading' | 'spam' | 'copyright' | 'other',
    details?: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      devLog.log(`📰 [Articles API] Reporting article: ${articleId} for ${reason}`);
      return await apiClient.post(`/articles/${articleId}/report`, {
        reason,
        details
      });
    } catch (error) {
      devLog.error(`❌ [Articles API] Error reporting article ${articleId}:`, error);
      throw error;
    }
  }
}

// ============================================================================
// Export
// ============================================================================

// Create singleton instance
const articlesService = new ArticlesService();

// Export as default
export default articlesService;

// Export service class for testing
export { ArticlesService };
