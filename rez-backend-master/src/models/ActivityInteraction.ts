import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityInteraction extends Document {
  activity: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'share';
  comment?: string;
  createdAt: Date;
}

const ActivityInteractionSchema = new Schema({
  activity: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['like', 'comment', 'share'],
    required: true
  },
  comment: String
}, {
  timestamps: true
});

// Prevent duplicate likes
ActivityInteractionSchema.index(
  { activity: 1, user: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'like' } }
);

export default mongoose.model<IActivityInteraction>('ActivityInteraction', ActivityInteractionSchema);
