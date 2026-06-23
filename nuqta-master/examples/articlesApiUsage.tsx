/**
 * Articles API Usage Examples
 *
 * This file demonstrates how to use the articlesApi service
 * in various React components and scenarios.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import articlesService from '../services/articlesApi';
import type { Article } from '../types/article.types';

// ============================================================================
// Example 1: Basic Article List Component
// ============================================================================

export function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await articlesService.getArticles({
        category: 'fashion',
        page: 1,
        limit: 10,
        sortBy: 'newest'
      });

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

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.title}</Text>
          <Text style={{ marginTop: 8 }}>{item.excerpt}</Text>
          <Text style={{ marginTop: 4, color: '#666' }}>
            By {item.author.name} • {item.readTime}
          </Text>
        </View>
      )}
    />
  );
}

// ============================================================================
// Example 2: Article Detail with Engagement
// ============================================================================

export function ArticleDetail({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
    recordView();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      const response = await articlesService.getArticleById(articleId);
      if (response.success && response.data) {
        setArticle(response.data);
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    // Record view for analytics
    await articlesService.recordView(articleId);
  };

  const handleLike = async () => {
    try {
      const response = await articlesService.toggleArticleLike(articleId);
      if (response.success && response.data) {
        setLiked(response.data.liked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      const response = await articlesService.toggleArticleBookmark(articleId);
      if (response.success && response.data) {
        setBookmarked(response.data.bookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleShare = async (platform: 'facebook' | 'twitter' | 'whatsapp') => {
    try {
      const response = await articlesService.shareArticle(articleId, platform);
      if (response.success && response.data) {
        console.log('Share URL:', response.data.shareUrl);
        // Open share dialog or copy URL
      }
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  if (loading || !article) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{article.title}</Text>
      <Text style={{ marginTop: 8, color: '#666' }}>
        By {article.author.name} • {article.readTime}
      </Text>
      <Text style={{ marginTop: 16 }}>{article.content}</Text>

      <View style={{ flexDirection: 'row', marginTop: 24, gap: 16 }}>
        <TouchableOpacity onPress={handleLike}>
          <Text>{liked ? '❤️' : '🤍'} Like</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBookmark}>
          <Text>{bookmarked ? '🔖' : '📑'} Bookmark</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleShare('facebook')}>
          <Text>📤 Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Example 3: Trending Articles
// ============================================================================

export function TrendingArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      const response = await articlesService.getTrendingArticles(10, '7d');
      if (response.success && response.data) {
        setArticles(response.data);
      }
    } catch (error) {
      console.error('Error loading trending articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 16 }}>
        🔥 Trending This Week
      </Text>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <View style={{ width: 200, padding: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ marginTop: 4, color: '#666' }}>{item.viewCount} views</Text>
          </View>
        )}
      />
    </View>
  );
}

// ============================================================================
// Example 4: Article Search
// ============================================================================

export function ArticleSearch() {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setArticles([]);
      return;
    }

    try {
      setLoading(true);
      const response = await articlesService.searchArticles(searchQuery, {
        category: 'fashion',
        page: 1,
        limit: 20
      });

      if (response.success && response.data) {
        setArticles(response.data.articles);
      }
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Search Articles:</Text>
      {/* Add TextInput here */}

      {loading && <ActivityIndicator />}

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 8 }}>
            <Text>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

// ============================================================================
// Example 5: Create Article Form
// ============================================================================

export function CreateArticleForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('fashion');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const response = await articlesService.createArticle({
        title,
        content,
        category,
        tags,
        isPublished: true
      });

      if (response.success && response.data) {
        console.log('Article created:', response.data);
        // Navigate to article detail or show success message
      } else {
        console.error('Error:', response.error);
      }
    } catch (error) {
      console.error('Error creating article:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Create Article</Text>

      {/* Add form inputs here */}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? '#ccc' : '#007AFF',
          padding: 16,
          borderRadius: 8,
          marginTop: 16
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {submitting ? 'Creating...' : 'Create Article'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Example 6: Category-Based Articles
// ============================================================================

export function CategoryArticles({ category }: { category: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadArticles();
  }, [category, page]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await articlesService.getArticlesByCategory(category, {
        page,
        limit: 10,
        sortBy: 'newest'
      });

      if (response.success && response.data) {
        setArticles(prev =>
          page === 1
            ? response.data!.articles
            : [...prev, ...response.data!.articles]
        );
        setHasMore(response.data.pagination.hasNext);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16 }}>
          <Text>{item.title}</Text>
        </View>
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loading ? <ActivityIndicator /> : null
      }
    />
  );
}

// ============================================================================
// Example 7: Bookmarked Articles
// ============================================================================

export function BookmarkedArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const response = await articlesService.getBookmarkedArticles(1, 20);
      if (response.success && response.data) {
        setArticles(response.data.articles);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        📑 Bookmarked Articles
      </Text>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 8 }}>
            <Text>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

// ============================================================================
// Example 8: Related Articles
// ============================================================================

export function RelatedArticles({ articleId }: { articleId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelated();
  }, [articleId]);

  const loadRelated = async () => {
    try {
      const response = await articlesService.getRelatedArticles(articleId, 5);
      if (response.success && response.data) {
        setArticles(response.data);
      }
    } catch (error) {
      console.error('Error loading related articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
        Related Articles
      </Text>
      {articles.map(article => (
        <View key={article.id} style={{ padding: 8 }}>
          <Text>{article.title}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// Example 9: Article Comments
// ============================================================================

export function ArticleComments({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    try {
      const response = await articlesService.getArticleComments(articleId, 1, 20, 'newest');
      if (response.success && response.data) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await articlesService.addArticleComment(articleId, newComment);

      if (response.success && response.data) {
        setComments(prev => [response.data!, ...prev]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Comments</Text>

      {/* Add comment input here */}
      <TouchableOpacity
        onPress={handleAddComment}
        disabled={submitting}
        style={{ marginTop: 8, padding: 8, backgroundColor: '#007AFF', borderRadius: 4 }}
      >
        <Text style={{ color: 'white' }}>
          {submitting ? 'Posting...' : 'Post Comment'}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ padding: 8, marginTop: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.author.name}</Text>
              <Text>{item.content}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
