// Account Data
// Category definitions, section groupings, and utility functions for account settings

import { BRAND } from '@/constants/brand';
import {
  AccountTab,
  AccountSettingsCategory,
  AccountSection,
  AccountTabType,
} from '@/types/account.types';

// Account Tabs
export const accountTabs: AccountTab[] = [
  { id: 'CUSTOMER_SUPPORT', title: 'Support', isActive: false },
  { id: 'SETTINGS', title: 'Settings', isActive: true },
  { id: 'NOTIFICATIONS', title: 'Notifications', isActive: false },
];

// Tab ordering for animated segmented control
export const TAB_ORDER: AccountTabType[] = [
  'CUSTOMER_SUPPORT',
  'SETTINGS',
  'NOTIFICATIONS',
];

// ============================================================================
// SETTINGS TAB - Sectioned
// ============================================================================

const settingsItems: Record<string, AccountSettingsCategory> = {
  subscription: {
    id: 'subscription',
    title: 'Premium Membership',
    icon: 'diamond-outline',
    route: '/subscription/manage',
    description: 'Manage your subscription and benefits',
    badge: 'PREMIUM',
    isEnabled: true,
    showArrow: true,
  },
  achievements: {
    id: 'achievements',
    title: 'Achievements',
    icon: 'trophy-outline',
    route: '/profile/achievements',
    description: 'View your achievements and badges',
    isEnabled: true,
    showArrow: true,
  },
  voucher: {
    id: 'voucher',
    title: 'Vouchers',
    icon: 'ticket-outline',
    route: '/account/voucher',
    description: 'View and manage your vouchers',
    badge: '3',
    isEnabled: true,
    showArrow: true,
  },
  my_deals: {
    id: 'my_deals',
    title: 'My Deals',
    icon: 'gift-outline',
    route: '/my-deals',
    description: 'View your redeemed campaign deals',
    isEnabled: true,
    showArrow: true,
  },
  coupon: {
    id: 'coupon',
    title: 'Coupon Codes',
    icon: 'pricetag-outline',
    route: '/account/coupon',
    description: 'View available coupon codes',
    badge: 'NEW',
    isEnabled: true,
    showArrow: true,
  },
  cashback: {
    id: 'cashback',
    title: 'Cashback',
    icon: 'cash-outline',
    route: '/account/cashback',
    description: 'View cashback earnings and history',
    isEnabled: true,
    showArrow: true,
  },
  bill_upload: {
    id: 'bill_upload',
    title: 'Bill Upload',
    icon: 'document-text-outline',
    route: '/bill-upload',
    description: 'Upload offline bills to earn cashback',
    badge: 'NEW',
    isEnabled: true,
    showArrow: true,
  },
  wallet: {
    id: 'wallet',
    title: `${BRAND.APP_NAME} Wallet`,
    icon: 'wallet-outline',
    route: '/wallet',
    description: `Manage your ${BRAND.APP_NAME} Wallet`,
    isEnabled: true,
    showArrow: true,
  },
  payment: {
    id: 'payment',
    title: 'Payment Methods',
    icon: 'card-outline',
    route: '/account/payment',
    description: 'Manage payment methods and settings',
    isEnabled: true,
    showArrow: true,
  },
  delivery: {
    id: 'delivery',
    title: 'Delivery',
    icon: 'car-outline',
    route: '/account/delivery',
    description: 'Manage delivery addresses and preferences',
    isEnabled: true,
    showArrow: true,
  },
  courier: {
    id: 'courier',
    title: 'Courier',
    icon: 'bicycle-outline',
    route: '/account/courier-preferences',
    description: 'Courier and delivery preferences',
    isEnabled: true,
    showArrow: true,
  },
  product_service: {
    id: 'product_service',
    title: 'Product / Service',
    icon: 'cube-outline',
    route: '/account/products',
    description: 'Manage your products and services',
    isEnabled: true,
    showArrow: true,
  },
  account_related: {
    id: 'account_related',
    title: 'Account & Profile',
    icon: 'person-outline',
    route: '/account/profile',
    description: 'Manage your account information',
    isEnabled: true,
    showArrow: true,
  },
};

