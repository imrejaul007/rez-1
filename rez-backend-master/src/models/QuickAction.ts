import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuickAction extends Document {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  deepLinkPath: string;
  targetAchievementTypes: string[];
  priority: number;
  isActive: boolean;
  regions: string[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuickActionSchema = new Schema<IQuickAction>({
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
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true,
    trim: true
  },
  iconColor: {
    type: String,
    default: '#F59E0B'
  },
  deepLinkPath: {
    type: String,
    required: true,
    trim: true
  },
  targetAchievementTypes: [{
    type: String,
    trim: true
  }],
  priority: {
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

QuickActionSchema.index({ isActive: 1, priority: 1 });

const QuickAction = mongoose.model<IQuickAction>('QuickAction', QuickActionSchema);
export default QuickAction;
