import { Types } from 'mongoose';

// Razorpay order creation request
export interface IRazorpayOrderRequest {
  amount: number; // in paise (smallest currency unit)
  currency: string;
  receipt: string;
  notes?: Record<string, any>;
  payment_capture?: 0 | 1; // 0 = manual, 1 = automatic
}

// Razorpay order response
export interface IRazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

// Razorpay payment verification
export interface IRazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Payment gateway details stored in Order
export interface IPaymentGatewayDetails {
  gatewayOrderId?: string; // Razorpay order ID
  gatewayPaymentId?: string; // Razorpay payment ID
  gatewaySignature?: string; // Razorpay signature for verification
  transactionId?: string; // Unique transaction ID
  gateway: 'razorpay' | 'cod' | 'wallet';
  currency?: string;
  amountPaid?: number; // in rupees
  paidAt?: Date;
  failureReason?: string;
  refundId?: string;
  refundedAt?: Date;
  refundAmount?: number;
}

// Payment order creation request from frontend
export interface ICreatePaymentOrderRequest {
  orderId: string; // MongoDB Order ID
  amount: number; // in rupees
  currency?: string;
}

// Payment order creation response to frontend
export interface ICreatePaymentOrderResponse {
  success: boolean;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number; // in paise
  currency: string;
  orderId: string; // MongoDB Order ID
  orderNumber: string;
  notes?: Record<string, any>;
}

// Payment verification request from frontend
export interface IVerifyPaymentRequest {
  orderId: string; // MongoDB Order ID
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Payment verification response to frontend
export interface IVerifyPaymentResponse {
  success: boolean;
  message: string;
  order?: any;
  verified?: boolean;
}

// Payment webhook event from Razorpay
export interface IRazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        invoice_id: string | null;
        international: boolean;
        method: string;
        amount_refunded: number;
        refund_status: string | null;
        captured: boolean;
        description: string;
        card_id: string | null;
        bank: string | null;
        wallet: string | null;
        vpa: string | null;
        email: string;
        contact: string;
        notes: Record<string, any>;
        fee: number;
        tax: number;
        error_code: string | null;
        error_description: string | null;
        error_source: string | null;
        error_step: string | null;
        error_reason: string | null;
        created_at: number;
      };
    };
    order: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt: string;
        status: string;
        attempts: number;
        notes: Record<string, any>;
        created_at: number;
      };
    };
  };
  created_at: number;
}

// Refund request
export interface IRefundRequest {
  orderId: string;
  amount?: number; // partial refund amount in rupees (optional)
  reason?: string;
}

// Refund response
export interface IRefundResponse {
  success: boolean;
  message: string;
  refundId?: string;
  refundAmount?: number;
  refundStatus?: string;
}

// Payment status check
export interface IPaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  paidAt?: Date;
  failureReason?: string;
}

// Stock reservation for pending payment
export interface IStockReservation {
  orderId: Types.ObjectId;
  items: Array<{
    productId: Types.ObjectId;
    quantity: number;
    variant?: {
      type: string;
      value: string;
    };
  }>;
  reservedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
}
