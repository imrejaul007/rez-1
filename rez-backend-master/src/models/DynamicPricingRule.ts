import { Schema, model, Document, Types } from 'mongoose';

export interface IDynamicPricingRule extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  serviceIds: Types.ObjectId[];  // empty = applies to all services
  name: string;

  // When this rule applies:
  dayOfWeek?: number[];     // [1,2,3,4,5] = weekdays only (0=Sun)
  startTime?: string;       // '11:00'
  endTime?: string;         // '17:00'

  // Price adjustment:
  adjustmentType: 'percent_off' | 'percent_on' | 'fixed_off' | 'fixed_on';
  adjustmentValue: number;  // 20 = 20% off / +₹50

  label: string;            // "Off-Peak Discount" / "Peak Hour Surcharge"
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const pricingRuleSchema = new Schema<IDynamicPricingRule>({
  merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  storeId:    { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  serviceIds: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  name:        { type: String, required: true },
  dayOfWeek:   [{ type: Number, min: 0, max: 6 }],
  startTime:   { type: String },
  endTime:     { type: String },
  adjustmentType: { type: String, enum: ['percent_off', 'percent_on', 'fixed_off', 'fixed_on'], required: true },
  adjustmentValue: { type: Number, required: true, min: 0 },
  label:       { type: String, required: true },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

pricingRuleSchema.index({ merchantId: 1, storeId: 1 });
pricingRuleSchema.index({ storeId: 1, isActive: 1 });

export default model<IDynamicPricingRule>('DynamicPricingRule', pricingRuleSchema);
