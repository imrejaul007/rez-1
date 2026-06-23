# Articles API Service - Quick Reference

## Overview

The `articlesApi.ts` service provides comprehensive article management functionality for the REZ app frontend. It follows the same patterns as other API services (videosApi, productsApi) and integrates with the centralized API client.

## Location

- **Service File**: `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\services\articlesApi.ts`
- **Export**: Available through `services/index.ts` as `articlesService`
- **Backend URL**: `http://localhost:5001/api/articles`

## Import Usage

```typescript
// Direct import
import articlesService from '@/services/articlesApi';

// Through index
import { articlesService } from '@/services';

// With types
import articlesService, {
  ArticlesQuery,
  ArticlesResponse,
  ArticleInput,
  ArticleEngagement
} from '@/services/articlesApi';
```

## API Endpoints

### 1. Get All Articles
```typescript
getArticles(params?: ArticlesQuery): Promise<ApiResponse<ArticlesResponse>>
```

**Parameters:**
- `page?: number` - Page number (1-indexed)
- `limit?: number` - Items per page
- `category?: string` - Filter by category
- `author?: string` - Filter by author ID
- `search?: string` - Search query
- `tags?: string[]` - Filter by tags
- `sortBy?: string` - Sort field
- `order?: 'asc' | 'desc'` - Sort direction
- `isPublished?: boolean` - Published status
- `dateFrom?: string` - Date range start
- `dateTo?: string` - Date range end
- `productId?: string` - Associated product

**Example:**
```typescript
const response = await articlesService.getArticles({
  category: 'fashion',
  page: 1,
  limit: 10,
  sortBy: 'newest'
});

console.log(response.data.articles);
console.log(response.data.pagination);
```

**Response:**
```typescript
{
  success: true,
  data: {
    articles: Article[],
    pagination: {
      current: 1,
      pages: 5,
      total: 50,
      limit: 10,
      hasNext: true,
      hasPrev: false
    },
    filters: {
      categories: [{ name: 'fashion', count: 25 }],
      authors: [{ id: 'user-1', name: 'John', count: 10 }],
      tags: [{ name: '#fashion', count: 15 }]
    }
  }
}
```

---

### 2. Get Article by ID
```typescript
getArticleById(articleId: string): Promise<ApiResponse<Article>>
```

**Example:**
```typescript
const response = await articlesService.getArticleById('article-123');
console.log(response.data); // Article object
```

---

### 3. Get Articles by Category
```typescript
getArticlesByCategory(
  category: string,
  params?: Omit<ArticlesQuery, 'category'>
): Promise<ApiResponse<ArticlesResponse>>
```

**Example:**
```typescript
const response = await articlesService.getArticlesByCategory('fashion', {
  page: 1,
  limit: 20,
  sortBy: 'popular'
});
```

---

### 4. Get Articles by Author
```typescript
getArticlesByAuthor(
  authorId: string,
  params?: Omit<ArticlesQuery, 'author'>
): Promise<ApiResponse<ArticlesResponse>>
```

**Example:**
```typescript
const response = await articlesService.getArticlesByAuthor('user-123', {
  page: 1,
  limit: 10
});
```

---

### 5. Get Trending Articles
```typescript
getTrendingArticles(
  limit?: number,
  timeframe?: '1d' | '7d' | '30d'
): Promise<ApiResponse<Article[]>>
```

**Example:**
```typescript
const response = await articlesService.getTrendingArticles(10, '7d');
console.log(response.data); // Array of trending articles
```

---

### 6. Get Featured Articles
```typescript
getFeaturedArticles(limit?: number): Promise<ApiResponse<Article[]>>
```

**Example:**
```typescript
const response = await articlesService.getFeaturedArticles(5);
console.log(response.data); // Array of featured articles
```

---

### 7. Search Articles
```typescript
searchArticles(
  query: string,
  filters?: Omit<ArticlesQuery, 'search'>
): Promise<ApiResponse<ArticlesResponse>>
```

**Example:**
```typescript
const response = await articlesService.searchArticles('sustainable fashion', {
  category: 'fashion',
  page: 1,
  limit: 20
});
```

---

