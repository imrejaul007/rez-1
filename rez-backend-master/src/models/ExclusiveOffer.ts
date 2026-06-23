import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExclusiveOffer extends Document {
  title: string; // "Student Special"
  icon: string; // emoji
  discount: string; // "25% Extra Off"
  description: string;
  color: string;
  gradient: string[]; // ["#3B82F6", "#1D4ED8"]
  targetAudience: 'student' | 'women' | 'senior' | 'corporate' | 'birthday' | 'first' | 'all';
  categories?: Types.ObjectId[]; // Related categories (optional)
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExclusiveOfferSchema = new Schema<IExclusiveOffer>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  icon: {
    type: String,
    required: true
  },
  discount: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  color: {
    type: String,
    required: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
  },
  gradient: [{
    type: String,
    required: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Gradient color must be a valid hex color']
  }],
  targetAudience: {
    type: String,
    required: true,
    enum: ['student', 'women', 'senior', 'corporate', 'birthday', 'first', 'all'],
    index: true
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  validFrom: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  validTo: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

ExclusiveOfferSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
ExclusiveOfferSchema.index({ targetAudience: 1, isActive: 1 });

export const ExclusiveOffer = mongoose.model<IExclusiveOffer>('ExclusiveOffer', ExclusiveOfferSchema);
export default ExclusiveOffer;





