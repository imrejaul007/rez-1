/**
 * Store Payment Components
 *
 * Components for the pay-in-store flow including:
 * - QR Scanner (cross-platform)
 * - Amount input
 * - Offer cards
 * - Payment summary
 * - Coin redemption
 */

// QR Scanner - platform-specific implementations
// Use: import QRScanner from '@/components/store-payment/QRScanner';
// Metro bundler will resolve .native.tsx for mobile and .web.tsx for web
export { default as QRScanner } from './QRScanner';

// Scanner Placeholder - visual card that opens QRScanner modal on tap
export { default as ScannerPlaceholder } from './ScannerPlaceholder';

// Re-export types from the types file for convenience
export type {
  QRCodeData,
  StoreQRInfo,
  StorePaymentInfo,
  StorePaymentSettings,
  StoreRewardRules,
  PaymentMethodType,
  PaymentMethod,
  CoinType,
  CoinBalance,
  CoinRedemption,
  OfferType,
  OfferSource,
  OfferValueType,
  StorePaymentOffer,
  OffersResponse,
  StorePaymentRequest,
  StorePaymentInitResponse,
  PaymentStatus,
  StorePaymentConfirmRequest,
  StorePaymentConfirmResponse,
  PaymentRewards,
  PaymentSummary,
  StorePaymentTransaction,
  PaymentHistoryResponse,
  UseStorePaymentState,
  UseStorePaymentActions,
  UseStorePaymentReturn,
  PayInStoreParams,
  EnterAmountParams,
  OffersScreenParams,
  PaymentScreenParams,
  SuccessScreenParams,
} from '@/types/storePayment.types';
