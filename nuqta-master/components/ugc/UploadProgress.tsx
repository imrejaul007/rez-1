// Upload Progress Component
// Displays upload progress with animation and statistics

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { UploadProgress as UploadProgressType, UploadStatus } from '@/types/ugc-upload.types';
import { colors } from '@/constants/theme';

interface UploadProgressProps {
  status: UploadStatus;
  progress?: UploadProgressType | null;
  onCancel?: () => void;
  showCancel?: boolean;
}

function UploadProgress({
  status,
  progress,
  onCancel,
  showCancel = true,
}: UploadProgressProps) {
  const progressAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  // Animate progress bar
  useEffect(() => {
    if (progress) {
      progressAnim.value = withTiming(progress.percentage, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [progress?.percentage]);

  // Pulse animation for processing state
  useEffect(() => {
    if (status === 'processing') {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: status === 'processing' ? pulseAnim.value : 1 }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%` as any,
  }));

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return 'cloud-upload-outline';
      case 'processing':
        return 'cog-outline';
      case 'complete':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'hourglass-outline';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return colors.infoScale[400];
      case 'processing':
        return colors.warningScale[400];
      case 'complete':
        return colors.lightMustard;
      case 'error':
        return colors.error;
      default:
        return colors.neutral[500];
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'validating':
        return 'Validating video...';
      case 'uploading':
        return 'Uploading video...';
      case 'processing':
        return 'Processing video...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Preparing...';
    }
  };

  const percentage = progress?.percentage || 0;
  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      {/* Status Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          iconAnimatedStyle,
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: statusColor }]}>
          <Ionicons
            name={getStatusIcon() as any}
            size={32}
            color={colors.background.primary}
          />
        </View>
      </Animated.View>

      {/* Status Text */}
      <Text style={styles.statusText}>{getStatusText()}</Text>

      {/* Progress Bar */}
      {(status === 'uploading' || status === 'processing') && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { backgroundColor: statusColor },
                progressBarStyle,
              ]}
            />
          </View>
          <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
        </View>
      )}

      {/* Upload Statistics */}
      {progress && status === 'uploading' && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-up" size={16} color={colors.midGray} />
            <Text style={styles.statLabel}>
              {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
            </Text>
          </View>

          {progress.uploadSpeed && (
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={16} color={colors.midGray} />
              <Text style={styles.statLabel}>
                {formatBytes(progress.uploadSpeed)}/s
              </Text>
            </View>
          )}

          {progress.estimatedTimeRemaining && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.midGray} />
              <Text style={styles.statLabel}>
                {formatTime(progress.estimatedTimeRemaining)} remaining
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Success Message */}
      {status === 'complete' && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            Your video has been uploaded successfully!
          </Text>
        </View>
      )}

      {/* Error Message */}
      {status === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Something went wrong. Please try again.
          </Text>
        </View>
      )}

      {/* Cancel Button */}
      {showCancel && (status === 'uploading' || status === 'processing') && onCancel && (
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}

        >
          <Ionicons name="close-circle-outline" size={20} color={colors.error} />
          <Text style={styles.cancelButtonText}>Cancel Upload</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midGray,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.midGray,
  },
  successContainer: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.tint.green,
    borderRadius: 8,
    marginTop: 8,
  },
  successText: {
    fontSize: 14,
    color: '#065F46',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.errorScale[100],
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.errorScale[100],
    backgroundColor: colors.errorScale[50],
    marginTop: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});

export default React.memo(UploadProgress);
