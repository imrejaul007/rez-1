import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

/**
 * AddToCartModal Component
 *
 * Success modal shown after adding product to cart
 * Provides options to continue shopping or view cart
 */
interface AddToCartModalProps {
  visible: boolean;
  onClose: () => void;
  onViewCart: () => void;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  variantDetails?: string; // e.g., "Size: Large, Color: Red"
}

export const AddToCartModal: React.FC<AddToCartModalProps> = ({
  visible,
  onClose,
  onViewCart,
  productName,
  productImage,
  quantity,
  price,
  variantDetails,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const scaleAnim = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scaleAnim.value = withSpring(1, { stiffness: 50, damping: 7 });
    } else {
      scaleAnim.value = 0;
    }
  }, [visible]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const totalPrice = quantity * price;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}

          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            animatedModalStyle,
          ]}
        >
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[colors.successScale[400], colors.successScale[700]]}
              style={styles.successIconGradient}
            >
              <Ionicons name="checkmark-circle" size={48} color={colors.background.primary} />
            </LinearGradient>
          </View>

          {/* Title */}
          <ThemedText style={styles.title}>Added to Cart!</ThemedText>

          {/* Product Info */}
          <View style={styles.productInfo}>
            {productImage && (
              <CachedImage
                source={productImage}
                style={styles.productImage}
                contentFit="cover"
              />
            )}

            <View style={styles.productDetails}>
              <ThemedText style={styles.productName} numberOfLines={2}>
                {productName}
              </ThemedText>

              {variantDetails && (
                <ThemedText style={styles.variantDetails}>{variantDetails}</ThemedText>
              )}

              <View style={styles.priceRow}>
                <ThemedText style={styles.quantityText}>Qty: {quantity}</ThemedText>
                <ThemedText style={styles.priceText}>{currencySymbol}{totalPrice.toLocaleString()}</ThemedText>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.continueButton}
              onPress={onClose}
             
            >
              <Ionicons name="arrow-back" size={20} color={colors.brand.purpleLight} />
              <ThemedText style={styles.continueButtonText}>
                Continue Shopping
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.viewCartButton}
              onPress={onViewCart}
             
            >
              <Ionicons name="cart" size={20} color={colors.background.primary} />
              <ThemedText style={styles.viewCartButtonText}>View Cart</ThemedText>
            </Pressable>
          </View>

          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.neutral[400]} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const modalWidth = Math.min(width - 48, 400);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: modalWidth,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Success Icon
  successIconContainer: {
    marginBottom: 16,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 20,
  },

  // Product Info
  productInfo: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 6,
    lineHeight: 20,
  },
  variantDetails: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },

  // Divider
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.neutral[200],
    marginBottom: 20,
  },

  // Buttons
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.pink,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  viewCartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(AddToCartModal);
