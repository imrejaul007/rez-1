import { Schema, model, Document, Types } from 'mongoose';

/**
 * CustomerTag — tags and metadata for merchant's customers.
 * Enables customer segmentation and personalized marketing.
 */
export interface ICustomerTag extends Document {
  merchantId: Types.ObjectId;
  userId: Types.ObjectId;
  phone: string;
  tags: string[];
  notes: string;
  lastUpdatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerTagSchema = new Schema<ICustomerTag>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, index: true },
    tags: { type: [String], default: [] },
    notes: { type: String, default: '' },
    lastUpdatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

CustomerTagSchema.index({ merchantId: 1, userId: 1 }, { unique: true });
CustomerTagSchema.index({ phone: 'text' });

export const CustomerTag = model<ICustomerTag>('CustomerTag', CustomerTagSchema);

export default CustomerTag;
