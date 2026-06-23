import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  progress?: number; // 0-100
  visible?: boolean;
}

function VideoControls({
  isPlaying,
  isMuted,
  onPlayPause,
  onMuteToggle,
  progress = 0,
  visible = true,
}: VideoControlsProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        {/* Play/Pause Button */}
        <Pressable
          style={styles.controlButton}
          onPress={onPlayPause}
         
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
            style={styles.buttonGradient}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={colors.background.primary}
            />
          </LinearGradient>
        </Pressable>

        {/* Mute/Unmute Button */}
        <Pressable
          style={styles.muteButton}
          onPress={onMuteToggle}
         
        >
          <View style={styles.muteButtonBg}>
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color={colors.background.primary}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 220, // Above product carousel
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: -10,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    right: 16,
    bottom: 0,
  },
  muteButtonBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default React.memo(VideoControls);
