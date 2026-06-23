import mongoose, { Document, Schema } from 'mongoose';

export type TriggerType =
  | 'rebooking_overdue'
  | 'birthday'
  | 'post_visit_review'
  | 'visit_anniversary'
  | 'inactive_client'
  | 'first_visit';

export type ActionType = 'send_push' | 'send_sms' | 'send_email' | 'give_coins';

export type RuleStatus = 'active' | 'paused' | 'draft';

export interface IAutomationRule extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  status: RuleStatus;
  trigger: {
    type: TriggerType;
    config: {
      daysSinceLastVisit?: number;
      daysBeforeBirthday?: number;
      hoursAfterVisit?: number;
      yearsAnniversary?: number;
    };
  };
  action: {
    type: ActionType;
    config: {
      title?: string;
      message: string;
      coinAmount?: number;
      deepLink?: string;
    };
  };
  stats: {
    sent: number;
    opened: number;
    converted: number;
    lastRunAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused', 'draft'], default: 'draft' },
    trigger: {
      type: {
        type: String,
        enum: [
          'rebooking_overdue',
          'birthday',
          'post_visit_review',
          'visit_anniversary',
          'inactive_client',
          'first_visit',
        ],
        required: true,
      },
      config: {
        daysSinceLastVisit: { type: Number },
        daysBeforeBirthday: { type: Number, default: 1 },
        hoursAfterVisit: { type: Number, default: 2 },
        yearsAnniversary: { type: Number, default: 1 },
      },
    },
    action: {
      type: {
        type: String,
        enum: ['send_push', 'send_sms', 'send_email', 'give_coins'],
        required: true,
      },
      config: {
        title: { type: String },
        message: { type: String, required: true },
        coinAmount: { type: Number },
        deepLink: { type: String },
      },
    },
    stats: {
      sent: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      converted: { type: Number, default: 0 },
      lastRunAt: { type: Date },
    },
  },
  { timestamps: true },
);

AutomationRuleSchema.index({ storeId: 1, status: 1 });

export const AutomationRule = mongoose.model<IAutomationRule>('AutomationRule', AutomationRuleSchema);
