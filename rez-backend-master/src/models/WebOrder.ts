import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
  customisation: string;
}

export interface IBillSplit {
  name: string;
  amount: number;
  paid: boolean;
  paidAt?: Date;
}

export interface IDeliveryAddress {
  line1: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface IWebOrder extends Document {
  orderNumber: string;
  storeId: mongoose.Types.ObjectId;
  storeSlug: string;
  storeName: string;
  customerPhone: string;
  customerName?: string;
  tableNumber?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  deliveryAddress?: IDeliveryAddress;
  deliveryFee?: number;
  items: IWebOrderItem[];
  subtotal: number;
  taxes: number;
  total: number;
  tipAmount?: number;
  tipPercentage?: number;
  totalWithTip?: number;
  billSplits?: IBillSplit[];
  status: 'pending_payment' | 'paid' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  specialInstructions?: string;
  scheduledFor?: Date | null;
  channel: string;
  coinsCredited: boolean;
  userId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  surveyFeedback?: {
    foodQuality?: string;
    serviceSpeed?: string;
    recommend?: boolean;
    textFeedback?: string;
    submittedAt?: Date;
  };
  rating?: number;
  ratingComment?: string;
  ratedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  refundStatus?: 'none' | 'pending' | 'processed';
}

const WebOrderSchema = new Schema<IWebOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    storeSlug: { type: String, required: true },
    storeName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerName: { type: String },
    tableNumber: { type: String },
    orderType: { type: String, enum: ['dine_in', 'takeaway', 'delivery'] },
    deliveryAddress: {
      line1: { type: String },
      city: { type: String },
      pincode: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    deliveryFee: { type: Number, default: 0 },
    items: [
      {
        menuItemId: String,
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        category: String,
        image: String,
        customisation: String,
      },
    ],
    subtotal: { type: Number, required: true },
    taxes: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending_payment',
    },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    specialInstructions: String,
    scheduledFor: { type: Date, default: null },
    channel: { type: String, default: 'web_qr' },
    coinsCredited: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    tipAmount: { type: Number, default: 0 },
    tipPercentage: { type: Number },
    totalWithTip: { type: Number },
    billSplits: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        paid: { type: Boolean, default: false },
        paidAt: { type: Date },
      },
    ],
    surveyFeedback: {
      foodQuality: { type: String },
      serviceSpeed: { type: String },
      recommend: { type: Boolean },
      textFeedback: { type: String },
      submittedAt: { type: Date },
    },
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: { type: String, maxlength: 300 },
    ratedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 200 },
    refundStatus: { type: String, enum: ['none', 'pending', 'processed'], default: 'none' },
  },
  { timestamps: true },
);

// KAVITA: Compound indexes for WebOrder aggregations (prevents collection scans)
// Store order history queries with recency
WebOrderSchema.index({ storeId: 1, createdAt: -1 }, { name: 'store_order_history_idx' });

// Customer order history
WebOrderSchema.index({ customerPhone: 1, createdAt: -1 }, { name: 'customer_order_history_idx' });

// Store dashboard: pending vs paid orders by createdAt (status breakdown)
WebOrderSchema.index({ storeId: 1, status: 1, createdAt: -1 }, { name: 'store_status_timeline_idx' });

// Global order status timeline queries
WebOrderSchema.index({ status: 1, createdAt: -1 }, { name: 'global_status_timeline_idx' });

// Payment status filtering (for reconciliation queries)
WebOrderSchema.index({ paymentStatus: 1, createdAt: -1 }, { name: 'payment_status_idx' });

// Razorpay order lookup (payment verification)
WebOrderSchema.index({ razorpayOrderId: 1 }, { sparse: true, name: 'razorpay_order_idx' });

// storeSlug-based queries: KDS polling, admin order list, analytics match stage
WebOrderSchema.index({ storeSlug: 1, createdAt: -1 }, { name: 'slug_order_history_idx' });

// Admin list filtered by storeSlug + status
WebOrderSchema.index({ storeSlug: 1, status: 1, createdAt: -1 }, { name: 'slug_status_timeline_idx' });

// Global admin order list (no store filter, sorted by recency)
WebOrderSchema.index({ createdAt: -1 }, { name: 'global_recency_idx' });

// User order history (sparse — userId is nullable)
WebOrderSchema.index({ userId: 1, createdAt: -1 }, { sparse: true, name: 'user_order_history_idx' });

// Loyalty stamp count: countDocuments({ customerPhone, storeSlug, paymentStatus })
WebOrderSchema.index({ customerPhone: 1, storeSlug: 1, paymentStatus: 1 }, { name: 'loyalty_stamp_idx' });

// Analytics aggregation match: { storeSlug, paymentStatus, status (ne cancelled), createdAt }
WebOrderSchema.index({ storeSlug: 1, paymentStatus: 1, status: 1 }, { name: 'slug_payment_status_idx' });

export const WebOrder = mongoose.model<IWebOrder>('WebOrder', WebOrderSchema);
export default WebOrder;
