import mongoose, { Document, Schema } from 'mongoose';

export interface IPrivePostSubmission extends Document {
  campaignId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId; // Alias used by some controllers (added during Phase 2E merge)
  orderId?: mongoose.Types.ObjectId;
  postUrl: string;
  postScreenshotUrl: string;
  submittedAt: Date;
  status: 'joined' | 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  rejectionCode?: string;
  cashbackIssued: boolean;
  cashbackAmount: number;
  coinsIssued: number;
  fraudScore: number;
  autoFlags: string[];
  reviewerNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrivePostSubmissionSchema = new Schema<IPrivePostSubmission>({
  campaignId: { type: Schema.Types.ObjectId, ref: 'PriveCampaign', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  postUrl: { type: String, required: true, trim: true },
  postScreenshotUrl: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['joined', 'pending', 'approved', 'rejected', 'expired'],
    default: 'joined',
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
  rejectionCode: {
    type: String,
    enum: ['post_removed', 'wrong_hashtag', 'no_brand_tag', 'minimum_followers_not_met', 'fraudulent', 'other'],
  },
  cashbackIssued: { type: Boolean, default: false },
  cashbackAmount: { type: Number, default: 0 },
  coinsIssued: { type: Number, default: 0 },
  fraudScore: { type: Number, default: 0, min: 0, max: 100 },
  autoFlags: [{ type: String }],
  reviewerNote: { type: String, default: '' },
}, { timestamps: true });

// === INDEXES ===

// Unique: one submission per user per campaign
PrivePostSubmissionSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

// Admin review queue
PrivePostSubmissionSchema.index({ status: 1, submittedAt: -1 });

// User's own submissions
PrivePostSubmissionSchema.index({ userId: 1, status: 1 });
PrivePostSubmissionSchema.index({ userId: 1, createdAt: -1 });

// Merchant's campaign submissions
PrivePostSubmissionSchema.index({ campaignId: 1, status: 1, submittedAt: -1 });

// Fraud monitoring
PrivePostSubmissionSchema.index({ fraudScore: -1, status: 1 });

export const PrivePostSubmission = mongoose.model<IPrivePostSubmission>(
  'PrivePostSubmission',
  PrivePostSubmissionSchema
);
export default PrivePostSubmission;
