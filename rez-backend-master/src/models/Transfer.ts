import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransferStatus = 'initiated' | 'otp_pending' | 'confirmed' | 'completed' | 'failed' | 'reversed';
export type TransferCoinType = 'nuqta' | 'promo' | 'branded';

export interface ITransfer extends Document {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  amount: number;
  coinType: TransferCoinType;
  merchantId?: Types.ObjectId; // For branded coin transfers
  status: TransferStatus;
  otpHash?: string;
  otpAttempts: number;
  otpExpiresAt?: Date;
  senderTxId?: Types.ObjectId;   // CoinTransaction ref for sender debit
  recipientTxId?: Types.ObjectId; // CoinTransaction ref for recipient credit
  note?: string;
  failureReason?: string;
  reversedAt?: Date;
  reversalReason?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  coinType: {
    type: String,
    required: true,
    enum: ['nuqta', 'promo', 'branded']
  },
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  status: {
    type: String,
    required: true,
    enum: ['initiated', 'otp_pending', 'confirmed', 'completed', 'failed', 'reversed'],
    default: 'initiated'
  },
  otpHash: String,
  otpAttempts: { type: Number, default: 0 },
  otpExpiresAt: Date,
  senderTxId: { type: Schema.Types.ObjectId, ref: 'CoinTransaction' },
  recipientTxId: { type: Schema.Types.ObjectId, ref: 'CoinTransaction' },
  note: { type: String, maxlength: 200, trim: true },
  failureReason: String,
  reversedAt: Date,
  reversalReason: String,
  idempotencyKey: { type: String, sparse: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes
TransferSchema.index({ sender: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
TransferSchema.index({ sender: 1, createdAt: -1 });
TransferSchema.index({ recipient: 1, createdAt: -1 });
TransferSchema.index({ status: 1, createdAt: -1 });
TransferSchema.index({ sender: 1, status: 1, createdAt: -1 });
TransferSchema.index({ recipient: 1, status: 1, createdAt: -1 }); // Recipient history with status filter

// TTL: Auto-expire initiated/otp_pending transfers after 10 minutes
TransferSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 600,
    partialFilterExpression: { status: { $in: ['initiated', 'otp_pending'] } }
  }
);

export const Transfer = mongoose.model<ITransfer>('Transfer', TransferSchema);
