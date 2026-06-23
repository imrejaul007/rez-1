// Video manager hook for handling iOS auto-play limitations
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface VideoInstance {
  id: string;
  ref: any;
  isPlaying: boolean;
  isLoaded: boolean;
}

class VideoManager {
  private activeVideos: Map<string, VideoInstance> = new Map();
  private maxSimultaneousVideos = Platform.OS === 'ios' ? 2 : 4; // iOS limitation
  private currentlyPlaying: string[] = [];
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  registerVideo(id: string, ref: any): void {
    // Clear any existing cleanup timer for this video
    if (this.cleanupTimers.has(id)) {
      clearTimeout(this.cleanupTimers.get(id)!);
      this.cleanupTimers.delete(id);
    }

    this.activeVideos.set(id, {
      id,
      ref,
      isPlaying: false,
      isLoaded: false,
    });
  }

  unregisterVideo(id: string): void {
    this.stopVideo(id);
    this.activeVideos.delete(id);

    // Clear any cleanup timer
    if (this.cleanupTimers.has(id)) {
      clearTimeout(this.cleanupTimers.get(id)!);
      this.cleanupTimers.delete(id);
    }
  }

  async startVideo(id: string): Promise<boolean> {
    const video = this.activeVideos.get(id);
    if (!video || !video.ref) return false;

    // Stop other videos if we're at the limit
    if (this.currentlyPlaying.length >= this.maxSimultaneousVideos) {
      const oldestPlaying = this.currentlyPlaying[0];
      await this.stopVideo(oldestPlaying);
    }

    try {
      await video.ref.setStatusAsync({
        shouldPlay: true,
        isLooping: true,
        isMuted: true,
        volume: 0,
      });

      video.isPlaying = true;
      this.currentlyPlaying.push(id);

      return true;
    } catch (error) {
      return false;
    }
  }

  async stopVideo(id: string): Promise<void> {
    const video = this.activeVideos.get(id);
    if (!video || !video.ref) return;

    try {
      await video.ref.setStatusAsync({ shouldPlay: false });
      video.isPlaying = false;
      this.currentlyPlaying = this.currentlyPlaying.filter(playingId => playingId !== id);

      // Clear any existing cleanup timer before scheduling a new one
      if (this.cleanupTimers.has(id)) {
        clearTimeout(this.cleanupTimers.get(id)!);
      }

      // Schedule cleanup of video resources after a delay
      const cleanupTimer = setTimeout(() => {
        if (video.ref) {
          try {
            video.ref.unloadAsync?.();
          } catch (_e) {
            // silently handle
          }
        }
        this.cleanupTimers.delete(id);
      }, 5000); // 5 second delay before cleanup

      this.cleanupTimers.set(id, cleanupTimer);

    } catch (_error) {
      // silently handle
    }
  }

  // Cleanup all videos - useful for page unmount
  cleanupAll(): void {
    this.activeVideos.forEach((video, id) => {
      this.stopVideo(id);
    });
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.cleanupTimers.clear();
    this.activeVideos.clear();
    this.currentlyPlaying = [];
  }

  setVideoLoaded(id: string, loaded: boolean): void {
    const video = this.activeVideos.get(id);
    if (video) {
      video.isLoaded = loaded;
    }
  }

  getActiveVideoCount(): number {
    return this.currentlyPlaying.length;
  }

  getStatus() {
    return {
      totalVideos: this.activeVideos.size,
      currentlyPlaying: this.currentlyPlaying.length,
      maxSimultaneous: this.maxSimultaneousVideos,
      playingIds: [...this.currentlyPlaying],
    };
  }
}

// Global video manager instance
const videoManager = new VideoManager();

/**
 * useVideoManager - hook for managing a single video's playback state.
 *
 * Returns the current video id, a playing flag, and play/pause controls.
 * Backed by the shared `videoManager` instance for cross-component coordination.
 */
export function useVideoManager(videoId?: string) {
  const videoRef = useRef<any>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(videoId ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const activeIdRef = useRef<string | null>(videoId ?? null);

  useEffect(() => {
    if (videoId) {
      // Register video on mount
      videoManager.registerVideo(videoId, videoRef.current);
      activeIdRef.current = videoId;
      setCurrentVideo(videoId);

      // Store cleanup function
      cleanupRef.current = () => {
        // Stop video before unregistering
        videoManager.stopVideo(videoId);
        videoManager.unregisterVideo(videoId);
        setIsPlaying(false);
        setIsLoaded(false);
      };

      return () => {
        // Cleanup on unmount
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        if (activeIdRef.current === videoId) {
          activeIdRef.current = null;
        }
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const playVideo = (id: string): void => {
    activeIdRef.current = id;
    setCurrentVideo(id);
    setIsPlaying(true);

    // Coordinate with the shared manager; the underlying ref is registered
    // by the component using the hook, but we keep state in sync here.
    if (videoManager['activeVideos'].has(id)) {
      videoManager['activeVideos'].get(id)!.isPlaying = true;
    }
  };

  const pauseVideo = (): void => {
    const id = activeIdRef.current;
    if (id) {
      videoManager.stopVideo(id);
    }
    setIsPlaying(false);
  };

  const startPlayback = async (): Promise<boolean> => {
    const id = activeIdRef.current ?? currentVideo;
    if (!id) return false;
    const success = await videoManager.startVideo(id);
    setIsPlaying(success);
    return success;
  };

  const stopPlayback = async (): Promise<void> => {
    const id = activeIdRef.current ?? currentVideo;
    if (id) {
      await videoManager.stopVideo(id);
    }
    setIsPlaying(false);
  };

  const setLoaded = (loaded: boolean): void => {
    setIsLoaded(loaded);
    const id = activeIdRef.current ?? currentVideo;
    if (id) {
      videoManager.setVideoLoaded(id, loaded);
    }
  };

  const getManagerStatus = () => videoManager.getStatus();

  return {
    videoRef,
    currentVideo,
    isPlaying,
    isLoaded,
    playVideo,
    pauseVideo,
    startPlayback,
    stopPlayback,
    setLoaded,
    getManagerStatus,
  };
}

export default videoManager;
