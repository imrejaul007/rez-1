import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';
import { mul, round2 } from '../utils/currency';

// Service booking details for order items
export interface IOrderServiceBookingDetails {
  bookingDate: Date;
  timeSlot: {
    start: string;
    end: string;
  };
  duration: number; // in minutes
  serviceType: 'home' | 'store' | 'online';
  customerNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

// Order item interface
export interface IOrderItem {
  product: Types.ObjectId;
  store: Types.ObjectId;
  storeName?: string; // Store name at time of order (for display without populate)
  name: string; // Store product name at time of order
  image: string; // Store product image at time of order
  itemType: 'product' | 'service' | 'event'; // Type of item
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
  price: number; // Price at time of order
  originalPrice?: number;
  discount?: number;
  subtotal: number; // price * quantity
  // Service booking specific fields
  serviceBookingId?: Types.ObjectId; // Reference to created ServiceBooking
  serviceBookingDetails?: IOrderServiceBookingDetails;
  // Smart Spend source tracking (for enhanced Privé coin earning)
  smartSpendSource?: {
    smartSpendItemId: string;
    coinRewardRate: number; // snapshotted at order time
  };
}

// Order totals interface
export interface IOrderTotals {
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  lockFeeDiscount?: number;  // Amount already paid when locking item
  cashback: number;
  total: number;
  paidAmount: number;
  refundAmount?: number;
  platformFee: number;      // 15% of subtotal - platform commission
  merchantPayout: number;   // subtotal - platformFee - what merchant receives
}

// Payment information interface
export interface IOrderPayment {
  method: 'wallet' | 'card' | 'upi' | 'cod' | 'netbanking' | 'razorpay' | 'stripe';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  transactionId?: string;
  paymentGateway?: string;
  failureReason?: string;
  paidAt?: Date;
  refundId?: string;
  refundedAt?: Date;
  coinsUsed?: {
    rezCoins?: number; // REZ coins used (primary field)
    wasilCoins?: number; // Legacy field - kept for backward compatibility
    promoCoins?: number; // Promo coins used
    storePromoCoins?: number; // Store promo coins used
    totalCoinsValue?: number; // Total value of coins used
  };
}

// Delivery address interface
export interface IOrderAddress {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  coordinates?: [number, number];
  landmark?: string;
  addressType?: 'home' | 'work' | 'other';
}

// Fulfillment type for orders
export type FulfillmentType = 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';

// Fulfillment details interface
export interface IFulfillmentDetails {
  storeAddress?: string;
  storeCoordinates?: [number, number];
  tableNumber?: string;
  vehicleInfo?: string;
  estimatedReadyTime?: Date;
  pickupInstructions?: string;
  driveThruLane?: string;
}

// Delivery information interface
export interface IOrderDelivery {
  method: 'standard' | 'express' | 'pickup' | 'drive_thru' | 'dine_in' | 'scheduled';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  address: IOrderAddress;
  estimatedTime?: Date;
  actualTime?: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  trackingId?: string;
  deliveryPartner?: string;
  deliveryFee: number;
  instructions?: string;
  deliveryOTP?: string;
  attempts?: {
    attemptNumber: number;
    attemptedAt: Date;
    status: 'successful' | 'failed';
    reason?: string;
    nextAttemptAt?: Date;
  }[];
}

// Order timeline interface
export interface IOrderTimeline {
  status: string;
  message: string;
  timestamp: Date;
  updatedBy?: string;
  metadata?: any;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deliveryPartner?: {
    name: string;
    phone: string;
    vehicleNumber?: string;
    photo?: string;
  };
}

// Order analytics interface
export interface IOrderAnalytics {
  source: 'app' | 'web' | 'social' | 'referral';
  campaign?: string;
  referralCode?: string;
  attributionPickId?: Types.ObjectId; // Creator pick that led to this purchase
  deviceInfo?: {
    platform: string;
    version: string;
    userAgent?: string;
  };
}

// Main Order interface
export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  store?: Types.ObjectId; // Primary store for the order (for single-store orders or main store)
  fulfillmentType: FulfillmentType;
  fulfillmentDetails?: IFulfillmentDetails;
  items: IOrderItem[];
  totals: IOrderTotals;
  payment: IOrderPayment;
  delivery: IOrderDelivery;
  timeline: IOrderTimeline[];
  analytics?: IOrderAnalytics;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  couponCode?: string;
  redemption?: {
    code: string;
    discount: number;
    dealTitle?: string;
  };
  offerRedemption?: {
    code: string;
    cashback: number;
    offerTitle?: string;
  };
  notes?: string;
  specialInstructions?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  returnReason?: string;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Invoice and document URLs
  invoiceUrl?: string;
  invoiceGeneratedAt?: Date;
  shippingLabelUrl?: string;
  packingSlipUrl?: string;

