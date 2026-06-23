import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, withRepeat, interpolate, SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface LevelBenefit {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface LevelUpCelebrationProps {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  levelName: string;
  benefits?: LevelBenefit[];
  bonusAmount?: number;
  onClose: () => void;
  onShopNow?: () => void;
}

const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.nileBlue,
  gold: colors.brand.goldWarm,
  goldDark: '#E5A500',
  navy: colors.brand.navyDark,
  white: colors.background.primary,
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Confetti particle component
const ConfettiParticle = ({ delay, color }: { delay: number; color: string }) => {
  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  const endX = useRef(startX + (Math.random() - 0.5) * 100).current;
  const endRotation = useRef(Math.random() * 720).current;
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(600, { duration: 3000 });
    translateX.value = withTiming(endX, { duration: 3000 });
    rotate.value = withTiming(endRotation, { duration: 3000 });
    opacity.value = withTiming(0, { duration: 3000 });

    // cleanup handled by reanimated
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
};

function LevelUpCelebration({
  visible,
  oldLevel,
  newLevel,
  levelName,
  benefits = [],
  bonusAmount = 0,
  onClose,
  onShopNow,
}: LevelUpCelebrationProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const scaleAnim = useSharedValue(0);
  const badgeRotate = useSharedValue(0);
  const glowAnim = useSharedValue(0.5);
  const [showConfetti, setShowConfetti] = useState(false);

  const confettiColors = [
    COLORS.gold,
    COLORS.primary,
    '#FF6B6B',
    '#4ECDC4',
    '#FFE66D',
    '#95E1D3',
  ];

  useEffect(() => {
    if (visible) {
      setShowConfetti(true);

      // Entry animation
      scaleAnim.value = withSpring(1, { stiffness: 50, damping: 7 });
      badgeRotate.value = withTiming(360, { duration: 1000 });

      // Glow pulse (separate loop so it can be cleaned up)
      glowAnim.value = withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.5, { duration: 800 })), -1);

      // Stop confetti after animation
      const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);

      return () => {
        clearTimeout(confettiTimer);
      };
    } else {
      scaleAnim.value = 0;
      badgeRotate.value = 0;
    }
  }, [visible]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const badgeRotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateY: `${badgeRotate.value}deg` },
    ],
  }));

  const handleClose = () => {
    scaleAnim.value = withTiming(0, { duration: 200 });
    setTimeout(() => onClose(), 200);
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1:
        return 'star';
      case 2:
        return 'trophy';
      case 3:
        return 'medal';
      default:
        return 'ribbon';
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return [COLORS.primary, COLORS.primaryDark];
      case 2:
        return [colors.lightMustard, colors.nileBlue];
      case 3:
        return [COLORS.gold, COLORS.goldDark];
      default:
        return [COLORS.primary, COLORS.primaryDark];
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {showConfetti && (
          <View style={[styles.confettiContainer, { pointerEvents: 'none' }]}>
            {[...Array(50)].map((_, i) => (
              <ConfettiParticle
                key={i}
                delay={i * 50}
                color={confettiColors[i % confettiColors.length]}
              />
            ))}
          </View>
        )}

        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidOverlay]} />
        )}

        <Animated.View
          style={[
            styles.container,
            scaleStyle,
          ]}
        >
          {/* Glow Effect */}
          <Animated.View
            style={[
              styles.glowContainer,
              glowStyle,
            ]}
          >
            <LinearGradient
              colors={[...getLevelColor(newLevel), 'transparent']}
              style={styles.glow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </Animated.View>

          {/* Badge */}
          <Animated.View
            style={[
              styles.badgeContainer,
              badgeRotateStyle,
            ]}
          >
            <LinearGradient colors={getLevelColor(newLevel)} style={styles.badge}>
              <Ionicons name={getLevelIcon(newLevel)} size={48} color={COLORS.white} />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={styles.congratsText}>Congratulations!</Text>
          <Text style={styles.levelUpText}>You've leveled up!</Text>

          {/* Level Progress */}
          <View style={styles.levelProgress}>
            <View style={styles.levelBox}>
              <Text style={styles.levelLabel}>From</Text>
              <Text style={styles.levelNumber}>Level {oldLevel}</Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={24} color={COLORS.gold} />
            </View>
            <View style={[styles.levelBox, styles.newLevelBox]}>
              <Text style={styles.levelLabel}>To</Text>
              <Text style={[styles.levelNumber, { color: COLORS.gold }]}>
                Level {newLevel}
              </Text>
            </View>
          </View>

          {/* Level Name */}
          <LinearGradient colors={getLevelColor(newLevel)} style={styles.levelNameBadge}>
            <Text style={styles.levelName}>{levelName}</Text>
          </LinearGradient>

          {/* Bonus Amount */}
          {bonusAmount > 0 && (
            <View style={styles.bonusContainer}>
              <Ionicons name="gift" size={24} color={COLORS.gold} />
              <Text style={styles.bonusText}>
                +{currencySymbol}{bonusAmount.toLocaleString('en-IN')} added to wallet!
              </Text>
            </View>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>New Benefits Unlocked</Text>
              {benefits.slice(0, 3).map((benefit) => (
                <View key={benefit.id} style={styles.benefitItem}>
                  <Ionicons
                    name={(benefit.icon || 'checkmark-circle') as any}
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.benefitText}>{benefit.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {onShopNow && (
              <Pressable style={styles.shopButton} onPress={onShopNow}>
                <LinearGradient
                  colors={getLevelColor(newLevel)}
                  style={styles.shopButtonGradient}
                >
                  <Text style={styles.shopButtonText}>Shop Now</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </LinearGradient>
              </Pressable>
            )}
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Continue</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  glowContainer: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    height: 200,
  },
  glow: {
    flex: 1,
    borderRadius: 100,
  },
  badgeContainer: {
    marginBottom: 16,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  levelUpText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  levelProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBox: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  newLevelBox: {
    backgroundColor: COLORS.gold + '20',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  levelLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  arrowContainer: {
    marginHorizontal: 12,
  },
  levelNameBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  bonusText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  shopButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default React.memo(LevelUpCelebration);
