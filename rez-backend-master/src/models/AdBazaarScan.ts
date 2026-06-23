import mongoose, { Schema, Document } from 'mongoose';

export interface IAdBazaarScan extends Document {
  rezUserId: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  scanEventId: string;
  coinsAwarded: number;
  visitBonusAwarded: number;
  scannedAt: Date;
  visitAttributed: boolean;
  visitAttributedAt?: Date;
  purchaseAttributed: boolean;
  purchaseAttributedAt?: Date;
  revenueAttributed?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdBazaarScanSchema: Schema = new Schema(
  {
    rezUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    scanEventId: {
      type: String,
      required: true,
    },
    coinsAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    visitBonusAwarded: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    scannedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    visitAttributed: {
      type: Boolean,
      default: false,
      index: true,
    },
    visitAttributedAt: {
      type: Date,
    },
    purchaseAttributed: {
      type: Boolean,
      default: false,
    },
    purchaseAttributedAt: {
      type: Date,
    },
    revenueAttributed: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for attribution lookups
AdBazaarScanSchema.index({ rezUserId: 1, visitAttributed: 1, scannedAt: -1 });
AdBazaarScanSchema.index({ rezUserId: 1, merchantId: 1, scannedAt: -1 });
// Index for the visit/purchase attribution queries in storeVisitController
AdBazaarScanSchema.index({ rezUserId: 1, merchantId: 1, visitAttributed: 1, scannedAt: -1 });
AdBazaarScanSchema.index({ rezUserId: 1, merchantId: 1, visitAttributed: 1, purchaseAttributed: 1, scannedAt: -1 });

// Prevent duplicate scan records for the same AdBazaar scan event
AdBazaarScanSchema.index({ scanEventId: 1 }, { unique: true });

export const AdBazaarScan = mongoose.model<IAdBazaarScan>('AdBazaarScan', AdBazaarScanSchema);