### 8. Create Article (Authenticated)
```typescript
createArticle(articleData: ArticleInput): Promise<ApiResponse<Article>>
```

**Parameters:**
```typescript
interface ArticleInput {
  title: string;
  excerpt?: string;
  content: string;
  coverImage?: string | File;
  category: string;
  tags: string[];
  productId?: string;
  productName?: string;
  isPublished?: boolean;
}
```

**Example:**
```typescript
const response = await articlesService.createArticle({
  title: 'My Fashion Article',
  content: 'Article content here...',
  category: 'fashion',
  tags: ['#style', '#trends'],
  isPublished: true
});
```

**With File Upload:**
```typescript
const coverImageFile = await pickImage(); // Get File object

const response = await articlesService.createArticle({
  title: 'My Fashion Article',
  content: 'Article content here...',
  coverImage: coverImageFile, // File object
  category: 'fashion',
  tags: ['#style', '#trends']
});
```

---

### 9. Update Article (Authenticated)
```typescript
updateArticle(
  articleId: string,
  articleData: Partial<ArticleInput>
): Promise<ApiResponse<Article>>
```

**Example:**
```typescript
const response = await articlesService.updateArticle('article-123', {
  title: 'Updated Title',
  content: 'Updated content...'
});
```

---

### 10. Delete Article (Authenticated)
```typescript
deleteArticle(articleId: string): Promise<ApiResponse<{ message: string }>>
```

**Example:**
```typescript
const response = await articlesService.deleteArticle('article-123');
console.log(response.data.message); // "Article deleted successfully"
```

---

### 11. Toggle Like (Authenticated)
```typescript
toggleArticleLike(
  articleId: string
): Promise<ApiResponse<{ liked: boolean; likeCount: number }>>
```

**Example:**
```typescript
const response = await articlesService.toggleArticleLike('article-123');
console.log(response.data.liked); // true or false
console.log(response.data.likeCount); // total likes
```

---

### 12. Toggle Bookmark (Authenticated)
```typescript
toggleArticleBookmark(
  articleId: string
): Promise<ApiResponse<{ bookmarked: boolean }>>
```

**Example:**
```typescript
const response = await articlesService.toggleArticleBookmark('article-123');
console.log(response.data.bookmarked); // true or false
```

---

### 13. Get Bookmarked Articles (Authenticated)
```typescript
getBookmarkedArticles(
  page?: number,
  limit?: number
): Promise<ApiResponse<ArticlesResponse>>
```

**Example:**
```typescript
const response = await articlesService.getBookmarkedArticles(1, 20);
console.log(response.data.articles); // User's bookmarked articles
```

---

### 14. Share Article
```typescript
shareArticle(
  articleId: string,
  platform?: 'facebook' | 'twitter' | 'whatsapp' | 'copy_link'
): Promise<ApiResponse<{ shareCount: number; shareUrl: string }>>
```

**Example:**
```typescript
const response = await articlesService.shareArticle('article-123', 'facebook');
console.log(response.data.shareUrl); // URL to share
console.log(response.data.shareCount); // Updated share count
```

---

### 15. Record View (Analytics)
```typescript
recordView(
  articleId: string,
  readTime?: number
): Promise<ApiResponse<void>>
```

**Example:**
```typescript
// Record view when article is opened
await articlesService.recordView('article-123');

// Record view with read time (in seconds)
await articlesService.recordView('article-123', 120);
```

---

### 16. Get Article Engagement
```typescript
getArticleEngagement(
  articleId: string
): Promise<ApiResponse<ArticleEngagement>>
```

**Example:**
```typescript
const response = await articlesService.getArticleEngagement('article-123');
console.log(response.data);
// {
//   articleId: 'article-123',
//   views: 1000,
//   likes: 50,
//   shares: 20,
//   bookmarks: 30,
//   comments: 15,
//   userInteraction: {
//     liked: true,
//     bookmarked: false,
//     shared: false
//   }
// }
```

---

### 17. Get Article Comments
```typescript
getArticleComments(
  articleId: string,
  page?: number,
  limit?: number,
  sort?: 'newest' | 'oldest' | 'popular'
): Promise<ApiResponse<{ comments: ArticleComment[]; pagination: any }>>
```

