import mongoose, { Schema, Document } from 'mongoose';

export interface IUserOfferUsage extends Document {
  userId: mongoose.Types.ObjectId;
  offerId: mongoose.Types.ObjectId;
  count: number;
  lastUsedAt: Date;
}

const UserOfferUsageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  count: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now },
});

UserOfferUsageSchema.index({ userId: 1, offerId: 1 }, { unique: true });

export const UserOfferUsage = mongoose.model<IUserOfferUsage>('UserOfferUsage', UserOfferUsageSchema);
