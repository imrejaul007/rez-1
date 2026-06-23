import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRecentBuyer {
  name: string;
  avatar: string;
  item: string;
  timeAgo: string;
}

export interface ISocialProofStat extends Document {
  category: Types.ObjectId;
  shoppedToday: number;
  totalEarned: number;
  topHashtags: string[];
  recentBuyers: IRecentBuyer[];
  updatedAt: Date;
}

const SocialProofStatSchema = new Schema<ISocialProofStat>({
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  shoppedToday: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalEarned: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  topHashtags: [{
    type: String,
    trim: true
  }],
  recentBuyers: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    avatar: {
      type: String,
      required: true
    },
    item: {
      type: String,
      required: true,
      trim: true
    },
    timeAgo: {
      type: String,
      required: true,
      trim: true
    }
  }]
}, {
  timestamps: true
});

SocialProofStatSchema.index({ updatedAt: -1 });

export const SocialProofStat = mongoose.model<ISocialProofStat>('SocialProofStat', SocialProofStatSchema);
export default SocialProofStat;





