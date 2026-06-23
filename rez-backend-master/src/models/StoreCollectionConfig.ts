/**
 * StoreCollectionConfig Model
 * Admin-configurable visibility, ordering, and UI metadata for store delivery categories.
 * Controls which categories appear on the Store Categories page and how they are displayed.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreCollectionConfig extends Document {
  categoryKey: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  isEnabled: boolean;
  sortOrder: number;
  regions: string[];
  tags: string[];
  badgeText: string;
  imageUrl: string;
  updatedBy?: mongoose.Types.ObjectId;
}

const StoreCollectionConfigSchema = new Schema<IStoreCollectionConfig>(
  {
    categoryKey: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    color: { type: String, default: '#7B61FF' },
    isEnabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    regions: [{ type: String }],
    tags: [{ type: String }],
    badgeText: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IStoreCollectionConfig>('StoreCollectionConfig', StoreCollectionConfigSchema);
