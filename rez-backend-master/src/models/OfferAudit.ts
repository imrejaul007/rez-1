/**
 * OfferAudit Model
 * Tracks every automation trigger event: what offer was sent, to whom, and the outcome.
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IOfferAudit extends Document {
  _id: Types.ObjectId;
  ruleId: Types.ObjectId;
  storeId: Types.ObjectId;
  customerId: Types.ObjectId;
  triggerType: string;
  offerTitle: string;
  offerMessage: string;
  offerSent: boolean;
  offerUsed: boolean;
  offerUsedAt?: Date;
  revenue?: number; // revenue from the order that used the offer
  notificationChannel: 'whatsapp' | 'push' | 'sms';
  sentAt: Date;
  createdAt: Date;
}

const OfferAuditSchema = new Schema<IOfferAudit>(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'OfferRule', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    triggerType: { type: String, required: true },
    offerTitle: { type: String, required: true },
    offerMessage: { type: String, required: true },
    offerSent: { type: Boolean, default: false },
    offerUsed: { type: Boolean, default: false },
    offerUsedAt: { type: Date },
    revenue: { type: Number },
    notificationChannel: { type: String, enum: ['whatsapp', 'push', 'sms'], required: true },
    sentAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

OfferAuditSchema.index({ ruleId: 1, createdAt: -1 });
OfferAuditSchema.index({ storeId: 1, createdAt: -1 });
OfferAuditSchema.index({ customerId: 1, createdAt: -1 });

const OfferAudit: Model<IOfferAudit> = mongoose.model<IOfferAudit>('OfferAudit', OfferAuditSchema);
export default OfferAudit;
