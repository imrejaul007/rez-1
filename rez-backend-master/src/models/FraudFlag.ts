import mongoose, { Schema, Document, Types } from 'mongoose';

export type FraudFlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudFlagStatus = 'open' | 'reviewed' | 'dismissed' | 'actioned';

export interface IFraudFlag extends Document {
  type: string;
  severity: FraudFlagSeverity;
  userId: Types.ObjectId | string;
  metadata: Record<string, any>;
  status: FraudFlagStatus;
  reviewedBy?: Types.ObjectId | string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FraudFlagSchema = new Schema<IFraudFlag>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed', 'actioned'],
      default: 'open',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

FraudFlagSchema.index({ userId: 1, type: 1 });
FraudFlagSchema.index({ status: 1, createdAt: -1 });

export const FraudFlag = mongoose.model<IFraudFlag>('FraudFlag', FraudFlagSchema);
export default FraudFlag;
