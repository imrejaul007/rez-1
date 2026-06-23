import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITableReservation extends Document {
  storeSlug: string;
  storeId: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM (e.g. "19:00")
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  reservationCode: string; // unique e.g. "RES-A3X"
  createdAt: Date;
  updatedAt: Date;
}

const TableReservationSchema = new Schema<ITableReservation>(
  {
    storeSlug: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    partySize: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    date: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'timeSlot must be HH:MM'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    reservationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes
TableReservationSchema.index({ storeSlug: 1, date: 1, timeSlot: 1 });
TableReservationSchema.index({ customerPhone: 1, status: 1 });

export const TableReservation = mongoose.model<ITableReservation>('TableReservation', TableReservationSchema);
