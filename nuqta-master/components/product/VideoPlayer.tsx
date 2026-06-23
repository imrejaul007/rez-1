import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * VideoPlayer Component
 *
 * Video player for product videos with playback controls
 */
interface VideoPlayerProps {
  uri: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  style?: any;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  width = 300,
  height = 300,
  autoPlay = false,
  loop = true,
  muted = false,
  style,
}) => {
  const videoRef = useRef<Video>(null);

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync();
    };
  }, []);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(muted);
  const isMounted = useIsMounted();

  /**
   * Handle video playback status
   */
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
    } else if (status.error) {
      setError('Failed to load video');
      setIsLoading(false);
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      // silently handle
    }
  };

  /**
   * Toggle mute/unmute
   */
  const toggleMute = async () => {
    if (!videoRef.current) return;

    try {
      if (!isMounted()) return;
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      // silently handle
    }
  };

  /**
   * Replay video from start
   */
  const replay = async () => {
    if (!videoRef.current) return;

    try {
      await videoRef.current.replayAsync();
    } catch (error) {
      // silently handle
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      {/* Video Component */}
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        isLooping={loop}
        isMuted={isMuted}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
          <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
        </View>
      )}

      {/* Play/Pause Overlay */}
      {!isLoading && (
        <Pressable
          style={styles.playPauseOverlay}
          onPress={togglePlayPause}
         
        >
          {!isPlaying && (
            <View style={styles.playButton}>
              <Ionicons name="play" size={40} color={colors.background.primary} />
            </View>
          )}
        </Pressable>
      )}

      {/* Controls */}
      {!isLoading && (
        <View style={styles.controls}>
          {/* Play/Pause Button */}
          <Pressable
            style={styles.controlButton}
            onPress={togglePlayPause}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={colors.background.primary}
            />
          </Pressable>

          {/* Replay Button */}
          <Pressable
            style={styles.controlButton}
            onPress={replay}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="reload" size={24} color={colors.background.primary} />
          </Pressable>

          <View style={{ flex: 1 }} />

          {/* Mute/Unmute Button */}
          <Pressable
            style={styles.controlButton}
            onPress={toggleMute}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color={colors.background.primary}
            />
          </Pressable>
        </View>
      )}

      {/* Video Badge */}
      <View style={styles.videoBadge}>
        <Ionicons name="videocam" size={14} color={colors.background.primary} />
        <ThemedText style={styles.videoBadgeText}>VIDEO</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.text.primary,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },

  // Loading
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.background.primary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },

  // Play/Pause Overlay
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Controls
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Video Badge
  videoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
});

export default React.memo(VideoPlayer);