  // Additional properties for compatibility
  cancellation?: {
    reason?: string;
    cancelledAt?: Date;
    cancelledBy?: Types.ObjectId;
    refundAmount?: number;
    refundStatus?: 'pending' | 'completed' | 'failed' | 'not_applicable';
  };
  paymentStatus?: string; // Alias for payment.status
  tracking?: {
    trackingId?: string;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
  };
  estimatedDeliveryTime?: Date; // Alias for delivery.estimatedTime
  deliveredAt?: Date; // Alias for delivery.deliveredAt
  totalAmount?: number; // Alias for totals.total (for compatibility with services)
  rating?: {
    score: number;
    review?: string;
    ratedAt: Date;
  };

  // Payment gateway details (for Razorpay)
  paymentGateway?: {
    gatewayOrderId?: string; // Razorpay order ID
    gatewayPaymentId?: string; // Razorpay payment ID
    gatewaySignature?: string; // Razorpay signature
    gateway: 'razorpay' | 'cod' | 'wallet';
    currency?: string;
    amountPaid?: number;
    paidAt?: Date;
    failureReason?: string;
    refundId?: string;
    refundedAt?: Date;
    refundAmount?: number;
  };

  // Scheduled delivery details
  scheduledDelivery?: {
    date: Date;
    timeSlot: string;
    isScheduled: boolean;
  };

  idempotencyKey?: string;

  // Dispute hold — locks reward issuance while dispute is active
  disputeHold?: boolean;

  // Methods
  updateStatus(newStatus: string, message?: string, updatedBy?: string): Promise<void>;
  calculateRefund(): number;
  canBeCancelled(): boolean;
  canBeReturned(): boolean;
  generateInvoice(): Promise<string>;
  sendStatusUpdate(): Promise<void>;
}

