// @ts-nocheck
/**
 * Lazy-Loaded Modal Components
 *
 * Heavy modals that should only load when needed
 * Reduces initial bundle size significantly
 */

import { lazyLoad } from '@/utils/lazyLoad';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

// ============================================================================
// Loading Fallback
// ============================================================================

const ModalLoader = () => (
  <View style={styles.modalLoader}>
    <ActivityIndicator size="large" color={colors.brand.purpleLight} />
  </View>
);

// ============================================================================
// Deal & Offer Modals
// ============================================================================

export const LazyDealDetailsModal = lazyLoad(
  () => import('@/components/DealDetailsModal'),
  { componentName: 'DealDetailsModal', fallback: <ModalLoader /> }
);

export const LazyDealComparisonModal = lazyLoad(
  () => import('@/components/DealComparisonModal'),
  { componentName: 'DealComparisonModal', fallback: <ModalLoader /> }
);

export const LazyDealFilterModal = lazyLoad(
  () => import('@/components/DealFilterModal'),
  { componentName: 'DealFilterModal', fallback: <ModalLoader /> }
);

export const LazyDealSharingModal = lazyLoad(
  () => import('@/components/DealSharingModal'),
  { componentName: 'DealSharingModal', fallback: <ModalLoader /> }
);

export const LazyWalkInDealsModal = lazyLoad(
  () => import('@/components/WalkInDealsModal'),
  { componentName: 'WalkInDealsModal', fallback: <ModalLoader /> }
);

export const LazyCashbackModal = lazyLoad(
  () => import('@/components/CashbackModal'),
  { componentName: 'CashbackModal', fallback: <ModalLoader /> }
);

