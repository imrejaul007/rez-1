// @ts-nocheck
// Achievement Unlock Modal Component
// Animated modal to celebrate achievement unlocks

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Share,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, withRepeat, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import type { Achievement } from '@/types/gamification.types';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface AchievementUnlockModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

const TIER_COLORS = {
  bronze: ['#CD7F32', '#B87333'],
  silver: ['#C0C0C0', '#A8A8A8'],
  gold: [colors.brand.goldBright, '#FFA500'],
  platinum: ['#E5E4E2', '#C0C0C0'],
  diamond: ['#B9F2FF', '#81D4FA'],
} as const;

function AchievementUnlockModal({
  visible,
  achievement,
  onClose,
}: AchievementUnlockModalProps) {
  const scaleAnim = useSharedValue(0);
  const shineAnim = useSharedValue(0);
  const coinsAnim = useSharedValue(0);
  const animationRef = useRef<any | null>(null);

  useEffect(() => {
    if (visible && achievement) {
      // Reset animations
      scaleAnim.value = 0;
      shineAnim.value = 0;
      coinsAnim.value = 0;

      // Create shine loop animation
      shineAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);

      // Start animations
      scaleAnim.value = withSpring(1, { stiffness: 50, damping: 7 });
      coinsAnim.value = withSpring(1, { stiffness: 40, damping: 8 });
    }

    // Cleanup: stop all animations on unmount or when visibility changes
    return () => {
      if (animationRef.current) {
        animationRef.current = null;
      }
      scaleAnim.value = 0;
      shineAnim.value = 0;
      coinsAnim.value = 0;
    };
  }, [visible, achievement]);

  // Handle share
  const handleShare = async () => {
    if (!achievement) return;

    try {
      await Share.share({
        message: `I just unlocked the "${achievement.title}" achievement on REZ! 🏆\n\nEarned ${achievement.coinReward} coins!\n\nJoin me on REZ and start earning!`,
      });
    } catch (error) {
      // silently handle
    }
  };

  if (!achievement) return null;

  const tierGradient = TIER_COLORS[achievement.tier];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Confetti/Particles Effect */}
          <View style={styles.confettiContainer}>
            {[...Array(20)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.confetti,
                  {
                    left: `${Math.random() * 100}%`,
                    backgroundColor: [colors.error, colors.warningScale[400], colors.successScale[400], colors.infoScale[400], colors.brand.purpleLight][
                      Math.floor(Math.random() * 5)
                    ],
                    transform: [
                      {
                        translateY: interpolate(shineAnim.value, [0, 1], [0, 300]),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          <LinearGradient colors={tierGradient} style={styles.gradient}>
            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.background.primary} />
            </Pressable>

            {/* Achievement Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    {
                      rotate: interpolate(shineAnim.value, [0, 1], ['0deg', '10deg']),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient colors={[colors.background.primary, colors.neutral[100]]} style={styles.iconCircle}>
                <Ionicons name={achievement.icon as any} size={64} color={tierGradient[0]} />
              </LinearGradient>
            </Animated.View>

            {/* Achievement Info */}
            <ThemedText style={styles.unlockText}>ACHIEVEMENT UNLOCKED!</ThemedText>
            <ThemedText style={styles.achievementTitle}>{achievement.title}</ThemedText>
            <ThemedText style={styles.achievementDescription}>
              {achievement.description}
            </ThemedText>

            {/* Tier Badge */}
            <View style={styles.tierBadge}>
              <ThemedText style={styles.tierText}>
                {achievement.tier.toUpperCase()} TIER
              </ThemedText>
            </View>

            {/* Coin Reward */}
            <Animated.View
              style={[
                styles.coinsContainer,
                {
                  transform: [{ scale: coinsAnim }],
                },
              ]}
            >
              <Ionicons name="diamond" size={32} color={colors.brand.goldBright} />
              <ThemedText style={styles.coinsText}>+{achievement.coinReward}</ThemedText>
            </Animated.View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social" size={20} color={colors.brand.purpleLight} />
                <ThemedText style={styles.shareButtonText}>Share Achievement</ThemedText>
              </Pressable>

              <Pressable style={styles.doneButton} onPress={onClose}>
                <LinearGradient colors={[colors.successScale[400], colors.successScale[700]]} style={styles.doneButtonGradient}>
                  <ThemedText style={styles.doneButtonText}>Awesome!</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContainer: {
    width: width * 0.9,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
    zIndex: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  unlockText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  achievementTitle: {
    color: colors.background.primary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    color: colors.background.primary,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 20,
  },
  tierBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  tierText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  coinsText: {
    color: colors.neutral[900],
    fontSize: 28,
    fontWeight: 'bold',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: colors.brand.purpleLight,
    fontSize: 15,
    fontWeight: 'bold',
  },
  doneButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default React.memo(AchievementUnlockModal);
