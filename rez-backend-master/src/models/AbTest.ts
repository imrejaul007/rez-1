import mongoose, { Document, Schema } from 'mongoose';

export type AbTestStatus = 'running' | 'paused' | 'completed';

export interface IAbTestVariant {
  name: string;
  allocation: number;
  conversions: number;
  impressions: number;
}

export interface IAbTest extends Document {
  id: string;
  name: string;
  status: AbTestStatus;
  startDate: Date;
  endDate?: Date;
  variants: IAbTestVariant[];
  metric: string;
  winner?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AbTestVariantSchema = new Schema<IAbTestVariant>(
  {
    name: {
      type: String,
      required: [true, 'Variant name is required'],
      trim: true,
    },
    allocation: {
      type: Number,
      required: [true, 'Allocation percentage is required'],
      min: [0, 'Allocation must be at least 0'],
      max: [100, 'Allocation cannot exceed 100'],
    },
    conversions: {
      type: Number,
      default: 0,
      min: 0,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const AbTestSchema = new Schema<IAbTest>(
  {
    id: {
      type: String,
      required: [true, 'Test ID is required'],
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['running', 'paused', 'completed'],
      default: 'running',
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: () => new Date(),
    },
    endDate: {
      type: Date,
      sparse: true,
    },
    variants: {
      type: [AbTestVariantSchema],
      required: [true, 'Variants are required'],
      validate: {
        validator: (v: IAbTestVariant[]) => v.length > 0,
        message: 'At least one variant is required',
      },
    },
    metric: {
      type: String,
      required: [true, 'Primary metric is required'],
      trim: true,
    },
    winner: {
      type: String,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'ab_tests',
  }
);

AbTestSchema.index({ status: 1, createdAt: -1 });
AbTestSchema.index({ startDate: 1, endDate: 1 });

const AbTest = mongoose.model<IAbTest>('AbTest', AbTestSchema);

export default AbTest;
