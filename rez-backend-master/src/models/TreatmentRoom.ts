import mongoose, { Document, Schema } from 'mongoose';

export interface ITreatmentRoom extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  type: 'treatment_room' | 'chair' | 'station' | 'suite' | 'other';
  capacity: number;
  description?: string;
  active: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const TreatmentRoomSchema = new Schema<ITreatmentRoom>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['treatment_room', 'chair', 'station', 'suite', 'other'],
      default: 'treatment_room',
    },
    capacity: { type: Number, default: 1, min: 1 },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    color: { type: String, default: '#6366F1' },
  },
  { timestamps: true },
);

TreatmentRoomSchema.index({ storeId: 1, active: 1 });

export const TreatmentRoom = mongoose.model<ITreatmentRoom>('TreatmentRoom', TreatmentRoomSchema);
