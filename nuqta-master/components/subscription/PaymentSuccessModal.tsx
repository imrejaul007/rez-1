// Payment Success Modal Component
// Displays success animation and subscription details after successful payment

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface PaymentSuccessModalProps {
  visible: boolean;
  tier: 'premium' | 'vip';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
}

function PaymentSuccessModal({
  visible,
  tier,
  price,
  billingCycle,
  onClose,
}: PaymentSuccessModalProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const scaleAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scaleAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
      fadeAnim.value = withDelay(500, withTiming(1, { duration: 300 }));
    } else {
      scaleAnim.value = 0;
      fadeAnim.value = 0;
    }
  }, [visible]);

  const scaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const handleViewSubscription = () => {
    onClose();
    router.push('/subscription/manage');
  };

  const handleContinueShopping = () => {
    onClose();
    router.push('/');
  };

  if (!visible) return null;

  const tierName = tier === 'vip' ? 'VIP' : 'Premium';
  const tierColor = tier === 'vip' ? colors.warningScale[400] : colors.brand.purpleLight;
  const tierGradient = tier === 'vip'
    ? [colors.warningScale[400], colors.warningScale[400]]
    : [colors.brand.purpleLight, colors.brand.purpleMedium, colors.brand.pink];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Success Animation */}
          <View style={styles.animationContainer}>
            <Animated.View
              style={[
                styles.successCircle,
                scaleAnimatedStyle,
              ]}
            >
              <LinearGradient
                colors={tierGradient}
                style={styles.successGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={60} color={colors.background.primary} />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Success Message */}
          <Animated.View
            style={[
              styles.contentContainer,
              fadeAnimatedStyle,
            ]}
          >
            <ThemedText style={styles.successTitle}>Payment Successful!</ThemedText>
            <ThemedText style={styles.successSubtitle}>
              Welcome to {tierName}
            </ThemedText>

            {/* Subscription Details Card */}
            <View style={styles.detailsCard}>
              <LinearGradient
                colors={[`${tierColor}15`, `${tierColor}08`]}
                style={styles.detailsGradient}
              >
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons
                      name={tier === 'vip' ? 'diamond' : 'star'}
                      size={24}
                      color={tierColor}
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={styles.detailLabel}>
                      {tierName} Subscription
                    </ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {currencySymbol}{price}/{billingCycle === 'monthly' ? 'month' : 'year'}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.benefitsContainer}>
                  <ThemedText style={styles.benefitsTitle}>Your Benefits:</ThemedText>

                  {tier === 'premium' ? (
                    <>
                      <BenefitItem
                        icon="flash"
                        text="2x cashback on all orders"
                        color={tierColor}
                      />
                      <BenefitItem
                        icon="car"
                        text={`Free delivery on orders above ${currencySymbol}500`}
                        color={tierColor}
                      />
                      <BenefitItem
                        icon="headset"
                        text="Priority customer support"
                        color={tierColor}
                      />
                      <BenefitItem
                        icon="gift"
                        text="Exclusive deals & early access"
                        color={tierColor}
                      />
                    </>
                  ) : (
                    <>
                      <BenefitItem
                        icon="flash"
                        text="3x cashback on all orders"
                        color={tierColor}
                      />
                      <BenefitItem
                        icon="car"
                        text="Free delivery on all orders"
                        color={tierColor}
                      />
                      <BenefitItem
                        icon="person"
                        text="Personal shopper assistance"
                        color={tierColor}
                      />
                      <BenefitItem
                        icon="trophy"
                        text="Premium events access"
                        color={tierColor}
                      />
                    </>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Action Buttons */}
            <Pressable
              style={styles.primaryButton}
              onPress={handleViewSubscription}
            >
              <LinearGradient
                colors={tierGradient}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ThemedText style={styles.primaryButtonText}>
                  View My Subscription
                </ThemedText>
                <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={handleContinueShopping}
            >
              <ThemedText style={styles.secondaryButtonText}>
                Continue Shopping
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// Benefit Item Component
function BenefitItem({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={styles.benefitItem}>
      <Ionicons name={icon as any} size={16} color={color} />
      <ThemedText style={styles.benefitText}>{text}</ThemedText>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  successGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsGradient: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 16,
  },
  benefitsContainer: {
    gap: 8,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  benefitText: {
    fontSize: 13,
    color: colors.neutral[600],
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: colors.neutral[100],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.neutral[500],
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(PaymentSuccessModal);
