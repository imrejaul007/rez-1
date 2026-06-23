// Achievement Unlock Modal
// Full-screen celebration modal shown when an achievement is unlocked

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions} from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface AchievementUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  achievement: {
    title: string;
    description?: string;
    icon: string;
    coinReward: number;
  } | null;
  onClaim?: () => void;
}

// ============================================
// CONFETTI PARTICLE CONFIG
// ============================================

const PARTICLE_COUNT = 18;
const PARTICLE_COLORS = [
  colors.brand.goldBright, '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#82E0AA',
  '#F8C471', '#E74C3C', '#3498DB', colors.success,
];

interface ParticleConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  color: string;
  delay: number;
}

const generateParticles = (): ParticleConfig[] => {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    startX: SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 40,
    startY: SCREEN_HEIGHT / 2 - 60,
    endX: Math.random() * SCREEN_WIDTH,
    endY: Math.random() * SCREEN_HEIGHT * 0.4 + 50,
    size: Math.random() * 8 + 4,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: Math.random() * 400,
  }));
};

// ============================================
// PARTICLE COMPONENT
// ============================================

const ParticleView: React.FC<{
  particle: ReturnType<typeof generateParticles>[0];
  progress: { value: number };
  opacity: { value: number };
}> = React.memo(({ particle, progress, opacity }) => {
  const rotationDeg = useRef(Math.random() * 720).current;
  const particleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [particle.startX, particle.endX]) },
      { translateY: interpolate(progress.value, [0, 0.4, 1], [particle.startY, particle.endY - 80, particle.endY + 100]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, rotationDeg])}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        particleStyle,
      ]}
    />
  );
});

// ============================================
// COMPONENT
// ============================================

const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  visible,
  onClose,
  achievement,
  onClaim,
}) => {
  // Animation values
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const rewardScale = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const shimmerAnim = useSharedValue(0);

  // Particle animation values - use shared values for each particle
  const particleProgress = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      progress: particleProgress,
      opacity: particleOpacity,
    }))
  ).current;

  const particles = useRef(generateParticles()).current;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 250 });
    cardScale.value = withTiming(0.8, { duration: 250 });
    cardOpacity.value = withTiming(0, { duration: 200 });
    // Delay onClose to let exit animation play
    setTimeout(() => onClose(), 300);
  }, [onClose, overlayOpacity, cardScale, cardOpacity]);

  // Start entrance animations
  useEffect(() => {
    if (visible && achievement) {
      // Reset all animations
      overlayOpacity.value = 0;
      cardScale.value = 0.3;
      cardOpacity.value = 0;
      iconScale.value = 0;
      titleOpacity.value = 0;
      rewardScale.value = 0;
      buttonOpacity.value = 0;
      shimmerAnim.value = 0;
      particleAnims.forEach((p) => {
        p.progress.value = 0;
        p.opacity.value = 0;
      });

      // Staggered entrance sequence
      // 1. Overlay fade in
      overlayOpacity.value = withTiming(1, { duration: 300 });
      // 2. Card scale + fade in (staggered)
      cardScale.value = withDelay(300, withSpring(1));
      cardOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
      iconScale.value = withDelay(500, withSpring(1));
      titleOpacity.value = withDelay(700, withTiming(1, { duration: 250 }));
      rewardScale.value = withDelay(950, withSpring(1));
      buttonOpacity.value = withDelay(1150, withTiming(1, { duration: 300 }));
      // Particles
      particleAnims.forEach((particleAnim) => {
        particleAnim.progress.value = withDelay(500, withTiming(1, { duration: 1200 }));
        particleAnim.opacity.value = withDelay(500, withTiming(1, { duration: 200 }));
      });

      // Auto-dismiss after 5 seconds
      autoDismissTimer.current = setTimeout(() => {
        handleClose();
      }, 5000);
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible, achievement, handleClose]);

  const handleClaim = useCallback(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
    }
    onClaim?.();
    handleClose();
  }, [onClaim, handleClose]);

  if (!achievement) return null;

  // Map icon string to Ionicons name
  const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      trophy: 'trophy',
      star: 'star',
      flame: 'flame',
      heart: 'heart',
      diamond: 'diamond',
      ribbon: 'ribbon',
      medal: 'medal',
      rocket: 'rocket',
      flash: 'flash',
      sparkles: 'sparkles',
      crown: 'diamond',
      shield: 'shield-checkmark',
    };
    return iconMap[icon] || 'trophy';
  };

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(iconScale.value, [0, 0.5, 1], [0, 1.2, 1]) }],
  }));

  const shimmerAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 0.5, 1], [0.3, 0.8, 0.3]),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable
          style={styles.overlayTouch}
         
          onPress={handleClose}
        >
          {/* Confetti Particles */}
          {particles.map((particle, index) => (
            <ParticleView
              key={index}
              particle={particle}
              progress={particleProgress}
              opacity={particleOpacity}
            />
          ))}

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            <Pressable>
              {/* Icon Container */}
              <View style={styles.iconSection}>
                <Animated.View
                  style={[
                    styles.iconGlow,
                    shimmerAnimStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.iconCircle,
                    iconAnimStyle,
                  ]}
                >
                  <Ionicons
                    name={getIconName(achievement.icon)}
                    size={48}
                    color={colors.brand.goldBright}
                  />
                </Animated.View>
              </View>

              {/* Title */}
              <Animated.View style={{ opacity: titleOpacity }}>
                <Text style={styles.unlockLabel}>Achievement Unlocked!</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                {achievement.description && (
                  <Text style={styles.achievementDescription}>
                    {achievement.description}
                  </Text>
                )}
              </Animated.View>

              {/* Coin Reward */}
              <Animated.View
                style={[
                  styles.rewardContainer,
                  { transform: [{ scale: rewardScale }] },
                ]}
              >
                <View style={styles.rewardBadge}>
                  <Ionicons name="diamond" size={20} color={colors.brand.greenDark} />
                  <Text style={styles.rewardAmount}>
                    +{achievement.coinReward}
                  </Text>
                  <Text style={styles.rewardLabel}>coins</Text>
                </View>
              </Animated.View>

              {/* Claim Button */}
              <Animated.View style={{ opacity: buttonOpacity }}>
                <Pressable
                  style={styles.claimButton}
                  onPress={handleClaim}
                 
                  accessibilityLabel={`Claim ${achievement.coinReward} coins reward`}
                  accessibilityRole="button"
                >
                  <Text style={styles.claimButtonText}>Claim Reward</Text>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  particle: {
    position: 'absolute',
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: colors.brand.goldBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  // Icon
  iconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brand.goldBright,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.nileBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.brand.goldBright,
    shadowColor: colors.brand.goldBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Text
  unlockLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.amberDeep,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  achievementDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },

  // Reward
  rewardContainer: {
    marginVertical: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successScale[50],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  rewardAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.brand.greenDark,
  },
  rewardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.greenDark,
  },

  // Button
  claimButton: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(AchievementUnlockModal);
