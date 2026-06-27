// Custom hook for Play Page state management
import { useState, useCallback, useEffect, useRef } from 'react';
import { Share, Platform } from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import {
  PlayPageState,
  PlayPageActions,
  UsePlayPageData,
  CategoryType,
  UGCVideoItem,
  CategoryTab
} from '@/types/playPage.types';
import { categoryTabs as defaultCategoryTabs } from '@/data/playPageData';
import realVideosApi from '@/services/realVideosApi';
import { transformVideosToUGC, getFeaturedVideo } from '@/utils/videoTransformers';
import { useAuthUser, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { devLog } from '@/utils/devLogger';

// Maximum videos to keep in memory to prevent memory leaks
const MAX_VIDEOS_IN_MEMORY = 60;

const initialState: PlayPageState = {
  featuredVideo: undefined,
  merchantVideos: [],
  articleVideos: [],
  ugcVideos: [],
  trendingVideos: [],
  allVideos: [],
  activeCategory: 'trending_me',
  categories: defaultCategoryTabs,
  loading: false,
  refreshing: false,
  playingVideos: new Set(),
  mutedVideos: new Set(),
  hasMoreVideos: true,
  currentPage: 1,
  error: undefined
};

export function usePlayPageData(): UsePlayPageData {
  const [state, setState] = useState<PlayPageState>(initialState);
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear retry timeout on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup function for abort controller
  const cleanupAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Data fetching - Fetches all video types from backend API
  const fetchVideos = useCallback(async (category?: CategoryType, page: number = 1) => {
    try {
      // Cancel previous request
      cleanupAbortController();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, loading: true, error: undefined }));

      devLog.log(`📹 [PlayPage] Fetching videos for category: ${category || 'all'}, page: ${page}`);

      // Fetch videos from real backend API with abort signal
      const response = await realVideosApi.getVideosByCategory(
        category || 'trending_me',
        {
          page,
          limit: 20,
          sortBy: 'newest'
        }
      );

      if (response.success) {
        const videos = transformVideosToUGC(response.data.videos, user?.id);
        const featured = getFeaturedVideo(response.data.videos, user?.id);

        setState(prev => {
          // On first page, replace all videos; on subsequent pages, append with limit
          let allVideos = page === 1
            ? videos
            : [...prev.allVideos, ...videos];

          // Limit total videos in memory to prevent memory leaks
          if (allVideos.length > MAX_VIDEOS_IN_MEMORY) {
            devLog.log(`⚠️ [PlayPage] Limiting videos from ${allVideos.length} to ${MAX_VIDEOS_IN_MEMORY}`);
            allVideos = allVideos.slice(-MAX_VIDEOS_IN_MEMORY);
          }

          // Filter videos by contentType for the 3 main sections
          const merchantVideos = allVideos.filter(v => v.contentType === 'merchant');
          const articleVideos = allVideos.filter(v => v.contentType === 'article');
          const ugcVideos = allVideos.filter(v => v.contentType === 'ugc');

          devLog.log(`✅ [PlayPage] Loaded ${videos.length} videos successfully`);
          devLog.log(`📊 [PlayPage] Merchant: ${merchantVideos.length}, Article: ${articleVideos.length}, UGC: ${ugcVideos.length}`);

          return {
            ...prev,
            featuredVideo: featured || prev.featuredVideo,
            allVideos,
            merchantVideos,
            articleVideos,
            ugcVideos,
            trendingVideos: category === 'trending_me' ? videos.slice(0, 20) : prev.trendingVideos,
            hasMoreVideos: response.data.pagination.hasNext,
            currentPage: page,
            loading: false
          };
        });
      } else {
        throw new Error(response.message || 'Failed to fetch videos');
      }

    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        devLog.log('⚠️ [PlayPage] Fetch request aborted');
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load videos. Please try again.'
      }));
      devLog.error('❌ [PlayPage] Failed to fetch videos:', error);

      // Retry logic - attempt once more after 2 seconds
      if (page === 1 && isMountedRef.current) {
        devLog.log('🔄 [PlayPage] Retrying video fetch...');
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchVideos(category, page);
          }
          retryTimeoutRef.current = null;
        }, 2000);
      }
    }
  }, [user, cleanupAbortController]);

  const refreshVideos = useCallback(async () => {
    try {
      // Cancel previous request
      cleanupAbortController();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, refreshing: true, error: undefined }));

      devLog.log('🔄 [PlayPage] Refreshing videos...');

      // Fetch fresh data from backend API with abort signal
      const response = await realVideosApi.getVideosByCategory(
        state.activeCategory || 'trending_me',
        {
          page: 1,
          limit: 20,
          sortBy: 'newest'
        }
      );

      devLog.log('🔍 [PlayPage] Response success:', response.success);
      devLog.log('🔍 [PlayPage] Response data videos count:', response.data?.videos?.length);

      if (response.success) {
        devLog.log('✅ [PlayPage] Response successful, starting transformation...');
        devLog.log('🔍 [PlayPage] Videos to transform:', response.data.videos.length);
        devLog.log('🔍 [PlayPage] User ID:', user?.id);

        let videos: UGCVideoItem[] = [];
        let featured: UGCVideoItem | undefined = undefined;

        try {
          devLog.log('🔄 [PlayPage] Calling transformVideosToUGC...');
          videos = transformVideosToUGC(response.data.videos, user?.id);
          devLog.log('✅ [PlayPage] transformVideosToUGC completed, count:', videos.length);
        } catch (transformError) {
          devLog.error('❌ [PlayPage] transformVideosToUGC FAILED:', transformError);
          devLog.error('❌ [PlayPage] Error stack:', transformError instanceof Error ? transformError.stack : 'No stack');
          throw transformError;
        }

        try {
          devLog.log('🔄 [PlayPage] Calling getFeaturedVideo...');
          featured = getFeaturedVideo(response.data.videos, user?.id);
          devLog.log('✅ [PlayPage] getFeaturedVideo completed');
        } catch (featuredError) {
          devLog.error('❌ [PlayPage] getFeaturedVideo FAILED:', featuredError);
          // Don't throw, featured is optional
        }

        devLog.log('🔄 [PlayPage] Updating state with transformed videos...');

        // Filter videos by contentType for the 3 main sections
        const merchantVideos = videos.filter(v => v.contentType === 'merchant');
        const articleVideos = videos.filter(v => v.contentType === 'article');
        const ugcVideos = videos.filter(v => v.contentType === 'ugc');

        setState(prev => ({
          ...prev,
          featuredVideo: featured,
          allVideos: videos,
          merchantVideos,
          articleVideos,
          ugcVideos,
          trendingVideos: videos.filter(v => v.category === 'trending_me'),
          hasMoreVideos: response.data.pagination.hasNext,
          refreshing: false,
          currentPage: 1
        }));

        devLog.log('✅ [PlayPage] Videos refreshed successfully');
        devLog.log(`📊 [PlayPage] Merchant: ${merchantVideos.length}, Article: ${articleVideos.length}, UGC: ${ugcVideos.length}`);
      } else {
        devLog.log('❌ [PlayPage] Response not successful');
        throw new Error(response.message || 'Failed to refresh videos');
      }

    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        devLog.log('⚠️ [PlayPage] Refresh request aborted');
        return;
      }

      devLog.error('❌ [PlayPage] CAUGHT ERROR in refreshVideos:', error);
      devLog.error('❌ [PlayPage] Error type:', typeof error);
      devLog.error('❌ [PlayPage] Error message:', error instanceof Error ? error.message : String(error));
      devLog.error('❌ [PlayPage] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      setState(prev => ({
        ...prev,
        refreshing: false,
        error: 'Failed to refresh videos. Please try again.'
      }));
    }
  }, [state.activeCategory, user, cleanupAbortController]);

  const loadMoreVideos = useCallback(async () => {
    if (!state.hasMoreVideos || state.loading) return;

    try {
      const nextPage = state.currentPage + 1;
      devLog.log(`📄 [PlayPage] Loading more videos, page: ${nextPage}`);

      await fetchVideos(state.activeCategory, nextPage);

    } catch (error) {
      devLog.error('❌ [PlayPage] Failed to load more videos:', error);
    }
  }, [state.hasMoreVideos, state.loading, state.activeCategory, state.currentPage, fetchVideos]);

  // Category management
  const setActiveCategory = useCallback((category: CategoryType) => {
    setState(prev => ({
      ...prev,
      activeCategory: category,
      categories: prev.categories.map(cat => ({
        ...cat,
        isActive: cat.type === category
      }))
    }));
    
    // Fetch videos for the new category
    fetchVideos(category);
  }, [fetchVideos]);

  // Video playback control
  const playVideo = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      playingVideos: new Set([...prev.playingVideos, videoId])
    }));
  }, []);

  const pauseVideo = useCallback((videoId: string) => {
    setState(prev => {
      const newPlayingVideos = new Set(prev.playingVideos);
      newPlayingVideos.delete(videoId);
      return {
        ...prev,
        playingVideos: newPlayingVideos
      };
    });
  }, []);

  const toggleMute = useCallback((videoId: string) => {
    setState(prev => {
      const newMutedVideos = new Set(prev.mutedVideos);
      if (newMutedVideos.has(videoId)) {
        newMutedVideos.delete(videoId);
      } else {
        newMutedVideos.add(videoId);
      }
      return {
        ...prev,
        mutedVideos: newMutedVideos
      };
    });
  }, []);

  // User interactions
  const likeVideoAction = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      devLog.log(`❤️ [PlayPage] Toggling like for video: ${videoId}`);

      const response = await realVideosApi.toggleVideoLike(videoId);

      if (response.success) {
        const isLiked = response.data.isLiked !== undefined ? response.data.isLiked : true;
        const newCount = response.data.totalLikes || response.data.likeCount || 0;

        // Update video like status in state across all filtered arrays
        setState(prev => {
          const updatedAllVideos = prev.allVideos.map(video =>
            video.id === videoId
              ? { ...video, isLiked, likes: newCount }
              : video
          );

          return {
            ...prev,
            allVideos: updatedAllVideos,
            merchantVideos: updatedAllVideos.filter(v => v.contentType === 'merchant'),
            articleVideos: updatedAllVideos.filter(v => v.contentType === 'article'),
            ugcVideos: updatedAllVideos.filter(v => v.contentType === 'ugc'),
            featuredVideo: prev.featuredVideo?.id === videoId
              ? { ...prev.featuredVideo, isLiked, likes: newCount }
              : prev.featuredVideo
          };
        });

        devLog.log(`✅ [PlayPage] Video ${isLiked ? 'liked' : 'unliked'} successfully`);
      }

      return response.success;
    } catch (error) {
      devLog.error('❌ [PlayPage] Failed to like video:', error);
      return false;
    }
  }, []);

  const shareVideoAction = useCallback(async (video: UGCVideoItem) => {
    try {
      devLog.log(`🔗 [PlayPage] Sharing video: ${video.id}`);

      const shareMessage = `Check out this amazing video: ${video.description}\n\n#${video.hashtags?.join(' #') || ''}`;

      const result = await Share.share({
        message: shareMessage,
        ...(Platform.OS === 'ios' ? { url: video.videoUrl } : {}),
      });

      if (result.action === Share.sharedAction) {
        // Update share count locally and update all filtered arrays
        setState(prev => {
          const updatedAllVideos = prev.allVideos.map(v =>
            v.id === video.id
              ? { ...v, shares: (v.shares || 0) + 1 }
              : v
          );

          return {
            ...prev,
            allVideos: updatedAllVideos,
            merchantVideos: updatedAllVideos.filter(v => v.contentType === 'merchant'),
            articleVideos: updatedAllVideos.filter(v => v.contentType === 'article'),
            ugcVideos: updatedAllVideos.filter(v => v.contentType === 'ugc')
          };
        });

        devLog.log('✅ [PlayPage] Video shared successfully');
      }
    } catch (error) {
      devLog.error('❌ [PlayPage] Failed to share video:', error);
      platformAlertSimple('Share Failed', 'Unable to share video. Please try again.');
    }
  }, []);

  // Navigation
  const navigateToDetail = useCallback((video: UGCVideoItem) => {
    // Pause all currently playing videos before navigation
    setState(prev => ({ ...prev, playingVideos: new Set() }));
    
    // Navigate to UGCDetailScreen with video data
    router.push({
      pathname: '/UGCDetailScreen',
      params: { item: JSON.stringify(video) }
    });
  }, [router]);

  // Error handling
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Initialize data on mount and cleanup on unmount
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refreshVideos();

    // Cleanup function
    return () => {
      cleanupAbortController();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // iOS-specific video management
  useEffect(() => {
    if (Platform.OS === 'ios') {
      // On iOS, we need to be more aggressive about video management
      // Pause videos when too many are playing to prevent memory issues
      if (state.playingVideos.size > 3) {
        const videosArray = Array.from(state.playingVideos);
        const videosToKeep = videosArray.slice(-2); // Keep only last 2 videos playing
        const videosToPause = videosArray.slice(0, -2);

        videosToPause.forEach(videoId => {
          pauseVideo(videoId);
        });
      }
    }
  }, [state.playingVideos, pauseVideo]);

  const actions: PlayPageActions = {
    fetchVideos,
    refreshVideos,
    loadMoreVideos,
    setActiveCategory,
    playVideo,
    pauseVideo,
    toggleMute,
    likeVideo: likeVideoAction,
    shareVideo: shareVideoAction,
    navigateToDetail,
    clearError
  };

  return {
    // Flat accessors for components that only need a subset of state
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    featuredVideo: state.featuredVideo,
    allVideos: state.allVideos,
    merchantVideos: state.merchantVideos,
    articleVideos: state.articleVideos,
    ugcVideos: state.ugcVideos,
    trendingVideos: state.trendingVideos,
    activeCategory: state.activeCategory,
    categories: state.categories,
    hasMoreVideos: state.hasMoreVideos,
    currentPage: state.currentPage,
    // Full state and actions preserved for components that need them
    state,
    actions,
  };
}