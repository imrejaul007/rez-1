/**
 * Supplier Model
 *
 * Tracks supplier information, contact details, products supplied,
 * payment terms, and pricing.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupplierProduct {
  productId: Types.ObjectId;
  supplierSku: string;
  cost: number;
  leadDays: number;
}

export interface ISupplier extends Document {
  merchantId: Types.ObjectId;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstNumber: string;
  products: ISupplierProduct[];
  paymentTerms: string;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    gstNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
        supplierSku: {
          type: String,
          default: '',
          trim: true,
        },
        cost: {
          type: Number,
          default: 0,
          min: 0,
        },
        leadDays: {
          type: Number,
          default: 7,
          min: 0,
        },
      },
    ],
    paymentTerms: {
      type: String,
      default: 'Immediate',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
SupplierSchema.index({ merchantId: 1, isActive: 1 });
SupplierSchema.index({ merchantId: 1, name: 1 });
SupplierSchema.index({ merchantId: 1, 'products.productId': 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
export default Supplier;
