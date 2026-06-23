import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IValueCard extends Document {
  title: string;
  subtitle: string;
  emoji: string;
  deepLinkPath?: string;
  sortOrder: number;
  isActive: boolean;
  regions: string[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ValueCardSchema = new Schema<IValueCard>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  emoji: {
    type: String,
    required: true
  },
  deepLinkPath: {
    type: String,
    trim: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  regions: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

ValueCardSchema.index({ isActive: 1, sortOrder: 1 });

const ValueCard = mongoose.model<IValueCard>('ValueCard', ValueCardSchema);
export default ValueCard;
