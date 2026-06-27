// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState,  useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet, Modal } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { ThemedText } from '@/components/ThemedText';
import wishlistApi, { DiscountSnapshot } from '@/services/wishlistApi';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  IconSize,
  Timing } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

// Modal types
type ModalType = 'success' | 'error' | 'info' | 'warning' | null;

interface ModalState {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  showViewButton?: boolean;
}

// Discount data interface matching Section3 discounts
interface DiscountData {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  type?: 'percentage' | 'fixed' | 'flat';
  value?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil?: string;
  storeId?: string;
  storeName?: string;
  productId?: string;
  productName?: string;
}

interface Section5Props {
  // For saving discounts/deals (primary use case)
  discountData?: DiscountData | null;
  // Store info for context
  storeInfo?: {
    id?: string;
    _id?: string;
    name?: string;
  } | null;
  // Legacy product data support (fallback)
  dynamicData?: {
    id?: string;
    _id?: string;
    title?: string;
    name?: string;
    price?: number;
    pricing?: {
      selling?: number;
    };
  } | null;
  cardType?: string;
}

function Section5({ discountData, storeInfo, dynamicData, cardType }: Section5Props) {
  const isMounted = useIsMounted();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { refreshWishlist, wishlistItems } = useWishlist();
  const router = useRouter();

  // Modal state
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    type: null,
    title: '',
    message: '',
    showViewButton: false });

  // Animation refs
  const buttonScaleAnim = useSharedValue(1);
  const buttonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScaleAnim.value }] }));
  const modalAnimStyle = useAnimatedStyle(() => ({ opacity: modalOpacityAnim.value, transform: [{ scale: modalScaleAnim.value }] }));
  const modalScaleAnim = useSharedValue(0.8);
  const modalOpacityAnim = useSharedValue(0);

  // Show modal with animation
  const showModal = (type: ModalType, title: string, message: string, showViewButton = false) => {
    setModal({ visible: true, type, title, message, showViewButton });
    modalScaleAnim.value = withSpring(1, { damping: 8, stiffness: 100 });
    modalOpacityAnim.value = withTiming(1, { duration: 200 });
  };

  // Hide modal with animation
  const hideModal = () => {
    modalScaleAnim.value = withTiming(0.8, { duration: 150 });
    modalOpacityAnim.value = withTiming(0, { duration: 150 });
    setTimeout(() => {
      setModal({ visible: false, type: null, title: '', message: '', showViewButton: false });
    }, 150);
  };

  // Check saved status function (used by both useEffect and useFocusEffect)
  const checkSavedStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    // First check for discount type if discountData is provided
    const discountId = discountData?._id || discountData?.id;
    if (discountId) {
      try {
        const response = await wishlistApi.checkWishlistStatus('discount', discountId);
        if (response.success && response.data?.inWishlist) {
          setIsSaved(true);
          return; // Found it, no need to check further
        }
      } catch (error) {
        // Silently fail - continue to check product type
      }
    }

    // Also check for product type if dynamicData is provided (fallback)
    const productId = dynamicData?.id || dynamicData?._id;
    if (productId) {
      try {
        const response = await wishlistApi.checkWishlistStatus('product', productId);
        if (response.success && response.data?.inWishlist) {
          setIsSaved(true);
          return;
        }
      } catch (error) {
        // Silently fail - just don't show saved state
      }
    }

    // If we get here, item is not saved
    if (!isMounted()) return;
    setIsSaved(false);
  }, [discountData, dynamicData, isAuthenticated]);

  // Check if item is already saved on mount
  useEffect(() => {
    checkSavedStatus();
  }, [checkSavedStatus]);

  // Re-check status when wishlist items change (syncs with header heart icon)
  useEffect(() => {
    checkSavedStatus();
  }, [wishlistItems, checkSavedStatus]);

  // Also re-check when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkSavedStatus();
    }, [checkSavedStatus])
  );

  // Animation helper
  const animateScale = (animValue: { value: number }, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  const handleSaveDeal = async () => {
    // Haptic feedback on button press
    triggerImpact('Medium');

    // Check authentication
    if (!isAuthenticated) {
      showModal('warning', 'Login Required', 'Please login to save deals to your wishlist');
      return;
    }

    // If already saved, show message
    if (isSaved) {
      showModal('info', 'Already Saved', 'This deal is already in your saved list', true);
      return;
    }

    try {
      setIsSaving(true);

      // Priority: Use discount data if available, otherwise fallback to product
      const discountId = discountData?._id || discountData?.id;

      if (discountId && discountData) {
        // Save as discount with snapshot
        const discountSnapshot: Partial<DiscountSnapshot> = {
          discountId: discountId,
          name: discountData.name,
          description: discountData.description,
          type: discountData.type || 'percentage',
          value: discountData.value || 0,
          minOrderValue: discountData.minOrderValue,
          maxDiscount: discountData.maxDiscount,
          validFrom: discountData.validFrom,
          validUntil: discountData.validUntil,
          storeId: discountData.storeId || storeInfo?._id || storeInfo?.id,
          storeName: discountData.storeName || storeInfo?.name,
          productId: discountData.productId,
          productName: discountData.productName };

        // Check if already saved
        const checkResponse = await wishlistApi.checkWishlistStatus('discount', discountId);
        if (checkResponse.success && checkResponse.data?.inWishlist) {
          setIsSaved(true);
          showModal('info', 'Already Saved', 'This deal is already in your saved list', true);
          return;
        }

        // Add discount to wishlist
        const response = await wishlistApi.addToWishlist({
          itemType: 'discount',
          itemId: discountId,
          notes: `${discountData.name} - ${discountData.type === 'percentage' ? `${discountData.value}% off` : `${currencySymbol}${discountData.value} off`}`,
          priority: 'medium',
          discountSnapshot
        });

        if (response.success) {
          if (!isMounted()) return;
          setIsSaved(true);
          triggerNotification('Success');
          await refreshWishlist(); // Sync with header
          showModal('success', 'Deal Saved!', `${discountData.name} has been saved to your deals`, true);
        } else {
          triggerNotification('Error');
          showModal('error', 'Error', response.message || 'Failed to save deal');
        }
      } else {
        // Fallback: Legacy product saving (for backwards compatibility)
        const productId = dynamicData?.id || dynamicData?._id;
        if (!productId) {
          showModal('error', 'Error', 'No deal or product information available');
          return;
        }

        const checkResponse = await wishlistApi.checkWishlistStatus('product', productId);
        if (checkResponse.success && checkResponse.data?.inWishlist) {
          setIsSaved(true);
          showModal('info', 'Already Saved', 'This item is already in your wishlist', true);
          return;
        }

        const response = await wishlistApi.addToWishlist({
          itemType: 'product',
          itemId: productId,
          notes: `Saved at ${currencySymbol}${dynamicData?.price || dynamicData?.pricing?.selling || 0}`,
          priority: 'medium'
        });

        if (response.success) {
          if (!isMounted()) return;
          setIsSaved(true);
          triggerNotification('Success');
          await refreshWishlist(); // Sync with header
          showModal('success', 'Saved!', `${dynamicData?.title || dynamicData?.name || 'This item'} has been saved`, true);
        } else {
          triggerNotification('Error');
          showModal('error', 'Error', response.message || 'Failed to save item');
        }
      }
    } catch (error) {
      triggerNotification('Error');
      showModal('error', 'Error', 'Unable to save deal. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsSaving(false);
    }
  };

  // Get modal icon based on type
  const getModalIcon = () => {
    switch (modal.type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: colors.lightMustard };
      case 'error':
        return { name: 'close-circle' as const, color: colors.nileBlue };
      case 'warning':
        return { name: 'warning' as const, color: colors.lightMustard };
      case 'info':
      default:
        return { name: 'information-circle' as const, color: colors.lightMustard };
    }
  };

  // Determine if we're saving a deal or product
  const hasDiscountData = !!(discountData?._id || discountData?.id);
  const itemLabel = hasDiscountData ? 'deal' : 'item';
  const ItemLabel = hasDiscountData ? 'Deal' : 'Item';

  // Determine display text based on saved state
  const getButtonText = () => {
    if (isSaving) return 'Saving...';
    if (isSaved) return `${ItemLabel} Saved`;
    return hasDiscountData ? 'Save Deal for Later' : 'Save for Later';
  };

  const getSubtitleText = () => {
    if (isSaved) return `This ${itemLabel} is in your saved list`;
    if (!isAuthenticated) return 'Login to save items';
    return `Keep this ${itemLabel} saved in your list`;
  };

  const getIconName = () => {
    if (isSaving) return 'hourglass-outline';
    if (isSaved) return 'bookmark';
    return 'bookmark-outline';
  };

  const iconInfo = getModalIcon();

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel="Save deal action"
    >
      <Animated.View style={buttonScaleStyle}>
        <Pressable
         
          style={[
            styles.button,
            isSaving && styles.buttonDisabled,
            isSaved && styles.buttonSaved
          ]}
          onPress={handleSaveDeal}
          onPressIn={() => animateScale(buttonScaleAnim, 0.96)}
          onPressOut={() => animateScale(buttonScaleAnim, 1)}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={isSaved
            ? 'Deal already saved to wishlist'
            : isSaving
              ? 'Saving deal to wishlist'
              : `Save ${discountData?.name || dynamicData?.title || dynamicData?.name || 'this deal'} for later`
          }
          accessibilityHint={isSaved
            ? 'This deal is already in your saved list'
            : 'Double tap to save this deal to your wishlist'
          }
          accessibilityState={{ disabled: isSaving, busy: isSaving, selected: isSaved }}
        >
          <View
            style={[styles.iconContainer, isSaved && styles.iconContainerSaved]}
            accessibilityElementsHidden
          >
            <Ionicons
              name={getIconName()}
              size={IconSize.lg}
              color={isSaved ? Colors.successScale[500] : Colors.primary[600]}
            />
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={[styles.title, isSaved && styles.titleSaved]}>
              {getButtonText()}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {getSubtitleText()}
            </ThemedText>
          </View>
          {isSaved && (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={IconSize.md} color={Colors.successScale[500]} />
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Custom Modal */}
      <Modal
        visible={modal.visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={hideModal}
      >
        <Pressable style={styles.modalOverlay} onPress={hideModal}>
          <Animated.View
            style={[styles.modalContent, modalAnimStyle]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Icon */}
              <View style={[styles.modalIconContainer, { backgroundColor: `${iconInfo.color}15` }]}>
                <Ionicons name={iconInfo.name} size={48} color={iconInfo.color} />
              </View>

              {/* Title */}
              <ThemedText style={styles.modalTitle}>{modal.title}</ThemedText>

              {/* Message */}
              <ThemedText style={styles.modalMessage}>{modal.message}</ThemedText>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                {modal.showViewButton && (
                  <Pressable
                    style={styles.modalButtonSecondary}
                    onPress={() => {
                      hideModal();
                      router.push('/wishlist');
                    }}
                  >
                    <Ionicons name="heart-outline" size={18} color={colors.lightMustard} />
                    <ThemedText style={styles.modalButtonSecondaryText}>View Saved</ThemedText>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.modalButtonPrimary, !modal.showViewButton && { flex: 1 }]}
                  onPress={hideModal}
                >
                  <ThemedText style={styles.modalButtonPrimaryText}>OK</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default withErrorBoundary(React.memo(Section5), 'StoreSectionSection5');

const styles = StyleSheet.create({
  // Modern Container
  container: {
    paddingHorizontal: Spacing['2xl'] - 4,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary },

  // Modern Button with Purple Tint
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.purpleLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.subtle },
  buttonDisabled: {
    opacity: 0.6 },
  buttonSaved: {
    backgroundColor: Colors.successScale[50],
    borderWidth: 1,
    borderColor: Colors.successScale[100] },

  // Modern Icon Container
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  iconContainerSaved: {
    backgroundColor: Colors.successScale[100] },

  textContainer: {
    flex: 1 },

  // Modern Typography
  title: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs - 1 },
  titleSaved: {
    color: Colors.successScale[700] },
  subtitle: {
    ...Typography.body,
    color: Colors.gray[600] },

  // Saved badge
  savedBadge: {
    marginLeft: Spacing.sm },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24 },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10 },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
    textAlign: 'center' },
  modalMessage: {
    fontSize: 15,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24 },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%' },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: colors.lightMustard,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center' },
  modalButtonPrimaryText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '600' },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6 },
  modalButtonSecondaryText: {
    color: colors.lightMustard,
    fontSize: 16,
    fontWeight: '600' } });
