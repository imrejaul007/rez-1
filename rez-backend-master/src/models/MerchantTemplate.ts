import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantTemplate extends Document {
  merchantId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MerchantTemplateSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    variables: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

export const MerchantTemplate = mongoose.model<IMerchantTemplate>('MerchantTemplate', MerchantTemplateSchema);
