# Articles API - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Import the Service

```typescript
import articlesService from '@/services/articlesApi';
// or
import { articlesService } from '@/services';
```

### Step 2: Fetch Articles

```typescript
const response = await articlesService.getArticles({
  category: 'fashion',
  page: 1,
  limit: 10
});

if (response.success) {
  console.log(response.data.articles);
}
```

### Step 3: Use in React Component

```tsx
import React, { useEffect, useState } from 'react';
import articlesService from '@/services/articlesApi';
import type { Article } from '@/types/article.types';

function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const response = await articlesService.getArticles({ limit: 10 });
    if (response.success && response.data) {
      setArticles(response.data.articles);
    }
  };

  return (
    <div>
      {articles.map(article => (
        <div key={article.id}>
          <h2>{article.title}</h2>
          <p>{article.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📋 Common Use Cases

### 1. Get Trending Articles
```typescript
const trending = await articlesService.getTrendingArticles(10, '7d');
```

### 2. Search Articles
```typescript
const results = await articlesService.searchArticles('fashion tips');
```

### 3. Like an Article (Authenticated)
```typescript
const { data } = await articlesService.toggleArticleLike('article-123');
console.log(data.liked); // true/false
```

### 4. Create Article (Authenticated)
```typescript
await articlesService.createArticle({
  title: 'My Fashion Article',
  content: 'Content here...',
  category: 'fashion',
  tags: ['#style', '#trends'],
  isPublished: true
});
```

### 5. Get Article Comments
```typescript
const { data } = await articlesService.getArticleComments('article-123');
console.log(data.comments);
```

---

## 🔐 Authentication

For authenticated endpoints, set the token first:

```typescript
import { apiClient } from '@/services';

// Set token (usually in AuthContext)
apiClient.setAuthToken('your-jwt-token');

// Now authenticated methods work
await articlesService.createArticle({ ... });
await articlesService.toggleArticleLike('article-123');
```

---

## 📖 Full Documentation

- **API Reference**: [ARTICLES_API_REFERENCE.md](./ARTICLES_API_REFERENCE.md)
- **Examples**: [examples/articlesApiUsage.tsx](./examples/articlesApiUsage.tsx)
- **Implementation Details**: [ARTICLES_API_IMPLEMENTATION_SUMMARY.md](./ARTICLES_API_IMPLEMENTATION_SUMMARY.md)

---

## 🛠️ Available Methods (22 Total)

**Core CRUD**
- `getArticles(params)` - Get all articles
- `getArticleById(id)` - Get single article
- `createArticle(data)` - Create article
- `updateArticle(id, data)` - Update article
- `deleteArticle(id)` - Delete article

**Queries**
- `getArticlesByCategory(category, params)`
- `getArticlesByAuthor(authorId, params)`
- `getTrendingArticles(limit, timeframe)`
- `getFeaturedArticles(limit)`
- `searchArticles(query, filters)`
- `getRelatedArticles(articleId, limit)`

**Engagement**
- `toggleArticleLike(id)`
- `toggleArticleBookmark(id)`
- `getBookmarkedArticles(page, limit)`
- `shareArticle(id, platform)`
- `getArticleEngagement(id)`

**Comments & Analytics**
- `recordView(id, readTime)`
- `getArticleComments(id, page, limit, sort)`
- `addArticleComment(id, content, parentId)`
- `getRecommendedArticles(limit)`

**Utility**
- `getArticleCategories()`
- `reportArticle(id, reason, details)`

---

## 🎯 Quick Tips

1. **Always check response.success** before using data
2. **Handle errors** with try-catch blocks
3. **Use TypeScript types** for better development experience
4. **Set authentication token** before using protected endpoints
5. **Check backend logs** if API calls fail
6. **Use pagination** for large datasets
7. **Debounce search** to reduce API calls

---

## ⚠️ Backend Required

Make sure backend endpoints are implemented at:
```
http://localhost:5001/api/articles
```

See [ARTICLES_API_REFERENCE.md](./ARTICLES_API_REFERENCE.md) for required endpoints.

---

## 🐛 Troubleshooting

**Problem**: API calls failing
- ✅ Check backend is running at `http://localhost:5001`
- ✅ Verify endpoint exists in backend
- ✅ Check browser console for errors
- ✅ Ensure token is set for authenticated endpoints

**Problem**: TypeScript errors
- ✅ Import types from `@/types/article.types`
- ✅ Check response.success before accessing data
- ✅ Use optional chaining: `response.data?.articles`

**Problem**: Authentication errors
- ✅ Set token: `apiClient.setAuthToken(token)`
- ✅ Check token expiration
- ✅ Verify user is logged in

---

## 📞 Need Help?

1. Check [ARTICLES_API_REFERENCE.md](./ARTICLES_API_REFERENCE.md) for detailed docs
2. Review [examples/articlesApiUsage.tsx](./examples/articlesApiUsage.tsx) for code examples
3. Inspect `services/apiClient.ts` for debugging
4. Check browser console for API logs

---

**Happy Coding! 🎉**
