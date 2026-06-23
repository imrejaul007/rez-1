import mongoose, { Schema, Document, Types } from 'mongoose';

// Activity Types
export enum ActivityType {
  ORDER = 'ORDER',
  CASHBACK = 'CASHBACK',
  REVIEW = 'REVIEW',
  VIDEO = 'VIDEO',
  PROJECT = 'PROJECT',
  VOUCHER = 'VOUCHER',
  OFFER = 'OFFER',
  REFERRAL = 'REFERRAL',
  WALLET = 'WALLET',
  ACHIEVEMENT = 'ACHIEVEMENT'
}

// Activity Interface
export interface IActivity extends Document {
  user: Types.ObjectId;
  type: ActivityType;
  title: string;
  description?: string;
  amount?: number;
  icon: string;
  color: string;

  // Related entities
  relatedEntity?: {
    id: Types.ObjectId;
    type: string; // 'Order', 'Video', 'Project', etc.
  };

  // Metadata
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

// Activity Schema
const ActivitySchema = new Schema<IActivity>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(ActivityType),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  amount: {
    type: Number
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#10B981'
  },
  relatedEntity: {
    id: {
      type: Schema.Types.ObjectId
    },
    type: {
      type: String
    }
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
// TTL: auto-delete activity records after 90 days (archived by archiveJob before expiry)
ActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to create activity
ActivitySchema.statics.createActivity = async function(
  userId: Types.ObjectId,
  type: ActivityType,
  data: {
    title: string;
    description?: string;
    amount?: number;
    icon?: string;
    color?: string;
    relatedEntity?: { id: Types.ObjectId; type: string };
    metadata?: Record<string, any>;
  }
) {
  const activity = new this({
    user: userId,
    type,
    ...data
  });

  return await activity.save();
};

// Helper function to get icon and color for activity type
export const getActivityTypeDefaults = (type: ActivityType): { icon: string; color: string } => {
  const defaults: Record<ActivityType, { icon: string; color: string }> = {
    [ActivityType.ORDER]: { icon: 'checkmark-circle', color: '#10B981' },
    [ActivityType.CASHBACK]: { icon: 'cash', color: '#F59E0B' },
    [ActivityType.REVIEW]: { icon: 'star', color: '#EC4899' },
    [ActivityType.VIDEO]: { icon: 'videocam', color: '#8B5CF6' },
    [ActivityType.PROJECT]: { icon: 'briefcase', color: '#3B82F6' },
    [ActivityType.VOUCHER]: { icon: 'ticket', color: '#F59E0B' },
    [ActivityType.OFFER]: { icon: 'pricetag', color: '#EF4444' },
    [ActivityType.REFERRAL]: { icon: 'people', color: '#10B981' },
    [ActivityType.WALLET]: { icon: 'wallet', color: '#6366F1' },
    [ActivityType.ACHIEVEMENT]: { icon: 'trophy', color: '#F59E0B' }
  };

  return defaults[type] || { icon: 'information-circle', color: '#6B7280' };
};

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);