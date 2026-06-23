import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FollowSchema = new Schema({
  follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

// Compound index to prevent duplicates and optimize queries
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ following: 1, follower: 1 });
// Sorted feed queries (activityFeedService, exploreController)
FollowSchema.index({ follower: 1, createdAt: -1 });
FollowSchema.index({ following: 1, createdAt: -1 });

export default mongoose.model<IFollow>('Follow', FollowSchema);
