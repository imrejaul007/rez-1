// useDiscoverContent.ts - Hook for fetching Discover & Shop content
import { useState, useCallback } from 'react';
import { realVideosApi } from '@/services/realVideosApi';
import articlesApi from '@/services/articlesApi';
import {
  DiscoverTabType,
  DiscoverReel,
  DiscoverPost,
  DiscoverArticle,
  DiscoverImage,
  DiscoverContentState,
  UseDiscoverContentReturn,
} from '@/types/discover.types';

const ITEMS_PER_PAGE = 10;

const initialState: DiscoverContentState = {
  reels: [],
  posts: [],
  articles: [],
  images: [],
  loading: false,
  loadingByTab: {
    reels: false,
    posts: false,
    articles: false,
    images: false,
  },
  error: null,
  pagination: {
    reels: { page: 1, hasMore: true },
    posts: { page: 1, hasMore: true },
    articles: { page: 1, hasMore: true },
    images: { page: 1, hasMore: true },
  },
};

export function useDiscoverContent(): UseDiscoverContentReturn {
  const [state, setState] = useState<DiscoverContentState>(initialState);

  // Transform video response to DiscoverReel format
  const transformToReel = (video: any): DiscoverReel => {
    // Extract creator name with better fallbacks
    const creatorName = video.creator?.profile
      ? `${video.creator.profile.firstName || ''} ${video.creator.profile.lastName || ''}`.trim()
      : video.creator?.name || video.creator?.username || video.store?.name || '';

    return {
    _id: video._id || video.id,
    id: video._id || video.id,
    title: video.title || '',
    description: video.description || '',
    videoUrl: video.videoUrl || '',
    thumbnail: video.thumbnail || video.preview || '',
    duration: video.metadata?.duration || 0,
    contentType: video.contentType || 'ugc',
    creator: {
      _id: video.creator?._id || video.creator?.id || '',
      id: video.creator?._id || video.creator?.id || '',
      name: creatorName,
      username: video.creator?.username,
      avatar: video.creator?.profile?.avatar || video.creator?.avatar,
      profile: video.creator?.profile,
      storeId: video.creator?.storeId,
      isVerified: video.creator?.isVerified,
    },
    products: (video.products || []).map((p: any) => ({
      _id: p._id || p.id,
      id: p._id || p.id,
      name: p.name || p.title || 'Product',
      title: p.title || p.name,
      image: p.thumbnail || p.image || p.images?.[0] || '',
      images: p.images,
      price: p.pricing?.selling || p.pricing?.basePrice || p.price || 0,
      salePrice: p.pricing?.selling || p.salePrice,
      cashbackPercent: p.cashback?.percentage || p.cashbackPercent,
      store: p.store,
      category: p.category,
      rating: p.rating,
      inStock: p.inStock !== false,
    })),
    hashtags: video.hashtags || [],
    tags: video.tags || [],
    engagement: {
      views: video.engagement?.views || video.metrics?.views || 0,
      likes: video.engagement?.likes || video.metrics?.likes || 0,
      shares: video.engagement?.shares || 0,
      comments: video.engagement?.comments || 0,
      saves: video.engagement?.saves || 0,
      liked: video.engagement?.liked || false,
      bookmarked: video.engagement?.bookmarked || false,
    },
    metrics: {
      views: video.engagement?.views || video.metrics?.views || 0,
      likes: Array.isArray(video.engagement?.likes)
        ? video.engagement.likes.length
        : video.engagement?.likes || 0,
    },
    store: video.store || video.stores?.[0],
    createdAt: video.createdAt,
  };
  };

  // Transform video/ugc to DiscoverPost format
  const transformToPost = (item: any): DiscoverPost => {
    const postCreatorName = item.creator?.profile
      ? `${item.creator.profile.firstName || ''} ${item.creator.profile.lastName || ''}`.trim()
      : item.creator?.name || item.creator?.username || '';

    return {
    _id: item._id || item.id,
    id: item._id || item.id,
    type: item.videoUrl ? 'video' : 'photo',
    contentType: item.contentType || 'ugc',
    mediaUrl: item.videoUrl || item.imageUrl || item.thumbnail || '',
    thumbnail: item.thumbnail || item.imageUrl || '',
    caption: item.description || item.caption || '',
    creator: {
      _id: item.creator?._id || item.creator?.id || '',
      id: item.creator?._id || item.creator?.id || '',
      name: postCreatorName,
      avatar: item.creator?.profile?.avatar || item.creator?.avatar,
      profile: item.creator?.profile,
    },
    products: (item.products || []).map((p: any) => ({
      _id: p._id || p.id,
      name: p.name || p.title || 'Product',
      image: p.thumbnail || p.image || p.images?.[0] || '',
      price: p.pricing?.selling || p.pricing?.basePrice || p.price || 0,
      cashbackPercent: p.cashback?.percentage,
    })),
    hashtags: item.hashtags || [],
    engagement: {
      views: item.engagement?.views || 0,
      likes: item.engagement?.likes || 0,
      shares: item.engagement?.shares || 0,
      comments: item.engagement?.comments || 0,
    },
    isBrandPost: item.contentType === 'merchant',
    createdAt: item.createdAt,
  };
  };

  // Transform article response to DiscoverArticle format
  const transformToArticle = (article: any): DiscoverArticle => {
    const authorName = article.author?.profile
      ? `${article.author.profile.firstName || ''} ${article.author.profile.lastName || ''}`.trim()
      : article.author?.name || article.author?.username || '';

    return {
    _id: article._id || article.id,
    id: article._id || article.id,
    title: article.title || '',
    excerpt: article.excerpt || article.summary || '',
    content: article.content,
    featuredImage: article.coverImage || article.featuredImage || article.image || '',
    category: article.category || 'general',
    author: {
      _id: article.author?._id || article.author?.id || '',
      name: authorName,
      avatar: article.author?.profile?.avatar || article.author?.avatar,
    },
    products: (article.products || []).map((p: any) => ({
      _id: p._id || p.id,
      name: p.name || p.title || 'Product',
      image: p.thumbnail || p.image || p.images?.[0] || '',
      price: p.pricing?.selling || p.pricing?.basePrice || p.price || 0,
      cashbackPercent: p.cashback?.percentage,
    })),
    tags: article.tags || [],
    readTime: article.readTime || article.analytics?.avgReadTime || 5,
    engagement: {
      views: article.analytics?.totalViews || article.engagement?.views || 0,
      likes: article.engagement?.likes || 0,
      bookmarks: article.engagement?.bookmarks || 0,
      shares: article.engagement?.shares || 0,
    },
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
  };
  };

  // Transform to DiscoverImage format
  const transformToImage = (item: any): DiscoverImage => {
    const imageCreatorName = item.creator?.profile
      ? `${item.creator.profile.firstName || ''} ${item.creator.profile.lastName || ''}`.trim()
      : item.creator?.name || item.creator?.username || '';

    return {
    _id: item._id || item.id,
    id: item._id || item.id,
    imageUrl: item.imageUrl || item.thumbnail || item.mediaUrl || '',
    caption: item.caption || item.description || '',
    creator: {
      _id: item.creator?._id || item.creator?.id || '',
      name: imageCreatorName,
      avatar: item.creator?.profile?.avatar || item.creator?.avatar,
    },
    products: (item.products || []).map((p: any) => ({
      _id: p._id || p.id,
      name: p.name || p.title || 'Product',
      image: p.thumbnail || p.image || p.images?.[0] || '',
      price: p.pricing?.selling || p.pricing?.basePrice || p.price || 0,
      cashbackPercent: p.cashback?.percentage,
    })),
    productTags: item.productTags || [],
    engagement: {
      views: item.engagement?.views || 0,
      likes: item.engagement?.likes || 0,
      shares: item.engagement?.shares || 0,
      comments: item.engagement?.comments || 0,
    },
    createdAt: item.createdAt,
  };
  };

  // Fetch content for a specific tab
  const fetchTabContent = useCallback(async (tab: DiscoverTabType, refresh = false) => {
    setState(prev => ({
      ...prev,
      loadingByTab: { ...prev.loadingByTab, [tab]: true },
      error: null,
    }));

    try {
      const page = refresh ? 1 : state.pagination[tab].page;

      switch (tab) {
        case 'reels': {
          const response = await realVideosApi.getVideos({
            contentType: 'ugc',
            hasProducts: true,
            sortBy: 'trending',
            page,
            limit: ITEMS_PER_PAGE,
          });

          const videos = response?.data?.videos || response?.videos || [];
          const pagination = response?.data?.pagination || response?.meta?.pagination;
          const transformedReels = videos.map(transformToReel);

          setState(prev => ({
            ...prev,
            reels: refresh ? transformedReels : [...prev.reels, ...transformedReels],
            pagination: {
              ...prev.pagination,
              reels: {
                page: page + 1,
                hasMore: pagination?.hasNext ?? videos.length === ITEMS_PER_PAGE,
                total: pagination?.total,
              },
            },
            loadingByTab: { ...prev.loadingByTab, reels: false },
          }));
          break;
        }

        case 'posts': {
          // Fetch both merchant and UGC content
          const [merchantResponse, ugcResponse] = await Promise.all([
            realVideosApi.getVideos({
              contentType: 'merchant',
              page,
              limit: Math.ceil(ITEMS_PER_PAGE / 2),
            }),
            realVideosApi.getVideos({
              contentType: 'ugc',
              page,
              limit: Math.ceil(ITEMS_PER_PAGE / 2),
            }),
          ]);

          const merchantVideos = merchantResponse?.data?.videos || merchantResponse?.videos || [];
          const ugcVideos = ugcResponse?.data?.videos || ugcResponse?.videos || [];

          // Merge and shuffle posts
          const allPosts = [
            ...merchantVideos.map(transformToPost),
            ...ugcVideos.map(transformToPost),
          ].sort(() => Math.random() - 0.5);

          const hasMore = merchantVideos.length > 0 || ugcVideos.length > 0;

          setState(prev => ({
            ...prev,
            posts: refresh ? allPosts : [...prev.posts, ...allPosts],
            pagination: {
              ...prev.pagination,
              posts: {
                page: page + 1,
                hasMore,
              },
            },
            loadingByTab: { ...prev.loadingByTab, posts: false },
          }));
          break;
        }

        case 'articles': {
          const response = await articlesApi.getArticles({
            sortBy: 'popular',
            page,
            limit: ITEMS_PER_PAGE,
            isPublished: true,
          });

          const articles = response?.data?.articles || response?.articles || [];
          const pagination = response?.data?.pagination || response?.pagination;
          const transformedArticles = articles.map(transformToArticle);

          setState(prev => ({
            ...prev,
            articles: refresh ? transformedArticles : [...prev.articles, ...transformedArticles],
            pagination: {
              ...prev.pagination,
              articles: {
                page: page + 1,
                hasMore: pagination?.hasNext ?? articles.length === ITEMS_PER_PAGE,
                total: pagination?.total,
              },
            },
            loadingByTab: { ...prev.loadingByTab, articles: false },
          }));
          break;
        }

        case 'images': {
          // Fetch UGC without video (photos only)
          const response = await realVideosApi.getVideos({
            contentType: 'ugc',
            hasProducts: true,
            page,
            limit: ITEMS_PER_PAGE,
          });

          const items = response?.data?.videos || response?.videos || [];
          // Filter to only include items with thumbnails (treat as images)
          const transformedImages = items
            .filter((item: any) => item.thumbnail)
            .map(transformToImage);

          const pagination = response?.data?.pagination || response?.meta?.pagination;

          setState(prev => ({
            ...prev,
            images: refresh ? transformedImages : [...prev.images, ...transformedImages],
            pagination: {
              ...prev.pagination,
              images: {
                page: page + 1,
                hasMore: pagination?.hasNext ?? items.length === ITEMS_PER_PAGE,
                total: pagination?.total,
              },
            },
            loadingByTab: { ...prev.loadingByTab, images: false },
          }));
          break;
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to load ${tab}`,
        loadingByTab: { ...prev.loadingByTab, [tab]: false },
      }));
    }
  }, [state.pagination]);

  // Load more content for a tab
  const loadMoreContent = useCallback(async (tab: DiscoverTabType) => {
    if (state.loadingByTab[tab] || !state.pagination[tab].hasMore) return;
    await fetchTabContent(tab, false);
  }, [fetchTabContent, state.loadingByTab, state.pagination]);

  // Refresh all content
  const refreshContent = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    // Reset pagination
    setState(prev => ({
      ...prev,
      pagination: {
        reels: { page: 1, hasMore: true },
        posts: { page: 1, hasMore: true },
        articles: { page: 1, hasMore: true },
        images: { page: 1, hasMore: true },
      },
    }));

    // Fetch all tabs
    await Promise.all([
      fetchTabContent('reels', true),
      fetchTabContent('posts', true),
      fetchTabContent('articles', true),
      fetchTabContent('images', true),
    ]);

    setState(prev => ({ ...prev, loading: false }));
  }, [fetchTabContent]);

  return {
    state,
    actions: {
      fetchTabContent,
      loadMoreContent,
      refreshContent,
    },
  };
}

export default useDiscoverContent;
