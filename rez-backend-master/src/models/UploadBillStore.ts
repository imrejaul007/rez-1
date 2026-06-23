import mongoose, { Document, Schema, Model } from 'mongoose';

// UploadBillStore interface (Stores that accept bill uploads for cashback)
export interface IUploadBillStore extends Document {
  name: string;
  logo?: string;
  category: string;
  coinsPerRupee: number; // e.g., 2 coins per Rs. 1 spent
  maxCoinsPerBill: number;
  minBillAmount?: number;
  verificationRequired: boolean;
  verificationTime?: string; // e.g., "24-48 hours"
  instructions?: string[];
  acceptedBillTypes?: string[]; // e.g., ["receipt", "invoice", "gst_invoice"]
  isActive: boolean;
  priority: number;
  totalUploads: number;
  createdAt: Date;
  updatedAt: Date;
}

const UploadBillStoreSchema = new Schema<IUploadBillStore>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    logo: {
      type: String,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    coinsPerRupee: {
      type: Number,
      required: true,
      min: 0.1,
      max: 10,
      default: 1,
    },
    maxCoinsPerBill: {
      type: Number,
      required: true,
      min: 1,
      default: 500,
    },
    minBillAmount: {
      type: Number,
      min: 0,
      default: 100,
    },
    verificationRequired: {
      type: Boolean,
      default: true,
    },
    verificationTime: {
      type: String,
      default: '24-48 hours',
    },
    instructions: [{
      type: String,
      trim: true,
    }],
    acceptedBillTypes: [{
      type: String,
      enum: ['receipt', 'invoice', 'gst_invoice', 'online_order', 'any'],
      default: 'any',
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalUploads: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const UploadBillStore = mongoose.model<IUploadBillStore>('UploadBillStore', UploadBillStoreSchema);

export default UploadBillStore;
