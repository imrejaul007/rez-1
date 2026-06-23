// Video preloading service for faster playback
import { Video, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { UGCVideoItem } from '@/types/playPage.types';
import React from 'react';

class VideoPreloadService {
  private preloadedVideos: Map<string, any> = new Map();
  private preloadQueue: string[] = [];
  private isPreloading: boolean = false;
  private maxPreloadedVideos = Platform.OS === 'ios' ? 3 : 5;

  // Simple URL tracking without actual preloading (to avoid Video component issues)
  async preloadVideo(videoUrl: string): Promise<boolean> {
    if (this.preloadedVideos.has(videoUrl)) {
      return true; // Already tracked
    }

    if (this.preloadedVideos.size >= this.maxPreloadedVideos) {
      // Remove oldest tracked video
      const oldestKey = this.preloadedVideos.keys().next().value;
      if (oldestKey) {
        this.preloadedVideos.delete(oldestKey);
      }
    }

    try {
      // For now, just track the URL without actual preloading
      // This prevents the Video component initialization errors
      this.preloadedVideos.set(videoUrl, { 
        url: videoUrl, 
        preloadedAt: Date.now(),
        ready: true 
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Batch preload multiple videos
  async preloadVideos(videos: UGCVideoItem[], priorityIndex: number = 0): Promise<void> {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    
    try {
      // Prioritize videos based on their position (visible first)
      const sortedVideos = videos
        .map((video, index) => ({ video, index }))
        .sort((a, b) => Math.abs(a.index - priorityIndex) - Math.abs(b.index - priorityIndex))
        .slice(0, this.maxPreloadedVideos);

      // Preload videos sequentially to avoid overwhelming the device
      for (const { video } of sortedVideos) {
        await this.preloadVideo(video.videoUrl);
        // Small delay between preloads to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isPreloading = false;
    }
  }

  // Get preloaded video status
  isVideoPreloaded(videoUrl: string): boolean {
    return this.preloadedVideos.has(videoUrl);
  }

  // Get preloaded video instance
  getPreloadedVideo(videoUrl: string): any | null {
    return this.preloadedVideos.get(videoUrl) || null;
  }

  // Clear specific video from cache
  async clearVideo(videoUrl: string): Promise<void> {
    const video = this.preloadedVideos.get(videoUrl);
    if (video) {
      // Since we're only tracking URLs now, just remove from map
      this.preloadedVideos.delete(videoUrl);

    }
  }

  // Clear all preloaded videos
  async clearAll(): Promise<void> {
    // Since we're only tracking URLs now, just clear the map
    this.preloadedVideos.clear();

  }

  // Get cache status for debugging
  getCacheStatus() {
    return {
      preloadedCount: this.preloadedVideos.size,
      maxPreloaded: this.maxPreloadedVideos,
      isPreloading: this.isPreloading,
      preloadedUrls: Array.from(this.preloadedVideos.keys()),
    };
  }
}

// Export singleton instance
export const videoPreloadService = new VideoPreloadService();

// Hook for React components
export function useVideoPreload() {
  const preloadVideos = async (videos: UGCVideoItem[], priorityIndex?: number) => {
    await videoPreloadService.preloadVideos(videos, priorityIndex);
  };

  const isPreloaded = (videoUrl: string) => {
    return videoPreloadService.isVideoPreloaded(videoUrl);
  };

  const getCacheStatus = () => {
    return videoPreloadService.getCacheStatus();
  };

  return {
    preloadVideos,
    isPreloaded,
    getCacheStatus,
  };
}
