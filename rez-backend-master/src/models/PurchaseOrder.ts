/**
 * Purchase Order Model
 *
 * Tracks purchase orders from suppliers with status workflow,
 * item details, quantities, and received amounts.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export type POStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export interface IPOItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQty: number;
}

export interface IPurchaseOrder extends Document {
  merchantId: Types.ObjectId;
  supplierId: Types.ObjectId;
  poNumber: string;
  items: IPOItem[];
  status: POStatus;
  totalAmount: number;
  expectedDate?: Date;
  receivedDate?: Date;
  notes: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    poNumber: {
      type: String,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
        productName: {
          type: String,
          default: '',
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitCost: {
          type: Number,
          required: true,
          min: 0,
        },
        totalCost: {
          type: Number,
          required: true,
          min: 0,
        },
        receivedQty: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'],
      default: 'draft',
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantUser',
    },
  },
  { timestamps: true },
);

// Indexes
PurchaseOrderSchema.index({ merchantId: 1, status: 1 });
PurchaseOrderSchema.index({ supplierId: 1, status: 1 });
PurchaseOrderSchema.index({ merchantId: 1, createdAt: -1 });
PurchaseOrderSchema.index({ poNumber: 1 });

// Pre-save hook: Auto-generate PO number
PurchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseOrder').countDocuments({
      merchantId: this.merchantId,
    });
    this.poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
export default PurchaseOrder;
