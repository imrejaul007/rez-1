import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITableSession extends Document {
  storeId: Types.ObjectId;
  merchantId: Types.ObjectId;
  tableNumber: string;
  status: 'open' | 'bill_requested' | 'paid' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  orders: Types.ObjectId[];
  subtotal: number;
  tax: number;
  total: number;
  guestCount: number;
  paymentId?: string;
  paymentMethod?: string;
  paidAt?: Date;
  userId?: Types.ObjectId;
  sessionToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const TableSessionSchema = new Schema<ITableSession>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'bill_requested', 'paid', 'closed'],
      default: 'open',
      index: true,
    },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    guestCount: { type: Number, default: 1, min: 1 },
    paymentId: { type: String },
    paymentMethod: { type: String },
    paidAt: { type: Date },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

// One open session per table at a time
TableSessionSchema.index({ storeId: 1, tableNumber: 1, status: 1 });

export const TableSession = mongoose.model<ITableSession>('TableSession', TableSessionSchema);
export default TableSession;
