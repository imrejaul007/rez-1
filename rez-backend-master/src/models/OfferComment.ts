import mongoose, { Schema, Document } from 'mongoose';

export interface IOfferCommentReply {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

export interface IOfferComment extends Document {
  offer: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  likes: mongoose.Types.ObjectId[];
  replies: IOfferCommentReply[];
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedBy?: mongoose.Types.ObjectId;
  moderationNotes?: string;
  coinsAwarded: number;
  qualityScore: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferCommentReplySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const OfferCommentSchema = new Schema<IOfferComment>({
  offer: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies: [OfferCommentReplySchema],
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderationNotes: { type: String },
  coinsAwarded: { type: Number, default: 0 },
  qualityScore: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

OfferCommentSchema.index({ offer: 1, moderationStatus: 1, createdAt: -1 });
OfferCommentSchema.index({ user: 1, createdAt: -1 });
OfferCommentSchema.index({ moderationStatus: 1, createdAt: -1 });

export default mongoose.model<IOfferComment>('OfferComment', OfferCommentSchema);
