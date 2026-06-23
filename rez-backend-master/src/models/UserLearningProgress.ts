import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLearningProgress extends Document {
  user: mongoose.Types.ObjectId;
  content: mongoose.Types.ObjectId;
  completed: boolean;
  completedAt?: Date;
  rewardClaimed: boolean;
  claimedAt?: Date;
  timeSpentSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserLearningProgressSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: Schema.Types.ObjectId,
    ref: 'LearningContent',
    required: true,
    index: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  rewardClaimed: {
    type: Boolean,
    default: false
  },
  claimedAt: Date,
  timeSpentSeconds: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// Prevent duplicate entries per user per content
UserLearningProgressSchema.index({ user: 1, content: 1 }, { unique: true });

export default mongoose.model<IUserLearningProgress>('UserLearningProgress', UserLearningProgressSchema);