**Example:**
```typescript
const response = await articlesService.getArticleComments(
  'article-123',
  1,
  20,
  'newest'
);
console.log(response.data.comments);
```

---

### 18. Add Comment (Authenticated)
```typescript
addArticleComment(
  articleId: string,
  content: string,
  parentId?: string
): Promise<ApiResponse<ArticleComment>>
```

**Example:**
```typescript
// Add top-level comment
const response = await articlesService.addArticleComment(
  'article-123',
  'Great article!'
);

// Add reply to a comment
const reply = await articlesService.addArticleComment(
  'article-123',
  'I agree!',
  'comment-456' // parent comment ID
);
```

---

### 19. Get Related Articles
```typescript
getRelatedArticles(
  articleId: string,
  limit?: number
): Promise<ApiResponse<Article[]>>
```

**Example:**
```typescript
const response = await articlesService.getRelatedArticles('article-123', 5);
console.log(response.data); // Array of related articles
```

---

### 20. Get Recommended Articles (Authenticated)
```typescript
getRecommendedArticles(
  limit?: number
): Promise<ApiResponse<Article[]>>
```

**Example:**
```typescript
const response = await articlesService.getRecommendedArticles(10);
console.log(response.data); // Personalized recommendations
```

---

### 21. Get Article Categories
```typescript
getArticleCategories(): Promise<ApiResponse<Category[]>>
```

**Example:**
```typescript
const response = await articlesService.getArticleCategories();
console.log(response.data);
// [
//   {
//     id: 'cat-1',
//     name: 'Fashion',
//     slug: 'fashion',
//     description: 'Fashion articles',
//     icon: 'fashion-icon',
//     articleCount: 100
//   }
// ]
```

---

### 22. Report Article (Authenticated)
```typescript
reportArticle(
  articleId: string,
  reason: 'inappropriate' | 'misleading' | 'spam' | 'copyright' | 'other',
  details?: string
): Promise<ApiResponse<{ message: string }>>
```

**Example:**
```typescript
const response = await articlesService.reportArticle(
  'article-123',
  'inappropriate',
  'Contains offensive content'
);
console.log(response.data.message);
```

---

## TypeScript Types

### Article Interface
```typescript
interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: 'user' | 'merchant';
  };
  productId?: string;
  productName?: string;
  category: 'fashion' | 'beauty' | 'lifestyle' | 'tech' | 'general';
  tags: string[];
  viewCount: string;
  readTime: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
}
```

### ArticlesQuery Interface
```typescript
interface ArticlesQuery {
  page?: number;
  limit?: number;
  category?: string;
  author?: string;
  search?: string;
  tags?: string[];
  sortBy?: 'newest' | 'oldest' | 'popular' | 'trending' | 'views' | 'readTime';
  order?: 'asc' | 'desc';
  isPublished?: boolean;
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}
```

### ArticlesResponse Interface
```typescript
interface ArticlesResponse {
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
```

---

## Error Handling

