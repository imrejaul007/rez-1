import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  StatusBar,
  Platform} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface CashbackModalProps {
  visible: boolean;
  onClose: () => void;
  cashbackAmount?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Separate component for floating coin (needs useAnimatedStyle)
const FloatingCoin: React.FC<{ animValue: { value: number }; style: object; currencySymbol: string }> = React.memo(({ animValue, style, currencySymbol }) => {
  const coinStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(animValue.value, [0, 1], [0, -25]) },
      { rotate: `${interpolate(animValue.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.coin, style, coinStyle]}>
      <LinearGradient colors={['#FFD93D', '#FCA311']} style={styles.coinGradient}>
        <Text style={styles.coinText}>{currencySymbol}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

function CashbackModal({
  visible,
  onClose,
  cashbackAmount = 219.9,
}: CashbackModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(screenHeight);
  const coin1Anim = useSharedValue(0);
  const coin2Anim = useSharedValue(0);
  const coin3Anim = useSharedValue(0);
  const coin4Anim = useSharedValue(0);

  const coinAnimRef = useRef<any | null>(null);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0);
      startCoinAnimations();
    } else {
      // Stop coin animations when modal closes
      if (coinAnimRef.current) {
        coinAnimRef.current = null;
      }
      fadeAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(screenHeight, { duration: 250 });
    }
    return () => {
      if (coinAnimRef.current) {
        coinAnimRef.current = null;
      }
    };
  }, [visible]);

  const startCoinAnimations = () => {
    const createFloatingAnimation = (animValue: { value: number }, delay: number) => {
      animValue.value = withRepeat(withSequence(withDelay(delay, withTiming(0, { duration: 0 })), withTiming(1, { duration: 2200 })), -1);
    };

    createFloatingAnimation(coin1Anim, 0);
    createFloatingAnimation(coin2Anim, 400);
    createFloatingAnimation(coin3Anim, 800);
    createFloatingAnimation(coin4Anim, 1200);

    coinAnimRef.current = true;
  };

  const renderFloatingCoin = (animValue: { value: number }, style: object) => {
    return (
      <FloatingCoin animValue={animValue} style={style} currencySymbol={currencySymbol} />
    );
  };

  const renderGiftBox = () => (
    <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
      <View style={styles.giftBoxContainer}>
        <LinearGradient colors={[colors.brand.pink, colors.brand.purpleLight]} style={styles.giftBoxBase} />
        <LinearGradient colors={[colors.brand.orange, colors.brand.pink]} style={styles.giftBoxTop} />
        <LinearGradient colors={['#FFD93D', '#FCA311']} style={styles.ribbonVertical} />
        <LinearGradient colors={['#FFD93D', '#FCA311']} style={styles.ribbonHorizontal} />
        <View style={styles.bow}>
          <LinearGradient colors={['#FFD93D', '#FCA311']} style={styles.bowLeft} />
          <LinearGradient colors={['#FFD93D', '#FCA311']} style={styles.bowRight} />
          <LinearGradient colors={['#FFD93D', '#FCA311']} style={styles.bowCenter} />
        </View>
        <View style={styles.giftBoxShadow} />
      </View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Cashback earned dialog"
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />

      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
      >
        <Pressable
          style={styles.overlayTouchable}
         
          onPress={onClose}
          accessibilityLabel="Close cashback modal"
          accessibilityRole="button"
          accessibilityHint="Double tap to close this dialog"
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close cashback modal"
            accessibilityRole="button"
            accessibilityHint="Double tap to close this dialog"
          >
            <Ionicons name="close" size={22} color={colors.neutral[500]} />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <LinearGradient colors={[colors.brand.purpleLight, colors.brand.pink]} style={styles.titleGradient}>
                <Text style={styles.titleText}>10%</Text>
              </LinearGradient>
              <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purpleDeep]} style={styles.cashGradient}>
                <Text style={styles.cashText}>CASH</Text>
              </LinearGradient>
              <LinearGradient colors={[colors.brand.pink, colors.brand.purpleLight]} style={styles.backGradient}>
                <Text style={styles.backText}>Back</Text>
              </LinearGradient>
            </View>

            <Text style={styles.subtitle}>You have earned</Text>

            <View style={styles.celebrationContainer}>
              {renderFloatingCoin(coin1Anim, styles.coin1Position)}
              {renderFloatingCoin(coin2Anim, styles.coin2Position)}
              {renderFloatingCoin(coin3Anim, styles.coin3Position)}
              {renderFloatingCoin(coin4Anim, styles.coin4Position)}
              {renderGiftBox()}
            </View>

            <Text style={styles.amount}>{currencySymbol}{cashbackAmount.toFixed(2)}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 9,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    paddingTop: 22,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGradient: {
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 8,
    marginBottom: -5,
    zIndex: 3,
  },
  titleText: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.background.primary,
    textAlign: 'center',
  },
  cashGradient: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: -5,
    zIndex: 2,
  },
  cashText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    textAlign: 'center',
  },
  backGradient: {
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 6,
    zIndex: 1,
  },
  backText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    marginBottom: 28,
    fontWeight: '500',
  },
  celebrationContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    width: 200,
    marginBottom: 20,
  },
  giftBoxContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftBoxBase: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  giftBoxTop: {
    position: 'absolute',
    top: -8,
    width: 88,
    height: 20,
    borderRadius: 8,
  },
  ribbonVertical: {
    position: 'absolute',
    top: -8,
    width: 8,
    height: 68,
    left: 36,
  },
  ribbonHorizontal: {
    position: 'absolute',
    top: 22,
    width: 88,
    height: 8,
  },
  bow: {
    position: 'absolute',
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowLeft: {
    position: 'absolute',
    width: 16,
    height: 12,
    borderRadius: 8,
    left: -8,
  },
  bowRight: {
    position: 'absolute',
    width: 16,
    height: 12,
    borderRadius: 8,
    right: -8,
  },
  bowCenter: {
    width: 6,
    height: 8,
    borderRadius: 3,
  },
  giftBoxShadow: {
    position: 'absolute',
    bottom: -20,
    width: 100,
    height: 15,
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 50,
    opacity: 0.25,
    transform: [{ scaleY: 0.3 }],
  },
  coin: {
    position: 'absolute',
    width: 34,
    height: 34,
  },
  coinGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD93D',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  coinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  coin1Position: { top: 40, left: 20 },
  coin2Position: { top: 30, right: 20 },
  coin3Position: { bottom: 60, left: 30 },
  coin4Position: { bottom: 50, right: 30 },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.successScale[400],
    textAlign: 'center',
  },
});

export default React.memo(CashbackModal);
