import mongoose, { Document, Schema, Model } from 'mongoose';

// ============================================
// TYPES & INTERFACES
// ============================================

export type OperatorType = 'mobile' | 'dth' | 'broadband';

export interface IRechargePlan {
  name: string;
  amount: number;
  validity: string;
  data?: string;
  calls?: string;
  sms?: string;
  cashbackPercent: number;
  popular: boolean;
}

export interface IRechargeOperator extends Document {
  name: string;
  code: string;
  type: OperatorType;
  region: string;
  countryCode: string;
  currency: string;
  logo: string;
  color: string;
  plans: IRechargePlan[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const rechargePlanSchema = new Schema<IRechargePlan>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    validity: { type: String, required: true, trim: true },
    data: { type: String, trim: true },
    calls: { type: String, trim: true },
    sms: { type: String, trim: true },
    cashbackPercent: { type: Number, default: 0, min: 0, max: 100 },
    popular: { type: Boolean, default: false },
  },
  { _id: true }
);

const rechargeOperatorSchema = new Schema<IRechargeOperator>(
  {
    name: {
      type: String,
      required: [true, 'Operator name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Operator code is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['mobile', 'dth', 'broadband'],
      default: 'mobile',
    },
    region: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    countryCode: {
      type: String,
      trim: true,
      default: '+91',
    },
    currency: {
      type: String,
      trim: true,
      default: 'INR',
    },
    logo: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#000000',
      trim: true,
    },
    plans: {
      type: [rechargePlanSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

rechargeOperatorSchema.index({ type: 1, isActive: 1, region: 1 });
rechargeOperatorSchema.index({ code: 1 }, { unique: true });

// ============================================
// EXPORT
// ============================================

const RechargeOperator: Model<IRechargeOperator> = mongoose.model<IRechargeOperator>(
  'RechargeOperator',
  rechargeOperatorSchema
);

export default RechargeOperator;
