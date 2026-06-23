import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Dimensions,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import EarnSocialData from '@/data/earnSocialData';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface OrderInfo {
  orderId: string;
  orderNumber: string;
  productName: string;
  productImage?: string;
  storeName: string;
  totalAmount: number;
  cashbackAmount: number;
}

interface CashbackInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: () => void;
  orderInfo: OrderInfo | null;
}

function CashbackInfoModal({
  visible,
  onClose,
  onUpload,
  orderInfo,
}: CashbackInfoModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (!orderInfo) return null;

  const cashbackPercent = 5;
  const estimatedCashback = (orderInfo.totalAmount * cashbackPercent) / 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.neutral[500]} />
          </Pressable>

          {/* Order Info Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIconContainer}>
              <Ionicons name="receipt-outline" size={24} color={colors.brand.purpleLight} />
            </View>
            <View style={styles.orderDetails}>
              <ThemedText style={styles.orderTitle}>
                Order #{orderInfo.orderNumber}
              </ThemedText>
              <ThemedText style={styles.orderSubtitle}>
                {orderInfo.productName}
              </ThemedText>
              <ThemedText style={styles.orderStore}>
                from {orderInfo.storeName}
              </ThemedText>
            </View>
          </View>

          {/* Cashback Information Cards */}
          <View style={styles.cardsContainer}>
            {/* Main Cashback Card */}
            <View style={styles.cashbackCard}>
              <View style={styles.cashbackBadge}>
                <ThemedText style={styles.cashbackText}>CASH BACK</ThemedText>
                <ThemedText style={styles.cashbackPercentage}>{cashbackPercent}%</ThemedText>
              </View>
              <View style={styles.coinIcons}>
                <Text style={styles.coin}>💰</Text>
                <Text style={styles.coin}>🪙</Text>
              </View>
              <ThemedText style={styles.cardDescription}>
                Buy anything and share it on social media. We'll give you {cashbackPercent}% cash back in the form of coins.
              </ThemedText>
            </View>

            {/* Share to Get Coins Card */}
            <View style={styles.shareCard}>
              <View style={styles.shareIllustration}>
                <Text style={styles.phoneIcon}>📱</Text>
                <View style={styles.socialIcons}>
                  <Text style={styles.heartIcon}>💜</Text>
                  <Text style={styles.heartIcon}>💜</Text>
                  <Text style={styles.heartIcon}>💜</Text>
                </View>
              </View>
              <ThemedText style={styles.shareTitle}>Share to get coins</ThemedText>
              <ThemedText style={styles.shareDescription}>
                We'll credit your account within 48 hours. Use your coins to buy more things.
              </ThemedText>
            </View>
          </View>

          {/* Estimated Earnings */}
          <View style={styles.earningsCard}>
            <ThemedText style={styles.earningsLabel}>Estimated Cashback</ThemedText>
            <ThemedText style={styles.earningsAmount}>
              {currencySymbol}{estimatedCashback.toFixed(2)}
            </ThemedText>
            <ThemedText style={styles.earningsNote}>
              Based on order total of {currencySymbol}{orderInfo.totalAmount.toFixed(2)}
            </ThemedText>
          </View>

          {/* Upload Button */}
          <Pressable
            style={styles.uploadButton}
            onPress={onUpload}
           
            accessibilityLabel="Upload social media post"
            accessibilityRole="button"
            accessibilityHint="Opens platform selection to submit your post"
          >
            <LinearGradient
              colors={EarnSocialData.ui.gradients.primary as any}
              style={styles.uploadButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <ThemedText style={styles.uploadButtonText}>Upload</ThemedText>
            </LinearGradient>
          </Pressable>

          {/* Get Cashback Text */}
          <ThemedText style={styles.getCashbackText}>Get Cashback</ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.offWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingRight: 40,
  },
  orderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  orderSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: 2,
  },
  orderStore: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  cashbackCard: {
    backgroundColor: '#E6E6FA',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    minHeight: 130,
  },
  cashbackBadge: {
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cashbackText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  cashbackPercentage: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  coinIcons: {
    position: 'absolute',
    right: 20,
    top: 20,
    flexDirection: 'row',
    gap: 8,
  },
  coin: {
    fontSize: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.neutral[700],
    marginTop: 16,
    lineHeight: 20,
  },
  shareCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minHeight: 130,
  },
  shareIllustration: {
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  heartIcon: {
    fontSize: 14,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 6,
    textAlign: 'center',
  },
  shareDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  earningsCard: {
    backgroundColor: colors.linen,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 4,
  },
  earningsNote: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  uploadButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 16,
  },
  uploadButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  getCashbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
});

export default React.memo(CashbackInfoModal);
