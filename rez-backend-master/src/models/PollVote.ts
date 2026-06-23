import mongoose, { Schema, Document } from 'mongoose';

export interface IPollVote extends Document {
  poll: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  optionId: string;
  coinsAwarded: number;
  createdAt: Date;
}

const PollVoteSchema = new Schema<IPollVote>({
  poll: { type: Schema.Types.ObjectId, ref: 'Poll', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  optionId: { type: String, required: true },
  coinsAwarded: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// One vote per user per poll
PollVoteSchema.index({ poll: 1, user: 1 }, { unique: true });
PollVoteSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IPollVote>('PollVote', PollVoteSchema);
