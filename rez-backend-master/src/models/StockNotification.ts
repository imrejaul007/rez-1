import mongoose, { Schema, Document, Types } from 'mongoose';

// Stock notification interface
export interface IStockNotification extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  email?: string;
  phoneNumber?: string;
  notificationMethod: 'email' | 'sms' | 'both' | 'push';
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Date;
  notifiedAt?: Date;
  product?: {
    name: string;
    image: string;
    price: number;
  };
}

// Stock Notification Schema
const StockNotificationSchema = new Schema<IStockNotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  notificationMethod: {
    type: String,
    enum: ['email', 'sms', 'both', 'push'],
    default: 'push',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'cancelled'],
    default: 'pending',
    required: true,
    index: true
  },
  notifiedAt: {
    type: Date
  },
  product: {
    name: {
      type: String
    },
    image: {
      type: String
    },
    price: {
      type: Number
    }
  }
}, {
  timestamps: true
});

// Compound indexes for performance
StockNotificationSchema.index({ userId: 1, productId: 1 });
StockNotificationSchema.index({ productId: 1, status: 1 });
StockNotificationSchema.index({ userId: 1, status: 1 });
StockNotificationSchema.index({ createdAt: -1 });

// Ensure unique subscription per user-product combination
StockNotificationSchema.index(
  { userId: 1, productId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

export const StockNotification = mongoose.model<IStockNotification>(
  'StockNotification',
  StockNotificationSchema
);