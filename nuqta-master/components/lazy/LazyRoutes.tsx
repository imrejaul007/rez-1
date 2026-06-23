// @ts-nocheck
/**
 * Lazy-Loaded Route Components
 *
 * Heavy route screens that should be code-split
 * Dramatically reduces initial bundle size
 */

import { lazyLoad } from '@/utils/lazyLoad';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

// ============================================================================
// Loading Fallback
// ============================================================================

const RouteLoader = () => (
  <View style={styles.routeLoader}>
    <ActivityIndicator size="large" color={colors.brand.purpleLight} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// ============================================================================
// Admin Routes (High Impact - Low Usage)
// ============================================================================

export const LazyAdminFAQs = lazyLoad(
  () => import('@/app/admin/faqs'),
  { componentName: 'AdminFAQs', fallback: <RouteLoader /> }
);

export const LazyAdminSocialMediaPosts = lazyLoad(
  () => import('@/app/admin/social-media-posts'),
  { componentName: 'AdminSocialMediaPosts', fallback: <RouteLoader /> }
);

// ============================================================================
// Games Routes (High Impact)
// ============================================================================

export const LazyGamesIndex = lazyLoad(
  () => import('@/app/games/index'),
  { componentName: 'GamesIndex', fallback: <RouteLoader /> }
);

export const LazyGameQuiz = lazyLoad(
  () => import('@/app/games/quiz'),
  { componentName: 'GameQuiz', fallback: <RouteLoader /> }
);

export const LazyGameTrivia = lazyLoad(
  () => import('@/app/games/trivia'),
  { componentName: 'GameTrivia', fallback: <RouteLoader /> }
);

export const LazyGameMemory = lazyLoad(
  () => import('@/app/games/memory'),
  { componentName: 'GameMemory', fallback: <RouteLoader /> }
);

export const LazyGameSlots = lazyLoad(
  () => import('@/app/games/slots'),
  { componentName: 'GameSlots', fallback: <RouteLoader /> }
);

export const LazyGameSpinWheel = lazyLoad(
  () => import('@/app/games/spin-wheel'),
  { componentName: 'GameSpinWheel', fallback: <RouteLoader /> }
);

// ============================================================================
// Gamification Routes
// ============================================================================

export const LazyGamificationIndex = lazyLoad(
  () => import('@/app/gamification/index'),
  { componentName: 'GamificationIndex', fallback: <RouteLoader /> }
);

// ============================================================================
// Subscription Routes (High Impact)
// ============================================================================

export const LazySubscriptionPlans = lazyLoad(
  () => import('@/app/subscription/plans'),
  { componentName: 'SubscriptionPlans', fallback: <RouteLoader /> }
);

export const LazySubscriptionManage = lazyLoad(
  () => import('@/app/subscription/manage'),
  { componentName: 'SubscriptionManage', fallback: <RouteLoader /> }
);

export const LazySubscriptionBilling = lazyLoad(
  () => import('@/app/subscription/billing'),
  { componentName: 'SubscriptionBilling', fallback: <RouteLoader /> }
);

export const LazySubscriptionPaymentConfirmation = lazyLoad(
  () => import('@/app/subscription/payment-confirmation'),
  { componentName: 'SubscriptionPaymentConfirmation', fallback: <RouteLoader /> }
);

export const LazySubscriptionUpgradeConfirmation = lazyLoad(
  () => import('@/app/subscription/upgrade-confirmation'),
  { componentName: 'SubscriptionUpgradeConfirmation', fallback: <RouteLoader /> }
);

export const LazySubscriptionDowngradeConfirmation = lazyLoad(
  () => import('@/app/subscription/downgrade-confirmation'),
  { componentName: 'SubscriptionDowngradeConfirmation', fallback: <RouteLoader /> }
);

export const LazySubscriptionCancelFeedback = lazyLoad(
  () => import('@/app/subscription/cancel-feedback'),
  { componentName: 'SubscriptionCancelFeedback', fallback: <RouteLoader /> }
);

export const LazySubscriptionTrial = lazyLoad(
  () => import('@/app/subscription/trial'),
  { componentName: 'SubscriptionTrial', fallback: <RouteLoader /> }
);

export const LazySubscriptionBenefits = lazyLoad(
  () => import('@/app/subscription/benefits'),
  { componentName: 'SubscriptionBenefits', fallback: <RouteLoader /> }
);

export const LazySubscriptionPaymentSuccess = lazyLoad(
  () => import('@/app/subscription/payment-success'),
  { componentName: 'SubscriptionPaymentSuccess', fallback: <RouteLoader /> }
);

// ============================================================================
// Social Features (Medium Impact)
// ============================================================================

export const LazyFeedIndex = lazyLoad(
  () => import('@/app/feed/index'),
  { componentName: 'FeedIndex', fallback: <RouteLoader /> }
);

export const LazyMessagesIndex = lazyLoad(
  () => import('@/app/messages/index'),
  { componentName: 'MessagesIndex', fallback: <RouteLoader /> }
);

// ============================================================================
// UGC Upload (High Impact)
// ============================================================================

export const LazyUGCUpload = lazyLoad(
  () => import('@/app/ugc-upload'),
  { componentName: 'UGCUpload', fallback: <RouteLoader /> }
);

export const LazyUGCUploadPage = lazyLoad(
  () => import('@/app/ugc/upload'),
  { componentName: 'UGCUploadPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Bill Upload (High Impact)
// ============================================================================

export const LazyBillUpload = lazyLoad(
  () => import('@/app/bill-upload'),
  { componentName: 'BillUpload', fallback: <RouteLoader /> }
);

export const LazyBillUploadEnhanced = lazyLoad(
  () => import('@/app/bill-upload-enhanced'),
  { componentName: 'BillUploadEnhanced', fallback: <RouteLoader /> }
);

export const LazyBillHistory = lazyLoad(
  () => import('@/app/bill-history'),
  { componentName: 'BillHistory', fallback: <RouteLoader /> }
);

// ============================================================================
// Referral (Medium Impact)
// ============================================================================

export const LazyReferralPage = lazyLoad(
  () => import('@/app/referral'),
  { componentName: 'ReferralPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Projects & Earnings (Medium Impact)
// ============================================================================

export const LazyProjectsPage = lazyLoad(
  () => import('@/app/projects'),
  { componentName: 'ProjectsPage', fallback: <RouteLoader /> }
);

export const LazyProjectDetailPage = lazyLoad(
  () => import('@/app/project-detail'),
  { componentName: 'ProjectDetailPage', fallback: <RouteLoader /> }
);

export const LazySubmissionDetailPage = lazyLoad(
  () => import('@/app/submission-detail'),
  { componentName: 'SubmissionDetailPage', fallback: <RouteLoader /> }
);

export const LazyMyEarningsPage = lazyLoad(
  () => import('@/app/my-earnings'),
  { componentName: 'MyEarningsPage', fallback: <RouteLoader /> }
);

export const LazyEarningsHistoryPage = lazyLoad(
  () => import('@/app/earnings-history'),
  { componentName: 'EarningsHistoryPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Group Buying (Medium Impact)
// ============================================================================

export const LazyGroupBuyPage = lazyLoad(
  () => import('@/app/group-buy'),
  { componentName: 'GroupBuyPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Loyalty (Medium Impact)
// ============================================================================

export const LazyLoyaltyPage = lazyLoad(
  () => import('@/app/loyalty'),
  { componentName: 'LoyaltyPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Payment (High Impact)
// ============================================================================

export const LazyPaymentPage = lazyLoad(
  () => import('@/app/payment'),
  { componentName: 'PaymentPage', fallback: <RouteLoader /> }
);

export const LazyPaymentRazorpay = lazyLoad(
  () => import('@/app/payment-razorpay'),
  { componentName: 'PaymentRazorpay', fallback: <RouteLoader /> }
);

export const LazyPaymentSuccess = lazyLoad(
  () => import('@/app/payment-success'),
  { componentName: 'PaymentSuccess', fallback: <RouteLoader /> }
);

export const LazyPaymentMethods = lazyLoad(
  () => import('@/app/payment-methods'),
  { componentName: 'PaymentMethods', fallback: <RouteLoader /> }
);

// ============================================================================
// Articles (Medium Impact)
// ============================================================================

export const LazyArticlesPage = lazyLoad(
  () => import('@/app/articles'),
  { componentName: 'ArticlesPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Products Videos (High Impact)
// ============================================================================

export const LazyProductsVideosPage = lazyLoad(
  () => import('@/app/products-videos'),
  { componentName: 'ProductsVideosPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Order Related (Medium Impact)
// ============================================================================

export const LazyOrderConfirmation = lazyLoad(
  () => import('@/app/order-confirmation'),
  { componentName: 'OrderConfirmation', fallback: <RouteLoader /> }
);

export const LazyOrderHistory = lazyLoad(
  () => import('@/app/order-history'),
  { componentName: 'OrderHistory', fallback: <RouteLoader /> }
);

// ============================================================================
// Ring Sizer (Medium Impact)
// ============================================================================

export const LazyRingSizerPage = lazyLoad(
  () => import('@/app/ring-sizer'),
  { componentName: 'RingSizerPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Scratch Card (Medium Impact)
// ============================================================================

export const LazyScratchCardPage = lazyLoad(
  () => import('@/app/scratch-card'),
  { componentName: 'ScratchCardPage', fallback: <RouteLoader /> }
);

// ============================================================================
// My Products (Low Impact)
// ============================================================================

export const LazyMyProductsPage = lazyLoad(
  () => import('@/app/my-products'),
  { componentName: 'MyProductsPage', fallback: <RouteLoader /> }
);

// ============================================================================
// My Services (Low Impact)
// ============================================================================

export const LazyMyServicesPage = lazyLoad(
  () => import('@/app/my-services'),
  { componentName: 'MyServicesPage', fallback: <RouteLoader /> }
);

// ============================================================================
// My Vouchers (Medium Impact)
// ============================================================================

export const LazyMyVouchersPage = lazyLoad(
  () => import('@/app/my-vouchers'),
  { componentName: 'MyVouchersPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Online Voucher (Medium Impact)
// ============================================================================

export const LazyOnlineVoucherPage = lazyLoad(
  () => import('@/app/online-voucher'),
  { componentName: 'OnlineVoucherPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Social Media Earning (Medium Impact)
// ============================================================================

export const LazySocialMediaPage = lazyLoad(
  () => import('@/app/social-media'),
  { componentName: 'SocialMediaPage', fallback: <RouteLoader /> }
);

export const LazyEarnFromSocialMedia = lazyLoad(
  () => import('@/app/earn-from-social-media'),
  { componentName: 'EarnFromSocialMedia', fallback: <RouteLoader /> }
);

// ============================================================================
// Going Out (Medium Impact)
// ============================================================================

export const LazyGoingOutPage = lazyLoad(
  () => import('@/app/going-out'),
  { componentName: 'GoingOutPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Home Delivery (Medium Impact)
// ============================================================================

export const LazyHomeDeliveryPage = lazyLoad(
  () => import('@/app/home-delivery'),
  { componentName: 'HomeDeliveryPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Search (Medium Impact)
// ============================================================================

export const LazySearchPage = lazyLoad(
  () => import('@/app/search'),
  { componentName: 'SearchPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Coin Page (Low Impact)
// ============================================================================

export const LazyCoinPage = lazyLoad(
  () => import('@/app/coins'),
  { componentName: 'coins', fallback: <RouteLoader /> }
);

// ============================================================================
// FAQ (Low Impact)
// ============================================================================

export const LazyFAQPage = lazyLoad(
  () => import('@/app/faq'),
  { componentName: 'FAQPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Bookings & Outlets (Low Impact)
// ============================================================================

export const LazyBookingsPage = lazyLoad(
  () => import('@/app/BookingsPage'),
  { componentName: 'BookingsPage', fallback: <RouteLoader /> }
);

export const LazyOutletsPage = lazyLoad(
  () => import('@/app/OutletsPage'),
  { componentName: 'OutletsPage', fallback: <RouteLoader /> }
);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  routeLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.midGray,
  },
});
