/**
 * Analytics Event Types
 *
 * Strongly-typed event payloads for the comprehensive analytics hook.
 * These types are erased at runtime — they exist only for TypeScript
 * safety in `useComprehensiveAnalytics` and other consumers.
 */

export interface StoreEvent {
  storeId: string;
  storeName: string;
  storeCategory?: string;
}

export interface ProductEvent {
  productId: string;
  productName: string;
  price: number;
  category: string;
  brand?: string;
  variant?: string;
}

export interface CartEvent {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  variant?: string;
  variantDetails?: string;
  totalValue: number;
}

export interface DealEvent {
  dealId: string;
  dealName: string;
  storeId?: string;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
}

export interface UGCEvent {
  contentId: string;
  contentType: 'review' | 'comment' | 'photo' | 'video' | 'reel' | 'story';
  authorId?: string;
  productIds?: string[];
  source?: string;
}

export interface BookingEvent {
  bookingId: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  totalAmount: number;
  merchantId?: string;
  merchantName?: string;
  paymentMethod?: string;
}

export interface PayBillEvent {
  billId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  billType?: string;
  paymentMethod?: string;
}

export interface PurchaseTransaction {
  transactionId: string;
  revenue: number;
  currency: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>;
  tax?: number;
  shipping?: number;
  coupon?: string;
  discount?: number;
  paymentMethod?: string;
}

export interface EventValidationResult {
  valid: boolean;
  missing: string[];
  extra: string[];
}
