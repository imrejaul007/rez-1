import mongoose, { Schema, Document, Types } from 'mongoose';

export type ExternalSourceType = 'pos' | 'pms' | 'booking' | 'inventory' | 'qr' | 'batch';
export type ExternalTxnStatus = 'pending' | 'verified' | 'rejected' | 'rewarded' | 'failed';
export type RewardStatus = 'pending' | 'issued' | 'skipped' | 'failed';

export interface IExternalTransactionItem {
  name: string;
  price: number;
  qty: number;
}

export interface ICustomerRef {
  phone?: string;
  email?: string;
  loyaltyId?: string;
}

export interface IExternalTransaction extends Document {
  merchant: Types.ObjectId;
  store: Types.ObjectId;
  integration?: Types.ObjectId;
  sourceType: ExternalSourceType;
  provider: string;
  externalId: string;
  txnHash: string;
  amount: number;
  currency: string;
  items: IExternalTransactionItem[];
  customerRef: ICustomerRef;
  user?: Types.ObjectId;
  status: ExternalTxnStatus;
  rewardStatus: RewardStatus;
  rewardAmount?: number;
  coinTransactionId?: Types.ObjectId;
  rawPayload: Record<string, any>;
  processedAt?: Date;
  rejectionReason?: string;
  batchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExternalTransactionSchema = new Schema<IExternalTransaction>({
  merchant: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  integration: { type: Schema.Types.ObjectId, ref: 'MerchantIntegration' },
  sourceType: {
    type: String,
    required: true,
    enum: ['pos', 'pms', 'booking', 'inventory', 'qr', 'batch'],
  },
  provider: { type: String, required: true, trim: true, lowercase: true },
  externalId: { type: String, required: true, trim: true },
  txnHash: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', trim: true },
  items: [{
    name: { type: String, trim: true },
    price: { type: Number, min: 0 },
    qty: { type: Number, min: 0, default: 1 },
  }],
  customerRef: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    loyaltyId: { type: String, trim: true },
  },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'rewarded', 'failed'],
    default: 'pending',
    index: true,
  },
  rewardStatus: {
    type: String,
    enum: ['pending', 'issued', 'skipped', 'failed'],
    default: 'pending',
  },
  rewardAmount: { type: Number },
  coinTransactionId: { type: Schema.Types.ObjectId, ref: 'CoinTransaction' },
  rawPayload: { type: Schema.Types.Mixed, default: {} },
  processedAt: { type: Date },
  rejectionReason: { type: String, trim: true },
  batchId: { type: String, trim: true },
}, { timestamps: true });

ExternalTransactionSchema.index({ merchant: 1, status: 1, createdAt: -1 });
ExternalTransactionSchema.index({ user: 1, createdAt: -1 });
ExternalTransactionSchema.index({ batchId: 1 }, { sparse: true });

export const ExternalTransaction = mongoose.model<IExternalTransaction>('ExternalTransaction', ExternalTransactionSchema);
export default ExternalTransaction;