All API calls return an `ApiResponse` object:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: { [key: string]: string[] };
}
```

**Example Error Handling:**
```typescript
try {
  const response = await articlesService.getArticleById('article-123');

  if (response.success && response.data) {
    console.log('Article:', response.data);
  } else {
    console.error('Error:', response.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Authentication

Methods requiring authentication automatically use the token set in `apiClient`:

```typescript
import { apiClient } from '@/services';

// Set token (usually done in AuthContext)
apiClient.setAuthToken(token);

// Now authenticated methods will work
await articlesService.createArticle({ ... });
await articlesService.toggleArticleLike('article-123');
await articlesService.addArticleComment('article-123', 'Great!');
```

**Authenticated Methods:**
- `createArticle()`
- `updateArticle()`
- `deleteArticle()`
- `toggleArticleLike()`
- `toggleArticleBookmark()`
- `getBookmarkedArticles()`
- `addArticleComment()`
- `getRecommendedArticles()`
- `reportArticle()`

---

## Usage in React Components

### Basic Example
```tsx
import React, { useEffect, useState } from 'react';
import articlesService from '@/services/articlesApi';
import type { Article } from '@/types/article.types';

function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await articlesService.getArticles({
        category: 'fashion',
        page: 1,
        limit: 10
      });

      if (response.success && response.data) {
        setArticles(response.data.articles);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {articles.map(article => (
        <div key={article.id}>{article.title}</div>
      ))}
    </div>
  );
}
```

### With Custom Hook
```tsx
// hooks/useArticles.ts
import { useState, useEffect } from 'react';
import articlesService, { ArticlesQuery } from '@/services/articlesApi';
import type { Article } from '@/types/article.types';

export function useArticles(params?: ArticlesQuery) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArticles();
  }, [JSON.stringify(params)]);

  const loadArticles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await articlesService.getArticles(params);

      if (response.success && response.data) {
        setArticles(response.data.articles);
      } else {
        setError(response.error || 'Failed to load articles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => loadArticles();

  return { articles, loading, error, refresh };
}

// Usage in component
function ArticlesPage() {
  const { articles, loading, error } = useArticles({
    category: 'fashion',
    limit: 20
  });

  // ... render
}
```

---

## Integration Checklist

- [x] Service file created at `services/articlesApi.ts`
- [x] Exported through `services/index.ts`
- [x] TypeScript types defined
- [x] All CRUD operations implemented
- [x] Error handling included
- [x] JSDoc comments added
- [x] Follows existing patterns (videosApi, productsApi)
- [x] Uses centralized apiClient
- [x] Supports file uploads (cover images)
- [x] Logging for debugging
- [x] Authentication support
- [ ] Backend endpoints implemented (user-backend)
- [ ] Integration tests written
- [ ] Custom hook created (useArticles)
- [ ] Connected to UI components

---

## Backend API Endpoints (Expected)

The service expects these backend endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/articles` | Get all articles | No |
| GET | `/articles/:id` | Get single article | No |
| GET | `/articles/category/:category` | Get by category | No |
| GET | `/articles/author/:authorId` | Get by author | No |
| GET | `/articles/trending` | Get trending | No |
| GET | `/articles/featured` | Get featured | No |
| GET | `/articles/search` | Search articles | No |
| POST | `/articles` | Create article | Yes |
| PATCH | `/articles/:id` | Update article | Yes |
| DELETE | `/articles/:id` | Delete article | Yes |
| POST | `/articles/:id/like` | Toggle like | Yes |
| POST | `/articles/:id/bookmark` | Toggle bookmark | Yes |
| GET | `/articles/bookmarks` | Get bookmarked | Yes |
| POST | `/articles/:id/share` | Share article | No |
| POST | `/articles/:id/view` | Record view | No |
| GET | `/articles/:id/engagement` | Get engagement | No |
| GET | `/articles/:id/comments` | Get comments | No |
| POST | `/articles/:id/comments` | Add comment | Yes |
| GET | `/articles/:id/related` | Get related | No |
| GET | `/articles/recommendations` | Get recommendations | Yes |
| GET | `/articles/categories` | Get categories | No |
| POST | `/articles/:id/report` | Report article | Yes |

---

## Testing

### Manual Testing
```typescript
// Test in browser console or React Native debugger
import articlesService from './services/articlesApi';

// Test get articles
const articles = await articlesService.getArticles({ limit: 5 });
console.log('Articles:', articles);

// Test get by ID
const article = await articlesService.getArticleById('article-1');
console.log('Article:', article);

// Test trending
const trending = await articlesService.getTrendingArticles(10, '7d');
console.log('Trending:', trending);
```

---

## Next Steps

1. **Backend Implementation**: Create corresponding backend endpoints in `user-backend/src/routes/articles.js`
2. **Create Custom Hook**: Build `hooks/useArticles.ts` for easier component integration
3. **UI Components**: Create article list, detail, and creation components
4. **Testing**: Write integration tests
5. **Documentation**: Update project documentation

---

## Support

For issues or questions:
- Check backend logs at `http://localhost:5001/api/articles`
- Review browser console for API call logs
- Check `apiClient.ts` for authentication issues
- Verify types in `types/article.types.ts`
