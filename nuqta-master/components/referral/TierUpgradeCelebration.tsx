// Tier Upgrade Celebration Component
// Full-screen celebration animation when user advances to new referral tier

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Share,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { TIER_COLORS, TIER_GRADIENTS } from '@/types/referral.types';
import type { ReferralTier } from '@/types/referral.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface TierUpgradeCelebrationProps {
  visible: boolean;
  newTier: string;
  tierData: ReferralTier;
  onClose: () => void;
}

function TierUpgradeCelebration({
  visible,
  newTier,
  tierData,
  onClose,
}: TierUpgradeCelebrationProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  // Store confetti target values for each particle
  const confettiProgress = [...Array(30)].map(() => useSharedValue(0));
  const confettiTargets = React.useRef(
    [...Array(30)].map(() => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: height * (1 + Math.random()),
      rotation: Math.random() * 720,
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.value = 0;
      fadeAnim.value = 0;

      // Fade in then scale
      fadeAnim.value = withTiming(1, { duration: 300 });
      scaleAnim.value = withSpring(1, { damping: 10, stiffness: 50 });

      // Animate confetti
      confettiProgress.forEach((sv, index) => {
        sv.value = 0;
        const delay = index * 50;
        setTimeout(() => {
          sv.value = withTiming(1, { duration: 3000 + Math.random() * 1000 });
        }, delay);
      });
    }
  }, [visible]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  // Handle share achievement
  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 I just reached ${tierData.name} tier on REZ!\n\n${tierData.referralsRequired} referrals unlocked!\n\nEarning ${tierData.rewards.perReferral} coins per referral now! 🚀\n\nJoin me on REZ and start earning!`,
      });
    } catch (error) {
      // silently handle
    }
  };

  const tierColor = TIER_COLORS[newTier] || TIER_COLORS.STARTER;
  const tierGradient = TIER_GRADIENTS[newTier] || TIER_GRADIENTS.STARTER;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, fadeStyle]}>
        {/* Confetti */}
        <View style={styles.confettiContainer}>
          {confettiProgress.map((sv, index) => {
            const confettiColors = [colors.error, colors.warningScale[400], colors.successScale[400], colors.infoScale[400], colors.brand.purpleLight, colors.brand.pink];
            const color = confettiColors[index % confettiColors.length];
            const target = confettiTargets[index];

            const confettiItemStyle = useAnimatedStyle(() => ({
              transform: [
                { translateX: sv.value * target.x },
                { translateY: sv.value * target.y },
                { rotate: `${sv.value * target.rotation}deg` },
              ],
            }));

            return (
              <Animated.View
                key={index}
                style={[
                  styles.confetti,
                  { backgroundColor: color },
                  confettiItemStyle,
                ]}
              />
            );
          })}
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            scaleStyle,
          ]}
        >
          <LinearGradient colors={tierGradient} style={styles.gradient}>
            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.background.primary} />
            </Pressable>

            {/* Trophy Icon */}
            <View style={styles.trophyContainer}>
              <Ionicons name="trophy" size={120} color={colors.brand.goldBright} />
            </View>

            {/* Tier Info */}
            <ThemedText style={styles.congratsText}>CONGRATULATIONS!</ThemedText>
            <ThemedText style={styles.tierName}>{tierData.name}</ThemedText>
            <ThemedText style={styles.tierSubtext}>
              You've unlocked a new tier!
            </ThemedText>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <ThemedText style={styles.benefitsTitle}>New Benefits Unlocked:</ThemedText>

              <View style={styles.benefitsList}>
                {tierData.rewards.perReferral && (
                  <View style={styles.benefitItem}>
                    <Ionicons name="diamond" size={24} color={colors.brand.goldBright} />
                    <ThemedText style={styles.benefitText}>
                      {tierData.rewards.perReferral} coins per referral
                    </ThemedText>
                  </View>
                )}

                {tierData.rewards.tierBonus && (
                  <View style={styles.benefitItem}>
                    <Ionicons name="gift" size={24} color={colors.brand.goldBright} />
                    <ThemedText style={styles.benefitText}>
                      {tierData.rewards.tierBonus} coins bonus!
                    </ThemedText>
                  </View>
                )}

                {tierData.rewards.voucher && (
                  <View style={styles.benefitItem}>
                    <Ionicons name="ticket" size={24} color={colors.brand.goldBright} />
                    <ThemedText style={styles.benefitText}>
                      {currencySymbol}{tierData.rewards.voucher.amount} {tierData.rewards.voucher.type} voucher
                    </ThemedText>
                  </View>
                )}

                {tierData.rewards.lifetimePremium && (
                  <View style={styles.benefitItem}>
                    <Ionicons name="star" size={24} color={colors.brand.goldBright} />
                    <ThemedText style={styles.benefitText}>
                      Lifetime Premium Access! 🎉
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.shareButton} onPress={handleShare}>
                <LinearGradient
                  colors={[colors.background.primary, colors.neutral[100]]}
                  style={styles.shareButtonGradient}
                >
                  <Ionicons name="share-social" size={24} color={tierColor} />
                  <ThemedText style={[styles.shareButtonText, { color: tierColor }]}>
                    Share Achievement
                  </ThemedText>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.continueButton} onPress={onClose}>
                <LinearGradient
                  colors={[colors.successScale[400], colors.successScale[700]]}
                  style={styles.continueButtonGradient}
                >
                  <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
                  <Ionicons name="arrow-forward" size={24} color={colors.background.primary} />
                </LinearGradient>
              </Pressable>
            </View>

            {/* Fireworks Effect */}
            <View style={styles.fireworksContainer}>
              <Animated.View style={[styles.firework, fadeStyle]} />
              <Animated.View style={[styles.firework, styles.firework2, fadeStyle]} />
              <Animated.View style={[styles.firework, styles.firework3, fadeStyle]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 12,
    height: 12,
    top: -20,
    left: width / 2,
  },
  contentContainer: {
    width: width * 0.9,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyContainer: {
    marginVertical: 20,
  },
  congratsText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 8,
  },
  tierName: {
    color: colors.background.primary,
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  tierSubtext: {
    color: colors.background.primary,
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 32,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    color: colors.background.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  continueButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  fireworksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  firework: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.background.primary,
  },
  firework2: {
    top: '20%',
    left: '30%',
  },
  firework3: {
    top: '70%',
    right: '25%',
  },
});

export default React.memo(TierUpgradeCelebration);
