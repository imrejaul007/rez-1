// Video utility functions for iOS optimization
import { Platform } from 'react-native';
import { ResizeMode } from 'expo-av';

export interface VideoConfig {
  autoPlay: boolean;
  maxConcurrentVideos: number;
  enablePoster: boolean;
  videoQuality: 'low' | 'medium' | 'high';
}

export const getOptimalVideoConfig = (): VideoConfig => {
  if (Platform.OS === 'ios') {
    return {
      autoPlay: true,
      maxConcurrentVideos: 2, // Limit concurrent videos on iOS
      enablePoster: true,
      videoQuality: 'medium', // Balance between quality and performance
    };
  }
  
  // Android and other platforms
  return {
    autoPlay: true,
    maxConcurrentVideos: 4,
    enablePoster: false,
    videoQuality: 'high',
  };
};

export const getIOSVideoProps = (videoUrl: string, thumbnailUrl?: string) => {
  const baseProps = {
    isLooping: true,
    isMuted: true,
    volume: 0,
    useNativeControls: false,
    progressUpdateIntervalMillis: 1000,
    positionMillis: 0,
  };

  if (Platform.OS === 'ios') {
    return {
      ...baseProps,
      // iOS-specific optimizations
      posterSource: thumbnailUrl ? { uri: thumbnailUrl } : undefined,
      usePoster: !!thumbnailUrl,
      // Prevent video from auto-playing in background
      ignoreSilentSwitch: 'ignore' as const,
    };
  }

  return baseProps;
};

export const shouldAutoPlayVideo = (index: number, totalVideos: number): boolean => {
  const config = getOptimalVideoConfig();
  
  if (Platform.OS === 'ios') {
    // On iOS, only auto-play first few videos to prevent memory issues
    return index < config.maxConcurrentVideos;
  }
  
  // On other platforms, auto-play all visible videos
  return true;
};

export const getVideoLoadingStrategy = () => {
  if (Platform.OS === 'ios') {
    return {
      preload: 'none' as const,
      loadAsync: true,
      shouldCorrectPitch: false,
      shouldPlay: false, // Start paused and play manually
    };
  }
  
  return {
    preload: 'auto' as const,
    loadAsync: false,
    shouldCorrectPitch: true,
    shouldPlay: true,
  };
};