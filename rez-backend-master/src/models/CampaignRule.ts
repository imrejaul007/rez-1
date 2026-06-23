import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICampaignRuleTrigger {
  type: 'days_since_visit' | 'birthday' | 'spend_milestone' | 'visit_count' | 'first_visit';
  value?: number; // days, ₹ amount, or visit count
}

export interface ICampaignRuleAction {
  type: 'coin_drop' | 'push' | 'sms';
  coinAmount?: number;
  discountPct?: number;
  message: string;
}

export interface ICampaignRule extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  name: string;
  isActive: boolean;
  trigger: ICampaignRuleTrigger;
  action: ICampaignRuleAction;
  cooldownDays: number;
  firedCount: number;
  lastFiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignRuleTriggerSchema = new Schema<ICampaignRuleTrigger>(
  {
    type: {
      type: String,
      enum: ['days_since_visit', 'birthday', 'spend_milestone', 'visit_count', 'first_visit'],
      required: true,
    },
    value: Number,
  },
  { _id: false }
);

const CampaignRuleActionSchema = new Schema<ICampaignRuleAction>(
  {
    type: {
      type: String,
      enum: ['coin_drop', 'push', 'sms'],
      required: true,
    },
    coinAmount: Number,
    discountPct: Number,
    message: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const CampaignRuleSchema = new Schema<ICampaignRule>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    trigger: {
      type: CampaignRuleTriggerSchema,
      required: true,
    },
    action: {
      type: CampaignRuleActionSchema,
      required: true,
    },
    cooldownDays: {
      type: Number,
      default: 7,
      min: 0,
    },
    firedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastFiredAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for finding active rules for a merchant
CampaignRuleSchema.index({ merchantId: 1, isActive: 1 });

const CampaignRule = mongoose.model<ICampaignRule>(
  'CampaignRule',
  CampaignRuleSchema
);

export default CampaignRule;