export const settingsSections: AccountSection[] = [
  {
    id: 'membership',
    title: 'Membership & Benefits',
    items: [settingsItems.subscription, settingsItems.achievements],
  },
  {
    id: 'orders',
    title: 'Orders & Deals',
    items: [
      settingsItems.voucher,
      settingsItems.my_deals,
      settingsItems.coupon,
      settingsItems.cashback,
      settingsItems.bill_upload,
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Wallet',
    items: [settingsItems.wallet, settingsItems.payment],
  },
  {
    id: 'delivery_services',
    title: 'Delivery & Services',
    items: [
      settingsItems.delivery,
      settingsItems.courier,
      settingsItems.product_service,
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [settingsItems.account_related],
  },
];

// ============================================================================
// CUSTOMER SUPPORT TAB - Sectioned
// ============================================================================

export const supportSections: AccountSection[] = [
  {
    id: 'help',
    title: 'Help & Support',
    items: [
      {
        id: 'faq',
        title: 'Frequently Asked Questions',
        icon: 'help-circle-outline',
        route: '/support/faq',
        description: 'Find answers to common questions',
        isEnabled: true,
        showArrow: true,
      },
      {
        id: 'live-chat',
        title: 'Live Chat',
        icon: 'chatbubbles-outline',
        route: '/support/chat',
        description: 'Chat with our support team',
        badge: 'ONLINE',
        isEnabled: true,
        showArrow: true,
      },
      {
        id: 'contact-support',
        title: 'Contact Support',
        icon: 'chatbubble-ellipses-outline',
        route: '/support',
        description: 'Email, phone or send feedback',
        isEnabled: true,
        showArrow: true,
      },
      {
        id: 'call-support',
        title: 'Call Support',
        icon: 'call-outline',
        route: '/support/call',
        description: 'Speak with a support agent',
        isEnabled: true,
        showArrow: true,
      },
    ],
  },
  {
    id: 'feedback_safety',
    title: 'Feedback & Safety',
    items: [
      {
        id: 'report-fraud',
        title: 'Report Fraud',
        icon: 'warning-outline',
        route: '/support/report-fraud',
        description: 'Report suspicious activity',
        isEnabled: true,
        showArrow: true,
      },
      {
        id: 'feedback',
        title: 'Feedback',
        icon: 'chatbox-outline',
        route: '/support/feedback',
        description: 'Share your experience with us',
        isEnabled: true,
        showArrow: true,
      },
    ],
  },
];

// ============================================================================
// NOTIFICATIONS TAB - Sectioned
// ============================================================================

export const notificationSections: AccountSection[] = [
  {
    id: 'channels',
    title: 'Notification Channels',
    items: [
      {
        id: 'push_notifications',
        title: 'Push Notifications',
        icon: 'notifications-outline',
        route: '/account/push-notifications',
        description: 'Manage push notification preferences',
        isEnabled: true,
        showArrow: true,
      },
      {
        id: 'email_notifications',
        title: 'Email Notifications',
        icon: 'mail-outline',
        route: '/account/email-notifications',
        description: 'Manage email notification settings',
        isEnabled: true,
        showArrow: true,
      },
      {
        id: 'sms_notifications',
        title: 'SMS Notifications',
        icon: 'phone-portrait-outline',
        route: '/account/sms-notifications',
        description: 'Manage SMS notification preferences',
        isEnabled: true,
        showArrow: true,
      },
    ],
  },
  {
    id: 'history',
    title: 'History',
    items: [
      {
        id: 'notification_history',
        title: 'Notification History',
        icon: 'time-outline',
        route: '/account/notification-history',
        description: 'View all past notifications',
        isEnabled: true,
        showArrow: true,
      },
    ],
  },
];

// ============================================================================
// BACKWARD-COMPATIBLE FLAT EXPORTS
// ============================================================================

export const accountSettingsCategories: AccountSettingsCategory[] = Object.values(settingsItems);

export const customerSupportCategories: AccountSettingsCategory[] =
  supportSections.flatMap((s) => s.items);

export const notificationCategories: AccountSettingsCategory[] =
  notificationSections.flatMap((s) => s.items);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get flat categories for a tab (backward compatible) */
export const getSettingsCategoryForTab = (
  tab: AccountTabType
): AccountSettingsCategory[] => {
  switch (tab) {
    case 'CUSTOMER_SUPPORT':
      return customerSupportCategories;
    case 'NOTIFICATIONS':
      return notificationCategories;
    case 'SETTINGS':
    default:
      return accountSettingsCategories;
  }
};

/** Get sectioned categories for a tab */
export const getSectionsForTab = (tab: AccountTabType): AccountSection[] => {
  switch (tab) {
    case 'CUSTOMER_SUPPORT':
      return supportSections;
    case 'NOTIFICATIONS':
      return notificationSections;
    case 'SETTINGS':
    default:
      return settingsSections;
  }
};

export const getCategoryIcon = (categoryId: string): string => {
  const category = accountSettingsCategories.find(
    (cat) => cat.id === categoryId
  );
  return category?.icon || 'settings-outline';
};
