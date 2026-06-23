import mongoose, { Schema, Document } from 'mongoose';

export interface IEngagementConfig extends Document {
  action: string;
  isEnabled: boolean;
  baseCoins: number;
  bonusCoins: number;
  dailyLimit: number;
  requiresModeration: boolean;
  qualityChecks: {
    minTextLength?: number;
    minPhotos?: number;
    minVideoLength?: number;
    minResolution?: string;
  };
  multiplier: number;
  multiplierEndsAt?: Date;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EngagementConfigSchema = new Schema<IEngagementConfig>({
  action: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'share_store', 'share_offer', 'poll_vote', 'offer_comment',
      'photo_upload', 'ugc_reel', 'event_rating',
    ],
  },
  isEnabled: { type: Boolean, default: true },
  baseCoins: { type: Number, required: true, min: 0, max: 1000 },
  bonusCoins: { type: Number, default: 0, min: 0, max: 1000 },
  dailyLimit: { type: Number, required: true, min: 1, max: 100 },
  requiresModeration: { type: Boolean, default: false },
  qualityChecks: {
    minTextLength: { type: Number },
    minPhotos: { type: Number },
    minVideoLength: { type: Number },
    minResolution: { type: String },
  },
  multiplier: { type: Number, default: 1, min: 1, max: 10 },
  multiplierEndsAt: { type: Date },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

export default mongoose.model<IEngagementConfig>('EngagementConfig', EngagementConfigSchema);