export const LazyAboutModal = lazyLoad(
  () => import('@/components/AboutModal'),
  { componentName: 'AboutModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Review & Rating Modals
// ============================================================================

export const LazyReviewModal = lazyLoad(
  () => import('@/components/ReviewModal'),
  { componentName: 'ReviewModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Payment Modals
// ============================================================================

export const LazyCardVerificationModal = lazyLoad(
  () => import('@/components/payment/CardVerificationModal'),
  { componentName: 'CardVerificationModal', fallback: <ModalLoader /> }
);

export const LazyBankVerificationModal = lazyLoad(
  () => import('@/components/payment/BankVerificationModal'),
  { componentName: 'BankVerificationModal', fallback: <ModalLoader /> }
);

export const LazyUPIVerificationModal = lazyLoad(
  () => import('@/components/payment/UPIVerificationModal'),
  { componentName: 'UPIVerificationModal', fallback: <ModalLoader /> }
);

export const LazyOTPVerificationModal = lazyLoad(
  () => import('@/components/payment/OTPVerificationModal'),
  { componentName: 'OTPVerificationModal', fallback: <ModalLoader /> }
);

export const LazyKYCUploadModal = lazyLoad(
  () => import('@/components/payment/KYCUploadModal'),
  { componentName: 'KYCUploadModal', fallback: <ModalLoader /> }
);

export const LazyStripePaymentModal = lazyLoad(
  () => import('@/components/subscription/StripePaymentModal'),
  { componentName: 'StripePaymentModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Subscription Modals
// ============================================================================

export const LazyBenefitsModal = lazyLoad(
  () => import('@/components/subscription/BenefitsModal'),
  { componentName: 'BenefitsModal', fallback: <ModalLoader /> }
);

export const LazyPaymentSuccessModal = lazyLoad(
  () => import('@/components/subscription/PaymentSuccessModal'),
  { componentName: 'PaymentSuccessModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Product Modals
// ============================================================================

export const LazyAddToCartModal = lazyLoad(
  () => import('@/components/product/AddToCartModal'),
  { componentName: 'AddToCartModal', fallback: <ModalLoader /> }
);

export const LazyStockNotificationModal = lazyLoad(
  () => import('@/components/product/StockNotificationModal'),
  { componentName: 'StockNotificationModal', fallback: <ModalLoader /> }
);

export const LazyImageZoomModal = lazyLoad(
  () => import('@/components/product/ImageZoomModal'),
  { componentName: 'ImageZoomModal', fallback: <ModalLoader /> }
);

export const LazyProductShareModal = lazyLoad(
  () => import('@/components/product/ProductShareModal'),
  { componentName: 'ProductShareModal', fallback: <ModalLoader /> }
);

export const LazySizeGuideModal = lazyLoad(
  () => import('@/components/product/SizeGuideModal'),
  { componentName: 'SizeGuideModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Voucher Modals
// ============================================================================

export const LazyOnlineRedemptionModal = lazyLoad(
  () => import('@/components/voucher/OnlineRedemptionModal'),
  { componentName: 'OnlineRedemptionModal', fallback: <ModalLoader /> }
);

export const LazyVoucherPurchaseModal = lazyLoad(
  () => import('@/components/voucher/PurchaseModal'),
  { componentName: 'VoucherPurchaseModal', fallback: <ModalLoader /> }
);

export const LazyVoucherSelectionModal = lazyLoad(
  () => import('@/components/voucher/VoucherSelectionModal'),
  { componentName: 'VoucherSelectionModal', fallback: <ModalLoader /> }
);

export const LazyQRCodeModal = lazyLoad(
  () => import('@/components/vouchers/QRCodeModal'),
  { componentName: 'QRCodeModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Gamification Modals
// ============================================================================

export const LazyAchievementUnlockModal = lazyLoad(
  () => import('@/components/gamification/AchievementUnlockModal'),
  { componentName: 'AchievementUnlockModal', fallback: <ModalLoader /> }
);

export const LazyCelebrationModal = lazyLoad(
  () => import('@/components/gamification/CelebrationModal'),
  { componentName: 'CelebrationModal', fallback: <ModalLoader /> }
);

export const LazyClaimRewardModal = lazyLoad(
  () => import('@/components/challenges/ClaimRewardModal'),
  { componentName: 'ClaimRewardModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Group Buying Modals
// ============================================================================

export const LazyGroupCreationModal = lazyLoad(
  () => import('@/components/group-buying/GroupCreationModal'),
  { componentName: 'GroupCreationModal', fallback: <ModalLoader /> }
);

export const LazyGroupShareModal = lazyLoad(
  () => import('@/components/group-buying/GroupShareModal'),
  { componentName: 'GroupShareModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Event Modals
// ============================================================================

export const LazyEventBookingModal = lazyLoad(
  () => import('@/components/events/EventBookingModal'),
  { componentName: 'EventBookingModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Loyalty Modals
// ============================================================================

export const LazyRedemptionModal = lazyLoad(
  () => import('@/components/loyalty/RedemptionModal'),
  { componentName: 'RedemptionModal', fallback: <ModalLoader /> }
);

// ============================================================================
// UGC Modals
// ============================================================================

export const LazyReportModal = lazyLoad(
  () => import('@/components/ugc/ReportModal'),
  { componentName: 'ReportModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Store Modals
// ============================================================================

export const LazyContactStoreModal = lazyLoad(
  () => import('@/components/store/ContactStoreModal'),
  { componentName: 'ContactStoreModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Referral Modals
// ============================================================================

export const LazyReferralQRModal = lazyLoad(
  () => import('@/components/referral/ReferralQRModal'),
  { componentName: 'ReferralQRModal', fallback: <ModalLoader /> }
);

export const LazyReferralShareModal = lazyLoad(
  () => import('@/components/referral/ShareModal'),
  { componentName: 'ReferralShareModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Search Modals
// ============================================================================

export const LazyFilterModal = lazyLoad(
  () => import('@/components/search/FilterModal'),
  { componentName: 'FilterModal', fallback: <ModalLoader /> }
);

export const LazySortModal = lazyLoad(
  () => import('@/components/search/SortModal'),
  { componentName: 'SortModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Account Modals
// ============================================================================

export const LazyAddAddressModal = lazyLoad(
  () => import('@/components/account/AddAddressModal'),
  { componentName: 'AddAddressModal', fallback: <ModalLoader /> }
);

export const LazyEditAddressModal = lazyLoad(
  () => import('@/components/account/EditAddressModal'),
  { componentName: 'EditAddressModal', fallback: <ModalLoader /> }
);

export const LazyEditInstructionsModal = lazyLoad(
  () => import('@/components/account/EditInstructionsModal'),
  { componentName: 'EditInstructionsModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Bill Modals
// ============================================================================

export const LazyBillPreviewModal = lazyLoad(
  () => import('@/components/bills/BillPreviewModal'),
  { componentName: 'BillPreviewModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Cart Modals
// ============================================================================

export const LazyAddedToCartModal = lazyLoad(
  () => import('@/components/cart/AddedToCartModal'),
  { componentName: 'AddedToCartModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Order Modals
// ============================================================================

export const LazyReorderModal = lazyLoad(
  () => import('@/components/orders/ReorderModal'),
  { componentName: 'ReorderModal', fallback: <ModalLoader /> }
);

export const LazyOrderFilterModal = lazyLoad(
  () => import('@/components/order/OrderFilterModal'),
  { componentName: 'OrderFilterModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Wallet Modals
// ============================================================================

export const LazyTopupModal = lazyLoad(
  () => import('@/components/wallet/TopupModal'),
  { componentName: 'TopupModal', fallback: <ModalLoader /> }
);

export const LazySendMoneyModal = lazyLoad(
  () => import('@/components/wallet/SendMoneyModal'),
  { componentName: 'SendMoneyModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Profile Modals
// ============================================================================

export const LazyProfileMenuModal = lazyLoad(
  () => import('@/components/profile/ProfileMenuModal'),
  { componentName: 'ProfileMenuModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Wishlist Modals
// ============================================================================

export const LazyWishlistShareModal = lazyLoad(
  () => import('@/components/wishlist/ShareModal'),
  { componentName: 'WishlistShareModal', fallback: <ModalLoader /> }
);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  modalLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
