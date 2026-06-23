import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICartItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IWhatsAppSession extends Document {
  _id: Types.ObjectId;
  phone: string;
  storeId: Types.ObjectId;
  state: 'idle' | 'browsing' | 'item_selected' | 'cart' | 'confirming' | 'awaiting_payment' | 'completed';
  cartItems: ICartItem[];
  lastInteractionAt: Date;
  pendingOrderId?: Types.ObjectId;
  currentCategory?: string;
  currentMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    state: {
      type: String,
      enum: ['idle', 'browsing', 'item_selected', 'cart', 'confirming', 'awaiting_payment', 'completed'],
      default: 'idle',
    },
    cartItems: [
      {
        menuItemId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
    lastInteractionAt: {
      type: Date,
      default: Date.now,
      // TTL: automatically delete sessions 30 minutes after last interaction
      // Create index: db.whatsappsessions.createIndex({ lastInteractionAt: 1 }, { expireAfterSeconds: 1800 })
    },
    pendingOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    currentCategory: {
      type: String,
      trim: true,
    },
    currentMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient session lookup
WhatsAppSessionSchema.index({ phone: 1, storeId: 1 }, { unique: true });

// TTL index for automatic session cleanup (30 minutes of inactivity)
WhatsAppSessionSchema.index({ lastInteractionAt: 1 }, { expireAfterSeconds: 1800 });

// Index for finding sessions by store (for debug/admin)
WhatsAppSessionSchema.index({ storeId: 1, createdAt: -1 });

const WhatsAppSession = mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema);

export default WhatsAppSession;
