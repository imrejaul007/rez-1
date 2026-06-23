import mongoose, { Schema, Document } from 'mongoose';

export interface IPollOption {
  id: string;
  text: string;
  imageUrl?: string;
  voteCount: number;
}

export interface IPoll extends Document {
  title: string;
  description?: string;
  options: IPollOption[];
  category?: string;
  store?: mongoose.Types.ObjectId;
  offer?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  status: 'draft' | 'active' | 'closed' | 'archived';
  totalVotes: number;
  startsAt: Date;
  endsAt: Date;
  coinsPerVote: number;
  isDaily: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String },
  voteCount: { type: Number, default: 0 },
}, { _id: false });

const PollSchema = new Schema<IPoll>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 500 },
  options: { type: [PollOptionSchema], required: true, validate: [(v: any[]) => v.length >= 2 && v.length <= 6, 'Poll must have 2-6 options'] },
  category: { type: String, trim: true },
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  offer: { type: Schema.Types.ObjectId, ref: 'Offer' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'active', 'closed', 'archived'], default: 'draft' },
  totalVotes: { type: Number, default: 0 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  coinsPerVote: { type: Number, default: 10, min: 0, max: 100 },
  isDaily: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
}, {
  timestamps: true,
});

PollSchema.index({ status: 1, startsAt: 1 });
PollSchema.index({ isDaily: 1, status: 1 });
PollSchema.index({ endsAt: 1, status: 1 });

export default mongoose.model<IPoll>('Poll', PollSchema);
