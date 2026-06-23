/**
 * OffersSectionConfig Model
 * Admin-configurable visibility, ordering, and limits for each offers page section
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IOffersSectionConfig extends Document {
  sectionKey: string;
  displayName: string;
  tab: 'offers' | 'cashback' | 'exclusive';
  isEnabled: boolean;
  sortOrder: number;
  maxItems: number;
  regions: string[];
  updatedBy?: mongoose.Types.ObjectId;
}

const OffersSectionConfigSchema = new Schema<IOffersSectionConfig>(
  {
    sectionKey: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    tab: { type: String, required: true, enum: ['offers', 'cashback', 'exclusive'] },
    isEnabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    maxItems: { type: Number, default: 10 },
    regions: [{ type: String }],
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IOffersSectionConfig>('OffersSectionConfig', OffersSectionConfigSchema);
