import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAggregatorOrderItem {
  name: string;
  qty: number;
  price: number;
  externalItemId?: string;
}

export interface IAggregatorOrderDeliveryAddress {
  line1: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

export interface IAggregatorOrder extends Document {
  _id: Types.ObjectId;
  externalId: string;
  platform: 'swiggy' | 'zomato' | 'dunzo' | 'ondc';
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  /**
   * B4 (Sprint 0): resolved User._id for the customer that placed this order.
   * Nullable because aggregators sometimes withhold phone (e.g. Zomato direct
   * orders routed through their masking layer) — in which case the order is
   * kept anonymous. Populated by `resolveCustomerIdentity` in
   * `aggregatorWebhookRoutes.ts`.
   */
  customerId?: Types.ObjectId;
  items: IAggregatorOrderItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: IAggregatorOrderDeliveryAddress;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  rawPayload?: any;
  acceptedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AggregatorOrderSchema = new Schema<IAggregatorOrder>(
  {
    externalId: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['swiggy', 'zomato', 'dunzo', 'ondc'],
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      sparse: true,
      index: true,
    },
    // B4 (Sprint 0): resolved User._id — see interface comment.
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    items: [
      {
        name: {
          type: String,
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        externalItemId: String,
      },
    ],
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    customerName: String,
    customerPhone: String,
    deliveryAddress: {
      line1: String,
      city: String,
      pincode: String,
      lat: Number,
      lng: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    rawPayload: Schema.Types.Mixed,
    acceptedAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

// Unique compound index on platform + externalId
AggregatorOrderSchema.index(
  { platform: 1, externalId: 1 },
  { unique: true }
);

// Index for merchant order queries
AggregatorOrderSchema.index({ merchantId: 1, createdAt: -1 });
AggregatorOrderSchema.index({ merchantId: 1, status: 1, createdAt: -1 });

const AggregatorOrder = mongoose.model<IAggregatorOrder>(
  'AggregatorOrder',
  AggregatorOrderSchema
);

export default AggregatorOrder;
