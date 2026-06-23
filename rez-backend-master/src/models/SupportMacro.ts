import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupportMacro extends Document {
  title: string;
  content: string;
  category: string;
  audience: 'user' | 'merchant' | 'all';
  shortcut?: string;
  tags: string[];
  isActive: boolean;
  usageCount: number;
  createdBy: Types.ObjectId;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMacroSchema = new Schema<ISupportMacro>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  category: {
    type: String,
    required: true,
    enum: ['order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'general', 'all'],
    default: 'all',
  },
  audience: {
    type: String,
    enum: ['user', 'merchant', 'all'],
    default: 'all',
  },
  shortcut: { type: String, trim: true, sparse: true },
  tags: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

SupportMacroSchema.index({ category: 1, audience: 1, isActive: 1, sortOrder: 1 });
SupportMacroSchema.index({ shortcut: 1 }, { unique: true, sparse: true });

export const SupportMacro = mongoose.model<ISupportMacro>('SupportMacro', SupportMacroSchema);
export default SupportMacro;
