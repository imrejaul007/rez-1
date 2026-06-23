/**
 * MerchantAggregator — tracks which aggregators a merchant has approved/integrated.
 *
 * ROUTE-SEC-014 FIX: Before creating orders from aggregator webhooks, we look up
 * the MerchantAggregator record to verify the merchant has explicitly approved this
 * aggregator. This prevents a Swiggy merchant from creating orders for any other
 * merchant's store on our platform.
 *
 * The record is created when a merchant completes aggregator onboarding (e.g. they
 * provide their Swiggy/Zomato store ID in the merchant dashboard). Admin can also
 * create records manually.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantAggregator extends Document {
  merchantId: mongoose.Types.ObjectId;
  platform: 'swiggy' | 'zomato' | 'magicpin' | 'QrOrder' | string;
  externalMerchantId: string;
  storeId?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive' | 'pending';
  approvedAt: Date;
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantAggregatorSchema = new Schema<IMerchantAggregator>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    platform: { type: String, required: true, enum: ['swiggy', 'zomato', 'magicpin', 'QrOrder'] },
    externalMerchantId: { type: String, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: false },
    status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
    approvedAt: { type: Date, default: Date.now },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: false },
  },
  { timestamps: true },
);

// Unique: one record per (platform, externalMerchantId) pair
MerchantAggregatorSchema.index({ platform: 1, externalMerchantId: 1 }, { unique: true });
// Index for lookup by merchantId
MerchantAggregatorSchema.index({ merchantId: 1, platform: 1 });

export const MerchantAggregator = mongoose.model<IMerchantAggregator>('MerchantAggregator', MerchantAggregatorSchema);
