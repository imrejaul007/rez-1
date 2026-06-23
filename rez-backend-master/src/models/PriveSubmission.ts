/**
 * PriveSubmission Model
 *
 * Tracks user submissions for Privé social cashback campaigns.
 * Each user can submit once per campaign (unique compound index).
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// ── Types ──

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type RejectionReason =
  | 'post_removed'
  | 'wrong_hashtag'
  | 'no_brand_tag'
  | 'minimum_followers_not_met'
  | 'fraudulent'
  | 'other';

// ── Interfaces ──

export interface IPriveSubmission extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;

  postUrl: string;
  postScreenshotUrl: string;
  orderId?: Types.ObjectId;
  notes?: string;

  status: SubmissionStatus;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewerNote?: string;
  rejectionReason?: RejectionReason;

  cashbackIssued: number;
  coinsEarned: number;

  fraudScore: number;
  autoFlags: string[];

  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPriveSubmissionModel extends Model<IPriveSubmission> {
  findByCampaign(campaignId: string, status?: string, page?: number, limit?: number): Promise<IPriveSubmission[]>;
  findByUser(userId: string, page?: number, limit?: number): Promise<IPriveSubmission[]>;
}

// ── Schema ──

const PriveSubmissionSchema = new Schema<IPriveSubmission>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'PriveCampaign', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    postUrl: { type: String, required: true, trim: true },
    postScreenshotUrl: { type: String, default: '' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    notes: { type: String, maxlength: 500 },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId },
    reviewerNote: { type: String, maxlength: 500 },
    rejectionReason: {
      type: String,
      enum: ['post_removed', 'wrong_hashtag', 'no_brand_tag', 'minimum_followers_not_met', 'fraudulent', 'other'],
    },

    cashbackIssued: { type: Number, default: 0, min: 0 },
    coinsEarned: { type: Number, default: 0, min: 0 },

    fraudScore: { type: Number, default: 0, min: 0 },
    autoFlags: [{ type: String }],

    submittedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──

// One submission per user per campaign
PriveSubmissionSchema.index({ campaignId: 1, userId: 1 }, { unique: true });
// Admin/merchant listing queries
PriveSubmissionSchema.index({ status: 1, submittedAt: -1 });
// User query
PriveSubmissionSchema.index({ userId: 1, status: 1 });

// ── Statics ──

PriveSubmissionSchema.statics.findByCampaign = async function (
  campaignId: string,
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<IPriveSubmission[]> {
  const filter: any = { campaignId };
  if (status) filter.status = status;
  return this.find(filter)
    .sort({ submittedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'fullName phoneNumber profile.avatar')
    .lean();
};

PriveSubmissionSchema.statics.findByUser = async function (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<IPriveSubmission[]> {
  return this.find({ userId })
    .sort({ submittedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('campaignId', 'title merchantName reward')
    .lean();
};

// ── Export ──

export const PriveSubmission = mongoose.model<IPriveSubmission, IPriveSubmissionModel>(
  'PriveSubmission',
  PriveSubmissionSchema
);

export default PriveSubmission;
