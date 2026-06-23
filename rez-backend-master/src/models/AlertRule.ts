import mongoose, { Document, Schema } from 'mongoose';

export interface IAlertRule extends Document {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  unit: string;
  enabled: boolean;
  channels: string[];
  cooldownMinutes: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AlertRuleSchema = new Schema<IAlertRule>(
  {
    id: {
      type: String,
      required: [true, 'Alert rule ID is required'],
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Alert rule name is required'],
      trim: true,
    },
    metric: {
      type: String,
      required: [true, 'Metric is required'],
      trim: true,
    },
    threshold: {
      type: Number,
      required: [true, 'Threshold is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    channels: {
      type: [String],
      default: [],
      enum: ['slack', 'pagerduty', 'email'],
    },
    cooldownMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },
    lastTriggeredAt: {
      type: Date,
      sparse: true,
    },
  },
  {
    timestamps: true,
    collection: 'alert_rules',
  }
);

// Index for enabled rules to improve query performance
AlertRuleSchema.index({ enabled: 1, createdAt: -1 });

const AlertRule = mongoose.model<IAlertRule>('AlertRule', AlertRuleSchema);

export default AlertRule;
