// Account Settings System Types and Interfaces
// TypeScript definitions for account settings, preferences, and configuration

import { BRAND } from '@/constants/brand';

export interface AccountSettings {
  id: string;
  userId: string;
  general: GeneralSettings;
  delivery: DeliverySettings;
  payment: PaymentSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  preferences: AppPreferences;
  lastUpdated: string;
}

export interface GeneralSettings {
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'auto';
}

export interface DeliverySettings {
  defaultAddress: DeliveryAddress | null;
  savedAddresses: DeliveryAddress[];
  deliveryInstructions: string;
  deliveryTime: DeliveryTimePreference;
  contactlessDelivery: boolean;
  deliveryNotifications: boolean;
}

export interface DeliveryAddress {
  id: string;
  type: 'HOME' | 'OFFICE' | 'OTHER';
  title: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
  instructions?: string;
}

export interface DeliveryTimePreference {
  preferred: 'ASAP' | 'SCHEDULED';
  timeSlots: TimeSlot[];
  workingDays: string[]; // ['MON', 'TUE', 'WED', ...]
}

export interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface PaymentSettings {
  defaultPaymentMethod: PaymentMethodData | null;
  savedCards: SavedCard[];
  savedBankAccounts: SavedBankAccount[];
  autoPayEnabled: boolean;
  paymentPinEnabled: boolean;
  biometricPaymentEnabled: boolean;
  transactionLimits: TransactionLimits;
}

export interface PaymentMethodData {
  id: string;
  type: 'CARD' | 'BANK' | 'WALLET' | 'UPI';
  name: string;
  details: string;
  isDefault: boolean;
}

