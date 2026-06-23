import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArchivedActivity extends Document {
  originalId: Types.ObjectId;
  user: Types.ObjectId;
  type: string;
  title: string;
  description?: string;
  amount?: number;
  icon: string;
  color: string;
  relatedEntity?: {
    id: Types.ObjectId;
    type: string;
  };
  metadata?: Record<string, any>;
  archivedAt: Date;
  createdAt: Date;
}

const ArchivedActivitySchema = new Schema<IArchivedActivity>({
  originalId: { type: Schema.Types.ObjectId, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount: Number,
  icon: { type: String, required: true },
  color: { type: String, default: '#10B981' },
  relatedEntity: {
    id: { type: Schema.Types.ObjectId },
    type: { type: String },
  },
  metadata: { type: Schema.Types.Mixed },
  archivedAt: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, required: true },
}, {
  timestamps: false,
});

// Indexes
ArchivedActivitySchema.index({ user: 1, createdAt: -1 });
ArchivedActivitySchema.index({ archivedAt: 1 });
// Auto-delete archived records after 1 year
ArchivedActivitySchema.index({ archivedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const ArchivedActivity = mongoose.model<IArchivedActivity>('ArchivedActivity', ArchivedActivitySchema);
export default ArchivedActivity;
