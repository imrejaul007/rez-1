// @ts-nocheck
import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import type { SpinWheelResult } from '@/types/gamification.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import CoinRainOverlay from '@/components/ui/CoinRainOverlay';

interface CelebrationModalProps {
  visible: boolean;
  result: SpinWheelResult | null;
  coinsEarned: number;
  newBalance: number;
  onClose: () => void;
  tournamentUpdate?: { tournamentName: string; pointsAdded: number; newRank: number } | null;
}

const { width } = Dimensions.get('window');

function CelebrationModal({
  visible,
  result,
  coinsEarned,
  newBalance,
  onClose,
  tournamentUpdate,
}: CelebrationModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const scaleAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.value = 0;
      rotateAnim.value = 0;
      fadeAnim.value = 0;

      // Start animations
      scaleAnim.value = withSpring(1, { stiffness: 50, damping: 7 });
      rotateAnim.value = withTiming(1, { duration: 800 });
      fadeAnim.value = withTiming(1, { duration: 300 });

      // cleanup handled by reanimated
    }
  }, [visible]);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: interpolate(rotateAnim.value, [0, 1], ['0deg', '360deg']) }],
  }));

  if (!result) return null;

  const getPrizeIcon = () => {
    switch (result.prize?.type) {
      case 'coins':
        return 'star';
      case 'cashback':
        return 'cash';
      case 'discount':
        return 'pricetag';
      case 'voucher':
        return 'ticket';
      default:
        return 'gift';
    }
  };

  const getPrizeColor = () => {
    switch (result.prize?.type) {
      case 'coins':
        return [colors.brand.goldBright, '#FFA500'];
      case 'cashback':
        return [colors.lightMustard, colors.nileBlue];
      case 'discount':
        return [colors.warningScale[400], colors.warningScale[700]];
      case 'voucher':
        return [colors.brand.purpleLight, colors.brand.purple];
      default:
        return [colors.infoScale[400], colors.brand.blue];
    }
  };

  const getPrizeText = () => {
    if (result.prize?.type === 'coins') {
      return `${result.prize.value} Coins`;
    } else if (result.prize?.type === 'cashback') {
      return `${result.prize.value}% Cashback`;
    } else if (result.prize?.type === 'discount') {
      return `${result.prize.value}% Discount`;
    } else if (result.prize?.type === 'voucher') {
      return `${currencySymbol}${result.prize.value} Voucher`;
    }
    return result.segment.label;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <CoinRainOverlay visible={visible && (result?.prize?.type === 'coins' || result?.prize?.type === 'cashback')} />
        <Pressable
          style={StyleSheet.absoluteFill}

          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
           
          >
            <Ionicons name="close-circle" size={32} color={colors.neutral[500]} />
          </Pressable>

          {/* Celebration Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              rotationStyle,
            ]}
          >
            <LinearGradient
              colors={getPrizeColor()}
              style={styles.iconGradient}
            >
              <Ionicons name={getPrizeIcon() as any} size={64} color="white" />
            </LinearGradient>
          </Animated.View>

          {/* Congratulations Text */}
          <ThemedText style={styles.congratsText}>🎉 Congratulations! 🎉</ThemedText>

          {/* Prize Won */}
          <View style={styles.prizeContainer}>
            <ThemedText style={styles.prizeLabel}>You Won</ThemedText>
            <ThemedText style={styles.prizeValue}>{getPrizeText()}</ThemedText>
          </View>

          {/* Coins Info (if coins were won) */}
          {result.prize?.type === 'coins' && coinsEarned > 0 && (
            <View style={styles.coinsInfo}>
              <View style={styles.coinsRow}>
                <ThemedText style={styles.coinsLabel}>Coins Earned:</ThemedText>
                <ThemedText style={styles.coinsEarned}>+{coinsEarned}</ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.coinsRow}>
                <ThemedText style={styles.coinsLabel}>New Balance:</ThemedText>
                <View style={styles.balanceContainer}>
                  <Ionicons name="star" size={20} color={colors.brand.goldBright} />
                  <ThemedText style={styles.balanceValue}>{newBalance}</ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Tournament Score Update */}
          {tournamentUpdate && (
            <View style={styles.tournamentBanner}>
              <View style={styles.tournamentBannerRow}>
                <Ionicons name="trophy" size={18} color={colors.warningScale[400]} />
                <ThemedText style={styles.tournamentBannerTitle}>{tournamentUpdate.tournamentName}</ThemedText>
              </View>
              <View style={styles.tournamentBannerStats}>
                <View style={styles.tournamentBannerStat}>
                  <ThemedText style={styles.tournamentBannerValue}>+{tournamentUpdate.pointsAdded}</ThemedText>
                  <ThemedText style={styles.tournamentBannerLabel}>Points</ThemedText>
                </View>
                <View style={[styles.tournamentBannerStat, { borderLeftWidth: 1, borderLeftColor: colors.neutral[200] }]}>
                  <ThemedText style={styles.tournamentBannerValue}>#{tournamentUpdate.newRank}</ThemedText>
                  <ThemedText style={styles.tournamentBannerLabel}>Rank</ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Coupon Applicability Info */}
          {result.prize?.couponDetails && (
            <View style={styles.couponDetailsContainer}>
              <View style={styles.applicabilityHeader}>
                <Ionicons
                  name={result.prize.couponDetails.isProductSpecific ? "pricetag" : "storefront"}
                  size={20}
                  color={colors.brand.purpleLight}
                />
                <ThemedText style={styles.applicabilityTitle}>
                  {result.prize.couponDetails.isProductSpecific ? 'Product-Specific' : 'Store-Wide'}
                </ThemedText>
              </View>

              <View style={styles.applicabilityContent}>
                <ThemedText style={styles.applicabilityText}>
                  {result.prize.couponDetails.applicableOn}
                </ThemedText>

                <View style={styles.storeTag}>
                  <Ionicons name="storefront" size={14} color={colors.neutral[500]} />
                  <ThemedText style={styles.storeTagText}>
                    {result.prize.couponDetails.storeName}
                  </ThemedText>
                </View>

                {result.prize.couponDetails.isProductSpecific && result.prize.couponDetails.productName && (
                  <View style={styles.productTag}>
                    <Ionicons name="cube" size={14} color={colors.neutral[500]} />
                    <ThemedText style={styles.productTagText}>
                      {result.prize.couponDetails.productName}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Other Reward Types Info */}
          {result.prize?.type !== 'coins' && result.prize?.type !== 'nothing' && (
            <View style={styles.rewardInfo}>
              <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
              <ThemedText style={styles.rewardText}>
                {result.prize?.type === 'cashback' && 'Cashback added to your wallet!'}
                {result.prize?.type === 'discount' && 'Discount coupon added to your coupons!'}
                {result.prize?.type === 'voucher' && 'Voucher added to your account!'}
              </ThemedText>
            </View>
          )}

          {/* Awesome Button */}
          <Pressable
            style={styles.awesomeButton}
            onPress={onClose}
           
          >
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purple]}
              style={styles.awesomeButtonGradient}
            >
              <ThemedText style={styles.awesomeButtonText}>Awesome!</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    width: Math.min(width - 40, 400),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 20,
    textAlign: 'center',
  },
  prizeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  prizeLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  prizeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  coinsInfo: {
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  coinsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  coinsEarned: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.lightMustard,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 12,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  couponDetailsContainer: {
    width: '100%',
    backgroundColor: colors.tint.purpleLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  applicabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  applicabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  applicabilityContent: {
    gap: 10,
  },
  applicabilityText: {
    fontSize: 13,
    color: colors.neutral[700],
    lineHeight: 18,
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  storeTagText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  productTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  productTagText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  rewardText: {
    fontSize: 13,
    color: colors.nileBlue,
    fontWeight: '500',
    flex: 1,
  },
  tournamentBanner: {
    width: '100%',
    backgroundColor: colors.tint.amber,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warningScale[200],
  },
  tournamentBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tournamentBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.amberDark,
    flex: 1,
  },
  tournamentBannerStats: {
    flexDirection: 'row',
  },
  tournamentBannerStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tournamentBannerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  tournamentBannerLabel: {
    fontSize: 10,
    color: colors.brand.amberDark,
    fontWeight: '500',
    marginTop: 2,
  },
  awesomeButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  awesomeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  awesomeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default React.memo(CelebrationModal);
