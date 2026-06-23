import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningContent extends Document {
  slug: string;
  title: string;
  category: 'coin-system' | 'earning-tips' | 'platform-guide' | 'coin-types';
  contentType: 'article' | 'video';
  body: string; // Markdown content
  videoUrl?: string;
  thumbnailUrl?: string;
  coinReward: number; // Coins awarded on first completion
  estimatedMinutes: number;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LearningContentSchema = new Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['coin-system', 'earning-tips', 'platform-guide', 'coin-types'],
    required: true,
    index: true
  },
  contentType: {
    type: String,
    enum: ['article', 'video'],
    default: 'article'
  },
  body: {
    type: String,
    default: ''
  },
  videoUrl: String,
  thumbnailUrl: String,
  coinReward: {
    type: Number,
    default: 10,
    min: 0
  },
  estimatedMinutes: {
    type: Number,
    default: 2,
    min: 1
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

LearningContentSchema.index({ isPublished: 1, sortOrder: 1 });

export default mongoose.model<ILearningContent>('LearningContent', LearningContentSchema);
