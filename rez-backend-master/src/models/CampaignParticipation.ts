import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICampaignParticipation extends Document {
  userId: Types.ObjectId;
  campaignId: Types.ObjectId;
  completedTrialIds: Types.ObjectId[];
  currentCount: number;
  completed: boolean;
  completedAt?: Date;
  rewardCredited: boolean;
  joinedAt: Date;
  updatedAt: Date;
}

const CampaignParticipationSchema = new Schema<ICampaignParticipation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'DiscoveryCampaign',
      required: true
    },
    completedTrialIds: {
      type: [Schema.Types.ObjectId],
      ref: 'TrialBooking',
      default: []
    },
    currentCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    completed: {
      type: Boolean,
      required: true,
      default: false
    },
    completedAt: {
      type: Date,
      required: false,
      default: null
    },
    rewardCredited: {
      type: Boolean,
      required: true,
      default: false
    },
    joinedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    }
  },
  {
    timestamps: true
  }
);

// Unique index on userId and campaignId
CampaignParticipationSchema.index({ userId: 1, campaignId: 1 }, { unique: true });
CampaignParticipationSchema.index({ campaignId: 1 });
CampaignParticipationSchema.index({ completed: 1 });

export const CampaignParticipation = mongoose.model<ICampaignParticipation>(
  'CampaignParticipation',
  CampaignParticipationSchema
);