// Order Schema
const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Primary store for the order (populated from first item's store during order creation)
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true
  },
  fulfillmentType: {
    type: String,
    enum: ['delivery', 'pickup', 'drive_thru', 'dine_in'],
    default: 'delivery',
    index: true
  },
  fulfillmentDetails: {
    storeAddress: String,
    storeCoordinates: {
      type: [Number],
      index: '2dsphere'
    },
    tableNumber: String,
    vehicleInfo: String,
    estimatedReadyTime: Date,
    pickupInstructions: String,
    driveThruLane: String
  },
  items: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    storeName: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      required: true
    },
    itemType: {
      type: String,
      enum: ['product', 'service', 'event'],
      default: 'product'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 999
    },
    variant: {
      type: {
        type: String,
        trim: true
      },
      value: {
        type: String,
        trim: true
      }
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    // Service booking specific fields
    serviceBookingId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceBooking'
    },
    serviceBookingDetails: {
      bookingDate: { type: Date },
      timeSlot: {
        start: { type: String },
        end: { type: String }
      },
      duration: { type: Number, min: 15 },
      serviceType: {
        type: String,
        enum: ['home', 'store', 'online']
      },
      customerNotes: { type: String, trim: true, maxlength: 500 },
      customerName: { type: String, trim: true },
      customerPhone: { type: String, trim: true },
      customerEmail: { type: String, trim: true, lowercase: true }
    },
    // Smart Spend source tracking
    smartSpendSource: {
      smartSpendItemId: { type: String },
      coinRewardRate: { type: Number },
    }
  }],
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    delivery: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    lockFeeDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    cashback: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0
    },
    merchantPayout: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  payment: {
    method: {
      type: String,
      required: true,
      enum: ['wallet', 'card', 'upi', 'cod', 'netbanking', 'razorpay', 'stripe']
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentGateway: String,
    failureReason: String,
    paidAt: Date,
    refundId: String,
    refundedAt: Date,
    coinsUsed: {
      rezCoins: { type: Number, default: 0, min: 0 }, // Primary field for REZ coins
      wasilCoins: { type: Number, default: 0, min: 0 }, // Legacy field for backward compatibility
      promoCoins: { type: Number, default: 0, min: 0 },
      storePromoCoins: { type: Number, default: 0, min: 0 },
      totalCoinsValue: { type: Number, default: 0, min: 0 }
    }
  },
  delivery: {
    method: {
      type: String,
      required: true,
      enum: ['standard', 'express', 'pickup', 'drive_thru', 'dine_in', 'scheduled'],
      default: 'standard'
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery', 'delivered', 'failed', 'returned'],
      default: 'pending'
    },
    address: {
      name: { type: String },
      phone: { type: String },
      email: String,
      addressLine1: { type: String },
      addressLine2: String,
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      },
      landmark: String,
      addressType: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
      }
    },
    estimatedTime: Date,
    actualTime: Date,
    dispatchedAt: Date,
    deliveredAt: Date,
    trackingId: String,
    deliveryPartner: String,
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    instructions: String,
    deliveryOTP: String,
    attempts: [{
      attemptNumber: { type: Number, min: 1 },
      attemptedAt: { type: Date, required: true },
      status: {
        type: String,
        enum: ['successful', 'failed'],
        required: true
      },
      reason: String,
      nextAttemptAt: Date
    }]
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    updatedBy: String,
    metadata: Schema.Types.Mixed,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    deliveryPartner: {
      name: String,
      phone: String,
      vehicleNumber: String,
      photo: String
    }
  }],
  analytics: {
    source: {
      type: String,
      enum: ['app', 'web', 'social', 'referral'],
      default: 'app'
    },
    campaign: String,
    referralCode: String,
    attributionPickId: {
      type: Schema.Types.ObjectId,
      ref: 'CreatorPick',
    },
    deviceInfo: {
      platform: String,
      version: String,
      userAgent: String
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery', 'delivered', 'cancelling', 'cancelled', 'returned', 'refunded'],
    default: 'placed',
    index: true
  },
  couponCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  redemption: {
    code: { type: String, uppercase: true, trim: true },
    discount: { type: Number, default: 0 },
    dealTitle: { type: String },
  },
  offerRedemption: {
    code: { type: String, uppercase: true, trim: true },
    cashback: { type: Number, default: 0 },
    offerTitle: { type: String },
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: 500
  },
  cancelReason: String,
  cancelledAt: Date,
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  returnReason: String,
  returnedAt: Date,

  // Invoice and document URLs
  invoiceUrl: String,
  invoiceGeneratedAt: Date,
  shippingLabelUrl: String,
  packingSlipUrl: String,

  // Additional fields for compatibility
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    refundAmount: {
      type: Number,
      min: 0
    }
  },
  tracking: {
    trackingId: String,
    estimatedDelivery: Date,
    deliveredAt: Date
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    ratedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Scheduled delivery details
  scheduledDelivery: {
    date: { type: Date },
    timeSlot: { type: String, trim: true },
    isScheduled: { type: Boolean, default: false },
  },

  idempotencyKey: {
    type: String,
    trim: true,
    maxlength: 128
  },

  // Dispute hold — locks reward issuance while dispute is active
  disputeHold: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Payment gateway details
  paymentGateway: {
    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewaySignature: String,
    gateway: {
      type: String,
      enum: ['razorpay', 'cod', 'wallet']
    },
    currency: String,
    amountPaid: Number,
    paidAt: Date,
    failureReason: String,
    refundId: String,
    refundedAt: Date,
    refundAmount: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
OrderSchema.index({ orderNumber: 1 }, { unique: true }); // Prevent duplicate order numbers
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ 'delivery.status': 1 });
OrderSchema.index({ 'items.store': 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'delivery.estimatedTime': 1 });
OrderSchema.index({ fulfillmentType: 1, status: 1 });

// Compound indexes
OrderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
OrderSchema.index({ user: 1, status: 1, createdAt: -1 });
OrderSchema.index({ 'items.store': 1, status: 1 });

// Analytics indexes for merchant dashboard
OrderSchema.index({ 'items.store': 1, createdAt: -1, status: 1 }); // Sales trends by store
OrderSchema.index({ 'items.store': 1, 'items.product': 1, createdAt: -1 }); // Product performance
OrderSchema.index({ 'items.store': 1, user: 1, createdAt: -1 }); // Customer insights
OrderSchema.index({ 'payment.method': 1, 'items.store': 1 }); // Payment analytics

// Virtual for order age in hours
OrderSchema.virtual('ageInHours').get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Virtual for estimated delivery date
OrderSchema.virtual('estimatedDeliveryDate').get(function () {
  return this.delivery.estimatedTime || new Date(Date.now() + 24 * 60 * 60 * 1000);
});

// Virtual properties for compatibility with controller
OrderSchema.virtual('paymentStatus').get(function () {
  return this.payment.status;
});

OrderSchema.virtual('estimatedDeliveryTime').get(function () {
  return this.delivery.estimatedTime;
});

OrderSchema.virtual('deliveredAt').get(function () {
  return this.delivery.deliveredAt;
});

OrderSchema.virtual('totalAmount').get(function () {
  return this.totals.total;
});

