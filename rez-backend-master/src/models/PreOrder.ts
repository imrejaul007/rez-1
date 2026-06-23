// PreOrder Model - Menu Pre-order System
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPreOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

const PreOrderItemSchema = new Schema<IPreOrderItem>({
  menuItemId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  specialInstructions: { type: String },
}, { _id: false });

export interface IPreOrder extends Document {
  orderNumber: string;
  storeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: IPreOrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  scheduledTime?: Date;
  deliveryType: 'pickup' | 'delivery' | 'dine_in';
  tableNumber?: string;
  deliveryAddress?: {
    address: string;
    city: string;
    postalCode: string;
    coordinates?: [number, number];
  };
  contactPhone: string;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  calculateTotals(): void;
  updateStatus(newStatus: IPreOrder['status']): Promise<this>;
}

// PreOrder Model with static methods
export interface IPreOrderModel extends Model<IPreOrder> {
  findByOrderNumber(orderNumber: string): Promise<IPreOrder | null>;
  findUserOrders(userId: string, limit?: number): Promise<IPreOrder[]>;
  findStoreOrders(storeId: string, status?: string): Promise<IPreOrder[]>;
}

const PreOrderSchema = new Schema<IPreOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  items: [PreOrderItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  scheduledTime: { type: Date },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery', 'dine_in'],
    required: true,
  },
  tableNumber: { type: String, trim: true },
  deliveryAddress: {
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    coordinates: {
      type: [Number],
      validate: {
        validator: function(v: number[]) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    },
  },
  contactPhone: { type: String, default: '' },
  notes: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
PreOrderSchema.index({ storeId: 1, status: 1 });
PreOrderSchema.index({ userId: 1, createdAt: -1 });
PreOrderSchema.index({ createdAt: -1 });

// Generate unique order number
PreOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `PO-${timestamp}-${random}`;
  }
  next();
});

// Virtual for order age
PreOrderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const ageInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  return ageInMinutes;
});

// Method to calculate totals
PreOrderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((total: number, item: IPreOrderItem) => total + (item.price * item.quantity), 0);
  this.tax = this.subtotal * 0.05; // 5% tax
  this.deliveryFee = this.deliveryType === 'delivery' ? 50 : 0; // delivery fee only for delivery orders
  this.total = this.subtotal + this.tax + this.deliveryFee;
};

// Method to update status
PreOrderSchema.methods.updateStatus = function(newStatus: IPreOrder['status']) {
  const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': [],
  };

  const currentStatus = this.status;
  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  this.status = newStatus;
  return this.save();
};

// Static method to find by order number
PreOrderSchema.statics.findByOrderNumber = function(orderNumber: string) {
  return this.findOne({ orderNumber });
};

// Static method to find user orders
PreOrderSchema.statics.findUserOrders = function(userId: string, limit: number = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('storeId', 'name logo location');
};

// Static method to find store orders
PreOrderSchema.statics.findStoreOrders = function(storeId: string, status?: string) {
  const query: any = { storeId };
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('userId', 'profile.firstName profile.lastName profile.avatar');
};

const PreOrder = mongoose.model<IPreOrder, IPreOrderModel>('PreOrder', PreOrderSchema);

export default PreOrder;