export interface SavedCard {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  brand: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER';
  lastFourDigits: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  nickname?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface SavedBankAccount {
  id: string;
  bankName: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'SALARY';
  accountNumber: string; // Masked
  ifscCode: string;
  nickname?: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface TransactionLimits {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
}

export interface NotificationSettings {
  push: PushNotificationSettings;
  email: EmailNotificationSettings;
  sms: SmsNotificationSettings;
  inApp: InAppNotificationSettings;
}

export interface PushNotificationSettings {
  enabled: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  recommendations: boolean;
  priceAlerts: boolean;
  deliveryUpdates: boolean;
  paymentUpdates: boolean;
  securityAlerts: boolean;
  chatMessages: boolean;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  newsletters: boolean;
  orderReceipts: boolean;
  weeklyDigest: boolean;
  promotions: boolean;
  securityAlerts: boolean;
  accountUpdates: boolean;
}

export interface SmsNotificationSettings {
  enabled: boolean;
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  paymentConfirmations: boolean;
  securityAlerts: boolean;
  otpMessages: boolean;
}

export interface InAppNotificationSettings {
  enabled: boolean;
  showBadges: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  bannerStyle: 'BANNER' | 'ALERT' | 'NONE';
}

export interface PrivacySettings {
  profileVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  showActivity: boolean;
  showPurchaseHistory: boolean;
  allowMessaging: boolean;
  allowFriendRequests: boolean;
  dataSharing: DataSharingSettings;
  analytics: AnalyticsSettings;
}

export interface DataSharingSettings {
  shareWithPartners: boolean;
  shareForMarketing: boolean;
  shareForRecommendations: boolean;
  shareForAnalytics: boolean;
  sharePurchaseData: boolean;
}

export interface AnalyticsSettings {
  allowUsageTracking: boolean;
  allowCrashReporting: boolean;
  allowPerformanceTracking: boolean;
  allowLocationTracking: boolean;
}

export interface SecuritySettings {
  twoFactorAuth: TwoFactorAuthSettings;
  biometric: BiometricSettings;
  sessionManagement: SessionManagementSettings;
  loginAlerts: boolean;
  passwordPolicy: PasswordPolicy;
}

export interface TwoFactorAuthSettings {
  enabled: boolean;
  method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP' | null;
  backupCodes: string[];
  lastUpdated: string;
}

export interface BiometricSettings {
  fingerprintEnabled: boolean;
  faceIdEnabled: boolean;
  voiceEnabled: boolean;
  availableMethods: BiometricMethod[];
}

export type BiometricMethod = 'FINGERPRINT' | 'FACE_ID' | 'VOICE' | 'IRIS';

export interface SessionManagementSettings {
  autoLogoutTime: number; // minutes
  allowMultipleSessions: boolean;
  activeSessions: ActiveSession[];
  rememberMe: boolean;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'WEB';
  ipAddress: string;
  location?: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordHistory: number; // Number of previous passwords to remember
  expiryDays?: number;
}

export interface AppPreferences {
  startupScreen: 'HOME' | 'DISCOVER' | 'LAST_VIEWED';
  defaultView: 'LIST' | 'GRID' | 'CARD';
  autoRefresh: boolean;
  offlineMode: boolean;
  dataSaver: boolean;
  highQualityImages: boolean;
  animations: boolean;
  sounds: boolean;
  hapticFeedback: boolean;
}

// Account Page Component Types
export interface AccountTab {
  id: AccountTabType;
  title: string;
  isActive: boolean;
}

export type AccountTabType = 'CUSTOMER_SUPPORT' | 'SETTINGS' | 'NOTIFICATIONS';

export interface AccountSettingsCategory {
  id: string;
  title: string;
  icon: string;
  route: string;
  description?: string;
  badge?: string | number;
  insight?: string;
  isEnabled: boolean;
  showArrow: boolean;
}

export interface AccountSection {
  id: string;
  title: string;
  items: AccountSettingsCategory[];
}

export interface AccountPageProps {
  activeTab: AccountTabType;
  tabs: AccountTab[];
  categories: AccountSettingsCategory[];
  onTabChange: (tab: AccountTabType) => void;
  onCategoryPress: (category: AccountSettingsCategory) => void;
  onBackPress: () => void;
}

export interface SettingsItemProps {
  category: AccountSettingsCategory;
  onPress: (category: AccountSettingsCategory) => void;
  style?: any;
}

export interface AccountTabsProps {
  tabs: AccountTab[];
  activeTab: AccountTabType;
  onTabPress: (tab: AccountTabType) => void;
}

// Account Context Types
export interface AccountContextType {
  settings: AccountSettings | null;
  isLoading: boolean;
  error: string | null;
  
  // Tab state
  activeTab: AccountTabType;
  setActiveTab: (tab: AccountTabType) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<AccountSettings>) => Promise<void>;
  updateDeliverySettings: (delivery: Partial<DeliverySettings>) => Promise<void>;
  updatePaymentSettings: (payment: Partial<PaymentSettings>) => Promise<void>;
  updateNotificationSettings: (notifications: Partial<NotificationSettings>) => Promise<void>;
  updatePrivacySettings: (privacy: Partial<PrivacySettings>) => Promise<void>;
  updateSecuritySettings: (security: Partial<SecuritySettings>) => Promise<void>;
  
  // Address management
  addAddress: (address: Omit<DeliveryAddress, 'id'>) => Promise<void>;
  updateAddress: (addressId: string, address: Partial<DeliveryAddress>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  
  // Payment management
  addPaymentMethod: (paymentMethod: SavedCard | SavedBankAccount) => Promise<void>;
  updatePaymentMethod: (methodId: string, updates: any) => Promise<void>;
  deletePaymentMethod: (methodId: string) => Promise<void>;
  setDefaultPaymentMethod: (methodId: string) => Promise<void>;
}

// API Types
export interface AccountApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UpdateAccountSettingsRequest {
  general?: Partial<GeneralSettings>;
  delivery?: Partial<DeliverySettings>;
  payment?: Partial<PaymentSettings>;
  notifications?: Partial<NotificationSettings>;
  privacy?: Partial<PrivacySettings>;
  security?: Partial<SecuritySettings>;
  preferences?: Partial<AppPreferences>;
}

// Constants - Nuqta Brand Colors (sourced from DesignSystem)
export const ACCOUNT_COLORS = {
  primary: '#ffcd57',        // Colors.primary[500]
  primaryLight: '#FFE799',   // Colors.primary[200]
  primaryDark: '#1a3a52',    // Colors.secondary[600]
  secondary: '#ffcd57',      // Colors.primary[500]
  gold: '#ffcd57',           // Colors.primary[500]
  goldDark: '#E6B84E',       // Colors.primary[700]
  background: '#faf1e0',     // Colors.gray[50]
  surface: '#FFFFFF',
  text: '#1a3a52',           // Colors.secondary[600]
  textSecondary: '#627D98',  // Colors.gray[600]
  border: '#E8DCC4',         // Colors.gray[200]
  success: '#2ECC71',        // Colors.success (semantic green, NOT mustard)
  warning: '#FF9F1C',        // Colors.warning
  error: '#E74C3C',          // Colors.error
  info: '#1a3a52',           // Colors.secondary[600]
} as const;

export const DEFAULT_ACCOUNT_TABS: AccountTab[] = [
  { id: 'CUSTOMER_SUPPORT', title: 'Customer Support', isActive: false },
  { id: 'SETTINGS', title: 'Settings', isActive: true },
  { id: 'NOTIFICATIONS', title: 'Notifications', isActive: false },
];

export const DEFAULT_SETTINGS_CATEGORIES: AccountSettingsCategory[] = [
  {
    id: 'delivery',
    title: 'Delivery',
    icon: 'car-outline',
    route: '/account/delivery',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'voucher',
    title: 'Voucher',
    icon: 'ticket-outline',
    route: '/account/voucher',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'wallet',
    title: `${BRAND.APP_NAME} Wallet`,
    icon: 'wallet-outline',
    route: '/wallet',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'payment',
    title: 'Payment',
    icon: 'wallet-outline',
    route: '/account/payment',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'coupon',
    title: 'Coupon codes',
    icon: 'pricetag-outline',
    route: '/account/coupon',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'account_related',
    title: 'Account related',
    icon: 'person-outline',
    route: '/account/profile',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'cashback',
    title: 'Cashback',
    icon: 'cash-outline',
    route: '/account/cashback',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'product_service',
    title: 'Product/Service',
    icon: 'cube-outline',
    route: '/account/products',
    isEnabled: true,
    showArrow: true,
  },
  {
    id: 'courier',
    title: 'Courier',
    icon: 'bicycle-outline',
    route: '/account/courier',
    isEnabled: true,
    showArrow: true,
  },
];

// Error Types
export type AccountErrorType = 
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'SERVER_ERROR'
  | 'SETTINGS_UPDATE_FAILED'
  | 'PAYMENT_METHOD_ERROR'
  | 'ADDRESS_ERROR';

export interface AccountValidationError {
  field: string;
  message: string;
  code: string;
  type: AccountErrorType;
}