// Pre-save hook to generate order number and add timeline entry
OrderSchema.pre('save', async function (next) {
  // Generate order number for new orders
  if (this.isNew && !this.orderNumber) {
    const count = await (this.constructor as any).countDocuments();
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }

  // Add timeline entry for status changes
  if (this.isModified('status') && !this.isNew) {
    const statusMessages = {
      placed: 'Order has been placed successfully',
      confirmed: 'Order has been confirmed by the store',
      preparing: 'Your order is being prepared',
      ready: 'Order is ready for pickup/dispatch',
      dispatched: 'Order has been dispatched',
      delivered: 'Order has been delivered successfully',
      cancelled: 'Order has been cancelled',
      returned: 'Order has been returned',
      refunded: 'Order amount has been refunded'
    };

    this.timeline.push({
      status: this.status,
      message: statusMessages[this.status] || `Order status updated to ${this.status}`,
      timestamp: new Date()
    });
  }

  next();
});

// Method to update order status
OrderSchema.methods.updateStatus = async function (
  newStatus: string,
  message?: string,
  updatedBy?: string
): Promise<void> {
  this.status = newStatus;

  // Update delivery status based on order status
  const deliveryStatusMap: { [key: string]: string } = {
    confirmed: 'confirmed',
    preparing: 'preparing',
    ready: 'ready',
    dispatched: 'dispatched',
    delivered: 'delivered',
    cancelled: 'failed',
    returned: 'returned'
  };

  if (deliveryStatusMap[newStatus]) {
    this.delivery.status = deliveryStatusMap[newStatus];
  }

  // Set timestamps for specific statuses
  if (newStatus === 'dispatched') {
    this.delivery.dispatchedAt = new Date();
  } else if (newStatus === 'delivered') {
    this.delivery.deliveredAt = new Date();
    this.delivery.actualTime = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  } else if (newStatus === 'returned') {
    this.returnedAt = new Date();
  }

  // Add custom timeline message if provided
  if (message) {
    this.timeline.push({
      status: newStatus,
      message,
      timestamp: new Date(),
      updatedBy
    });
  }

  await this.save();
};

// Method to calculate refund amount
OrderSchema.methods.calculateRefund = function (): number {
  let refundAmount = this.totals.paidAmount;

  // Deduct delivery charges if order was dispatched
  if (this.status === 'dispatched' || this.status === 'delivered') {
    refundAmount -= this.totals.delivery;
  }

  // Apply cancellation charges based on timing
  const ageInHours = this.ageInHours;
  if (ageInHours > 24) {
    refundAmount = mul(refundAmount, 0.9); // 10% cancellation fee after 24 hours
  } else if (ageInHours > 2) {
    refundAmount = mul(refundAmount, 0.95); // 5% cancellation fee after 2 hours
  }

  return Math.max(0, round2(refundAmount));
};

// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function (): boolean {
  const cancellableStatuses = ['placed', 'confirmed', 'preparing'];
  return cancellableStatuses.includes(this.status);
};

// Method to check if order can be returned
OrderSchema.methods.canBeReturned = function (): boolean {
  if (this.status !== 'delivered') return false;

  const deliveredAt = this.delivery.deliveredAt;
  if (!deliveredAt) return false;

  const hoursSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceDelivery <= 24; // 24 hours return window
};

// Method to generate invoice (placeholder)
OrderSchema.methods.generateInvoice = async function (): Promise<string> {
  // This would typically generate a PDF invoice
  return `Invoice for order ${this.orderNumber}`;
};

// Method to send status update (placeholder)
OrderSchema.methods.sendStatusUpdate = async function (): Promise<void> {
  // This would typically send push notification, SMS, or email
  logger.info(`Status update sent for order ${this.orderNumber}: ${this.status}`);
};

// Static method to get user orders
OrderSchema.statics.getUserOrders = function (
  userId: string,
  status?: string,
  limit: number = 20,
  skip: number = 0
) {
  const query: any = { user: userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('items.product', 'name images')
    .populate('items.store', 'name logo')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get store orders
OrderSchema.statics.getStoreOrders = function (
  storeId: string,
  status?: string,
  limit: number = 50
) {
  const query: any = { 'items.store': storeId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('user', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get orders by date range
OrderSchema.statics.getOrdersByDateRange = function (
  startDate: Date,
  endDate: Date,
  filters: any = {}
) {
  const query: any = {
    createdAt: { $gte: startDate, $lte: endDate },
    ...filters
  };

  return this.find(query)
    .populate('user', 'profile.firstName profile.lastName')
    .populate('items.store', 'name')
    .sort({ createdAt: -1 });
};

export const Order = mongoose.model<IOrder>('Order', OrderSchema);