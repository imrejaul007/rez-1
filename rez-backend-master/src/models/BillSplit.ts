import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBillSplitParticipant {
  user?: Types.ObjectId;
  phone: string;
  name?: string;
  amount: number;
  status: 'pending' | 'accepted' | 'paid' | 'declined';
  paidAt?: Date;
  transferId?: Types.ObjectId;
}

export interface IBillSplit extends Document {
  initiator: Types.ObjectId;
  totalAmount: number;
  splitType: 'equal' | 'custom';
  currency: string;
  participants: IBillSplitParticipant[];
  status: 'pending' | 'partially_paid' | 'completed' | 'cancelled' | 'expired';
  note?: string;
  idempotencyKey: string;
  expiresAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BillSplitParticipantSchema = new Schema<IBillSplitParticipant>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'paid', 'declined'],
    default: 'pending',
  },
  paidAt: Date,
  transferId: {
    type: Schema.Types.ObjectId,
    ref: 'CoinTransaction',
  },
}, { _id: true });

const BillSplitSchema = new Schema<IBillSplit>({
  initiator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 1,
  },
  splitType: {
    type: String,
    required: true,
    enum: ['equal', 'custom'],
  },
  currency: {
    type: String,
    required: true,
    default: 'NC',
  },
  participants: {
    type: [BillSplitParticipantSchema],
    validate: {
      validator: (v: IBillSplitParticipant[]) => v.length >= 1,
      message: 'At least one participant is required',
    },
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'partially_paid', 'completed', 'cancelled', 'expired'],
    default: 'pending',
  },
  note: {
    type: String,
    maxlength: 200,
    trim: true,
  },
  idempotencyKey: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
  completedAt: Date,
}, {
  timestamps: true,
});

// Indexes
BillSplitSchema.index({ initiator: 1, status: 1 });
BillSplitSchema.index({ 'participants.phone': 1, status: 1 });
BillSplitSchema.index({ 'participants.user': 1, status: 1 });
BillSplitSchema.index({ idempotencyKey: 1 }, { unique: true });
BillSplitSchema.index({ expiresAt: 1 }, {
  expireAfterSeconds: 0,
  partialFilterExpression: { status: { $in: ['pending', 'partially_paid'] } },
});

// Pre-save: auto-update status based on participant payment states
BillSplitSchema.pre('save', function (next) {
  if (this.status === 'cancelled' || this.status === 'expired') {
    return next();
  }

  const participants = this.participants;
  if (!participants || participants.length === 0) {
    return next();
  }

  const allPaid = participants.every(p => p.status === 'paid');
  const somePaid = participants.some(p => p.status === 'paid');
  const allDeclined = participants.every(p => p.status === 'declined');

  if (allPaid) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (allDeclined) {
    this.status = 'cancelled';
  } else if (somePaid) {
    this.status = 'partially_paid';
  } else {
    this.status = 'pending';
  }

  next();
});

export const BillSplit = mongoose.model<IBillSplit>('BillSplit', BillSplitSchema);
export default BillSplit;
