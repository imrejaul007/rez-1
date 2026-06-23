import { Schema, model, Document, Types } from 'mongoose';

/**
 * SalesSummary — sub-document for shift sales breakdown.
 */
export interface ISalesSummary {
  totalBills: number;
  totalRevenue: number;
  cashRevenue: number;
  upiRevenue: number;
  cardRevenue: number;
  coinsRevenue: number;
  refunds: number;
  discounts: number;
  tips: number;
}

/**
 * PosShift — tracks POS shift operations with sales, cash tracking, and settlement.
 */
export interface IPosShift extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  staffId: Types.ObjectId;
  staffName: string;
  openedAt: Date;
  closedAt?: Date;
  openingCash: number;
  closingCash?: number;
  expectedCash: number; // openingCash + total cash sales
  cashDifference?: number; // closingCash - expectedCash
  salesSummary: ISalesSummary;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesSummarySchema = new Schema<ISalesSummary>(
  {
    totalBills: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    cashRevenue: { type: Number, default: 0 },
    upiRevenue: { type: Number, default: 0 },
    cardRevenue: { type: Number, default: 0 },
    coinsRevenue: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    discounts: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
  },
  { _id: false },
);

const PosShiftSchema = new Schema<IPosShift>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String, required: true },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },
    openingCash: { type: Number, required: true, default: 0 },
    closingCash: { type: Number },
    expectedCash: { type: Number, default: 0 },
    cashDifference: { type: Number },
    salesSummary: SalesSummarySchema,
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    notes: { type: String },
  },
  { timestamps: true },
);

PosShiftSchema.index({ merchantId: 1, storeId: 1, status: 1 });
PosShiftSchema.index({ storeId: 1, openedAt: -1 });

export const PosShift = model<IPosShift>('PosShift', PosShiftSchema);

export default PosShift;
